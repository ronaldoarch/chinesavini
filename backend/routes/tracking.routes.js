import express from 'express'
import { body, validationResult } from 'express-validator'
import { protect } from '../middleware/auth.middleware.js'
import { isAdmin } from '../middleware/admin.middleware.js'
import WebhookLog from '../models/WebhookLog.model.js'
import FacebookEventLog from '../models/FacebookEventLog.model.js'
import TrackingConfig from '../models/TrackingConfig.model.js'

const router = express.Router()

// Public route - get pixel ID for frontend
// @route   GET /api/admin/tracking/config/public
// @desc    Get public tracking config (only pixel ID for frontend)
// @access  Public
router.get('/config/public', async (req, res) => {
  try {
    const config = await TrackingConfig.getConfig()
    res.json({
      success: true,
      data: {
        facebookPixelId: config.facebookPixelId || null
      }
    })
  } catch (error) {
    console.error('Get public tracking config error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar configuração',
      error: error.message
    })
  }
})

// Admin routes - require authentication
router.use(protect)
router.use(isAdmin)

// @route   GET /api/admin/tracking/webhooks
// @desc    List webhook logs with filters
// @access  Private/Admin
router.get('/webhooks', async (req, res) => {
  try {
    const { source, status, page = 1, limit = 50, from, to } = req.query
    const filter = {}
    if (source) filter.source = source
    if (status) filter.status = status
    if (from || to) {
      filter.createdAt = {}
      if (from) filter.createdAt.$gte = new Date(from)
      if (to) filter.createdAt.$lte = new Date(to)
    }
    const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, Math.max(1, parseInt(limit)))
    const total = await WebhookLog.countDocuments(filter)
    const logs = await WebhookLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Math.min(100, Math.max(1, parseInt(limit))))
      .lean()
    res.json({
      success: true,
      data: {
        logs,
        total,
        page: parseInt(page) || 1,
        limit: Math.min(100, Math.max(1, parseInt(limit))),
        pages: Math.ceil(total / Math.min(100, Math.max(1, parseInt(limit))))
      }
    })
  } catch (error) {
    console.error('Tracking webhooks list error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao listar webhooks',
      error: error.message
    })
  }
})

// @route   GET /api/admin/tracking/facebook-events
// @desc    List Facebook/Meta event logs with filters
// @access  Private/Admin
router.get('/facebook-events', async (req, res) => {
  try {
    const { eventName, status, page = 1, limit = 50, from, to } = req.query
    const filter = {}
    if (eventName) filter.eventName = eventName
    if (status) filter.status = status
    if (from || to) {
      filter.sentAt = {}
      if (from) filter.sentAt.$gte = new Date(from)
      if (to) filter.sentAt.$lte = new Date(to)
    }
    const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, Math.max(1, parseInt(limit)))
    const total = await FacebookEventLog.countDocuments(filter)
    const logs = await FacebookEventLog.find(filter)
      .sort({ sentAt: -1 })
      .skip(skip)
      .limit(Math.min(100, Math.max(1, parseInt(limit))))
      .populate('userId', 'username phone')
      .lean()
    res.json({
      success: true,
      data: {
        logs,
        total,
        page: parseInt(page) || 1,
        limit: Math.min(100, Math.max(1, parseInt(limit))),
        pages: Math.ceil(total / Math.min(100, Math.max(1, parseInt(limit))))
      }
    })
  } catch (error) {
    console.error('Tracking facebook events list error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao listar eventos Facebook',
      error: error.message
    })
  }
})

// @route   GET /api/admin/tracking/config
// @desc    Get tracking configuration
// @access  Private/Admin
router.get('/config', async (req, res) => {
  try {
    const config = await TrackingConfig.getConfig()
    res.json({
      success: true,
      data: config
    })
  } catch (error) {
    console.error('Get tracking config error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar configuração de rastreamento',
      error: error.message
    })
  }
})

// @route   PUT /api/admin/tracking/config
// @desc    Update tracking configuration
// @access  Private/Admin
router.put(
  '/config',
  [
    body('facebookPixelId').optional().isString().trim(),
    body('facebookAccessToken').optional().isString().trim(),
    body('webhookBaseUrl').optional().custom((value) => {
      if (!value || value === '') return true
      try {
        new URL(value)
        return true
      } catch {
        return false
      }
    }).withMessage('URL do webhook inválida'),
    body('activeFacebookEvents').optional().isArray()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array()
        })
      }

      const config = await TrackingConfig.getConfig()
      const { facebookPixelId, facebookAccessToken, webhookBaseUrl, activeFacebookEvents } = req.body

      if (facebookPixelId !== undefined) config.facebookPixelId = facebookPixelId || ''
      if (facebookAccessToken !== undefined) config.facebookAccessToken = facebookAccessToken || ''
      if (webhookBaseUrl !== undefined) config.webhookBaseUrl = webhookBaseUrl || ''
      if (activeFacebookEvents !== undefined) {
        // Validate events are in enum
        const validEvents = ['Lead', 'CompleteRegistration', 'Purchase', 'AddToCart', 'InitiateCheckout', 'ViewContent']
        config.activeFacebookEvents = Array.isArray(activeFacebookEvents)
          ? activeFacebookEvents.filter(e => validEvents.includes(e))
          : config.activeFacebookEvents
      }

      await config.save()

      res.json({
        success: true,
        message: 'Configuração de rastreamento atualizada',
        data: config
      })
    } catch (error) {
      console.error('Update tracking config error:', error)
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar configuração',
        error: error.message
      })
    }
  }
)

export default router
