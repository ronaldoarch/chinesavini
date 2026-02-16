import express from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { isAdmin } from '../middleware/admin.middleware.js'
import User from '../models/User.model.js'
import Referral from '../models/Referral.model.js'
import Transaction from '../models/Transaction.model.js'
import affiliateService from '../services/affiliate.service.js'

const router = express.Router()

// Helper: get date range from period
function getDateRange(period) {
  const now = new Date()
  let start = null
  let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  switch (period) {
    case 'this_week': {
      const day = now.getDay()
      const mondayOffset = day === 0 ? -6 : 1 - day
      start = new Date(now)
      start.setDate(now.getDate() + mondayOffset)
      start.setHours(0, 0, 0, 0)
      break
    }
    case 'last_week': {
      const day = now.getDay()
      const mondayOffset = day === 0 ? -6 : 1 - day
      const thisMonday = new Date(now)
      thisMonday.setDate(now.getDate() + mondayOffset)
      start = new Date(thisMonday)
      start.setDate(thisMonday.getDate() - 7)
      start.setHours(0, 0, 0, 0)
      end = new Date(start)
      end.setDate(end.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      break
    }
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      break
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      break
    default:
      start = new Date(0)
  }
  return { start, end }
}

// @route   GET /api/affiliate/stats
// @desc    Get affiliate statistics for current user (optional ?period=all|this_week|last_week|this_month|last_month)
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const userId = req.user._id
    const user = await User.findById(userId)
    const period = req.query.period || 'all'
    const { start, end } = getDateRange(period)

    // Get referrals (all or filtered by createdAt)
    const referralQuery = { referrer: userId }
    if (period !== 'all' && start) {
      referralQuery.createdAt = { $gte: start }
      if (end) referralQuery.createdAt.$lte = end
    }

    const referrals = await Referral.find(referralQuery)
      .populate('referred', 'username phone createdAt totalDeposits totalBets totalWithdrawals')
      .sort({ createdAt: -1 })

    const referredUserIds = referrals.map(r => r.referred?._id).filter(Boolean)

    // New subordinates in period
    const newSubordinates = referrals.length

    // From Transaction: deposits, first deposits, withdrawals in period for referred users
    const txMatch = { user: { $in: referredUserIds }, status: 'paid' }
    if (period !== 'all' && start) {
      txMatch.paidAt = { $gte: start }
      if (end) txMatch.paidAt.$lte = end
    }

    const depositsInPeriod = await Transaction.aggregate([
      { $match: { ...txMatch, type: 'deposit' } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$netAmount' } } }
    ])

    const withdrawalsInPeriod = await Transaction.aggregate([
      { $match: { ...txMatch, type: 'withdraw' } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$netAmount' } } }
    ])

    // First deposit: users who made their first deposit in period (min paidAt per user in deposits)
    let firstDepositsCount = 0
    let firstDepositValue = 0
    let usersWithFirstDeposit = 0
    if (referredUserIds.length > 0) {
      const firstDeposits = await Transaction.aggregate([
        { $match: { user: { $in: referredUserIds }, type: 'deposit', status: 'paid' } },
        { $sort: { paidAt: 1 } },
        { $group: { _id: '$user', firstAmount: { $first: '$netAmount' }, firstAt: { $first: '$paidAt' } } }
      ])
      const inPeriod = (period !== 'all' && start && end)
        ? firstDeposits.filter(d => d.firstAt && d.firstAt >= start && d.firstAt <= end)
        : firstDeposits
      firstDepositsCount = inPeriod.length
      firstDepositValue = inPeriod.reduce((s, d) => s + (d.firstAmount || 0), 0)
      usersWithFirstDeposit = inPeriod.length
    }

    // Totals (all time) from referrals
    const totalDeposits = referrals.reduce((sum, r) => sum + (r.totalDeposits || 0), 0)
    const totalBets = referrals.reduce((sum, r) => sum + (r.totalBets || 0), 0)
    const totalRewards = referrals.reduce((sum, r) => sum + (r.rewardAmount || 0), 0)
    const totalReferrals = await Referral.countDocuments({ referrer: userId })
    const qualifiedReferrals = referrals.filter(r => r.status === 'qualified').length
    const rewardedReferrals = referrals.filter(r => r.status === 'rewarded').length

    const depositsCount = depositsInPeriod[0]?.count || 0
    const depositsTotalInPeriod = depositsInPeriod[0]?.total || 0
    const withdrawalsCount = withdrawalsInPeriod[0]?.count || 0
    const withdrawalsTotalInPeriod = withdrawalsInPeriod[0]?.total || 0

    // Valid bets = totalBets from referrals (in period we don't have per-transaction bets easily, use all from refs)
    const validBets = period === 'all' ? totalBets : referrals.reduce((s, r) => s + (r.totalBets || 0), 0)
    // Direct W/L: simplified as (total rewards - something) or 0
    const directWL = totalRewards

    res.json({
      success: true,
      data: {
        referralCode: user.referralCode,
        affiliateBalance: user.affiliateBalance || 0,
        period,
        newSubordinates,
        depositsCount,
        firstDepositsCount,
        usersWithFirstDeposit,
        totalDepositsInPeriod: depositsTotalInPeriod,
        firstDepositValue,
        registrationAndFirstDeposit: firstDepositValue,
        withdrawalsCount,
        withdrawalsTotalInPeriod: withdrawalsTotalInPeriod,
        totalRewards,
        validBets,
        directWL,
        directIncome: 0,
        totalReferrals,
        qualifiedReferrals,
        rewardedReferrals,
        totalDeposits,
        totalBets,
        referrals: referrals.map(r => ({
          id: r._id,
          referred: {
            username: r.referred?.username,
            phone: r.referred?.phone,
            createdAt: r.referred?.createdAt
          },
          status: r.status,
          totalDeposits: r.totalDeposits,
          totalBets: r.totalBets,
          rewardAmount: r.rewardAmount,
          qualifiedAt: r.qualifiedAt,
          rewardedAt: r.rewardedAt,
          createdAt: r.createdAt
        }))
      }
    })
  } catch (error) {
    console.error('Get affiliate stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar estatísticas de afiliado',
      error: error.message
    })
  }
})

// @route   POST /api/affiliate/withdraw
// @desc    Withdraw affiliate balance
// @access  Private
router.post('/withdraw', protect, async (req, res) => {
  try {
    const { amount } = req.body
    const user = await User.findById(req.user._id)

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valor inválido'
      })
    }

    if (user.affiliateBalance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Saldo de afiliado insuficiente'
      })
    }

    // Transfer from affiliate balance to main balance
    user.affiliateBalance -= amount
    user.balance += amount
    await user.save()

    res.json({
      success: true,
      message: 'Transferência realizada com sucesso',
      data: {
        transferredAmount: amount,
        newAffiliateBalance: user.affiliateBalance,
        newBalance: user.balance
      }
    })
  } catch (error) {
    console.error('Affiliate withdraw error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao realizar transferência',
      error: error.message
    })
  }
})

// @route   POST /api/affiliate/admin/sync-metrics
// @desc    Sincroniza métricas (totalDeposits, totalBets) de todos os referidos
// @access  Private/Admin
router.post('/admin/sync-metrics', protect, isAdmin, async (req, res) => {
  try {
    const referrals = await Referral.find({})
    let updated = 0
    for (const ref of referrals) {
      await affiliateService.updateReferralQualification(ref.referred)
      updated++
    }
    res.json({
      success: true,
      message: `Métricas sincronizadas para ${updated} referidos`,
      data: { updated }
    })
  } catch (error) {
    console.error('Sync affiliate metrics error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao sincronizar métricas',
      error: error.message
    })
  }
})

// @route   GET /api/affiliate/admin/all
// @desc    Get all affiliates (admin)
// @access  Private/Admin
router.get('/admin/all', protect, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    // Build query
    const query = {}
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { referralCode: { $regex: search, $options: 'i' } }
      ]
    }

    // Get users with referrals
    const users = await User.find(query)
      .select('username referralCode affiliateBalance totalReferrals qualifiedReferrals createdAt')
      .sort({ totalReferrals: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await User.countDocuments(query)

    // Get detailed stats for each user
    const affiliates = await Promise.all(
      users.map(async (user) => {
        const referrals = await Referral.find({ referrer: user._id })
        const qualified = referrals.filter(r => r.status === 'qualified').length
        const totalDeposits = referrals.reduce((sum, r) => sum + (r.totalDeposits || 0), 0)
        const totalBets = referrals.reduce((sum, r) => sum + (r.totalBets || 0), 0)
        const totalRewards = referrals.reduce((sum, r) => sum + (r.rewardAmount || 0), 0)

        return {
          id: user._id,
          username: user.username,
          referralCode: user.referralCode,
          affiliateBalance: user.affiliateBalance || 0,
          totalReferrals: referrals.length,
          qualifiedReferrals: qualified,
          totalDeposits,
          totalBets,
          totalRewards,
          createdAt: user.createdAt
        }
      })
    )

    res.json({
      success: true,
      data: {
        affiliates,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    })
  } catch (error) {
    console.error('Get all affiliates error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar afiliados',
      error: error.message
    })
  }
})

// @route   GET /api/affiliate/admin/:userId
// @desc    Get affiliate details (admin)
// @access  Private/Admin
router.get('/admin/:userId', protect, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      })
    }

    const referrals = await Referral.find({ referrer: user._id })
      .populate('referred', 'username phone balance totalDeposits totalBets createdAt')
      .sort({ createdAt: -1 })

    const stats = {
      totalReferrals: referrals.length,
      qualifiedReferrals: referrals.filter(r => r.status === 'qualified').length,
      rewardedReferrals: referrals.filter(r => r.status === 'rewarded').length,
      totalDeposits: referrals.reduce((sum, r) => sum + (r.totalDeposits || 0), 0),
      totalBets: referrals.reduce((sum, r) => sum + (r.totalBets || 0), 0),
      totalRewards: referrals.reduce((sum, r) => sum + (r.rewardAmount || 0), 0)
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          referralCode: user.referralCode,
          affiliateBalance: user.affiliateBalance || 0,
          affiliateDepositBonusPercent: user.affiliateDepositBonusPercent ?? 0,
          affiliateAllDeposits: user.affiliateAllDeposits ?? false,
          createdAt: user.createdAt
        },
        stats,
        referrals: referrals.map(r => ({
          id: r._id,
          referred: r.referred,
          status: r.status,
          totalDeposits: r.totalDeposits,
          totalBets: r.totalBets,
          rewardAmount: r.rewardAmount,
          qualifiedAt: r.qualifiedAt,
          rewardedAt: r.rewardedAt,
          createdAt: r.createdAt
        }))
      }
    })
  } catch (error) {
    console.error('Get affiliate details error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar detalhes do afiliado',
      error: error.message
    })
  }
})

// @route   PUT /api/affiliate/admin/:userId/config
// @desc    Update affiliate configuration (% bonus on deposit, all deposits or first only)
// @access  Private/Admin
router.put('/admin/:userId/config', protect, isAdmin, async (req, res) => {
  try {
    const { affiliateDepositBonusPercent, affiliateAllDeposits } = req.body
    const user = await User.findById(req.params.userId)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      })
    }

    if (affiliateDepositBonusPercent !== undefined) {
      if (affiliateDepositBonusPercent < 0 || affiliateDepositBonusPercent > 100) {
        return res.status(400).json({
          success: false,
          message: 'Percentual deve estar entre 0 e 100'
        })
      }
      user.affiliateDepositBonusPercent = affiliateDepositBonusPercent
    }

    if (affiliateAllDeposits !== undefined) {
      user.affiliateAllDeposits = !!affiliateAllDeposits
    }

    await user.save()

    res.json({
      success: true,
      message: 'Configuração do afiliado atualizada com sucesso',
      data: {
        affiliateDepositBonusPercent: user.affiliateDepositBonusPercent,
        affiliateAllDeposits: user.affiliateAllDeposits
      }
    })
  } catch (error) {
    console.error('Update affiliate config error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar configuração do afiliado',
      error: error.message
    })
  }
})

export default router
