import express from 'express'
import Transaction from '../models/Transaction.model.js'
import User from '../models/User.model.js'
import BonusConfig from '../models/BonusConfig.model.js'
import WebhookLog from '../models/WebhookLog.model.js'
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
    idTransaction: body.idTransaction || body.transactionId || body.transaction_id || body.tx_id || body?.data?.idTransaction,
    ip: req.ip || req.connection?.remoteAddress,
    ...extra
  }).catch(err => console.error('WebhookLog create error:', err))
}

// Middleware to parse JSON (webhooks may not send proper headers)
router.use(express.json())
router.use(express.urlencoded({ extended: true }))

// @route   POST /api/webhooks/pix
// @desc    Webhook for PIX payment confirmation (deposit)
// @access  Public (but should be validated in production)
router.post('/pix', async (req, res) => {
  logWebhook('pix', req)
  try {
    const body = req.body || {}
    const { status, type, data } = body
    // NXGATE and others may send idTransaction as idTransaction, transaction_id, tx_id, or inside data
    const idTransaction = body.idTransaction || body.transactionId || body.transaction_id || body.tx_id || body?.data?.idTransaction

    // Respond immediately to avoid timeout
    res.status(200).json({ status: 'received' })

    if (!idTransaction) {
      console.error('Webhook PIX: idTransaction não fornecido. Body:', JSON.stringify(body))
      return
    }

    // Find transaction by idTransaction
    const transaction = await Transaction.findOne({ idTransaction })

    if (!transaction) {
      console.error(`Webhook PIX: Transação não encontrada: ${idTransaction}`)
      return
    }

    // Handle different webhook formats
    let paymentStatus = status
    let webhookData = data || req.body

    if (type === 'QR_CODE_COPY_AND_PASTE_PAID' || status === 'paid' || status === 'PAID') {
      paymentStatus = 'paid'
    } else if (status === 'failed' || status === 'FAILED' || status === 'ERROR') {
      paymentStatus = 'failed'
    }

    // Update transaction status
    await transaction.updateStatus(paymentStatus, webhookData)

    // If payment is confirmed, update user balance
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

        // Update referral qualification and VIP level
        await affiliateService.updateReferralQualification(user._id)
        await affiliateService.updateVipLevel(user._id)

        // Facebook Conversions API: first deposit = Purchase
        if (isFirstDeposit) {
          facebookService.sendFirstDeposit(user, depositAmount, 'BRL').catch(() => {})
        }
      }
    }

    console.log(`Webhook PIX: Transação ${idTransaction} atualizada para ${paymentStatus}`)
  } catch (error) {
    console.error('Webhook PIX Error:', error)
    // Still return 200 to avoid retries
    res.status(200).json({ status: 'received', error: error.message })
  }
})

// @route   POST /api/webhooks/pix-withdraw
// @desc    Webhook for PIX withdrawal confirmation
// @access  Public (but should be validated in production)
router.post('/pix-withdraw', async (req, res) => {
  logWebhook('pix-withdraw', req)
  try {
    const body = req.body || {}
    const { type, status, amount, fee } = body
    const idTransaction = body.idTransaction || body.transactionId || body.transaction_id || body.tx_id || body?.data?.idTransaction

    // Respond immediately to avoid timeout
    res.status(200).json({ status: 'received' })

    if (!idTransaction) {
      console.error('Webhook PIX Withdraw: idTransaction não fornecido. Body:', JSON.stringify(body))
      return
    }

    // Find transaction by idTransaction
    const transaction = await Transaction.findOne({ idTransaction })

    if (!transaction) {
      console.error(`Webhook PIX Withdraw: Transação não encontrada: ${idTransaction}`)
      return
    }

    // Determine status from webhook type
    let paymentStatus = 'failed'
    if (type === 'PIX_CASHOUT_SUCCESS' || status === 'SUCCESS') {
      paymentStatus = 'paid'
    } else if (type === 'PIX_CASHOUT_ERROR' || status === 'ERROR') {
      paymentStatus = 'failed'
    }

    // Update transaction
    transaction.status = paymentStatus
    transaction.webhookReceived = true
    transaction.webhookData = req.body

    if (fee !== undefined) {
      transaction.fee = parseFloat(fee)
      transaction.netAmount = transaction.amount - transaction.fee
    }

    if (paymentStatus === 'paid') {
      transaction.paidAt = new Date()
    } else if (paymentStatus === 'failed') {
      transaction.failedAt = new Date()
      
      // Refund balance if withdrawal failed
      const user = await User.findById(transaction.user)
      if (user) {
        user.balance += transaction.amount
        await user.save()
      }
    } else {
      transaction.failedAt = new Date()
      
      // Refund balance
      const user = await User.findById(transaction.user)
      if (user) {
        user.balance += transaction.amount
        await user.save()
      }
    }

    await transaction.save()

    // Update user withdrawal total if successful
    if (paymentStatus === 'paid') {
      const user = await User.findById(transaction.user)
      if (user) {
        user.totalWithdrawals += transaction.netAmount
        await user.save()
      }
    }

    console.log(`Webhook PIX Withdraw: Transação ${idTransaction} atualizada para ${paymentStatus}`)
  } catch (error) {
    console.error('Webhook PIX Withdraw Error:', error)
    // Still return 200 to avoid retries
    res.status(200).json({ status: 'received', error: error.message })
  }
})

export default router
