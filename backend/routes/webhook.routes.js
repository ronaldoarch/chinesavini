import express from 'express'
import Transaction from '../models/Transaction.model.js'
import User from '../models/User.model.js'
import BonusConfig from '../models/BonusConfig.model.js'
import WebhookLog from '../models/WebhookLog.model.js'
import AffiliateDeposit from '../models/AffiliateDeposit.model.js'
import GameTxnLog from '../models/GameTxnLog.model.js'
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
 * Process affiliate commissions (CPA and RevShare)
 */
async function processAffiliateCommissions(referredUser, transaction, depositAmount, isFirstDeposit) {
  try {
    const affiliate = await User.findById(referredUser.referredBy)
    if (!affiliate) return

    // Get affiliate configuration
    const cpa = affiliate.affiliateCpa || 0
    const revShare = affiliate.affiliateRevShare || 0
    const skipDeposits = affiliate.affiliateSkipDeposits || 0
    const totalDepositsCycle = affiliate.affiliateTotalDepositsCycle || 0

    // Count existing deposits for this referred user
    const existingDeposits = await AffiliateDeposit.countDocuments({
      affiliate: affiliate._id,
      referredUser: referredUser._id
    })

    // Calculate cycle position
    let cyclePosition = 0
    let isSkipped = false
    
    if (totalDepositsCycle > 0) {
      // Calculate position in current cycle (1-based)
      cyclePosition = (existingDeposits % totalDepositsCycle) + 1
      
      // Determine if this deposit should be skipped
      // Skip the last 'skipDeposits' positions in each cycle
      // Example: skip 1 of 2 means skip position 2, keep position 1
      // Example: skip 5 of 10 means skip positions 6-10, keep positions 1-5
      const skipStart = totalDepositsCycle - skipDeposits + 1
      isSkipped = cyclePosition >= skipStart && cyclePosition <= totalDepositsCycle
    }

    // Create affiliate deposit record
    const affiliateDeposit = await AffiliateDeposit.create({
      affiliate: affiliate._id,
      referredUser: referredUser._id,
      transaction: transaction._id,
      depositAmount,
      isFirstDeposit,
      cyclePosition,
      isSkipped
    })

    let totalCommission = 0

    // Process CPA (only on first deposit)
    if (isFirstDeposit && cpa > 0) {
      affiliateDeposit.cpaPaid = true
      affiliateDeposit.cpaAmount = cpa
      totalCommission += cpa
      await affiliateDeposit.save()
    }

    // Process RevShare (only if not skipped)
    if (!isSkipped && revShare > 0) {
      // Get the last processed deposit to calculate incremental profit
      const lastProcessedDeposit = await AffiliateDeposit.findOne({
        affiliate: affiliate._id,
        referredUser: referredUser._id,
        revShareCalculated: true
      }).sort({ createdAt: -1 })

      // Calculate platform profit for this user since last processed deposit
      // Profit = Deposits - Withdrawals - Net Game Wins
      const depositsQuery = {
        user: referredUser._id,
        type: 'deposit',
        status: 'paid'
      }
      if (lastProcessedDeposit?.transaction) {
        depositsQuery.createdAt = { $gte: lastProcessedDeposit.createdAt }
      }

      const deposits = await Transaction.aggregate([
        { $match: depositsQuery },
        {
          $group: {
            _id: null,
            total: { $sum: '$netAmount' }
          }
        }
      ])

      const withdrawalsQuery = {
        user: referredUser._id,
        type: 'withdraw',
        status: 'paid'
      }
      if (lastProcessedDeposit?.transaction) {
        withdrawalsQuery.createdAt = { $gte: lastProcessedDeposit.createdAt }
      }

      const withdrawals = await Transaction.aggregate([
        { $match: withdrawalsQuery },
        {
          $group: {
            _id: null,
            total: { $sum: '$netAmount' }
          }
        }
      ])

      // Calculate net game wins since last processed deposit
      const gameResultsQuery = { user: referredUser._id }
      if (lastProcessedDeposit?.transaction) {
        gameResultsQuery.createdAt = { $gte: lastProcessedDeposit.createdAt }
      }

      const gameResults = await GameTxnLog.aggregate([
        { $match: gameResultsQuery },
        {
          $group: {
            _id: null,
            totalBets: { $sum: '$betCents' },
            totalWins: { $sum: '$winCents' }
          }
        }
      ])

      const incrementalDeposits = deposits[0]?.total || 0
      const incrementalWithdrawals = withdrawals[0]?.total || 0
      const incrementalBets = (gameResults[0]?.totalBets || 0) / 100
      const incrementalWins = (gameResults[0]?.totalWins || 0) / 100
      const incrementalNetGameWins = incrementalWins - incrementalBets

      // Platform profit = Deposits - Withdrawals - Net Game Wins
      // If incrementalNetGameWins is positive, user won, so subtract from profit
      // If incrementalNetGameWins is negative, user lost, so add to profit
      const incrementalProfit = incrementalDeposits - incrementalWithdrawals - incrementalNetGameWins

      // Calculate RevShare only on positive profit
      if (incrementalProfit > 0) {
        const revShareAmount = Math.round((incrementalProfit * revShare / 100) * 100) / 100
        affiliateDeposit.revShareCalculated = true
        affiliateDeposit.revShareAmount = revShareAmount
        totalCommission += revShareAmount
        await affiliateDeposit.save()
      }
    }

    // Update affiliate balance
    if (totalCommission > 0) {
      affiliate.affiliateBalance = (affiliate.affiliateBalance || 0) + totalCommission
      await affiliate.save()
    }
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
    // NXGATE and others may send idTransaction in various formats
    const idTransaction =
      body.idTransaction || body.transactionId || body.transaction_id || body.tx_id || body.id ||
      body?.data?.idTransaction || body?.data?.id || body?.data?.tx_id ||
      body?.data?.transaction_id

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

    // Handle different webhook formats (NXGATE, XGate, etc.)
    const rawStatus = (status ?? body.status ?? data?.status ?? '').toString().toUpperCase()
    const rawType = (type ?? body.type ?? data?.type ?? '').toString().toUpperCase()
    let paymentStatus = 'pending'
    let webhookData = data || req.body

    if (
      rawType.includes('PAID') ||
      rawType === 'QR_CODE_COPY_AND_PASTE_PAID' ||
      rawStatus === 'PAID' ||
      rawStatus === 'PAYED' ||
      rawStatus === 'CONFIRMED' ||
      rawStatus === 'PAYMENT_CONFIRMED' ||
      rawStatus === 'SUCCESS' ||
      rawStatus === 'COMPLETED' ||
      rawStatus === 'APPROVED'
    ) {
      paymentStatus = 'paid'
    } else if (rawStatus === 'FAILED' || rawStatus === 'ERROR' || rawStatus === 'REJECTED' || rawStatus === 'REFUSED') {
      paymentStatus = 'failed'
    } else if (rawStatus || rawType) {
      console.warn(`Webhook PIX: status/type não reconhecido. status="${rawStatus}" type="${rawType}". Body:`, JSON.stringify(body).slice(0, 500))
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

        // Process affiliate commissions (CPA and RevShare)
        if (user.referredBy) {
          await processAffiliateCommissions(user, transaction, depositAmount, isFirstDeposit)
        }

        // Facebook Conversions API: first deposit = Purchase
        if (isFirstDeposit) {
          facebookService.sendFirstDeposit(user, depositAmount, 'BRL').catch(() => {})
        }
      }
    }

    console.log(`Webhook PIX: Transação ${idTransaction} atualizada para ${paymentStatus}`)
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
    const { type, status, amount, fee } = body
    const idTransaction =
      body.idTransaction || body.transactionId || body.transaction_id || body.tx_id || body.id ||
      body?.data?.idTransaction || body?.data?.id || body?.data?.tx_id

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
    // Conforme documentação: PIX_CASHOUT_SUCCESS = sucesso, PIX_CASHOUT_ERROR = falha
    // Também verificar campo 'worked' e 'status'
    let paymentStatus = 'failed'
    const worked = body.worked === true || body.worked === 'true'
    const statusUpper = (status || '').toString().toUpperCase()
    const typeUpper = (type || '').toString().toUpperCase()
    
    if (
      typeUpper === 'PIX_CASHOUT_SUCCESS' ||
      statusUpper === 'SUCCESS' ||
      (worked && statusUpper !== 'ERROR')
    ) {
      paymentStatus = 'paid'
    } else if (
      typeUpper === 'PIX_CASHOUT_ERROR' ||
      statusUpper === 'ERROR' ||
      (!worked && statusUpper !== 'SUCCESS')
    ) {
      paymentStatus = 'failed'
    }

    // Update transaction
    transaction.status = paymentStatus
    transaction.webhookReceived = true
    transaction.webhookData = req.body

    // Atualizar taxa se fornecida
    if (fee !== undefined && fee !== null) {
      transaction.fee = parseFloat(fee) || 0
      transaction.netAmount = transaction.amount - transaction.fee
    }

    if (paymentStatus === 'paid') {
      transaction.paidAt = new Date(body.payment_date ? new Date(body.payment_date) : new Date())
      
      // Atualizar total de saques do usuário
      const user = await User.findById(transaction.user)
      if (user) {
        user.totalWithdrawals += transaction.netAmount || transaction.amount
        await user.save()
      }
    } else if (paymentStatus === 'failed') {
      transaction.failedAt = new Date()
      
      // Reembolsar saldo se o saque falhou
      const user = await User.findById(transaction.user)
      if (user) {
        user.balance += transaction.amount
        await user.save()
        console.log(`Webhook PIX Withdraw: Saldo reembolsado para usuário ${user._id} - R$ ${transaction.amount}`)
      }
    }

    await transaction.save()

    console.log(`Webhook PIX Withdraw: Transação ${idTransaction} atualizada para ${paymentStatus}`)
  } catch (error) {
    console.error('Webhook PIX Withdraw Error:', error)
    if (!res.headersSent) res.status(200).json({ status: 'received', error: error.message })
  }
})

export default router
