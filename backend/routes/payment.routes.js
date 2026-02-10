import express from 'express'
import { body, validationResult } from 'express-validator'
import { protect } from '../middleware/auth.middleware.js'
import Transaction from '../models/Transaction.model.js'
import User from '../models/User.model.js'
import BonusConfig from '../models/BonusConfig.model.js'
import GatewayConfig from '../models/GatewayConfig.model.js'
import gateboxService from '../services/gatebox.service.js'

const router = express.Router()

async function getWebhookBaseUrl() {
  try {
    const config = await GatewayConfig.getConfig()
    if (config?.webhookBaseUrl?.trim()) {
      return config.webhookBaseUrl.replace(/\/$/, '')
    }
  } catch (_) {}
  return (process.env.WEBHOOK_BASE_URL || 'http://localhost:5000').replace(/\/$/, '')
}

// @route   POST /api/payments/deposit
// @desc    Create a PIX deposit
// @access  Private
router.post(
  '/deposit',
  protect,
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Valor inválido'),
    body('cpf')
      .optional()
      .custom((val) => !val || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(val) || /^\d{11}$/.test(val))
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

      const depositConfig = await BonusConfig.getConfig()
      const minDeposit = depositConfig.minDeposit ?? 10
      const maxDeposit = depositConfig.maxDeposit ?? 10000
      const amountNum = parseFloat(req.body.amount)
      if (amountNum < minDeposit || amountNum > maxDeposit) {
        return res.status(400).json({
          success: false,
          message: `Valor deve estar entre R$ ${minDeposit.toFixed(2)} e R$ ${maxDeposit.toFixed(2)}`
        })
      }

      let { amount, cpf } = req.body
      // Normalize CPF: accept 11 digits or formatted 000.000.000-00
      if (cpf && typeof cpf === 'string') {
        const digits = cpf.replace(/\D/g, '')
        if (digits.length === 11) {
          cpf = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
        }
      }
      const user = req.user

      const webhookBase = await getWebhookBaseUrl()
      const webhookUrl = `${webhookBase}/api/webhooks/pix`

      // Create transaction record
      const transaction = await Transaction.create({
        user: user._id,
        type: 'deposit',
        status: 'pending',
        amount: parseFloat(amount),
        netAmount: parseFloat(amount),
        payerName: user.username,
        payerDocument: cpf.replace(/\D/g, ''),
        webhookUrl
      })

      // Generate PIX via GATEBOX
      const pixResult = await gateboxService.generatePix({
        nome_pagador: user.username,
        documento_pagador: cpf,
        valor: amount,
        webhook: transaction.webhookUrl,
        externalId: transaction._id.toString()
      })

      if (!pixResult.success) {
        await transaction.updateStatus('failed')
        return res.status(400).json({
          success: false,
          message: pixResult.message || 'Erro ao gerar PIX'
        })
      }

      // Update transaction with PIX data (support multiple gateway response formats)
      const pixData = pixResult.data
      const raw = pixData?.data || pixData || {}
      // Gatebox returns transactionId, but we use externalId (our transaction ID) for webhook matching
      transaction.idTransaction = pixData?.transactionId || pixData?.idTransaction || pixData?.externalId || pixData?.tx_id || raw?.transactionId || raw?.idTransaction || raw?.externalId || raw?.tx_id || transaction._id.toString()

      // GATEBOX retorna o código PIX em data.key; outros gateways usam qrCode, pixCopyPaste, etc.
      const copyPaste =
        raw?.key || pixData?.key ||
        pixData?.qrCode || pixData?.pixCopyPaste || pixData?.copyPaste ||
        raw?.qrCode || raw?.pixCopyPaste || raw?.copyPaste ||
        raw?.pix_copy_and_paste || raw?.pixCopyPaste || raw?.copy_paste || raw?.qr_code || raw?.qrcode ||
        raw?.codigo_pix || raw?.codigo || raw?.pix_copia_cola || raw?.brcode || raw?.emv || raw?.payload ||
        pixData?.paymentCode || raw?.paymentCode
      const qrImage =
        pixData?.qrCodeImage || pixData?.qrCodeBase64 ||
        raw?.qrCodeImage || raw?.qrCodeBase64 ||
        raw?.base_64_image_url || raw?.base_64_image || raw?.qr_code_image ||
        raw?.imagem_qr || raw?.qrcode_base64 || pixData?.paymentCodeBase64 || raw?.paymentCodeBase64
      // Gatebox envia timeout/expire em segundos
      const expireSeconds = raw?.expire ?? raw?.timeout ?? pixData?.expire ?? pixData?.timeout
      const expDate = pixData?.expiresAt || raw?.expiration_date || raw?.expiresAt || raw?.expires_at || raw?.expiracao ||
        (expireSeconds ? new Date(Date.now() + Number(expireSeconds) * 1000) : null)

      if (copyPaste) {
        transaction.pixCopyPaste = typeof copyPaste === 'string' ? copyPaste : (copyPaste?.valor || copyPaste?.code || String(copyPaste))
        transaction.qrCode = transaction.pixCopyPaste
      }
      if (qrImage) {
        transaction.qrCodeImage = typeof qrImage === 'string' ? qrImage : (qrImage?.url || qrImage?.data || String(qrImage))
      }
      if (expDate) {
        transaction.expiresAt = new Date(expDate)
      }
      // Default: expire in 30 minutes if gateway didn't send expiration
      if (!transaction.expiresAt) {
        transaction.expiresAt = new Date(Date.now() + 30 * 60 * 1000)
      }

      // If gateway didn't return PIX code, log raw response for debugging and fail
      if (!transaction.pixCopyPaste) {
        console.warn('GATEBOX deposit success but no PIX code found. Raw response:', JSON.stringify(pixData, null, 2))
        await transaction.updateStatus('failed')
        return res.status(502).json({
          success: false,
          message: 'Gateway não retornou o código PIX. Verifique as credenciais do gateway no admin ou tente novamente.'
        })
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
      .isFloat({ min: 1 })
      .withMessage('Valor inválido'),
    body('pixKey')
      .notEmpty()
      .withMessage('Chave PIX é obrigatória'),
    body('pixKeyType')
      .isIn(['CPF', 'CNPJ', 'PHONE', 'EMAIL', 'RANDOM'])
      .withMessage('Tipo de chave PIX inválido'),
    // CPF do recebedor (titular da chave PIX) é obrigatório: Gatebox valida correspondência com a chave
    body('cpf')
      .notEmpty()
      .withMessage('CPF do titular da chave PIX é obrigatório para saque')
      .custom((value) => {
        const digits = (value || '').replace(/\D/g, '')
        if (digits.length !== 11) throw new Error('CPF inválido')
        return true
      })
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

      const { amount, pixKey, pixKeyType, cpf, holderName } = req.body
      const user = req.user

      // Validar limites de saque configurados
      const withdrawConfig = await BonusConfig.getConfig()
      const minWithdraw = withdrawConfig.minWithdraw ?? 20
      const maxWithdraw = withdrawConfig.maxWithdraw ?? 5000
      const amountNum = parseFloat(amount)
      if (amountNum < minWithdraw || amountNum > maxWithdraw) {
        return res.status(400).json({
          success: false,
          message: `Valor deve estar entre R$ ${minWithdraw.toFixed(2)} e R$ ${maxWithdraw.toFixed(2)}`
        })
      }

      // Bônus não é sacável - apenas para jogar
      const withdrawable = Math.max(0, (user.balance || 0) - (user.bonusBalance || 0))
      if (parseFloat(amount) > withdrawable) {
        return res.status(400).json({
          success: false,
          message: withdrawable <= 0
            ? 'Seu saldo é de bônus e não pode ser sacado. Use nos jogos!'
            : `Saldo disponível para saque: R$ ${withdrawable.toFixed(2)}. O restante é bônus para jogar.`
        })
      }
      if (user.balance < parseFloat(amount)) {
        return res.status(400).json({
          success: false,
          message: 'Saldo insuficiente'
        })
      }

      const webhookBase = await getWebhookBaseUrl()
      const webhookUrl = `${webhookBase}/api/webhooks/pix-withdraw`

      // Create transaction record
      const transaction = await Transaction.create({
        user: user._id,
        type: 'withdraw',
        status: 'processing',
        amount: parseFloat(amount),
        netAmount: parseFloat(amount), // Will be updated with fee after webhook
        pixKey: pixKey,
        pixKeyType: pixKeyType,
        webhookUrl
      })
      // Garantir idTransaction para o webhook encontrar pelo externalId (mesmo se a API falhar)
      transaction.idTransaction = transaction._id.toString()
      await transaction.save()

      // Process withdrawal via GATEBOX — documentNumber = CPF do recebedor (titular da chave). Gatebox valida correspondência.
      const documentoFormatted = String(cpf).replace(/\D/g, '')

      const withdrawResult = await gateboxService.withdrawPix({
        valor: amount,
        chave_pix: pixKey,
        tipo_chave: pixKeyType,
        documento: documentoFormatted,
        nome_recebedor: holderName || 'Recebedor',
        webhook: transaction.webhookUrl,
        externalId: transaction._id.toString()
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
      // Gatebox returns transactionId, but we use externalId (our transaction ID) for webhook matching
      transaction.idTransaction = withdrawData.transactionId || withdrawData.idTransaction || withdrawData.externalId || withdrawData.transaction_id || transaction._id.toString()
      await transaction.save()

      // Deduct balance immediately (will be reversed if withdrawal fails)
      user.balance -= parseFloat(amount)
      user.bonusBalance = Math.min(user.bonusBalance || 0, user.balance)
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
