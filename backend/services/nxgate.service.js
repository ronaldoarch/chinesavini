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

      // NxGate retorna: idTransaction, cashInRequestKey (logs: status,message,cashInRequestKey,paymentCode,idTransaction,paymentCodeBase64)
      // O webhook envia data.tag = um desses IDs. Priorizar cashInRequestKey pois pode ser o tag do webhook.
      const raw = cobranca?.data || cobranca
      const nxTag = raw.cashInRequestKey || raw.tag || raw.idTransaction || raw.id || raw.transactionId || raw.tx_id ||
        cobranca.cashInRequestKey || cobranca.tag || cobranca.idTransaction || cobranca.id || cobranca.transactionId || cobranca.tx_id ||
        cobranca?.transaction?.tag || cobranca?.transaction?.idTransaction
      const tagForWebhook = nxTag || data.externalId
      if (process.env.NODE_ENV === 'production') {
        console.log('NXGATE pixGenerate response - tag:', nxTag || '(não encontrado)', '| cobranca keys:', Object.keys(cobranca || {}).join(','), '| raw keys:', raw ? Object.keys(raw).join(',') : 'n/a')
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
          idTransaction: tagForWebhook,
          tag: tagForWebhook,
          transactionId: cobranca.idTransaction,
          cashInRequestKey: raw.cashInRequestKey || cobranca.cashInRequestKey,
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
   * @param {Object} data - Dados do saque
   * @param {number} data.valor - Valor do saque
   * @param {string} data.chave_pix - Chave PIX do recebedor
   * @param {string} data.tipo_chave - Tipo da chave (CPF, CNPJ, PHONE, EMAIL, RANDOM)
   * @param {string} data.documento - CPF do recebedor
   * @param {string} data.webhook - URL do webhook
   * @param {string} data.externalId - ID externo para conciliação
   * @returns {Promise<Object>} Resposta da API
   */
  async withdrawPix(data) {
    try {
      await this.ensureClient()

      const webhook = data.webhook || `${this.webhookBaseUrl}/api/webhooks/pix-withdraw`

      const saque = await this.nx.pixWithdraw({
        valor: parseFloat(data.valor),
        chave_pix: data.chave_pix,
        tipo_chave: data.tipo_chave,
        documento: (data.documento || '').replace(/\D/g, ''),
        webhook,
        magic_id: data.externalId
      })

      // NxGate retorna internalreference (tag/idTransaction)
      const idTransaction = saque.internalreference || saque.idTransaction || saque.tag || data.externalId
      return {
        success: true,
        data: {
          idTransaction,
          transactionId: idTransaction,
          tag: idTransaction,
          internalreference: idTransaction
        }
      }
    } catch (error) {
      console.error('NXGATE Withdraw PIX Error:', error)
      const message = error?.description || error?.message || 'Erro ao processar saque'
      return {
        success: false,
        error: error,
        message
      }
    }
  }
}

export default new NxgateService()
