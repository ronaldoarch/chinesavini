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
    idTransaction: body.externalId || body.idTransaction || body.transactionId || body.transaction_id || body.tx_id || body.tag || body?.transaction?.externalId || body?.invoice?.externalId || body?.data?.idTransaction || body?.data?.tag,
    ip: req.ip || req.connection?.remoteAddress,
    ...extra
  }).catch(err => console.error('WebhookLog create error:', err))
}

// Middleware to parse JSON (webhooks may not send proper headers)
router.use(express.json())
router.use(express.urlencoded({ extended: true }))

function getIdTransaction(body) {
  // NxGate usa data.tag (nosso magic_id) - priorizar para webhook cash-in
  const dataTag = body?.data?.tag || body?.data?.magic_id
  if (dataTag) return dataTag
  return (
    body.externalId || body.idTransaction || body.transactionId || body.transaction_id || body.tx_id || body.id || body.tag || body.internalreference || body.magic_id ||
    body?.transaction?.externalId || body?.transaction?.idTransaction || body?.transaction?.transactionId || body?.transaction?.internalreference ||
    body?.invoice?.externalId || body?.invoice?.idTransaction || body?.invoice?.transactionId ||
    body?.data?.externalId || body?.data?.idTransaction || body?.data?.transactionId || body?.data?.id || body?.data?.tx_id || body?.data?.tag || body?.data?.magic_id || body?.data?.internalreference || body?.data?.withdrawalId
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
    if (!transaction) transaction = await Transaction.findOne({ gatewayTxId: idTransaction })
    if (!transaction) transaction = await Transaction.findOne({ gatewayIds: idTransaction })
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
  const webhookData = body.data || body.invoice || body
  // Gatebox, NxGate, Escale Cyber: status pode estar em body.status ou body.data.status
  const rawStatus = (status ?? body.status ?? webhookData?.status ?? body?.invoice?.status ?? '').toString().toUpperCase()
  const rawType = (type ?? body.type ?? data?.type ?? body?.invoice?.type ?? '').toString().toUpperCase()
  let paymentStatus = 'pending'
  // NxGate exige data.worked === true (https://nxgate-api.readme.io/reference/webhook_cashin_paid)
  const worked = webhookData?.worked === true || webhookData?.worked === 'true'
  const isNxGateFormat = rawType === 'QR_CODE_COPY_AND_PASTE_PAID'
  const canCredit = isNxGateFormat ? worked : true // NxGate: só creditar se worked; Gatebox: não envia worked
  if (
    (rawType.includes('PAID') || rawType === 'QR_CODE_COPY_AND_PASTE_PAID' ||
    rawStatus === 'PAID' || rawStatus === 'PAYED' || rawStatus === 'CONFIRMED' ||
    rawStatus === 'PAYMENT_CONFIRMED' || rawStatus === 'SUCCESS' || rawStatus === 'COMPLETED' || rawStatus === 'APPROVED') &&
    canCredit
  ) {
    paymentStatus = 'paid'
  } else if (rawStatus === 'FAILED' || rawStatus === 'ERROR' || rawStatus === 'REJECTED' || rawStatus === 'REFUSED' || rawStatus === 'REFUNDED' || rawStatus === 'EXPIRED') {
    paymentStatus = 'failed'
  } else if (rawType === 'QR_CODE_COPY_AND_PASTE_REFUNDED' || rawStatus === 'REFUNDED') {
    paymentStatus = 'failed' // Estorno: reverter crédito
  }
  const wasPaid = transaction.status === 'paid'
  await transaction.updateStatus(paymentStatus, webhookData)
  if (paymentStatus === 'paid' && transaction.type === 'deposit') {
    const user = await User.findById(transaction.user)
    if (user) {
      const isFirstDeposit = user.totalDeposits === 0
      const depositAmount = transaction.netAmount
      const bonusConfig = await BonusConfig.getConfig().catch(() => null)
      const bonusAmount = calcDepositBonus(depositAmount, isFirstDeposit, bonusConfig)
      transaction.bonusAmount = bonusAmount
      await transaction.save()
      user.balance += depositAmount + bonusAmount
      user.bonusBalance = (user.bonusBalance || 0) + bonusAmount
      user.totalDeposits += depositAmount
      await user.save()
      await affiliateService.updateReferralQualification(user._id)
      await affiliateService.updateVipLevel(user._id)
      if (user.referredBy) await processAffiliateCommissions(user, transaction, depositAmount, isFirstDeposit)
      if (isFirstDeposit) facebookService.sendFirstDeposit(user, depositAmount, 'BRL').catch(() => {})
    }
  } else if (paymentStatus === 'failed' && transaction.type === 'deposit' && wasPaid) {
    // Estorno (REFUNDED): reverter crédito já dado (usar bonusAmount armazenado para precisão)
    const user = await User.findById(transaction.user)
    if (user) {
      const depositAmount = transaction.netAmount
      let bonusAmount = transaction.bonusAmount ?? 0
      if (bonusAmount <= 0) {
        const bonusConfig = await BonusConfig.getConfig().catch(() => null)
        const isFirstDeposit = user.totalDeposits <= depositAmount
        bonusAmount = calcDepositBonus(depositAmount, isFirstDeposit, bonusConfig)
      }
      user.balance = Math.max(0, (user.balance || 0) - depositAmount - bonusAmount)
      user.bonusBalance = Math.max(0, (user.bonusBalance || 0) - bonusAmount)
      user.totalDeposits = Math.max(0, (user.totalDeposits || 0) - depositAmount)
      await user.save()
      console.log(`Webhook PIX (estorno): Crédito revertido para usuário ${user._id} - R$ ${depositAmount}`)
    }
  }
  console.log(`Webhook PIX (depósito): Transação ${transaction.idTransaction} atualizada para ${paymentStatus}`)
}

async function processWithdrawWebhook(body, transaction) {
  const { type, status, fee } = body
  const data = body.data || body
  // Gatebox, NxGate, Escale Cyber: status pode estar em body.data.status
  const txStatus = body.transaction?.status ?? data?.status
  const statusUpper = (txStatus ?? status ?? body.invoice?.status ?? body.status ?? data?.status ?? '').toString().toUpperCase()
  const typeUpper = (type ?? body.invoice?.type ?? body.type ?? body.event ?? data?.type ?? '').toString().toUpperCase()

  let paymentStatus = null
  if (body._gateboxReversal) {
    paymentStatus = 'failed'
  } else if (typeUpper === 'PIX_OUT_REVERSAL' || typeUpper === 'PIX.OUT.REVERSAL' || typeUpper === 'PIX_CASHOUT_REFUNDED' || statusUpper === 'REFUNDED' || statusUpper === 'REVERSED') {
    paymentStatus = 'failed' // Saque devolvido: reembolsar usuário
  } else if (typeUpper === 'PIX_CASHOUT_ERROR' || typeUpper === 'PIX_OUT_FAILURE' || typeUpper === 'PIX.OUT.FAILURE' || (statusUpper === 'ERROR' && !body.worked)) {
    paymentStatus = 'failed' // NxGate/Escale Cyber: saque falhou - reembolsar
  } else if (typeUpper === 'PIX_CASHOUT_SUCCESS' || typeUpper === 'PIX_OUT_CONFIRMATION' || typeUpper === 'PIX.OUT.CONFIRMATION' || statusUpper === 'SUCCESS' || statusUpper === 'COMPLETED' || statusUpper === 'PAID' || statusUpper === 'APPROVED') {
    paymentStatus = 'paid'
  } else {
    const worked = body.worked === true || body.worked === 'true'
    const errorMsg = body.error || body.invoice?.error || body.motivo || body.message || body.reason || data?.reason || data?.error || ''
    const errorStr = typeof errorMsg === 'string' ? errorMsg : (errorMsg?.message || JSON.stringify(errorMsg))
    const hasError = !!errorStr || typeUpper === 'PIX_CASHOUT_ERROR' || typeUpper === 'PIX_OUT_FAILURE' || typeUpper === 'PIX.OUT.FAILURE' || /invalid|falha|error|invalid/i.test(errorStr)
    if (worked && statusUpper !== 'ERROR' && statusUpper !== 'FAILED' && !hasError) {
      paymentStatus = 'paid'
    } else if (statusUpper === 'FAILED' || statusUpper === 'ERROR') {
      paymentStatus = 'failed'
    } else if (body.worked === false || body.worked === 'false') {
      // NxGate: worked=false indica falha mesmo sem status explícito
      paymentStatus = 'failed'
    }
  }

  // Saldo foi debitado se: flag explícita OU status ainda processing (retrocompatível)
  const hadBalanceDeducted = transaction.balanceDeducted === true || transaction.status === 'processing'

  transaction.webhookReceived = true
  transaction.webhookData = body
  const feeValue = fee ?? data?.totalFee ?? data?.feeAmount ?? data?.fee
  if (feeValue !== undefined && feeValue !== null) {
    transaction.fee = parseFloat(feeValue) || 0
    transaction.netAmount = transaction.amount - transaction.fee
  }

  if (paymentStatus === 'paid') {
    transaction.status = 'paid'
    const paidAt = body.payment_date ?? body.paymentAt ?? data?.paymentAt ?? data?.payment_date
    transaction.paidAt = new Date(paidAt ? new Date(paidAt) : new Date())
    const user = await User.findById(transaction.user)
    if (user) {
      user.totalWithdrawals += transaction.netAmount || transaction.amount
      await user.save()
    }
    console.log(`Webhook PIX Withdraw: Transação ${transaction.idTransaction} atualizada para paid`)
  } else if (paymentStatus === 'failed') {
    const wasPaid = transaction.status === 'paid'
    transaction.status = 'failed'
    transaction.failedAt = new Date()
    const errorMsg = body.error || body.message || body.data?.error || ''
    const isRefunded = typeUpper === 'PIX_CASHOUT_REFUNDED' || statusUpper === 'REFUNDED'
    const user = await User.findById(transaction.user)
    // Reembolsar: (1) saldo foi debitado (hadBalanceDeducted) ou (2) saque foi devolvido (REFUNDED)
    const shouldRefund = user && (hadBalanceDeducted || (isRefunded && wasPaid))
    if (shouldRefund) {
      user.balance = (user.balance || 0) + transaction.amount
      if (isRefunded && wasPaid) user.totalWithdrawals = Math.max(0, (user.totalWithdrawals || 0) - (transaction.netAmount || transaction.amount))
      await user.save()
      console.log(`Webhook PIX Withdraw: Reembolso para usuário ${user._id} - R$ ${transaction.amount} (${isRefunded ? 'saque devolvido' : 'saque falhou'}${errorMsg ? ': ' + errorMsg : ''})`)
    } else if (!hadBalanceDeducted && !isRefunded) {
      console.log(`Webhook PIX Withdraw: Saque falhou; saldo não havia sido debitado, reembolso não necessário`)
    } else if (!user) {
      console.error(`Webhook PIX Withdraw: Usuário não encontrado para reembolso - transaction.user: ${transaction.user}`)
    }
    console.log(`Webhook PIX Withdraw: Transação ${transaction.idTransaction} atualizada para failed`)
  } else {
    // Status ambíguo (ex: primeiro webhook com processing): não alterar status e não reembolsar
    console.log(`Webhook PIX Withdraw: Transação ${transaction.idTransaction} — status ambíguo (${statusUpper || 'vazio'}), aguardando webhook definitivo`)
  }

  await transaction.save()
}

// @route   POST /api/webhooks/escalecyber
// @desc    Webhook único Escale Cyber (depósito e saque)
// @access  Public
router.post('/escalecyber', async (req, res) => {
  logWebhook('escalecyber', req)
  try {
    const body = req.body || {}
    res.status(200).json({ status: 'received' })

    const eventType = (body.type || '').toString()
    const data = body.data || body
    const idTransaction = data?.transactionId || data?.id || data?.withdrawalId || data?.externalId || body.id

    if (!idTransaction) {
      console.error('Webhook Escale Cyber: idTransaction não fornecido. Body:', JSON.stringify(body).slice(0, 500))
      return
    }

    let transaction = await Transaction.findOne({ idTransaction })
    if (!transaction && /^[a-fA-F0-9]{24}$/.test(idTransaction)) {
      transaction = await Transaction.findById(idTransaction)
    }
    if (!transaction) {
      console.error(`Webhook Escale Cyber: Transação não encontrada: ${idTransaction}`)
      return
    }

    const isDeposit = /^pix\.in\./.test(eventType)
    const isWithdraw = /^pix\.out\./.test(eventType)

    if (isDeposit) {
      await processDepositWebhook(body, transaction)
    } else if (isWithdraw) {
      await processWithdrawWebhook(body, transaction)
    } else if (transaction.type === 'withdraw') {
      await processWithdrawWebhook(body, transaction)
    } else {
      await processDepositWebhook(body, transaction)
    }
  } catch (error) {
    console.error('Webhook Escale Cyber Error:', error)
  }
})

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
    let transaction = await Transaction.findOne({ idTransaction })
    if (!transaction) transaction = await Transaction.findOne({ gatewayTxId: idTransaction })
    if (!transaction) transaction = await Transaction.findOne({ gatewayIds: idTransaction })
    if (!transaction && body?.data?.tx_id) {
      transaction = await Transaction.findOne({ $or: [{ idTransaction: body.data.tx_id }, { gatewayTxId: body.data.tx_id }, { gatewayIds: body.data.tx_id }] })
    }
    if (!transaction && /^[a-fA-F0-9]{24}$/.test(idTransaction)) {
      transaction = await Transaction.findById(idTransaction)
    }
    if (!transaction) {
      const dataKeys = body?.data ? Object.keys(body.data) : []
      console.error(`Webhook PIX: Transação não encontrada: ${idTransaction} | data.tx_id: ${body?.data?.tx_id || 'n/a'} | dataKeys: ${dataKeys.join(',')}`)
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
    // NxGate PIX_CASHOUT_SUCCESS: internalReference (camelCase), idTransaction, tag ou transaction_id
    const idTransaction = body.internalReference || body.internalreference || body.idTransaction || body.tag || body.transaction_id || body.data?.internalReference || body.data?.idTransaction || body.data?.tag || getIdTransaction(body)
    res.status(200).json({ status: 'received' })
    if (!idTransaction) {
      console.error('Webhook PIX Withdraw: idTransaction não fornecido. Body:', JSON.stringify(body).slice(0, 500))
      return
    }
    let transaction = await Transaction.findOne({ idTransaction })
    if (!transaction) transaction = await Transaction.findOne({ gatewayTxId: idTransaction })
    if (!transaction) transaction = await Transaction.findOne({ gatewayIds: idTransaction })
    const altIds = [body?.tx_id, body?.transaction_id].filter(Boolean)
    for (const altId of altIds) {
      if (!transaction) transaction = await Transaction.findOne({ $or: [{ idTransaction: altId }, { gatewayTxId: altId }, { gatewayIds: altId }] })
    }
    if (!transaction && /^[a-fA-F0-9]{24}$/.test(idTransaction)) {
      transaction = await Transaction.findById(idTransaction)
    }
    if (!transaction) {
      console.error(`Webhook PIX Withdraw: Transação não encontrada: ${idTransaction} | bodyKeys: ${Object.keys(body).join(',')}`)
      return
    }
    await processWithdrawWebhook(body, transaction)
  } catch (error) {
    console.error('Webhook PIX Withdraw Error:', error)
    if (!res.headersSent) res.status(200).json({ status: 'received', error: error.message })
  }
})

export default router
