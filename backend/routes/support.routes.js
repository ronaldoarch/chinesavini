import express from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { isAdmin } from '../middleware/admin.middleware.js'
import SupportConfig from '../models/SupportConfig.model.js'

const router = express.Router()

// @route   GET /api/support/config
// @desc    Get support links (public)
// @access  Public
router.get('/config', async (req, res) => {
  try {
    const config = await SupportConfig.getConfig()
    res.json({
      success: true,
      data: {
        whatsappUrl: config.whatsappUrl || '',
        telegramUrl: config.telegramUrl || '',
        instagramUrl: config.instagramUrl || ''
      }
    })
  } catch (error) {
    console.error('Get support config error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar configuração de suporte',
      error: error.message
    })
  }
})

// @route   PUT /api/support/config
// @desc    Update support links
// @access  Private/Admin
router.put('/config', protect, isAdmin, async (req, res) => {
  try {
    const { whatsappUrl, telegramUrl, instagramUrl } = req.body
    const config = await SupportConfig.getConfig()
    if (whatsappUrl !== undefined) config.whatsappUrl = String(whatsappUrl || '').trim()
    if (telegramUrl !== undefined) config.telegramUrl = String(telegramUrl || '').trim()
    if (instagramUrl !== undefined) config.instagramUrl = String(instagramUrl || '').trim()
    await config.save()

    res.json({
      success: true,
      message: 'Configuração de suporte atualizada',
      data: {
        whatsappUrl: config.whatsappUrl,
        telegramUrl: config.telegramUrl,
        instagramUrl: config.instagramUrl
      }
    })
  } catch (error) {
    console.error('Update support config error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar configuração',
      error: error.message
    })
  }
})

export default router
