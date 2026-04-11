import express from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { isAdmin } from '../middleware/admin.middleware.js'
import SiteConfig from '../models/SiteConfig.model.js'
import Logo from '../models/Logo.model.js'

const router = express.Router()

// @route   GET /api/site-config
// @desc    Get site config (public - nome do site para título da página)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const config = await SiteConfig.getConfig()
    let logoImagePath = ''
    try {
      const logo = await Logo.getActiveLogo()
      logoImagePath = (logo?.imageUrl || '').trim()
    } catch (_) {
      /* ignore */
    }
    res.json({
      success: true,
      data: {
        siteName: config.siteName || 'Plataforma',
        shareDescription: config.shareDescription || '',
        shareImageUrl: config.shareImageUrl || '',
        logoImagePath
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
    const { siteName, shareDescription, shareImageUrl } = req.body
    let config = await SiteConfig.findOne()
    if (!config) {
      config = await SiteConfig.create({})
    }
    if (siteName !== undefined) config.siteName = String(siteName).trim() || 'Plataforma'
    if (shareDescription !== undefined) config.shareDescription = String(shareDescription).trim().slice(0, 500)
    if (shareImageUrl !== undefined) config.shareImageUrl = String(shareImageUrl).trim().slice(0, 500)
    await config.save()
    res.json({
      success: true,
      message: 'Configuração do site atualizada',
      data: {
        siteName: config.siteName,
        shareDescription: config.shareDescription || '',
        shareImageUrl: config.shareImageUrl || ''
      }
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
