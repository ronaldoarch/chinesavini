import express from 'express'
import Transaction from '../models/Transaction.model.js'
import User from '../models/User.model.js'

const router = express.Router()

// Middleware to parse JSON (webhooks may not send proper headers)
router.use(express.json())
router.use(express.urlencoded({ extended: true }))

// @route   POST /api/webhooks/pix
// @desc    Webhook for PIX payment confirmation (deposit)
// @access  Public (but should be validated in production)
router.post('/pix', async (req, res) => {
  try {
    const { idTransaction, status, type, data } = req.body

    // Respond immediately to avoid timeout
    res.status(200).json({ status: 'received' })

    if (!idTransaction) {
      console.error('Webhook PIX: idTransaction não fornecido')
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
        user.balance += transaction.netAmount
        user.totalDeposits += transaction.netAmount
        await user.save()
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
  try {
    const { idTransaction, type, status, amount, fee } = req.body

    // Respond immediately to avoid timeout
    res.status(200).json({ status: 'received' })

    if (!idTransaction) {
      console.error('Webhook PIX Withdraw: idTransaction não fornecido')
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
