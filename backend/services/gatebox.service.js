import axios from 'axios'
import GatewayConfig from '../models/GatewayConfig.model.js'

const GATEBOX_API_URL = 'https://api.gatebox.com.br'
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || 'http://localhost:5000'

/**
 * Normaliza chave PIX e documento para o formato aceito pela Gatebox.
 * - PHONE: só dígitos, com código do país 55 (ex: 5594992961626)
 * - CPF/CNPJ: só dígitos, sem pontuação
 * - EMAIL: trim, minúsculo
 * - RANDOM: trim
 */
function normalizePixKeyForGatebox(key, keyType) {
  if (!key || typeof key !== 'string') return key
  const trimmed = key.trim()
  const type = (keyType || '').toUpperCase()
  if (type === 'PHONE') {
    const digits = trimmed.replace(/\D/g, '')
    if (digits.length === 11) return `55${digits}` // DDD + 9 + número
    if (digits.length === 13 && digits.startsWith('55')) return digits
    if (digits.length === 12 && digits.startsWith('55')) return digits // 55 + 10 dígitos (antigo)
    return digits.length >= 10 ? `55${digits.slice(-11)}` : trimmed
  }
  if (type === 'CPF' || type === 'CNPJ') return trimmed.replace(/\D/g, '')
  if (type === 'EMAIL') return trimmed.toLowerCase()
  if (type === 'RANDOM') return trimmed
  return trimmed.replace(/\D/g, '') // fallback: só dígitos
}

function normalizeDocumentForGatebox(document) {
  if (!document || typeof document !== 'string') return document
  return document.replace(/\D/g, '')
}

class GateboxService {
  constructor() {
    this.username = null
    this.password = null
    this.baseURL = GATEBOX_API_URL
    this.webhookBaseUrl = WEBHOOK_BASE_URL
    this.accessToken = null
    this.tokenExpiresAt = null
  }

  async getConfig() {
    try {
      const config = await GatewayConfig.getConfig()
      
      if (config && config.isActive) {
        this.username = config.username || this.username
        this.password = config.password || this.password
        this.baseURL = config.apiUrl || this.baseURL
        this.webhookBaseUrl = config.webhookBaseUrl || this.webhookBaseUrl
      }
      
      // Log para debug
      console.log('📡 GATEBOX baseURL configurado:', this.baseURL)
    } catch (error) {
      console.error('Error loading gateway config:', error)
    }
  }

  /**
   * Autentica na API Gatebox e obtém access token
   * @returns {Promise<string>} Access token
   */
  async authenticate() {
    try {
      // Se já temos um token válido, retornar
      if (this.accessToken && this.tokenExpiresAt && new Date() < this.tokenExpiresAt) {
        return this.accessToken
      }

      await this.getConfig()

      if (!this.username || !this.password) {
        throw new Error('Username e password não configurados')
      }

      const endpoint = `${this.baseURL}/v1/customers/auth/sign-in`
      console.log('GATEBOX Authentication Request:', {
        url: endpoint,
        username: this.username
      })

      const response = await axios.post(
        endpoint,
        {
          username: this.username,
          password: this.password
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      )

      if (!response.data || !response.data.access_token) {
        throw new Error('Resposta de autenticação inválida')
      }

      this.accessToken = response.data.access_token
      // Token geralmente expira em 1 hora, vamos considerar 50 minutos para segurança
      this.tokenExpiresAt = new Date(Date.now() + 50 * 60 * 1000)

      console.log('✅ GATEBOX autenticado com sucesso')
      return this.accessToken
    } catch (error) {
      console.error('GATEBOX Authentication Error:', error.response?.data || error.message)
      this.accessToken = null
      this.tokenExpiresAt = null
      throw new Error(error.response?.data?.message || 'Erro ao autenticar na API Gatebox')
    }
  }

  /**
   * Obtém o token de autenticação (autentica se necessário)
   * @returns {Promise<string>} Access token
   */
  async getAuthToken() {
    return await this.authenticate()
  }

  /**
   * Gera um PIX para depósito
   * @param {Object} data - Dados do pagamento
   * @param {string} data.nome_pagador - Nome do pagador
   * @param {string} data.documento_pagador - CPF/CNPJ do pagador
   * @param {number} data.valor - Valor do pagamento
   * @param {string} data.webhook - URL do webhook (opcional)
   * @param {string} data.externalId - ID externo para conciliação
   * @returns {Promise<Object>} Resposta da API
   */
  async generatePix(data) {
    try {
      await this.getConfig()
      const token = await this.getAuthToken()

      // Documento do pagador: só dígitos (Gatebox aceita sem pontuação)
      const document = normalizeDocumentForGatebox(data.documento_pagador)

      const payload = {
        externalId: data.externalId || data.idTransaction || `deposit_${Date.now()}`,
        amount: parseFloat(data.valor),
        name: (data.nome_pagador || 'Pagador').trim(),
        expire: 3600 // 1 hora em segundos (conforme Postman)
      }
      if (document && document.length >= 11) payload.document = document

      // Campos opcionais (Postman: email, phone ex: +5514987654321, identification, description)
      if (data.email) payload.email = data.email
      if (data.phone) payload.phone = data.phone
      if (data.identification) payload.identification = data.identification
      if (data.description) payload.description = data.description

      const endpoint = `${this.baseURL}/v1/customers/pix/create-immediate-qrcode`
      console.log('GATEBOX Generate PIX Request:', {
        url: endpoint,
        externalId: payload.externalId
      })

      const response = await axios.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        timeout: 30000
      })

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('GATEBOX Generate PIX Error:', error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data || error.message,
        message: error.response?.data?.message || 'Erro ao gerar PIX'
      }
    }
  }

  /**
   * Cria um saque via PIX
   * @param {Object} data - Dados do saque
   * @param {number} data.valor - Valor do saque
   * @param {string} data.chave_pix - Chave PIX do recebedor
   * @param {string} data.tipo_chave - Tipo da chave (CPF, CNPJ, PHONE, EMAIL, RANDOM)
   * @param {string} data.documento - CPF/CNPJ do recebedor
   * @param {string} data.nome_recebedor - Nome do recebedor
   * @param {string} data.webhook - URL do webhook (opcional)
   * @param {string} data.externalId - ID externo para conciliação
   * @returns {Promise<Object>} Resposta da API
   */
  async withdrawPix(data) {
    try {
      await this.getConfig()
      const token = await this.getAuthToken()

      const tipoChave = (data.tipo_chave || '').toUpperCase()
      const key = normalizePixKeyForGatebox(data.chave_pix, tipoChave)
      const documentNumber = normalizeDocumentForGatebox(data.documento || '')

      const payload = {
        externalId: data.externalId || data.idTransaction || `withdraw_${Date.now()}`,
        key,
        name: (data.nome_recebedor || 'Recebedor').trim(),
        amount: parseFloat(data.valor)
      }
      if (documentNumber && documentNumber.length >= 11) payload.documentNumber = documentNumber

      // Campos opcionais
      if (data.description) payload.description = data.description

      const endpoint = `${this.baseURL}/v1/customers/pix/withdraw`
      console.log('GATEBOX Withdraw Request:', {
        url: endpoint,
        externalId: payload.externalId
      })

      const response = await axios.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        timeout: 30000
      })

      const resData = response.data?.data ?? response.data
      const status = (resData?.status ?? response.data?.status ?? '').toString().toUpperCase()
      const errorMsg = resData?.error ?? response.data?.error ?? resData?.message ?? response.data?.message
      if (errorMsg || status === 'FAILED') {
        console.error('GATEBOX Withdraw PIX: API retornou falha no body:', { status, error: errorMsg })
        return {
          success: false,
          error: response.data,
          message: (typeof errorMsg === 'string' ? errorMsg : errorMsg?.message) || 'Falha ao processar saque na Gatebox'
        }
      }

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('GATEBOX Withdraw PIX Error:', error.response?.data || error.message)

      let errorMessage = 'Erro ao processar saque'
      if (error.response?.status === 401) {
        errorMessage = 'Erro de autenticação. Verifique username e password.'
      } else if (error.response?.status === 400 || error.response?.status === 422) {
        errorMessage = error.response?.data?.message || 'Dados inválidos. Verifique os dados da conta PIX.'
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }

      return {
        success: false,
        error: error.response?.data || error.message,
        message: errorMessage
      }
    }
  }

  /**
   * Consulta status de uma transação
   * @param {Object} params - Parâmetros de busca
   * @param {string} params.transactionId - ID da transação
   * @param {string} params.externalId - ID externo
   * @param {string} params.endToEnd - EndToEnd ID
   * @returns {Promise<Object>} Resposta da API
   */
  async getTransactionStatus(params) {
    try {
      await this.getConfig()
      const token = await this.getAuthToken()

      const queryParams = new URLSearchParams()
      if (params.transactionId) queryParams.append('transactionId', params.transactionId)
      if (params.externalId) queryParams.append('externalId', params.externalId)
      if (params.endToEnd) queryParams.append('endToEnd', params.endToEnd)

      const endpoint = `${this.baseURL}/v1/customers/pix/status?${queryParams.toString()}`
      console.log('GATEBOX Get Status Request:', { url: endpoint })

      const response = await axios.get(endpoint, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        timeout: 30000
      })

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('GATEBOX Get Status Error:', error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data || error.message,
        message: error.response?.data?.message || 'Erro ao consultar status'
      }
    }
  }
}

export default new GateboxService()
