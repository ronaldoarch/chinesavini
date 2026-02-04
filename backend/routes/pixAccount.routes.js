import express from 'express'
import { body, validationResult } from 'express-validator'
import { protect } from '../middleware/auth.middleware.js'
import PixAccount from '../models/PixAccount.model.js'

const router = express.Router()

// Todas as rotas requerem autenticação
router.use(protect)

// @route   GET /api/pix-accounts
// @desc    Get all PIX accounts for the authenticated user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const accounts = await PixAccount.find({ user: req.user._id, active: true })
      .sort({ createdAt: -1 })
      .select('-__v')

    res.json({
      success: true,
      data: accounts
    })
  } catch (error) {
    console.error('Get PIX accounts error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar contas PIX',
      error: error.message
    })
  }
})

// @route   POST /api/pix-accounts
// @desc    Create a new PIX account
// @access  Private
router.post(
  '/',
  [
    body('holderName')
      .trim()
      .notEmpty()
      .withMessage('Nome do titular é obrigatório')
      .isLength({ max: 100 })
      .withMessage('Nome muito longo'),
    body('pixKeyType')
      .isIn(['CPF', 'CNPJ', 'PHONE', 'EMAIL', 'RANDOM'])
      .withMessage('Tipo de chave PIX inválido'),
    body('pixKey')
      .trim()
      .notEmpty()
      .withMessage('Chave PIX é obrigatória')
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

      const { holderName, pixKeyType, pixKey } = req.body

      // Validação adicional baseada no tipo de chave
      if (pixKeyType === 'CPF') {
        const digits = pixKey.replace(/\D/g, '')
        if (digits.length !== 11) {
          return res.status(400).json({
            success: false,
            message: 'CPF deve ter 11 dígitos'
          })
        }
      } else if (pixKeyType === 'CNPJ') {
        const digits = pixKey.replace(/\D/g, '')
        if (digits.length !== 14) {
          return res.status(400).json({
            success: false,
            message: 'CNPJ deve ter 14 dígitos'
          })
        }
      } else if (pixKeyType === 'EMAIL') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(pixKey)) {
          return res.status(400).json({
            success: false,
            message: 'Email inválido'
          })
        }
      } else if (pixKeyType === 'PHONE') {
        const digits = pixKey.replace(/\D/g, '')
        if (digits.length !== 11) {
          return res.status(400).json({
            success: false,
            message: 'Telefone deve ter 11 dígitos (com DDD)'
          })
        }
      } else if (pixKeyType === 'RANDOM') {
        if (pixKey.length < 32 || pixKey.length > 77) {
          return res.status(400).json({
            success: false,
            message: 'Chave aleatória deve ter entre 32 e 77 caracteres'
          })
        }
      }

      // Verificar se já existe uma conta com a mesma chave para este usuário
      const existingAccount = await PixAccount.findOne({
        user: req.user._id,
        pixKey: pixKey.trim()
      })

      if (existingAccount) {
        // Se a conta existe mas está inativa, reativá-la
        if (!existingAccount.active) {
          existingAccount.active = true
          existingAccount.holderName = holderName.trim()
          existingAccount.pixKeyType = pixKeyType
          await existingAccount.save()
          
          return res.status(200).json({
            success: true,
            message: 'Conta PIX reativada com sucesso',
            data: existingAccount
          })
        }
        
        // Se a conta está ativa, retornar erro
        return res.status(400).json({
          success: false,
          message: 'Você já possui uma conta PIX cadastrada com esta chave'
        })
      }

      const pixAccount = await PixAccount.create({
        user: req.user._id,
        holderName: holderName.trim(),
        pixKeyType,
        pixKey: pixKey.trim(),
        active: true
      })

      res.status(201).json({
        success: true,
        message: 'Conta PIX cadastrada com sucesso',
        data: pixAccount
      })
    } catch (error) {
      console.error('Create PIX account error:', error)
      
      // Erro de chave duplicada (índice único)
      if (error.code === 11000) {
        // Tentar encontrar e reativar conta inativa
        const inactiveAccount = await PixAccount.findOne({
          user: req.user._id,
          pixKey: pixKey.trim(),
          active: false
        })
        
        if (inactiveAccount) {
          inactiveAccount.active = true
          inactiveAccount.holderName = holderName.trim()
          inactiveAccount.pixKeyType = pixKeyType
          await inactiveAccount.save()
          
          return res.status(200).json({
            success: true,
            message: 'Conta PIX reativada com sucesso',
            data: inactiveAccount
          })
        }
        
        return res.status(400).json({
          success: false,
          message: 'Você já possui uma conta PIX cadastrada com esta chave'
        })
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao cadastrar conta PIX',
        error: error.message
      })
    }
  }
)

// @route   DELETE /api/pix-accounts/:id
// @desc    Delete (deactivate) a PIX account
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const account = await PixAccount.findOne({
      _id: req.params.id,
      user: req.user._id
    })

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Conta PIX não encontrada'
      })
    }

    // Marcar como inativa ao invés de deletar
    account.active = false
    await account.save()

    res.json({
      success: true,
      message: 'Conta PIX removida com sucesso'
    })
  } catch (error) {
    console.error('Delete PIX account error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao remover conta PIX',
      error: error.message
    })
  }
})

export default router
