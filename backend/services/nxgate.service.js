import axios from 'axios'
import GatewayConfig from '../models/GatewayConfig.model.js'

const NXGATE_API_URL = 'https://nxgate.com.br/api'
const NXGATE_API_KEY = process.env.NXGATE_API_KEY || 'd6fd1a0ed8daf4b33754d9f7d494d697'
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || 'http://localhost:5000'

class NxgateService {
  constructor() {
    this.apiKey = NXGATE_API_KEY
    this.baseURL = NXGATE_API_URL
    this.webhookBaseUrl = WEBHOOK_BASE_URL
  }

  async getConfig() {
    try {
      const config = await GatewayConfig.getConfig()
      
      // Correção automática: atualizar URL antiga para nova (mesmo se não estiver ativa)
      if (config && (config.apiUrl === 'https://api.nxgate.com.br' || config.apiUrl === 'https://api.nxgate.com.br/')) {
        console.log('⚠️  Corrigindo URL antiga do NXGATE no banco de dados...')
        config.apiUrl = 'https://nxgate.com.br/api'
        await config.save()
        console.log('✅ URL atualizada para:', config.apiUrl)
      }
      
      if (config && config.isActive) {
        this.apiKey = config.apiKey || this.apiKey
        this.baseURL = config.apiUrl || this.baseURL
        this.webhookBaseUrl = config.webhookBaseUrl || this.webhookBaseUrl
      }
      
      // Garantir que sempre use a URL correta, mesmo se config não estiver ativa
      if (this.baseURL === 'https://api.nxgate.com.br' || this.baseURL === 'https://api.nxgate.com.br/') {
        console.log('⚠️  Corrigindo baseURL para URL correta do NXGATE')
        this.baseURL = 'https://nxgate.com.br/api'
      }
    } catch (error) {
      console.error('Error loading gateway config:', error)
      // Use defaults from env (já está correto no const)
    }
  }

  /**
   * Gera um PIX para depósito
   * @param {Object} data - Dados do pagamento
   * @param {string} data.nome_pagador - Nome do pagador
   * @param {string} data.documento_pagador - CPF do pagador
   * @param {number} data.valor - Valor do pagamento
   * @param {string} data.webhook - URL do webhook
   * @returns {Promise<Object>} Resposta da API
   */
  async generatePix(data) {
    try {
      await this.getConfig()
      const payload = {
        nome_pagador: data.nome_pagador,
        documento_pagador: data.documento_pagador,
        valor: parseFloat(data.valor).toFixed(2),
        api_key: this.apiKey,
        webhook: data.webhook || `${this.webhookBaseUrl}/api/webhooks/pix`
      }

      const response = await axios.post(`${this.baseURL}/pix/gerar`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json'
        }
      })

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('NXGATE Generate PIX Error:', error.response?.data || error.message)
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
   * @param {string} data.documento - CPF do recebedor
   * @param {string} data.nome_recebedor - Nome do recebedor (opcional)
   * @param {string} data.webhook - URL do webhook
   * @returns {Promise<Object>} Resposta da API
   */
  async withdrawPix(data) {
    try {
      await this.getConfig()
      
      // Formatar documento (CPF) se necessário - deve estar no formato XXX.XXX.XXX-XX
      let documento = data.documento
      if (documento && !documento.includes('.')) {
        // Se está apenas com números, formatar
        const digits = documento.replace(/\D/g, '')
        if (digits.length === 11) {
          documento = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
        }
      }
      
      // Formatar valor como string conforme documentação
      const valor = parseFloat(data.valor).toFixed(2)
      
      const payload = {
        api_key: this.apiKey,
        valor: valor, // String conforme documentação
        chave_pix: data.chave_pix,
        tipo_chave: data.tipo_chave,
        documento: documento,
        ...(data.webhook && { webhook: data.webhook })
      }

      const endpoint = `${this.baseURL}/pix/sacar`
      console.log('NXGATE Withdraw Request:', {
        url: endpoint,
        baseURL: this.baseURL,
        payload: { ...payload, api_key: '***' }
      })

      const response = await axios.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        timeout: 30000
      })

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method
      }
      console.error('NXGATE Withdraw PIX Error:', JSON.stringify(errorDetails, null, 2))

      // Mensagem de erro mais específica baseada no status
      let errorMessage = 'Erro ao processar saque'
      if (error.response?.status === 404) {
        errorMessage = 'Endpoint de saque não encontrado. Verifique a configuração da API do gateway no admin.'
      } else if (error.response?.status === 403) {
        errorMessage = 'Acesso negado. Verifique se a API Key está correta e tem permissão para saques.'
      } else if (error.response?.status === 400 || error.response?.status === 422) {
        const apiMessage = error.response?.data?.message || error.response?.data?.error || ''
        // Se a mensagem menciona documento/CPF mas a chave não é CPF, adaptar mensagem
        if (apiMessage.toLowerCase().includes('documento') || apiMessage.toLowerCase().includes('cpf')) {
          const tipoChave = data.tipo_chave
          if (tipoChave !== 'CPF' && tipoChave !== 'CNPJ') {
            errorMessage = 'Dados inválidos. Verifique se a chave PIX está correta.'
          } else {
            errorMessage = apiMessage || 'Dados inválidos. Verifique os dados da conta PIX.'
          }
        } else {
          errorMessage = apiMessage || 'Dados inválidos. Verifique os dados da conta PIX.'
        }
      } else if (error.response?.data) {
        errorMessage = error.response.data.message || error.response.data.error || errorMessage
      }

      return {
        success: false,
        error: error.response?.data || error.message,
        message: errorMessage
      }
    }
  }
}

export default new NxgateService()
