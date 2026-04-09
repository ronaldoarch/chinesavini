import axios from 'axios'
import GatewayConfig from '../models/GatewayConfig.model.js'

const DEFAULT_BASE = 'https://apiv1.sarrixpay.com'

/** Base URL: só host (sem /v1 extra) — paths /auth/... e /pix/... são absolutos na doc. */
function normalizeBaseUrl(url) {
  if (!url || typeof url !== 'string') return DEFAULT_BASE
  let u = url.trim().replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`
  return u
}

function summarizeSarrixError(error, context = 'operação') {
  const status = error.response?.status
  const data = error.response?.data

  if (status === 502 || status === 503 || status === 504) {
    return {
      status,
      message: 'SarrixPay está temporariamente indisponível (erro no servidor ou Cloudflare). Tente de novo em alguns minutos ou fale com o suporte SarrixPay.',
      logShort: `HTTP ${status} — origem SarrixPay/Cloudflare indisponível`
    }
  }

  if (typeof data === 'string') {
    const isHtml = /<!DOCTYPE|<html|Bad gateway|502:/i.test(data)
    if (isHtml) {
      return {
        status,
        message: status === 502
          ? 'SarrixPay indisponível no momento (502). Aguarde e tente novamente.'
          : 'Resposta inválida da SarrixPay. Verifique a URL da API ou contate o suporte.',
        logShort: `HTTP ${status || '?'} — resposta HTML (proxy/erro upstream), len=${data.length}`
      }
    }
    return { status, message: data.slice(0, 280).trim(), logShort: data.slice(0, 120) }
  }

  if (data && typeof data === 'object') {
    const msg = data.message || data.detail || data.error
    const str = typeof msg === 'string' ? msg : JSON.stringify(data)
    let message = str
    if (status === 404 || /not found/i.test(str)) {
      message =
        'Endpoint não encontrado (404). No admin, use só a URL base (ex.: https://apiv1.sarrixpay.com), sem /v1 ou paths extras, salvo orientação contrária da SarrixPay.'
    }
    return { status, message, logShort: str.slice(0, 200) }
  }

  return {
    status,
    message: error.message || `Erro ao comunicar com SarrixPay (${context}).`,
    logShort: error.message
  }
}

function digitsOnly(s) {
  return String(s || '').replace(/\D/g, '')
}

function mapPixKeyTypeToSarrix(tipoChave) {
  const t = (tipoChave || 'CPF').toString().toUpperCase()
  const map = { CPF: 'cpf', CNPJ: 'cnpj', PHONE: 'phone', EMAIL: 'email', RANDOM: 'random' }
  return map[t] || 'cpf'
}

function formatPixKeyForSarrix(rawKey, pixKeyType) {
  const key = String(rawKey || '').trim()
  if (!key) return key
  if (pixKeyType === 'email') return key.toLowerCase()
  if (pixKeyType === 'phone') {
    const d = digitsOnly(key)
    if (d.startsWith('55') && d.length >= 12) return d
    if (d.length === 11) return `55${d}`
    return d
  }
  if (pixKeyType === 'cpf' || pixKeyType === 'cnpj') return digitsOnly(key)
  return key.replace(/\s/g, '').toLowerCase()
}

/**
 * SarrixPay — OAuth2 client credentials + PIX normalizado.
 * @see https://apiv1.sarrixpay.com
 */
class SarrixPayService {
  constructor() {
    this.baseURL = DEFAULT_BASE
    this.clientId = ''
    this.clientSecret = ''
    this._accessToken = null
    this._tokenExpiresAt = 0
  }

  async loadConfig() {
    const config = await GatewayConfig.getConfig()
    if (config?.provider === 'sarrixpay' && config.isActive) {
      this.clientId = (config.clientId || '').trim()
      this.clientSecret = (config.apiKey || '').trim()
      this.baseURL = normalizeBaseUrl(config.apiUrl || DEFAULT_BASE)
    } else {
      this.clientId = ''
      this.clientSecret = ''
    }
    this._accessToken = null
    this._tokenExpiresAt = 0
  }

  async ensureConfig() {
    await this.loadConfig()
    if (!this.clientId || !this.clientSecret) {
      throw new Error('SarrixPay não configurado. Informe Client ID e Client Secret no admin.')
    }
  }

  async getAccessToken() {
    const bufferMs = 120_000
    if (this._accessToken && Date.now() < this._tokenExpiresAt - bufferMs) {
      return this._accessToken
    }
    const res = await axios.post(
      `${this.baseURL}/auth/integrations/token`,
      { client_id: this.clientId, client_secret: this.clientSecret },
      { headers: { 'Content-Type': 'application/json' }, timeout: 20000 }
    )
    const d = res.data || {}
    if (!d.access_token) {
      throw new Error(d.message || 'SarrixPay: token sem access_token')
    }
    this._accessToken = d.access_token
    const ttl = Number(d.expires_in) || 3600
    this._tokenExpiresAt = Date.now() + ttl * 1000
    return this._accessToken
  }

  async generatePix(data) {
    try {
      await this.ensureConfig()
      const token = await this.getAccessToken()

      const doc = digitsOnly(data.documento_pagador || '')
      let document = doc
      if (document.length < 11) {
        const fallback = (await GatewayConfig.getConfig())?.defaultCpf?.replace(/\D/g, '') || ''
        document = fallback.length >= 11 ? fallback : '00000000000'
      }

      const idempotencyKey = data.externalId
        ? `deposit-${data.externalId}`
        : `deposit-${Date.now()}`

      const payload = {
        client_id: this.clientId,
        amount: parseFloat(data.valor),
        currency: 'BRL',
        description: (data.externalId ? `Depósito ${data.externalId}` : 'Depósito PIX').substring(0, 255),
        idempotency_key: idempotencyKey,
        payer: {
          name: (data.nome_pagador || 'Pagador').trim().substring(0, 120),
          document
        }
      }

      const response = await axios.post(`${this.baseURL}/pix/in/charges`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`
        },
        timeout: 30000
      })

      const r = response.data || {}
      const qr = r.qr_code || {}
      const brCode = qr.br_code || r.br_code
      const payUrl = qr.pay_url || r.pay_url
      const txId = r.transaction_id || r.provider_order

      return {
        success: true,
        data: {
          key: brCode,
          paymentCode: brCode,
          qrCode: brCode,
          pixCopyPaste: brCode,
          paymentCodeBase64: payUrl,
          qrCodeBase64: payUrl,
          qrCodeImage: payUrl,
          idTransaction: txId,
          transactionId: txId,
          tag: txId,
          externalId: data.externalId
        }
      }
    } catch (error) {
      const { status, message, logShort } = summarizeSarrixError(error, 'gerar PIX')
      console.error('SARRIXPAY Generate PIX:', logShort, '| status:', status, '| base:', this.baseURL)
      return { success: false, error: error.response?.data || { message: logShort }, message }
    }
  }

  async withdrawPix(data) {
    try {
      await this.ensureConfig()
      const token = await this.getAccessToken()

      const pixKeyType = mapPixKeyTypeToSarrix(data.tipo_chave)
      const pixKey = formatPixKeyForSarrix(data.chave_pix, pixKeyType)
      let beneficiaryDoc = digitsOnly(data.documento || '')
      if (beneficiaryDoc.length < 11 && pixKeyType === 'cpf') {
        beneficiaryDoc = digitsOnly(data.chave_pix || '')
      }
      if (beneficiaryDoc.length < 11) beneficiaryDoc = '00000000000'

      const idempotencyKey = data.externalId
        ? `withdraw-${data.externalId}`
        : `withdraw-${Date.now()}`

      const payload = {
        client_id: this.clientId,
        amount: parseFloat(data.valor),
        currency: 'BRL',
        description: data.externalId ? `Saque ${data.externalId}` : 'Saque PIX',
        idempotency_key: idempotencyKey,
        beneficiary: {
          name: (data.nome_recebedor || 'Beneficiário').trim().substring(0, 120),
          document: beneficiaryDoc.length > 14 ? beneficiaryDoc.slice(0, 14) : beneficiaryDoc,
          pix_key_type: pixKeyType,
          pix_key: pixKey
        }
      }

      const response = await axios.post(`${this.baseURL}/pix/out/transfers`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`
        },
        timeout: 30000
      })

      const r = response.data || {}
      const txId = r.transaction_id || r.provider_order || data.externalId

      return {
        success: true,
        data: {
          idTransaction: txId,
          transactionId: txId,
          tag: txId,
          internalReference: txId,
          internalreference: txId
        }
      }
    } catch (error) {
      const { status, message, logShort } = summarizeSarrixError(error, 'saque PIX')
      console.error('SARRIXPAY Withdraw:', logShort, '| status:', status, '| base:', this.baseURL)
      return { success: false, error: error.response?.data || { message: logShort }, message }
    }
  }
}

export default new SarrixPayService()
