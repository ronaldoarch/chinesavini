import express from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { isAdmin } from '../middleware/admin.middleware.js'
import GatewayConfig from '../models/GatewayConfig.model.js'

const router = express.Router()

// @route   GET /api/gateway/config
// @desc    Get gateway configuration
// @access  Private/Admin
router.get('/config', protect, isAdmin, async (req, res) => {
  try {
    const config = await GatewayConfig.getConfig()
    res.json({
      success: true,
      data: {
        provider: config.provider || 'gatebox',
        username: config.username,
        password: config.password ? '***' : '', // Não retornar senha real
        clientId: config.clientId,
        apiKey: config.apiKey,
        webhookBaseUrl: config.webhookBaseUrl,
        apiUrl: config.apiUrl,
        defaultCpf: config.defaultCpf,
        isActive: config.isActive
      }
    })
  } catch (error) {
    console.error('Get gateway config error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar configuração do gateway',
      error: error.message
    })
  }
})

// @route   PUT /api/gateway/config
// @desc    Update gateway configuration
// @access  Private/Admin
router.put('/config', protect, isAdmin, async (req, res) => {
  try {
    const { provider, username, password, clientId, apiKey, webhookBaseUrl, apiUrl, defaultCpf, isActive } = req.body

    let config = await GatewayConfig.findOne()

    if (!config) {
      config = new GatewayConfig({
        provider: provider || 'gatebox',
        username: username || process.env.GATEBOX_USERNAME || '',
        password: password || process.env.GATEBOX_PASSWORD || '',
        clientId: clientId || process.env.NXGATE_CLIENT_ID || '',
        apiKey: apiKey || process.env.NXGATE_CLIENT_SECRET || process.env.NXGATE_API_KEY || '',
        webhookBaseUrl: webhookBaseUrl || process.env.WEBHOOK_BASE_URL || 'http://localhost:5000',
        apiUrl: apiUrl || (provider === 'nxgate' ? 'https://api.nxgate.com.br' : 'https://api.gatebox.com.br'),
        defaultCpf: defaultCpf || process.env.GATEBOX_DEFAULT_CPF || '000.000.000-00'
      })
    }

    if (provider !== undefined) config.provider = provider
    if (username !== undefined) config.username = username
    if (password !== undefined) config.password = password
    if (clientId !== undefined) config.clientId = clientId
    if (apiKey !== undefined) config.apiKey = apiKey
    if (webhookBaseUrl !== undefined) config.webhookBaseUrl = webhookBaseUrl
    if (apiUrl !== undefined) config.apiUrl = apiUrl
    if (defaultCpf !== undefined) config.defaultCpf = defaultCpf
    if (isActive !== undefined) config.isActive = isActive

    await config.save()

    res.json({
      success: true,
      message: 'Configuração do gateway atualizada com sucesso',
      data: {
        provider: config.provider,
        username: config.username,
        password: config.password ? '***' : '',
        clientId: config.clientId,
        apiKey: config.apiKey,
        webhookBaseUrl: config.webhookBaseUrl,
        apiUrl: config.apiUrl,
        defaultCpf: config.defaultCpf,
        isActive: config.isActive
      }
    })
  } catch (error) {
    console.error('Update gateway config error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar configuração do gateway',
      error: error.message
    })
  }
})

// @route   POST /api/gateway/test
// @desc    Test gateway connection (validates config; optional real PIX test)
// @access  Private/Admin
router.post('/test', protect, isAdmin, async (req, res) => {
  try {
    const config = await GatewayConfig.getConfig()
    const provider = (config.provider || 'gatebox').toLowerCase()

    if (provider === 'gatebox') {
      if (!config.username || !config.password || config.username.trim() === '' || config.password.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Username e Password não configurados para GATEBOX'
        })
      }
    } else if (provider === 'nxgate') {
      if (!config.clientId || !config.apiKey || config.clientId.trim() === '' || config.apiKey.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Client ID e Client Secret não configurados para NxGate'
        })
      }
    }

    const { realTest } = req.body || {}
    if (realTest) {
      const { getGatewayService } = await import('../services/gateway.service.js')
      const gatewayService = await getGatewayService()
      const webhookBase = config.webhookBaseUrl || process.env.WEBHOOK_BASE_URL || 'http://localhost:5000'
      const result = await gatewayService.generatePix({
        nome_pagador: 'Teste Admin',
        documento_pagador: '00000000000',
        valor: 10,
        webhook: `${webhookBase}/api/webhooks/pix`,
        externalId: `test_${Date.now()}`
      })
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message || `Falha ao chamar a API ${provider === 'nxgate' ? 'NxGate' : 'GATEBOX'}`,
          data: { detail: result.error }
        })
      }
      const data = result.data || {}
      const raw = data?.data || data
      const hasCode = raw?.key || data?.key || raw?.qrCode || raw?.pixCopyPaste || raw?.copyPaste || raw?.paymentCode || raw?.qr_code || raw?.qrcode || raw?.codigo_pix || data?.qrCode || data?.pixCopyPaste || data?.copyPaste
      if (!hasCode) {
        console.warn('Gateway test response (no PIX code found):', JSON.stringify(result.data, null, 2))
        return res.status(400).json({
          success: false,
          message: 'API respondeu mas não retornou código PIX. Verifique o formato da resposta no backend.',
          data: { rawKeys: Object.keys(data) }
        })
      }
      return res.json({
        success: true,
        message: 'Teste real: PIX gerado com sucesso.',
        data: { credentialsConfigured: 'Sim', apiKeyConfigured: provider === 'nxgate' ? 'Sim' : undefined, webhookBaseUrl: config.webhookBaseUrl, apiUrl: config.apiUrl }
      })
    }

    res.json({
      success: true,
      message: 'Configuração válida (teste rápido). Use "Teste real" para validar geração de PIX.',
      data: {
        provider: config.provider,
        credentialsConfigured: provider === 'gatebox' ? (config.username && config.password ? 'Sim' : 'Não') : (config.clientId && config.apiKey ? 'Sim' : 'Não'),
        apiKeyConfigured: provider === 'nxgate' ? (config.apiKey ? 'Sim' : 'Não') : undefined,
        webhookBaseUrl: config.webhookBaseUrl,
        apiUrl: config.apiUrl
      }
    })
  } catch (error) {
    console.error('Test gateway error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao testar gateway',
      error: error.message
    })
  }
})

export default router
