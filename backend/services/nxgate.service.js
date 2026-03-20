import { NXGate } from '@nxgate/sdk'
import GatewayConfig from '../models/GatewayConfig.model.js'

const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || 'http://localhost:5000'

class NxgateService {
  constructor() {
    this.nx = null
    this.webhookBaseUrl = WEBHOOK_BASE_URL
  }

  async getConfig() {
    try {
      const config = await GatewayConfig.getConfig()

      if (config && config.provider === 'nxgate' && config.isActive) {
        const clientId = config.clientId || ''
        const clientSecret = config.apiKey || '' // apiKey = clientSecret (OAuth2)
        this.webhookBaseUrl = config.webhookBaseUrl || this.webhookBaseUrl

        if (clientId && clientSecret) {
          const opts = {
            clientId,
            clientSecret,
            baseUrl: config.apiUrl || 'https://api.nxgate.com.br'
          }
          if (config.hmacSecret && config.hmacSecret.trim()) {
            opts.hmacSecret = config.hmacSecret.trim()
            console.log('📡 NXGATE configurado com OAuth2 + HMAC')
          } else {
            console.log('📡 NXGATE configurado com OAuth2 (sem HMAC)')
          }
          this.nx = new NXGate(opts)
        } else {
          this.nx = null
        }
      } else {
        this.nx = null
      }
    } catch (error) {
      console.error('Error loading NxGate config:', error)
      this.nx = null
    }
  }

  async ensureClient() {
    // Sempre recarregar config para pegar HMAC Secret e outras alterações recentes
    await this.getConfig()
    if (!this.nx) throw new Error('NxGate não configurado. Configure Client ID e Client Secret no admin.')
  }

  /**
   * Gera um PIX para depósito (Cash-in)
   * @param {Object} data - Dados do pagamento
   * @param {string} data.nome_pagador - Nome do pagador
   * @param {string} data.documento_pagador - CPF do pagador
   * @param {number} data.valor - Valor do pagamento
   * @param {string} data.webhook - URL do webhook
   * @param {string} data.externalId - ID externo (tag) para conciliação
   * @returns {Promise<Object>} Resposta da API
   */
  async generatePix(data) {
    try {
      await this.ensureClient()

      const documento = (data.documento_pagador || '').replace(/\D/g, '')
      const webhook = data.webhook || `${this.webhookBaseUrl}/api/webhooks/pix`

      // NxGate exige CPF com exatamente 11 dígitos (TS0019 Payer Document Invalid)
      if (!documento || documento.length !== 11) {
        throw new Error(`CPF inválido: deve ter 11 dígitos. Recebido: "${data.documento_pagador || ''}" (${documento.length} dígitos)`)
      }

      const cobranca = await this.nx.pixGenerate({
        valor: parseFloat(data.valor),
        nome_pagador: data.nome_pagador || 'Pagador',
        documento_pagador: documento,
        webhook,
        descricao: data.externalId ? `Depósito ${data.externalId}` : undefined,
        magic_id: data.externalId
      })

      // NxGate retorna: idTransaction, cashInRequestKey (webhook envia data.tag = idTransaction)
      const raw = cobranca?.data || cobranca
      const apiIdTransaction = raw.idTransaction || cobranca.idTransaction
      const apiCashInRequestKey = raw.cashInRequestKey || cobranca.cashInRequestKey
      const tagForWebhook = apiIdTransaction || apiCashInRequestKey || data.externalId
      if (process.env.NODE_ENV === 'production') {
        const safe = { status: raw?.status, message: raw?.message, idTransaction: raw?.idTransaction, cashInRequestKey: raw?.cashInRequestKey, tx_id: raw?.tx_id }
        console.log('NXGATE pixGenerate:', JSON.stringify(safe))
      }
      return {
        success: true,
        data: {
          key: cobranca.paymentCode,
          paymentCode: cobranca.paymentCode,
          qrCode: cobranca.paymentCode,
          pixCopyPaste: cobranca.paymentCode,
          paymentCodeBase64: cobranca.paymentCodeBase64,
          qrCodeBase64: cobranca.paymentCodeBase64,
          idTransaction: apiIdTransaction || tagForWebhook,
          tag: tagForWebhook,
          transactionId: cobranca.idTransaction,
          cashInRequestKey: apiCashInRequestKey,
          tx_id: raw.tx_id || cobranca.tx_id || cobranca.idTransaction
        }
      }
    } catch (error) {
      console.error('NXGATE Generate PIX Error:', error)
      const message = error?.description || error?.message || 'Erro ao gerar PIX'
      return {
        success: false,
        error: error,
        message
      }
    }
  }

  /**
   * Cria um saque via PIX (Cash-out)
   * POST https://api.nxgate.com.br/pix/sacar
   * @param {Object} data - Dados do saque
   * @param {number} data.valor - Valor do saque em reais
   * @param {string} data.chave_pix - Chave PIX do destinatário
   * @param {string} data.tipo_chave - Tipo da chave (CPF, CNPJ, PHONE, EMAIL, RANDOM)
   * @param {string} data.documento - CPF/CNPJ do destinatário (opcional, somente dígitos)
   * @param {string} data.webhook - URL para notificação do resultado
   * @param {string} data.externalId - magic_id para idempotência
   * @returns {Promise<Object>} Resposta da API
   */
  async withdrawPix(data) {
    try {
      await this.ensureClient()

      const webhook = data.webhook || `${this.webhookBaseUrl}/api/webhooks/pix-withdraw`
      const documento = (data.documento || '').replace(/\D/g, '')
      const tipoChave = (data.tipo_chave || 'CPF').toUpperCase()

      const payload = {
        valor: parseFloat(data.valor),
        chave_pix: String(data.chave_pix || '').trim(),
        tipo_chave: tipoChave,
        webhook,
        magic_id: data.externalId
      }
      if (documento && (tipoChave === 'CPF' || tipoChave === 'CNPJ')) {
        payload.documento = documento
      }

      const saque = await this.nx.pixWithdraw(payload)

      // NxGate /pix/sacar retorna internalReference (camelCase) - webhook usa para buscar
      const raw = saque?.data || saque?.result || saque?.response || saque
      const apiTag = raw?.internalReference || raw?.internalreference || raw?.tag || raw?.idTransaction || raw?.id || raw?.reference ||
        saque?.internalReference || saque?.internalreference || saque?.tag || saque?.idTransaction || saque?.id || saque?.reference ||
        saque?.cashOutRequestKey
      const tagForWebhook = apiTag || data.externalId
      const txId = raw?.transaction_id || saque?.transaction_id
      if (process.env.NODE_ENV === 'production') {
        const keys = Object.keys(saque || {})
        const uuidLike = (v) => typeof v === 'string' && /^[a-f0-9-]{36}$/i.test(v)
        const allValues = { ...saque, ...(saque?.data || {}), ...(saque?.result || {}) }
        const found = Object.entries(allValues).filter(([, v]) => uuidLike(v)).map(([k, v]) => `${k}:${v}`)
        console.log('NXGATE pixWithdraw keys:', keys.join(','), '| tagForWebhook:', tagForWebhook, '| uuidLike:', found.join(', ') || 'nenhum')
      }
      return {
        success: true,
        data: {
          idTransaction: tagForWebhook,
          transactionId: tagForWebhook,
          tag: tagForWebhook,
          internalReference: tagForWebhook,
          internalreference: saque.internalReference || saque.internalreference || tagForWebhook,
          transaction_id: txId
        }
      }
    } catch (error) {
      console.error('NXGATE Withdraw PIX Error:', error)
      const status = error?.status ?? error?.statusCode
      let message = error?.description || error?.message || 'Erro ao processar saque'
      if (status === 400) message = error?.description || 'Saldo insuficiente ou dados inválidos'
      else if (status === 401) message = 'Token ou API Key inválidos'
      else if (status === 403) message = error?.description || 'IP não autorizado ou conta inativa'
      else if (status === 422) message = error?.description || 'Dados inválidos ou ausentes'
      else if (status === 503) message = 'Serviço indisponível. Tente novamente em instantes.'
      return {
        success: false,
        error: error,
        message
      }
    }
  }
}

export default new NxgateService()
