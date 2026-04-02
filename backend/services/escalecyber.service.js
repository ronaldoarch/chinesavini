import axios from 'axios'
import GatewayConfig from '../models/GatewayConfig.model.js'

const ESCALECYBER_BASE_URL = 'https://api.escalecyber.com/v1'
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || 'http://localhost:5000'

/**
 * Formata telefone para formato internacional (5511999999999)
 */
function formatPhoneInternational(phone) {
  if (!phone || typeof phone !== 'string') return '5511999999999'
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length >= 12) return digits
  if (digits.length === 11) return `55${digits}`
  if (digits.length === 13) return digits
  return '5511999999999'
}

/** Tipos aceitos pelo app (uppercase) → valores esperados pela API Escale (geralmente lowercase). */
function mapPixKeyTypeToEscale(tipoChave) {
  const t = (tipoChave || 'CPF').toString().toUpperCase()
  const map = {
    CPF: 'cpf',
    CNPJ: 'cnpj',
    PHONE: 'phone',
    EMAIL: 'email',
    RANDOM: 'evp'
  }
  return map[t] || 'cpf'
}

/**
 * Chave PIX telefone: DICT costuma exigir E.164 com "+" (ex: +5594992961626).
 * Só dígitos 55DDD... sem "+" costuma retornar "Invalid Pix Key" em várias APIs.
 */
function formatPixPhoneKeyForEscale(rawKey) {
  const digits = formatPhoneInternational(rawKey).replace(/\D/g, '')
  const br = digits.startsWith('55') ? digits : `55${digits}`
  return `+${br}`
}

/**
 * Normaliza valor da chave PIX para o mesmo padrão usado em generatePix (CPF/CNPJ formatados, telefone E.164).
 */
function formatPixKeyValueForEscale(rawKey, tipoApi) {
  const key = String(rawKey || '').trim()
  if (!key) return key
  if (tipoApi === 'email') return key.toLowerCase()
  if (tipoApi === 'evp') return key.replace(/\s/g, '').toLowerCase()
  if (tipoApi === 'phone') return formatPixPhoneKeyForEscale(key)
  if (tipoApi === 'cpf') {
    const d = key.replace(/\D/g, '')
    if (d.length !== 11) return d
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  }
  if (tipoApi === 'cnpj') {
    const d = key.replace(/\D/g, '')
    if (d.length !== 14) return d
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
  }
  return key
}

class EscaleCyberService {
  constructor() {
    this.apiKey = null
    this.baseURL = ESCALECYBER_BASE_URL
    this.webhookBaseUrl = WEBHOOK_BASE_URL
  }

  async getConfig() {
    try {
      const config = await GatewayConfig.getConfig()
      if (config && config.provider === 'escalecyber' && config.isActive) {
        this.apiKey = (config.apiKey || '').trim()
        this.baseURL = (config.apiUrl || ESCALECYBER_BASE_URL).replace(/\/$/, '')
        this.webhookBaseUrl = config.webhookBaseUrl || this.webhookBaseUrl
      } else {
        this.apiKey = null
      }
    } catch (error) {
      console.error('Error loading Escale Cyber config:', error)
      this.apiKey = null
    }
  }

  async ensureConfig() {
    if (!this.apiKey) await this.getConfig()
    if (!this.apiKey || this.apiKey.trim() === '') {
      throw new Error('Escale Cyber não configurado. Configure a API Key no admin.')
    }
  }

  _headers() {
    const key = (this.apiKey || '').trim()
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-API-Key': key
    }
  }

  /**
   * Gera um PIX para depósito (Cash-in)
   * POST /payments/transactions
   * @param {Object} data - Dados do pagamento
   * @param {string} data.nome_pagador - Nome do pagador
   * @param {string} data.documento_pagador - CPF/CNPJ do pagador
   * @param {string} data.customerEmail - Email do cliente (opcional)
   * @param {string} data.customerPhone - Telefone formato internacional (opcional)
   * @param {number} data.valor - Valor do pagamento
   * @param {string} data.webhook - URL do webhook
   * @param {string} data.externalId - ID externo para conciliação
   * @returns {Promise<Object>} Resposta da API
   */
  async generatePix(data) {
    try {
      await this.ensureConfig()

      const documentoRaw = (data.documento_pagador || '').replace(/\D/g, '')
      let documento = documentoRaw.length >= 11 ? documentoRaw : (await GatewayConfig.getConfig())?.defaultCpf?.replace(/\D/g, '') || documentoRaw
      if (!documento || documento.length < 11) documento = '00000000000'
      const docType = documento.length === 14 ? 'cnpj' : 'cpf'
      // Escale Cyber: exemplo na doc usa CPF formatado (179.539.020-44)
      const customerDocument = docType === 'cpf' && documento.length === 11
        ? `${documento.slice(0, 3)}.${documento.slice(3, 6)}.${documento.slice(6, 9)}-${documento.slice(9)}`
        : docType === 'cnpj' && documento.length === 14
          ? `${documento.slice(0, 2)}.${documento.slice(2, 5)}.${documento.slice(5, 8)}/${documento.slice(8, 12)}-${documento.slice(12)}`
          : documento
      // Escale Cyber exige email válido; .local pode ser rejeitado
      const customerEmail = data.customerEmail || `${(data.nome_pagador || 'user').replace(/\s/g, '_')}@example.com`
      const customerPhone = formatPhoneInternational(data.customerPhone)

      const payload = {
        amount: parseFloat(data.valor),
        customerName: (data.nome_pagador || 'Pagador').trim().substring(0, 100),
        customerDocument,
        customerDocumentType: docType,
        customerEmail: customerEmail.substring(0, 255),
        customerPhone,
        description: (data.externalId ? `Depósito ${data.externalId}` : 'Depósito PIX').substring(0, 255)
      }
      if (data.externalId) payload.metadata = { ...(data.metadata || {}), externalId: data.externalId }
      else if (data.metadata) payload.metadata = data.metadata

      if (process.env.NODE_ENV === 'production') {
        console.log('ESCALECYBER generatePix payload (sem doc completo):', { amount: payload.amount, customerName: payload.customerName, docLen: payload.customerDocument?.length, phone: payload.customerPhone?.length })
      }

      const response = await axios.post(
        `${this.baseURL}/payments/transactions`,
        payload,
        { headers: this._headers(), timeout: 30000 }
      )

      const res = response.data
      const d = res?.data || res
      const pix = d?.pix || {}
      const qrCode = pix?.qrCode || {}

      const copyPaste = qrCode?.emv || pix?.emv || d?.paymentCode || d?.qrCode
      const qrImage = qrCode?.image || pix?.image || d?.qrCodeBase64
      const txId = pix?.txid || d?.txid
      const idTransaction = d?.id || d?.external_id || d?.transactionId || data.externalId
      const expireDate = pix?.expirationDate ? new Date(pix.expirationDate * 1000) : null

      return {
        success: true,
        data: {
          key: copyPaste,
          paymentCode: copyPaste,
          qrCode: copyPaste,
          pixCopyPaste: copyPaste,
          paymentCodeBase64: qrImage,
          qrCodeBase64: qrImage,
          qrCodeImage: qrImage,
          idTransaction,
          transactionId: idTransaction,
          tag: idTransaction,
          externalId: d?.external_id,
          txid: txId,
          expire: pix?.expirationDate,
          expiresAt: expireDate
        }
      }
    } catch (error) {
      const errBody = error.response?.data || {}
      console.error('ESCALECYBER Generate PIX Error:', JSON.stringify(errBody))
      if (errBody?.errors || errBody?.details) {
        console.error('ESCALECYBER validation details:', JSON.stringify(errBody.errors || errBody.details))
      }
      if (errBody?.message && error.response?.status === 400) {
        console.error('ESCALECYBER 400 - payload summary:', { amount: data?.valor, docLen: (data?.documento_pagador || '').replace(/\D/g, '').length, phone: (data?.customerPhone || '').length })
      }
      const status = error.response?.status
      let message = error.response?.data?.message || error.message || 'Erro ao gerar PIX'
      if (status === 400) message = error.response?.data?.message || 'Requisição inválida'
      else if (status === 401) message = 'API Key inválida ou não autenticado'
      else if (status === 500) message = 'Erro interno do servidor. Tente novamente.'
      return {
        success: false,
        error: error.response?.data || error,
        message
      }
    }
  }

  /**
   * Cria um saque via PIX (Cash-out)
   * POST /payments/withdrawals
   * @param {Object} data - Dados do saque
   * @param {number} data.valor - Valor do saque
   * @param {string} data.chave_pix - Chave PIX do destinatário
   * @param {string} data.tipo_chave - Tipo da chave (CPF, CNPJ, PHONE, EMAIL, RANDOM)
   * @param {string} data.documento - CPF/CNPJ (opcional, Escale Cyber não usa no body)
   * @param {string} data.webhook - URL do webhook
   * @param {string} data.externalId - ID externo para conciliação
   * @returns {Promise<Object>} Resposta da API
   */
  async withdrawPix(data) {
    try {
      await this.ensureConfig()

      const tipoApi = mapPixKeyTypeToEscale(data.tipo_chave)
      const pixKey = formatPixKeyValueForEscale(data.chave_pix, tipoApi)

      const payload = {
        amount: parseFloat(data.valor),
        pixKey,
        pixKeyType: tipoApi,
        description: data.externalId ? `Saque ${data.externalId}` : 'Saque PIX'
      }

      if (process.env.NODE_ENV === 'production') {
        console.log('ESCALECYBER withdraw (sem chave completa):', {
          amount: payload.amount,
          pixKeyType: payload.pixKeyType,
          pixKeyLen: pixKey?.length
        })
      }

      const response = await axios.post(
        `${this.baseURL}/payments/withdrawals`,
        payload,
        { headers: this._headers(), timeout: 30000 }
      )

      const res = response.data
      const d = res?.data || res

      const idTransaction = d?.id || d?.withdrawal_id || d?.transactionId || d?.transaction_id || d?.externalTransactionId || data.externalId

      return {
        success: true,
        data: {
          idTransaction,
          transactionId: idTransaction,
          tag: idTransaction,
          withdrawal_id: d?.withdrawal_id,
          transaction_id: d?.transaction_id
        }
      }
    } catch (error) {
      console.error('ESCALECYBER Withdraw PIX Error:', error.response?.data || error.message)
      const status = error.response?.status
      let message = error.response?.data?.message || error.message || 'Erro ao processar saque'
      if (status === 400) message = error.response?.data?.message || 'Requisição inválida'
      else if (status === 401) message = 'API Key inválida ou não autenticado'
      else if (status === 403) message = error.response?.data?.message || 'Acesso negado ou serviço em manutenção'
      return {
        success: false,
        error: error.response?.data || error,
        message
      }
    }
  }
}

export default new EscaleCyberService()
