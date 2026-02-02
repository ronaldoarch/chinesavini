import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { protect } from '../middleware/auth.middleware.js'
import { isAdmin } from '../middleware/admin.middleware.js'
import Promotion from '../models/Promotion.model.js'

const router = express.Router()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const uploadsDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'promo-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/
    const ext = allowed.test(path.extname(file.originalname).toLowerCase())
    const mime = allowed.test(file.mimetype)
    if (ext && mime) return cb(null, true)
    cb(new Error('Apenas imagens são permitidas (jpeg, jpg, png, gif, webp)'))
  }
})

// @route   GET /api/promotions
// @desc    Get active promotions (public)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const promotions = await Promotion.find({ isActive: true })
      .sort({ order: 1 })
      .select('-__v')
      .lean()
    res.json({ success: true, data: { promotions } })
  } catch (error) {
    console.error('Get promotions error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar promoções',
      error: error.message
    })
  }
})

// @route   GET /api/promotions/admin/all
// @desc    Get all promotions (admin)
// @access  Private/Admin
router.get('/admin/all', protect, isAdmin, async (req, res) => {
  try {
    const promotions = await Promotion.find().sort({ order: 1 }).select('-__v').lean()
    res.json({ success: true, data: { promotions } })
  } catch (error) {
    console.error('Get all promotions error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar promoções',
      error: error.message
    })
  }
})

// @route   POST /api/promotions/admin
// @desc    Create promotion (admin)
// @access  Private/Admin
router.post('/admin', protect, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { title, description, actionType, bonusType, order, isActive } = req.body
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Banner é obrigatório'
      })
    }
    const imageUrl = `/uploads/${req.file.filename}`
    const promotion = await Promotion.create({
      title: title || 'Promoção',
      description: description || '',
      imageUrl,
      actionType: actionType || 'deposit',
      bonusType: bonusType || '',
      order: order ? parseInt(order) : 0,
      isActive: isActive === 'true' || isActive === true
    })
    res.json({
      success: true,
      message: 'Promoção criada com sucesso',
      data: { promotion }
    })
  } catch (error) {
    console.error('Create promotion error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao criar promoção',
      error: error.message
    })
  }
})

// @route   PUT /api/promotions/admin/:id
// @desc    Update promotion (admin)
// @access  Private/Admin
router.put('/admin/:id', protect, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { title, description, actionType, bonusType, order, isActive } = req.body
    const promotion = await Promotion.findById(req.params.id)
    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promoção não encontrada'
      })
    }
    const updateData = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (actionType !== undefined) updateData.actionType = actionType
    if (bonusType !== undefined) updateData.bonusType = bonusType || ''
    if (order !== undefined) updateData.order = parseInt(order)
    if (isActive !== undefined) updateData.isActive = isActive === 'true' || isActive === true
    if (req.file) updateData.imageUrl = `/uploads/${req.file.filename}`
    const updated = await Promotion.findByIdAndUpdate(req.params.id, updateData, { new: true })
    res.json({
      success: true,
      message: 'Promoção atualizada',
      data: { promotion: updated }
    })
  } catch (error) {
    console.error('Update promotion error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar promoção',
      error: error.message
    })
  }
})

// @route   DELETE /api/promotions/admin/:id
// @desc    Delete promotion (admin)
// @access  Private/Admin
router.delete('/admin/:id', protect, isAdmin, async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id)
    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promoção não encontrada'
      })
    }
    await Promotion.findByIdAndDelete(req.params.id)
    res.json({ success: true, message: 'Promoção removida' })
  } catch (error) {
    console.error('Delete promotion error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao remover promoção',
      error: error.message
    })
  }
})

export default router
