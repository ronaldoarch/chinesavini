import express from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { isAdmin } from '../middleware/admin.middleware.js'
import WebhookLog from '../models/WebhookLog.model.js'
import FacebookEventLog from '../models/FacebookEventLog.model.js'

const router = express.Router()

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

export default router
