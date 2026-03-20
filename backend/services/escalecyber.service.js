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
        this.apiKey = config.apiKey || ''
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
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-API-Key': this.apiKey
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

      const documento = (data.documento_pagador || '').replace(/\D/g, '')
      const docType = documento.length === 14 ? 'cnpj' : 'cpf'
      const customerEmail = data.customerEmail || `${(data.nome_pagador || 'user').replace(/\s/g, '')}@deposito.local`
      const customerPhone = formatPhoneInternational(data.customerPhone)

      const payload = {
        amount: parseFloat(data.valor),
        customerName: data.nome_pagador || 'Pagador',
        customerDocument: documento || '00000000000',
        customerDocumentType: docType,
        customerEmail,
        customerPhone,
        description: data.externalId ? `Depósito ${data.externalId}` : 'Depósito PIX'
      }
      if (data.metadata) payload.metadata = data.metadata

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
      console.error('ESCALECYBER Generate PIX Error:', error.response?.data || error.message)
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

      const tipoChave = (data.tipo_chave || 'CPF').toUpperCase()

      const payload = {
        amount: parseFloat(data.valor),
        pixKey: String(data.chave_pix || '').trim(),
        pixKeyType: tipoChave,
        description: data.externalId ? `Saque ${data.externalId}` : 'Saque PIX'
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
      return {
        success: false,
        error: error.response?.data || error,
        message
      }
    }
  }
}

export default new EscaleCyberService()
