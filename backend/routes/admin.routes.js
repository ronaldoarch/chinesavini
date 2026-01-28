import express from 'express'
import { body, validationResult, query } from 'express-validator'
import { protect } from '../middleware/auth.middleware.js'
import { isAdmin, isSuperAdmin } from '../middleware/admin.middleware.js'
import User from '../models/User.model.js'
import Transaction from '../models/Transaction.model.js'

const router = express.Router()

// All admin routes require authentication and admin role
router.use(protect)
router.use(isAdmin)

// @route   GET /api/admin/dashboard
// @desc    Get dashboard statistics
// @access  Private/Admin
router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date()
    const todayStart = new Date(now.setHours(0, 0, 0, 0))
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // Total users
    const totalUsers = await User.countDocuments({ role: 'user' })
    const activeUsers = await User.countDocuments({ role: 'user', isActive: true })
    const newUsersToday = await User.countDocuments({
      role: 'user',
      createdAt: { $gte: todayStart }
    })
    const newUsersThisMonth = await User.countDocuments({
      role: 'user',
      createdAt: { $gte: thisMonthStart }
    })

    // Transactions statistics
    const totalDeposits = await Transaction.aggregate([
      { $match: { type: 'deposit', status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])

    const totalWithdrawals = await Transaction.aggregate([
      { $match: { type: 'withdraw', status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$netAmount' }, count: { $sum: 1 } } }
    ])

    const depositsToday = await Transaction.aggregate([
      {
        $match: {
          type: 'deposit',
          status: 'paid',
          paidAt: { $gte: todayStart }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])

    const withdrawalsToday = await Transaction.aggregate([
      {
        $match: {
          type: 'withdraw',
          status: 'paid',
          paidAt: { $gte: todayStart }
        }
      },
      { $group: { _id: null, total: { $sum: '$netAmount' }, count: { $sum: 1 } } }
    ])

    const depositsThisMonth = await Transaction.aggregate([
      {
        $match: {
          type: 'deposit',
          status: 'paid',
          paidAt: { $gte: thisMonthStart }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])

    const withdrawalsThisMonth = await Transaction.aggregate([
      {
        $match: {
          type: 'withdraw',
          status: 'paid',
          paidAt: { $gte: thisMonthStart }
        }
      },
      { $group: { _id: null, total: { $sum: '$netAmount' }, count: { $sum: 1 } } }
    ])

    // Pending transactions
    const pendingDeposits = await Transaction.countDocuments({
      type: 'deposit',
      status: 'pending'
    })
    const pendingWithdrawals = await Transaction.countDocuments({
      type: 'withdraw',
      status: { $in: ['pending', 'processing'] }
    })

    // Total balance (sum of all user balances)
    const totalBalance = await User.aggregate([
      { $match: { role: 'user' } },
      { $group: { _id: null, total: { $sum: '$balance' } } }
    ])

    // Recent transactions
    const recentTransactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'username phone')
      .select('-__v')

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          newToday: newUsersToday,
          newThisMonth: newUsersThisMonth
        },
        transactions: {
          deposits: {
            total: totalDeposits[0]?.total || 0,
            count: totalDeposits[0]?.count || 0,
            today: depositsToday[0]?.total || 0,
            todayCount: depositsToday[0]?.count || 0,
            thisMonth: depositsThisMonth[0]?.total || 0,
            thisMonthCount: depositsThisMonth[0]?.count || 0,
            pending: pendingDeposits
          },
          withdrawals: {
            total: totalWithdrawals[0]?.total || 0,
            count: totalWithdrawals[0]?.count || 0,
            today: withdrawalsToday[0]?.total || 0,
            todayCount: withdrawalsToday[0]?.count || 0,
            thisMonth: withdrawalsThisMonth[0]?.total || 0,
            thisMonthCount: withdrawalsThisMonth[0]?.count || 0,
            pending: pendingWithdrawals
          }
        },
        balance: {
          total: totalBalance[0]?.total || 0
        },
        recentTransactions
      }
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar dados do dashboard',
      error: error.message
    })
  }
})

// @route   GET /api/admin/users
// @desc    Get all users with filters
// @access  Private/Admin
router.get(
  '/users',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
    query('role').optional().isIn(['user', 'admin', 'superadmin']),
    query('isActive').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Parâmetros inválidos',
          errors: errors.array()
        })
      }

      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 20
      const skip = (page - 1) * limit

      const query = { role: 'user' }

      if (req.query.search) {
        query.$or = [
          { username: { $regex: req.query.search, $options: 'i' } },
          { phone: { $regex: req.query.search, $options: 'i' } }
        ]
      }

      if (req.query.role) {
        query.role = req.query.role
      }

      if (req.query.isActive !== undefined) {
        query.isActive = req.query.isActive === 'true'
      }

      const users = await User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)

      const total = await User.countDocuments(query)

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      })
    } catch (error) {
      console.error('Get users error:', error)
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar usuários',
        error: error.message
      })
    }
  }
)

// @route   GET /api/admin/users/:id
// @desc    Get single user details
// @access  Private/Admin
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      })
    }

    // Get user transactions
    const transactions = await Transaction.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(50)

    res.json({
      success: true,
      data: {
        user,
        transactions
      }
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar usuário',
      error: error.message
    })
  }
})

// @route   PUT /api/admin/users/:id
// @desc    Update user
// @access  Private/Admin
router.put(
  '/users/:id',
  [
    body('balance').optional().isFloat({ min: 0 }),
    body('isActive').optional().isBoolean(),
    body('vipLevel').optional().isInt({ min: 0, max: 8 })
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

      const user = await User.findById(req.params.id)

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        })
      }

      // Only superadmin can change roles
      if (req.body.role && req.admin.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          message: 'Apenas super administradores podem alterar roles'
        })
      }

      const updateData = {}
      if (req.body.balance !== undefined) updateData.balance = req.body.balance
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive
      if (req.body.vipLevel !== undefined) updateData.vipLevel = req.body.vipLevel
      if (req.body.role && req.admin.role === 'superadmin') updateData.role = req.body.role

      const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true
      }).select('-password')

      res.json({
        success: true,
        message: 'Usuário atualizado com sucesso',
        data: { user: updatedUser }
      })
    } catch (error) {
      console.error('Update user error:', error)
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar usuário',
        error: error.message
      })
    }
  }
)

// @route   GET /api/admin/transactions
// @desc    Get all transactions with filters
// @access  Private/Admin
router.get(
  '/transactions',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('type').optional().isIn(['deposit', 'withdraw']),
    query('status').optional().isIn(['pending', 'paid', 'failed', 'cancelled', 'processing']),
    query('userId').optional().isMongoId()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Parâmetros inválidos',
          errors: errors.array()
        })
      }

      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 50
      const skip = (page - 1) * limit

      const query = {}

      if (req.query.type) {
        query.type = req.query.type
      }

      if (req.query.status) {
        query.status = req.query.status
      }

      if (req.query.userId) {
        query.user = req.query.userId
      }

      const transactions = await Transaction.find(query)
        .populate('user', 'username phone')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)

      const total = await Transaction.countDocuments(query)

      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      })
    } catch (error) {
      console.error('Get transactions error:', error)
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar transações',
        error: error.message
      })
    }
  }
)

// @route   GET /api/admin/transactions/:id
// @desc    Get single transaction details
// @access  Private/Admin
router.get('/transactions/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate(
      'user',
      'username phone balance'
    )

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transação não encontrada'
      })
    }

    res.json({
      success: true,
      data: { transaction }
    })
  } catch (error) {
    console.error('Get transaction error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar transação',
      error: error.message
    })
  }
})

// @route   PUT /api/admin/transactions/:id/status
// @desc    Update transaction status manually
// @access  Private/Admin
router.put(
  '/transactions/:id/status',
  [body('status').isIn(['pending', 'paid', 'failed', 'cancelled', 'processing'])],
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

      const transaction = await Transaction.findById(req.params.id).populate('user')

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transação não encontrada'
        })
      }

      const oldStatus = transaction.status
      const newStatus = req.body.status

      // Update transaction status
      await transaction.updateStatus(newStatus)

      // Handle balance updates
      if (oldStatus !== 'paid' && newStatus === 'paid') {
        const user = await User.findById(transaction.user._id)
        if (transaction.type === 'deposit') {
          user.balance += transaction.netAmount
          user.totalDeposits += transaction.netAmount
        } else if (transaction.type === 'withdraw') {
          user.totalWithdrawals += transaction.netAmount
        }
        await user.save()
      } else if (oldStatus === 'paid' && newStatus !== 'paid') {
        // Revert balance if status changed from paid
        const user = await User.findById(transaction.user._id)
        if (transaction.type === 'deposit') {
          user.balance -= transaction.netAmount
          user.totalDeposits -= transaction.netAmount
        } else if (transaction.type === 'withdraw') {
          user.balance += transaction.amount // Refund
          user.totalWithdrawals -= transaction.netAmount
        }
        await user.save()
      }

      const updatedTransaction = await Transaction.findById(req.params.id).populate(
        'user',
        'username phone'
      )

      res.json({
        success: true,
        message: 'Status da transação atualizado com sucesso',
        data: { transaction: updatedTransaction }
      })
    } catch (error) {
      console.error('Update transaction status error:', error)
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar status da transação',
        error: error.message
      })
    }
  }
)

export default router
