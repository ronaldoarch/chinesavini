import axios from 'axios'
import GatewayConfig from '../models/GatewayConfig.model.js'

const BASE_URL = 'https://painel.akadpay.com.br'
const DEPOSIT_PATH = '/api/wallet/deposit/payment'
const WITHDRAW_PATH = '/api/pixout'

function digitsOnly(s) {
  return String(s || '').replace(/\D/g, '')
}

/** Mapeia tipo de chave interno → tipo aceito pela AkadPay: cpf | email | telefone | aleatoria */
function mapPixKeyType(tipoChave) {
  const t = (tipoChave || 'CPF').toString().toUpperCase()
  const map = {
    CPF: 'cpf',
    CNPJ: 'cnpj',
    PHONE: 'telefone',
    EMAIL: 'email',
    RANDOM: 'aleatoria'
  }
  return map[t] || 'cpf'
}

/** Formata chave PIX conforme o tipo esperado pela AkadPay */
function formatPixKey(rawKey, pixKeyType) {
  const key = String(rawKey || '').trim()
  if (!key) return key
  if (pixKeyType === 'cpf' || pixKeyType === 'cnpj') return digitsOnly(key)
  if (pixKeyType === 'telefone') {
    // Padrão BACEN para chave PIX telefone: E.164 com +55
    // Ex: 94992961626 → +5594992961626
    const digits = digitsOnly(key)
    if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`
    if (digits.length === 11) return `+55${digits}`
    if (digits.length === 10) return `+55${digits}` // sem o 9 inicial (celulares antigos)
    return `+55${digits}`
  }
  if (pixKeyType === 'email') return key.toLowerCase()
  return key // aleatoria: envia como está
}

class AkadPayService {
  constructor() {
    this.token = null
    this.secret = null
    this.baseURL = BASE_URL
    this.webhookBaseUrl = process.env.WEBHOOK_BASE_URL || 'http://localhost:5000'
  }

  async getConfig() {
    try {
      const config = await GatewayConfig.getConfig()
      if (config && config.provider === 'akadpay' && config.isActive) {
        this.token = (config.clientId || '').trim()   // Token → clientId
        this.secret = (config.apiKey || '').trim()    // Secret → apiKey
        // Permite override da URL via admin, mas mantém base padrão
        this.baseURL = (config.apiUrl || BASE_URL).replace(/\/$/, '')
        this.webhookBaseUrl = config.webhookBaseUrl || this.webhookBaseUrl
      } else {
        this.token = null
        this.secret = null
      }
    } catch (error) {
      console.error('AkadPay: erro ao carregar config:', error)
      this.token = null
      this.secret = null
    }
  }

  async ensureConfig() {
    await this.getConfig()
    if (!this.token || !this.secret) {
      throw new Error('AkadPay não configurado. Informe o Token e o Secret no admin.')
    }
  }

  /**
   * Gera PIX para depósito (PIX-IN)
   * POST https://painel.akadpay.com.br/api/wallet/deposit/payment
   */
  async generatePix(data) {
    try {
      await this.ensureConfig()

      const document = digitsOnly(data.documento_pagador || '') || '00000000000'
      const phoneRaw = digitsOnly(data.customerPhone || '')
      const phone = phoneRaw.startsWith('55') && phoneRaw.length > 11
        ? phoneRaw.slice(2, 13)
        : phoneRaw.slice(0, 11) || '11900000000'

      const webhookBase = this.webhookBaseUrl.replace(/\/$/, '')
      const postback = `${webhookBase}/api/webhooks/akadpay`

      const payload = {
        token: this.token,
        secret: this.secret,
        amount: parseFloat(data.valor),
        debtor_name: (data.nome_pagador || 'Pagador').trim().substring(0, 100),
        email: data.customerEmail || `${(data.nome_pagador || 'user').replace(/\s+/g, '_').toLowerCase()}@deposito.local`,
        debtor_document_number: document,
        phone,
        method_pay: 'pix',
        postback
      }

      if (process.env.NODE_ENV === 'production') {
        console.log('AKADPAY generatePix:', { amount: payload.amount, debtor_name: payload.debtor_name, docLen: document.length })
      }

      const response = await axios.post(`${this.baseURL}${DEPOSIT_PATH}`, payload, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        timeout: 30000,
        responseType: 'json'
      })

      const res = response.data || {}
      const idTransaction = res.idTransaction || res.id || res.transaction_id
      const qrCode = res.qrcode || res.qr_code || res.pix_copy_paste || res.copy_paste
      const qrImage = res.qr_code_image_url || res.qrCodeBase64 || res.qr_code_base64

      return {
        success: true,
        data: {
          key: qrCode,
          paymentCode: qrCode,
          qrCode,
          pixCopyPaste: qrCode,
          paymentCodeBase64: qrImage,
          qrCodeBase64: qrImage,
          qrCodeImage: qrImage,
          idTransaction,
          transactionId: idTransaction,
          tag: idTransaction
        }
      }
    } catch (error) {
      const errBody = error.response?.data || {}
      const status = error.response?.status
      console.error('AKADPAY Generate PIX Error:', JSON.stringify(errBody), '| status:', status, '| msg:', error.message)
      // AkadPay usa HTTP 401 para erros de negócio (valor mínimo, etc), não só para auth
      let message = errBody?.message || errBody?.error || error.message || 'Erro ao gerar PIX'
      if (status === 422 && typeof errBody === 'object') {
        const fields = Object.values(errBody).flat()
        if (fields.length) message = fields.join(', ')
      }
      return { success: false, error: errBody, message }
    }
  }

  /**
   * Saque via PIX (PIX-OUT)
   * POST https://painel.akadpay.com.br/api/pixout
   */
  async withdrawPix(data) {
    try {
      await this.ensureConfig()

      const pixKeyType = mapPixKeyType(data.tipo_chave)
      const pixKey = formatPixKey(data.chave_pix, pixKeyType)

      const webhookBase = this.webhookBaseUrl.replace(/\/$/, '')
      const baasPostbackUrl = `${webhookBase}/api/webhooks/akadpay`

      const payload = {
        token: this.token,
        secret: this.secret,
        amount: parseFloat(data.valor),
        pixKey,
        pixKeyType,
        baasPostbackUrl
      }

      if (process.env.NODE_ENV === 'production') {
        console.log('AKADPAY withdrawPix:', { amount: payload.amount, pixKeyType })
      }

      const response = await axios.post(`${this.baseURL}${WITHDRAW_PATH}`, payload, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        timeout: 30000,
        responseType: 'json'
      })

      const res = response.data || {}
      const idTransaction = res.id || res.idTransaction || res.transaction_id || data.externalId

      return {
        success: true,
        data: {
          idTransaction,
          transactionId: idTransaction,
          tag: idTransaction
        }
      }
    } catch (error) {
      const errBody = error.response?.data || {}
      const status = error.response?.status
      console.error('AKADPAY Withdraw PIX Error:', JSON.stringify(errBody), '| status:', status)
      // AkadPay usa HTTP 401 para erros de negócio (saldo insuficiente, valor mínimo, etc)
      // e HTTP 429 para rate limiting
      let message = errBody?.message || errBody?.error || error.message || 'Erro ao processar saque'
      if (status === 429) message = 'Muitas requisições à AkadPay. Aguarde alguns segundos e tente novamente.'
      else if (status === 422 && typeof errBody === 'object') {
        const fields = Object.values(errBody).flat()
        if (fields.length) message = fields.join(', ')
      }
      return { success: false, error: errBody, message }
    }
  }
}

export default new AkadPayService()
