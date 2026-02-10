import express from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { isAdmin } from '../middleware/admin.middleware.js'
import SiteConfig from '../models/SiteConfig.model.js'

const router = express.Router()

// @route   GET /api/site-config
// @desc    Get site config (public - nome do site para título da página)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const config = await SiteConfig.getConfig()
    res.json({
      success: true,
      data: {
        siteName: config.siteName || 'FORTUNEBET'
      }
    })
  } catch (error) {
    console.error('Get site config error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar configuração do site',
      error: error.message
    })
  }
})

// @route   PUT /api/site-config
// @desc    Update site config (nome do site)
// @access  Private/Admin
router.put('/', protect, isAdmin, async (req, res) => {
  try {
    const { siteName } = req.body
    let config = await SiteConfig.findOne()
    if (!config) {
      config = await SiteConfig.create({ siteName: siteName != null ? String(siteName).trim() : 'FORTUNEBET' })
    } else {
      if (siteName !== undefined) config.siteName = String(siteName).trim() || 'FORTUNEBET'
      await config.save()
    }
    res.json({
      success: true,
      message: 'Configuração do site atualizada',
      data: { siteName: config.siteName }
    })
  } catch (error) {
    console.error('Update site config error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar configuração',
      error: error.message
    })
  }
})

export default router
