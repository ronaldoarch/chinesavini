import express from 'express'
import { body, validationResult } from 'express-validator'
import { protect } from '../middleware/auth.middleware.js'
import Transaction from '../models/Transaction.model.js'
import User from '../models/User.model.js'
import nxgateService from '../services/nxgate.service.js'

const router = express.Router()

// @route   POST /api/payments/deposit
// @desc    Create a PIX deposit
// @access  Private
router.post(
  '/deposit',
  protect,
  [
    body('amount')
      .isFloat({ min: 10, max: 10000 })
      .withMessage('Valor deve estar entre R$ 10,00 e R$ 10.000,00'),
    body('cpf')
      .matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)
      .withMessage('CPF inválido')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array()
        })
      }

      const { amount, cpf } = req.body
      const user = req.user

      // Create transaction record
      const transaction = await Transaction.create({
        user: user._id,
        type: 'deposit',
        status: 'pending',
        amount: parseFloat(amount),
        netAmount: parseFloat(amount),
        payerName: user.username,
        payerDocument: cpf.replace(/\D/g, ''),
        webhookUrl: `${process.env.WEBHOOK_BASE_URL || 'http://localhost:5000'}/api/webhooks/pix`
      })

      // Generate PIX via NXGATE
      const pixResult = await nxgateService.generatePix({
        nome_pagador: user.username,
        documento_pagador: cpf,
        valor: amount,
        webhook: transaction.webhookUrl
      })

      if (!pixResult.success) {
        await transaction.updateStatus('failed')
        return res.status(400).json({
          success: false,
          message: pixResult.message || 'Erro ao gerar PIX'
        })
      }

      // Update transaction with PIX data
      const pixData = pixResult.data
      transaction.idTransaction = pixData.idTransaction || pixData.tx_id
      
      // Handle different response formats
      if (pixData.data) {
        // Full response format
        transaction.qrCode = pixData.data.pix_copy_and_paste
        transaction.qrCodeImage = pixData.data.base_64_image_url || pixData.data.base_64_image
        transaction.pixCopyPaste = pixData.data.pix_copy_and_paste
        
        // Set expiration date
        if (pixData.data.expiration_date) {
          transaction.expiresAt = new Date(pixData.data.expiration_date)
        }
      } else if (pixData.qrCode) {
        // Simple response format
        transaction.qrCode = pixData.qrCode
        transaction.qrCodeImage = pixData.qrCodeImage
        transaction.pixCopyPaste = pixData.qrCode
      }

      await transaction.save()

      res.json({
        success: true,
        message: 'PIX gerado com sucesso',
        data: {
          transaction: {
            id: transaction._id,
            idTransaction: transaction.idTransaction,
            amount: transaction.amount,
            status: transaction.status,
            qrCode: transaction.qrCode,
            qrCodeImage: transaction.qrCodeImage,
            pixCopyPaste: transaction.pixCopyPaste,
            expiresAt: transaction.expiresAt
          }
        }
      })
    } catch (error) {
      console.error('Deposit error:', error)
      res.status(500).json({
        success: false,
        message: 'Erro ao criar depósito',
        error: error.message
      })
    }
  }
)

// @route   POST /api/payments/withdraw
// @desc    Create a PIX withdrawal
// @access  Private
router.post(
  '/withdraw',
  protect,
  [
    body('amount')
      .isFloat({ min: 10 })
      .withMessage('Valor mínimo de saque é R$ 10,00'),
    body('pixKey')
      .notEmpty()
      .withMessage('Chave PIX é obrigatória'),
    body('pixKeyType')
      .isIn(['CPF', 'CNPJ', 'PHONE', 'EMAIL', 'RANDOM'])
      .withMessage('Tipo de chave PIX inválido'),
    body('cpf')
      .matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)
      .withMessage('CPF inválido')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array()
        })
      }

      const { amount, pixKey, pixKeyType, cpf } = req.body
      const user = req.user

      // Check if user has sufficient balance
      if (user.balance < parseFloat(amount)) {
        return res.status(400).json({
          success: false,
          message: 'Saldo insuficiente'
        })
      }

      // Create transaction record
      const transaction = await Transaction.create({
        user: user._id,
        type: 'withdraw',
        status: 'processing',
        amount: parseFloat(amount),
        netAmount: parseFloat(amount), // Will be updated with fee after webhook
        pixKey: pixKey,
        pixKeyType: pixKeyType,
        webhookUrl: `${process.env.WEBHOOK_BASE_URL || 'http://localhost:5000'}/api/webhooks/pix-withdraw`
      })

      // Process withdrawal via NXGATE
      const withdrawResult = await nxgateService.withdrawPix({
        valor: amount,
        chave_pix: pixKey,
        tipo_chave: pixKeyType,
        documento: cpf.replace(/\D/g, ''),
        webhook: transaction.webhookUrl
      })

      if (!withdrawResult.success) {
        await transaction.updateStatus('failed')
        return res.status(400).json({
          success: false,
          message: withdrawResult.message || 'Erro ao processar saque'
        })
      }

      // Update transaction with withdrawal data
      const withdrawData = withdrawResult.data
      transaction.idTransaction = withdrawData.idTransaction || withdrawData.transaction_id
      await transaction.save()

      // Deduct balance immediately (will be reversed if withdrawal fails)
      user.balance -= parseFloat(amount)
      await user.save()

      res.json({
        success: true,
        message: 'Saque solicitado com sucesso',
        data: {
          transaction: {
            id: transaction._id,
            idTransaction: transaction.idTransaction,
            amount: transaction.amount,
            status: transaction.status
          }
        }
      })
    } catch (error) {
      console.error('Withdraw error:', error)
      res.status(500).json({
        success: false,
        message: 'Erro ao processar saque',
        error: error.message
      })
    }
  }
)

// @route   GET /api/payments/transactions
// @desc    Get user transactions
// @access  Private
router.get('/transactions', protect, async (req, res) => {
  try {
    const { type, status, limit = 50, page = 1 } = req.query
    const query = { user: req.user._id }

    if (type) {
      query.type = type
    }
    if (status) {
      query.status = status
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))

    const total = await Transaction.countDocuments(query)

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    })
  } catch (error) {
    console.error('Get transactions error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar transações',
      error: error.message
    })
  }
})

// @route   GET /api/payments/transaction/:id
// @desc    Get single transaction
// @access  Private
router.get('/transaction/:id', protect, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id
    })

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transação não encontrada'
      })
    }

    res.json({
      success: true,
      data: { transaction }
    })
  } catch (error) {
    console.error('Get transaction error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar transação',
      error: error.message
    })
  }
})

export default router
