import express from 'express'
import rateLimit from 'express-rate-limit'
import { body, validationResult } from 'express-validator'
import User from '../models/User.model.js'
import generateToken from '../utils/generateToken.js'
import { validatePhone } from '../utils/validatePhone.js'
import { protect } from '../middleware/auth.middleware.js'

const router = express.Router()

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: 'Muitas tentativas. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
})

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  '/register',
  authLimiter,
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage('Username deve ter entre 3 e 20 caracteres')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username pode conter apenas letras, números e underscore'),
    body('phone')
      .trim()
      .notEmpty()
      .withMessage('Telefone é obrigatório'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Senha deve ter no mínimo 6 caracteres'),
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('As senhas não coincidem')
        }
        return true
      }),
    body('termsAccepted')
      .equals('true')
      .withMessage('Você deve aceitar os termos de uso')
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array()
        })
      }

      const { username, phone, password } = req.body

      // Validate and format phone
      const phoneValidation = validatePhone(phone)
      if (!phoneValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Formato de telefone inválido. Use o formato (XX) XXXXX-XXXX'
        })
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { username: username.toLowerCase() },
          { phone: phoneValidation.digits }
        ]
      })

      if (existingUser) {
        if (existingUser.username === username.toLowerCase()) {
          return res.status(400).json({
            success: false,
            message: 'Este username já está em uso'
          })
        }
        if (existingUser.phone === phoneValidation.digits) {
          return res.status(400).json({
            success: false,
            message: 'Este telefone já está cadastrado'
          })
        }
      }

      // Create user
      const user = await User.create({
        username: username.toLowerCase(),
        phone: phoneValidation.digits,
        password
      })

      // Generate token
      const token = generateToken(user._id)

      // Update last login
      user.lastLogin = new Date()
      await user.save()

      res.status(201).json({
        success: true,
        message: 'Cadastro realizado com sucesso!',
        data: {
          token,
          user: {
            id: user._id,
            username: user.username,
            phone: user.formatPhone(),
            balance: user.balance,
            referralCode: user.referralCode,
            vipLevel: user.vipLevel,
            createdAt: user.createdAt
          }
        }
      })
    } catch (error) {
      console.error('Register error:', error)
      res.status(500).json({
        success: false,
        message: 'Erro ao realizar cadastro',
        error: error.message
      })
    }
  }
)

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  authLimiter,
  [
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username é obrigatório'),
    body('password')
      .notEmpty()
      .withMessage('Senha é obrigatória')
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array()
        })
      }

      const { username, password } = req.body

      // Find user by username
      const user = await User.findOne({ username: username.toLowerCase() })

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas'
        })
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Conta desativada. Entre em contato com o suporte.'
        })
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password)

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas'
        })
      }

      // Update last login
      user.lastLogin = new Date()
      await user.save()

      // Generate token
      const token = generateToken(user._id)

      res.json({
        success: true,
        message: 'Login realizado com sucesso!',
        data: {
          token,
          user: {
            id: user._id,
            username: user.username,
            phone: user.formatPhone(),
            balance: user.balance,
            referralCode: user.referralCode,
            vipLevel: user.vipLevel,
            createdAt: user.createdAt
          }
        }
      })
    } catch (error) {
      console.error('Login error:', error)
      res.status(500).json({
        success: false,
        message: 'Erro ao realizar login',
        error: error.message
      })
    }
  }
)

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password')

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          phone: user.formatPhone(),
          balance: user.balance,
          referralCode: user.referralCode,
          vipLevel: user.vipLevel,
          totalDeposits: user.totalDeposits,
          totalWithdrawals: user.totalWithdrawals,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      }
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar dados do usuário',
      error: error.message
    })
  }
})

export default router
