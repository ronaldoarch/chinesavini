import express from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { isAdmin } from '../middleware/admin.middleware.js'
import Theme from '../models/Theme.model.js'

const router = express.Router()

// @route   GET /api/theme/active
// @desc    Get active theme (public)
// @access  Public
router.get('/active', async (req, res) => {
  try {
    const theme = await Theme.getActiveTheme()
    res.json({
      success: true,
      data: theme
    })
  } catch (error) {
    console.error('Get active theme error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar tema ativo',
      error: error.message
    })
  }
})

// @route   GET /api/theme
// @desc    Get all themes
// @access  Private/Admin
router.get('/', protect, isAdmin, async (req, res) => {
  try {
    const themes = await Theme.find().sort({ createdAt: -1 })
    res.json({
      success: true,
      data: themes
    })
  } catch (error) {
    console.error('Get themes error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar temas',
      error: error.message
    })
  }
})

// @route   GET /api/theme/:id
// @desc    Get theme by ID
// @access  Private/Admin
router.get('/:id', protect, isAdmin, async (req, res) => {
  try {
    const theme = await Theme.findById(req.params.id)
    if (!theme) {
      return res.status(404).json({
        success: false,
        message: 'Tema não encontrado'
      })
    }
    res.json({
      success: true,
      data: theme
    })
  } catch (error) {
    console.error('Get theme error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar tema',
      error: error.message
    })
  }
})

// @route   POST /api/theme
// @desc    Create new theme
// @access  Private/Admin
router.post('/', protect, isAdmin, async (req, res) => {
  try {
    const { name, colors, icons, isActive } = req.body

    const theme = new Theme({
      name: name || 'Novo Tema',
      colors: colors || {},
      icons: icons || {},
      isActive: isActive || false
    })

    await theme.save()

    res.json({
      success: true,
      message: 'Tema criado com sucesso',
      data: theme
    })
  } catch (error) {
    console.error('Create theme error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao criar tema',
      error: error.message
    })
  }
})

// @route   PUT /api/theme/:id
// @desc    Update theme
// @access  Private/Admin
router.put('/:id', protect, isAdmin, async (req, res) => {
  try {
    const { name, colors, icons, isActive } = req.body

    const theme = await Theme.findById(req.params.id)
    if (!theme) {
      return res.status(404).json({
        success: false,
        message: 'Tema não encontrado'
      })
    }

    if (name !== undefined) theme.name = name
    if (colors !== undefined) theme.colors = { ...theme.colors, ...colors }
    if (icons !== undefined) theme.icons = { ...theme.icons, ...icons }
    if (isActive !== undefined) theme.isActive = isActive

    await theme.save()

    res.json({
      success: true,
      message: 'Tema atualizado com sucesso',
      data: theme
    })
  } catch (error) {
    console.error('Update theme error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar tema',
      error: error.message
    })
  }
})

// @route   DELETE /api/theme/:id
// @desc    Delete theme
// @access  Private/Admin
router.delete('/:id', protect, isAdmin, async (req, res) => {
  try {
    const theme = await Theme.findById(req.params.id)
    if (!theme) {
      return res.status(404).json({
        success: false,
        message: 'Tema não encontrado'
      })
    }

    if (theme.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível deletar o tema ativo. Ative outro tema primeiro.'
      })
    }

    await Theme.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: 'Tema deletado com sucesso'
    })
  } catch (error) {
    console.error('Delete theme error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar tema',
      error: error.message
    })
  }
})

// @route   POST /api/theme/:id/duplicate
// @desc    Duplicate theme
// @access  Private/Admin
router.post('/:id/duplicate', protect, isAdmin, async (req, res) => {
  try {
    const theme = await Theme.findById(req.params.id)
    if (!theme) {
      return res.status(404).json({
        success: false,
        message: 'Tema não encontrado'
      })
    }

    const duplicatedTheme = new Theme({
      name: `${theme.name} (Cópia)`,
      colors: { ...theme.colors },
      icons: { ...theme.icons },
      isActive: false
    })

    await duplicatedTheme.save()

    res.json({
      success: true,
      message: 'Tema duplicado com sucesso',
      data: duplicatedTheme
    })
  } catch (error) {
    console.error('Duplicate theme error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao duplicar tema',
      error: error.message
    })
  }
})

export default router
