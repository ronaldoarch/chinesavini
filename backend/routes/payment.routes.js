import express from 'express'
import { body, validationResult } from 'express-validator'
import { protect } from '../middleware/auth.middleware.js'
import Transaction from '../models/Transaction.model.js'
import User from '../models/User.model.js'
import BonusConfig from '../models/BonusConfig.model.js'
import GatewayConfig from '../models/GatewayConfig.model.js'
import { getGatewayService } from '../services/gateway.service.js'
import { computeWithdrawableBalance } from '../utils/rollover.util.js'
import {
  getGatewayPixOutFeeBrl,
  getValorForWithdrawGatewayCall
} from '../utils/withdrawFee.util.js'

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
      .notEmpty()
      .withMessage('CPF é obrigatório para gerar o PIX')
      .custom((val) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(val) || /^\d{11}$/.test(val))
      .withMessage('CPF inválido (informe 11 dígitos ou no formato 000.000.000-00)')
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
      // Normaliza CPF: aceita 11 dígitos ou formato 000.000.000-00
      const cpfRaw = typeof cpf === 'string' ? cpf : ''
      const cpfDigits = cpfRaw.replace(/\D/g, '')
      if (cpfDigits.length === 11) {
        cpf = `${cpfDigits.slice(0, 3)}.${cpfDigits.slice(3, 6)}.${cpfDigits.slice(6, 9)}-${cpfDigits.slice(9)}`
      } else {
        cpf = cpfRaw
      }
      const user = req.user

      const gatewayCfg = await GatewayConfig.getConfig()
      const gwProvider = gatewayCfg?.provider?.toLowerCase() || ''
      const webhookBase = await getWebhookBaseUrl()
      const webhookPath = gwProvider === 'sarrixpay' ? '/api/webhooks/sarrixpay' : '/api/webhooks/pix'
      const webhookUrl = `${webhookBase}${webhookPath}`

      // Create transaction record
      const transaction = await Transaction.create({
        user: user._id,
        type: 'deposit',
        status: 'pending',
        amount: parseFloat(amount),
        netAmount: parseFloat(amount),
        payerName: user.username,
        payerDocument: cpfDigits,
        webhookUrl
      })

      // Generate PIX via gateway configurado (GATEBOX, NxGate, Escale Cyber ou SarrixPay)
      const gatewayService = await getGatewayService()
      const pixResult = await gatewayService.generatePix({
        nome_pagador: user.username,
        documento_pagador: cpf,
        valor: amount,
        webhook: transaction.webhookUrl,
        externalId: transaction._id.toString(),
        customerPhone: user.phone,
        customerEmail: user.email || `${user.username}@deposito.local`
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
      // NxGate webhook envia data.tag. Salvar todos os IDs possíveis para lookup (incl. nosso externalId/magic_id).
      const ids = [
        pixData?.idTransaction, pixData?.tag, pixData?.cashInRequestKey, pixData?.tx_id, pixData?.transactionId, pixData?.externalId,
        raw?.idTransaction, raw?.tag, raw?.cashInRequestKey, raw?.tx_id, raw?.transactionId,
        transaction._id.toString()
      ].filter(Boolean)
      const uniqueIds = [...new Set(ids)]
      if (gwProvider === 'sarrixpay') {
        uniqueIds.push(`deposit-${transaction._id.toString()}`)
      }
      transaction.idTransaction = pixData?.idTransaction || pixData?.tag || pixData?.transactionId || pixData?.tx_id || raw?.idTransaction || raw?.tag || raw?.transactionId || raw?.tx_id || pixData?.externalId || transaction._id.toString()
      transaction.gatewayTxId = pixData?.cashInRequestKey || raw?.cashInRequestKey || pixData?.tx_id || raw?.tx_id || transaction.idTransaction
      transaction.gatewayIds = uniqueIds.length ? [...new Set(uniqueIds)] : undefined

      // GATEBOX retorna o código PIX em data.key; outros gateways usam qrCode, pixCopyPaste, etc.
      const copyPaste =
        raw?.key || pixData?.key ||
        pixData?.qrCode || pixData?.pixCopyPaste || pixData?.copyPaste ||
        raw?.qrCode || raw?.pixCopyPaste || raw?.copyPaste ||
        raw?.pix_copy_and_paste || raw?.pixCopyPaste || raw?.copy_paste || raw?.qr_code || raw?.qrcode ||
        raw?.codigo_pix || raw?.codigo || raw?.pix_copia_cola || raw?.brcode || raw?.br_code || pixData?.br_code || raw?.emv || raw?.payload ||
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
        console.warn('Gateway deposit success but no PIX code found. Raw response:', JSON.stringify(pixData, null, 2))
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
        const digits = String(value || '').replace(/\D/g, '')
        if (digits.length !== 11) {
          throw new Error('CPF do titular: informe 11 dígitos (o CPF do dono da chave PIX de saque).')
        }
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
      const bonusCfg = await BonusConfig.getConfig()
      const requestedAmount = parseFloat(amount)
      const pixOutFeeBrl = getGatewayPixOutFeeBrl()
      const valorParaGateway = getValorForWithdrawGatewayCall(requestedAmount)

      // Limite de saque não se aplica a afiliados com 50% de comissão
      const isAffiliate50Percent = (user.affiliateDepositBonusPercent || 0) >= 50
      if (!isAffiliate50Percent) {
        const minWithdraw = bonusCfg.minWithdraw ?? 20
        const maxWithdraw = bonusCfg.maxWithdraw ?? 5000
        const amountNum = requestedAmount
        if (amountNum < minWithdraw || amountNum > maxWithdraw) {
          return res.status(400).json({
            success: false,
            message: `Valor deve estar entre R$ ${minWithdraw.toFixed(2)} e R$ ${maxWithdraw.toFixed(2)}`
          })
        }
      }

      const withdrawable = computeWithdrawableBalance(user, bonusCfg)
      const wrLeft = Math.max(0, user.wageringRequirement || 0)
      if (requestedAmount > withdrawable) {
        const rolloverMsg =
          bonusCfg.rolloverEnabled === true && wrLeft > 0
            ? `Complete o rollover: faltam R$ ${wrLeft.toFixed(2)} em apostas para liberar saques.`
            : null
        return res.status(400).json({
          success: false,
          message:
            rolloverMsg ||
            (withdrawable <= 0
              ? 'Saldo não disponível para saque no momento.'
              : `Saldo disponível para saque: R$ ${withdrawable.toFixed(2)}.`)
        })
      }
      if (user.balance < requestedAmount) {
        return res.status(400).json({
          success: false,
          message: 'Saldo insuficiente'
        })
      }

      const webhookBase = await getWebhookBaseUrl()
      const webhookUrl = `${webhookBase}/api/webhooks/pix-withdraw`

      // Create transaction record (amount/netAmount = o que o usuário pediu e deve receber na conta PIX; fee = custo PSP no merchant)
      const transaction = await Transaction.create({
        user: user._id,
        type: 'withdraw',
        status: 'processing',
        amount: requestedAmount,
        fee: pixOutFeeBrl,
        netAmount: requestedAmount,
        pixKey: pixKey,
        pixKeyType: pixKeyType,
        webhookUrl
      })
      // Garantir idTransaction para o webhook encontrar pelo externalId (mesmo se a API falhar)
      transaction.idTransaction = transaction._id.toString()
      await transaction.save()

      // Process withdrawal via gateway configurado (GATEBOX ou NxGate)
      const documentoFormatted = String(cpf).replace(/\D/g, '')
      const gatewayService = await getGatewayService()
      const withdrawResult = await gatewayService.withdrawPix({
        valor: valorParaGateway,
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

      // Debita apenas o valor solicitado pelo usuário (a taxa PSP sai da conta merchant no gateway)
      user.balance -= requestedAmount
      await user.save()

      // Update transaction with withdrawal data (NxGate webhook usa idTransaction/tag)
      const withdrawData = withdrawResult.data
      const ids = [
        withdrawData.transactionId, withdrawData.idTransaction, withdrawData.internalreference, withdrawData.internalReference,
        withdrawData.tag, withdrawData.transaction_id, withdrawData.externalId,
        transaction._id.toString()
      ].filter(Boolean)
      if ((await GatewayConfig.getConfig()).provider?.toLowerCase() === 'sarrixpay') {
        ids.push(`withdraw-${transaction._id.toString()}`)
      }
      transaction.idTransaction = withdrawData.idTransaction || withdrawData.tag || withdrawData.internalreference || withdrawData.internalReference || withdrawData.transactionId || withdrawData.externalId || withdrawData.transaction_id || transaction._id.toString()
      transaction.gatewayTxId = withdrawData.internalreference || withdrawData.internalReference || withdrawData.idTransaction || withdrawData.tag
      transaction.gatewayIds = [...new Set(ids.filter(Boolean))]
      transaction.balanceDeducted = true
      await transaction.save()

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
