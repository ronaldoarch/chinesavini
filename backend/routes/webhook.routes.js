import express from 'express'
import Transaction from '../models/Transaction.model.js'
import User from '../models/User.model.js'
import BonusConfig from '../models/BonusConfig.model.js'
import WebhookLog from '../models/WebhookLog.model.js'
import AffiliateDeposit from '../models/AffiliateDeposit.model.js'
import affiliateService from '../services/affiliate.service.js'
import facebookService from '../services/facebook.service.js'

function calcDepositBonus(amount, isFirstDeposit, bonusConfig) {
  let percent = 0
  if (isFirstDeposit && bonusConfig?.firstDepositBonusPercent) {
    percent = bonusConfig.firstDepositBonusPercent
  } else if (bonusConfig?.depositTiers?.length) {
    const tier = [...bonusConfig.depositTiers]
      .filter((t) => Number(t.amount) <= amount)
      .sort((a, b) => Number(b.amount) - Number(a.amount))[0]
    if (tier) percent = Number(tier.bonusPercent) || 0
  }
  return Math.round((amount * percent / 100) * 100) / 100
}

/**
 * Process affiliate commissions: % sobre depósito (vai direto para saldo real sacável)
 * - Afiliados com % definido: ganham sobre depósitos (todos ou só primeiro, conforme config)
 * - Bônus vai para balance (saldo real sacável)
 * - Comissões ficam registradas em AffiliateDeposit para exibição no painel
 */
async function processAffiliateCommissions(referredUser, transaction, depositAmount, isFirstDeposit) {
  try {
    const affiliate = await User.findById(referredUser.referredBy)
    if (!affiliate) return

    const bonusPercent = affiliate.affiliateDepositBonusPercent || 0
    const allDeposits = affiliate.affiliateAllDeposits === true

    if (bonusPercent <= 0) return

    // Só primeiro depósito ou todos os depósitos
    if (!allDeposits && !isFirstDeposit) return

    const bonusAmount = Math.round((depositAmount * bonusPercent / 100) * 100) / 100
    if (bonusAmount <= 0) return

    await AffiliateDeposit.create({
      affiliate: affiliate._id,
      referredUser: referredUser._id,
      transaction: transaction._id,
      depositAmount,
      isFirstDeposit,
      depositBonusPercent: bonusPercent,
      depositBonusAmount: bonusAmount
    })

    // Bônus vai direto para saldo real sacável (balance)
    affiliate.balance = (affiliate.balance || 0) + bonusAmount
    await affiliate.save()
  } catch (error) {
    console.error('Process affiliate commissions error:', error)
  }
}

const router = express.Router()

function logWebhook(source, req, extra = {}) {
  const body = req.body || {}
  const bodyStr = JSON.stringify(body)
  const bodySummary = bodyStr.length > 2000 ? bodyStr.slice(0, 2000) + '...' : bodyStr
  WebhookLog.create({
    source,
    path: req.path,
    method: req.method,
    bodySummary,
    bodyKeys: Object.keys(body),
    idTransaction: body.externalId || body.idTransaction || body.transactionId || body.transaction_id || body.tx_id || body?.transaction?.externalId || body?.invoice?.externalId || body?.data?.idTransaction,
    ip: req.ip || req.connection?.remoteAddress,
    ...extra
  }).catch(err => console.error('WebhookLog create error:', err))
}

// Middleware to parse JSON (webhooks may not send proper headers)
router.use(express.json())
router.use(express.urlencoded({ extended: true }))

function getIdTransaction(body) {
  return (
    body.externalId || body.idTransaction || body.transactionId || body.transaction_id || body.tx_id || body.id ||
    body?.transaction?.externalId || body?.transaction?.idTransaction || body?.transaction?.transactionId ||
    body?.invoice?.externalId || body?.invoice?.idTransaction || body?.invoice?.transactionId ||
    body?.data?.externalId || body?.data?.idTransaction || body?.data?.transactionId || body?.data?.id || body?.data?.tx_id
  )
}

// Tipos Gatebox: PIX_PAY_IN = depósito, PIX_PAY_OUT = saque, PIX_REVERSAL / PIX_REFUND = estorno (reembolso)
const GATEBOX_TYPE_DEPOSIT = ['PIX_PAY_IN']
const GATEBOX_TYPE_WITHDRAW = ['PIX_PAY_OUT', 'PIX_REVERSAL', 'PIX_REVERSAL_OUT', 'PIX_REFUND']

// @route   POST /api/webhooks/gatebox
// @desc    Webhook único para todos os eventos Gatebox (depósito, saque, estorno)
// @access  Public
router.post('/gatebox', async (req, res) => {
  logWebhook('gatebox', req)
  try {
    const body = req.body || {}
    res.status(200).json({ status: 'received' })

    const idTransaction = getIdTransaction(body)
    if (!idTransaction) {
      console.error('Webhook Gatebox: idTransaction não fornecido. Body:', JSON.stringify(body).slice(0, 300))
      return
    }
    let transaction = await Transaction.findOne({ idTransaction })
    if (!transaction && /^[a-fA-F0-9]{24}$/.test(idTransaction)) {
      transaction = await Transaction.findById(idTransaction)
    }
    if (!transaction) {
      console.error(`Webhook Gatebox: Transação não encontrada: ${idTransaction}`)
      return
    }

    const webhookType = (body.type ?? body.invoice?.type ?? body.event ?? '').toString().toUpperCase()
    const isDepositType = GATEBOX_TYPE_DEPOSIT.includes(webhookType)
    const isWithdrawType = GATEBOX_TYPE_WITHDRAW.includes(webhookType)

    if (isDepositType) {
      await processDepositWebhook(body, transaction)
    } else if (isWithdrawType) {
      // PIX_REVERSAL / PIX_REFUND = estorno: forçar falha e reembolso automático
      if (['PIX_REVERSAL', 'PIX_REVERSAL_OUT', 'PIX_REFUND'].includes(webhookType)) {
        body._gateboxReversal = true
      }
      await processWithdrawWebhook(body, transaction)
    } else if (transaction.type === 'withdraw') {
      await processWithdrawWebhook(body, transaction)
    } else {
      await processDepositWebhook(body, transaction)
    }
  } catch (error) {
    console.error('Webhook Gatebox Error:', error)
  }
})

async function processDepositWebhook(body, transaction) {
  const { status, type, data } = body
  // Gatebox pode enviar status em body.invoice.status ou no topo
  const rawStatus = (status ?? body.status ?? data?.status ?? body?.invoice?.status ?? '').toString().toUpperCase()
  const rawType = (type ?? body.type ?? data?.type ?? body?.invoice?.type ?? '').toString().toUpperCase()
  let paymentStatus = 'pending'
  const webhookData = data || body.invoice || body
  if (
    rawType.includes('PAID') || rawType === 'QR_CODE_COPY_AND_PASTE_PAID' ||
    rawStatus === 'PAID' || rawStatus === 'PAYED' || rawStatus === 'CONFIRMED' ||
    rawStatus === 'PAYMENT_CONFIRMED' || rawStatus === 'SUCCESS' || rawStatus === 'COMPLETED' || rawStatus === 'APPROVED'
  ) {
    paymentStatus = 'paid'
  } else if (rawStatus === 'FAILED' || rawStatus === 'ERROR' || rawStatus === 'REJECTED' || rawStatus === 'REFUSED') {
    paymentStatus = 'failed'
  }
  await transaction.updateStatus(paymentStatus, webhookData)
  if (paymentStatus === 'paid' && transaction.type === 'deposit') {
    const user = await User.findById(transaction.user)
    if (user) {
      const isFirstDeposit = user.totalDeposits === 0
      const depositAmount = transaction.netAmount
      const bonusConfig = await BonusConfig.getConfig().catch(() => null)
      const bonusAmount = calcDepositBonus(depositAmount, isFirstDeposit, bonusConfig)
      user.balance += depositAmount + bonusAmount
      user.bonusBalance = (user.bonusBalance || 0) + bonusAmount
      user.totalDeposits += depositAmount
      await user.save()
      await affiliateService.updateReferralQualification(user._id)
      await affiliateService.updateVipLevel(user._id)
      if (user.referredBy) await processAffiliateCommissions(user, transaction, depositAmount, isFirstDeposit)
      if (isFirstDeposit) facebookService.sendFirstDeposit(user, depositAmount, 'BRL').catch(() => {})
    }
  }
  console.log(`Webhook PIX (depósito): Transação ${transaction.idTransaction} atualizada para ${paymentStatus}`)
}

async function processWithdrawWebhook(body, transaction) {
  const { type, status, fee } = body
  // Gatebox pode enviar vários webhooks (ex: primeiro processing, depois COMPLETED). Só reembolsar em falha explícita.
  const txStatus = body.transaction?.status
  const statusUpper = (txStatus ?? status ?? body.invoice?.status ?? body.status ?? '').toString().toUpperCase()
  const typeUpper = (type ?? body.invoice?.type ?? body.type ?? body.event ?? '').toString().toUpperCase()

  let paymentStatus = null
  if (body._gateboxReversal) {
    paymentStatus = 'failed'
  } else if (typeUpper === 'PIX_CASHOUT_SUCCESS' || statusUpper === 'SUCCESS' || statusUpper === 'COMPLETED') {
    paymentStatus = 'paid'
  } else {
    const worked = body.worked === true || body.worked === 'true'
    const errorMsg = body.error || body.invoice?.error || body.motivo || body.message || body.reason || ''
    const errorStr = typeof errorMsg === 'string' ? errorMsg : (errorMsg?.message || JSON.stringify(errorMsg))
    const hasError = !!errorStr || typeUpper === 'PIX_CASHOUT_ERROR' || /invalid|falha|error|invalid/i.test(errorStr)
    if (worked && statusUpper !== 'ERROR' && statusUpper !== 'FAILED' && !hasError) {
      paymentStatus = 'paid'
    } else if (statusUpper === 'FAILED' || statusUpper === 'ERROR') {
      paymentStatus = 'failed'
    }
  }

  const hadBalanceDeducted = transaction.status === 'processing'

  transaction.webhookReceived = true
  transaction.webhookData = body
  if (fee !== undefined && fee !== null) {
    transaction.fee = parseFloat(fee) || 0
    transaction.netAmount = transaction.amount - transaction.fee
  }

  if (paymentStatus === 'paid') {
    transaction.status = 'paid'
    transaction.paidAt = new Date(body.payment_date ? new Date(body.payment_date) : new Date())
    const user = await User.findById(transaction.user)
    if (user) {
      user.totalWithdrawals += transaction.netAmount || transaction.amount
      await user.save()
    }
    console.log(`Webhook PIX Withdraw: Transação ${transaction.idTransaction} atualizada para paid`)
  } else if (paymentStatus === 'failed') {
    transaction.status = 'failed'
    transaction.failedAt = new Date()
    const user = await User.findById(transaction.user)
    if (user && hadBalanceDeducted) {
      user.balance += transaction.amount
      await user.save()
      console.log(`Webhook PIX Withdraw: Reembolso automático para usuário ${user._id} - R$ ${transaction.amount} (saque falhou)`)
    } else if (!hadBalanceDeducted) {
      console.log(`Webhook PIX Withdraw: Saque falhou; saldo não havia sido debitado, reembolso não necessário`)
    }
    console.log(`Webhook PIX Withdraw: Transação ${transaction.idTransaction} atualizada para failed`)
  } else {
    // Status ambíguo (ex: primeiro webhook com processing): não alterar status e não reembolsar
    console.log(`Webhook PIX Withdraw: Transação ${transaction.idTransaction} — status ambíguo (${statusUpper || 'vazio'}), aguardando webhook definitivo`)
  }

  await transaction.save()
}

// @route   POST /api/webhooks/pix
// @desc    Webhook for PIX payment confirmation (deposit)
// @access  Public (but should be validated in production)
router.post('/pix', async (req, res) => {
  logWebhook('pix', req)
  try {
    const body = req.body || {}
    const idTransaction = getIdTransaction(body)
    res.status(200).json({ status: 'received' })
    if (!idTransaction) {
      console.error('Webhook PIX: idTransaction não fornecido. Body:', JSON.stringify(body))
      return
    }
    const transaction = await Transaction.findOne({ idTransaction })
    if (!transaction) {
      console.error(`Webhook PIX: Transação não encontrada: ${idTransaction}`)
      return
    }
    await processDepositWebhook(body, transaction)
  } catch (error) {
    console.error('Webhook PIX Error:', error)
    if (!res.headersSent) res.status(200).json({ status: 'received', error: error.message })
  }
})

// @route   POST /api/webhooks/pix-withdraw
// @desc    Webhook for PIX withdrawal confirmation
// @access  Public (but should be validated in production)
router.post('/pix-withdraw', async (req, res) => {
  logWebhook('pix-withdraw', req)
  try {
    const body = req.body || {}
    const idTransaction = getIdTransaction(body)
    res.status(200).json({ status: 'received' })
    if (!idTransaction) {
      console.error('Webhook PIX Withdraw: idTransaction não fornecido. Body:', JSON.stringify(body))
      return
    }
    const transaction = await Transaction.findOne({ idTransaction })
    if (!transaction) {
      console.error(`Webhook PIX Withdraw: Transação não encontrada: ${idTransaction}`)
      return
    }
    await processWithdrawWebhook(body, transaction)
  } catch (error) {
    console.error('Webhook PIX Withdraw Error:', error)
    if (!res.headersSent) res.status(200).json({ status: 'received', error: error.message })
  }
})

export default router
