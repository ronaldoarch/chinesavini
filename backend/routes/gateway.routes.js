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
        apiKey: config.apiKey,
        webhookBaseUrl: config.webhookBaseUrl,
        apiUrl: config.apiUrl,
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
    const { apiKey, webhookBaseUrl, apiUrl, isActive } = req.body

    let config = await GatewayConfig.findOne()
    
    if (!config) {
      config = new GatewayConfig({
        apiKey: apiKey || process.env.NXGATE_API_KEY || '',
        webhookBaseUrl: webhookBaseUrl || process.env.WEBHOOK_BASE_URL || 'http://localhost:5000',
        apiUrl: apiUrl || 'https://api.nxgate.com.br'
      })
    }

    if (apiKey !== undefined) config.apiKey = apiKey
    if (webhookBaseUrl !== undefined) config.webhookBaseUrl = webhookBaseUrl
    if (apiUrl !== undefined) config.apiUrl = apiUrl
    if (isActive !== undefined) config.isActive = isActive

    await config.save()

    res.json({
      success: true,
      message: 'Configuração do gateway atualizada com sucesso',
      data: {
        apiKey: config.apiKey,
        webhookBaseUrl: config.webhookBaseUrl,
        apiUrl: config.apiUrl,
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

    if (!config.apiKey || config.apiKey.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'API Key não configurada'
      })
    }

    const { realTest } = req.body || {}
    if (realTest) {
      // Real test: call NXGATE /pix/gerar with minimal amount to validate response format
      const nxgateService = (await import('../services/nxgate.service.js')).default
      const webhookBase = config.webhookBaseUrl || process.env.WEBHOOK_BASE_URL || 'http://localhost:5000'
      const result = await nxgateService.generatePix({
        nome_pagador: 'Teste Admin',
        documento_pagador: '00000000000',
        valor: 10,
        webhook: `${webhookBase}/api/webhooks/pix`
      })
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message || 'Falha ao chamar a API NXGATE',
          data: { detail: result.error }
        })
      }
      const data = result.data?.data || result.data || {}
      const hasCode = data.pix_copy_and_paste || data.pixCopyPaste || data.copy_paste || data.codigo_pix || data.codigo || data.qr_code || data.qrcode || data.pix_copia_cola || data.brcode || data.emv || data.payload
      if (!hasCode) {
        console.warn('NXGATE test response (no PIX code found):', JSON.stringify(result.data, null, 2))
        return res.status(400).json({
          success: false,
          message: 'API respondeu mas não retornou código PIX. Verifique o formato da resposta no backend.',
          data: { rawKeys: Object.keys(data) }
        })
      }
      return res.json({
        success: true,
        message: 'Teste real: PIX gerado com sucesso.',
        data: { apiKeyConfigured: 'Sim', webhookBaseUrl: config.webhookBaseUrl, apiUrl: config.apiUrl }
      })
    }

    res.json({
      success: true,
      message: 'Configuração válida (teste rápido). Use "Teste real" para validar geração de PIX.',
      data: {
        apiKeyConfigured: config.apiKey ? 'Sim' : 'Não',
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
