import express from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { isAdmin } from '../middleware/admin.middleware.js'
import User from '../models/User.model.js'
import Referral from '../models/Referral.model.js'
import Transaction from '../models/Transaction.model.js'
import AffiliateDeposit from '../models/AffiliateDeposit.model.js'
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

/**
 * Sincroniza comissões de depósitos que não foram processadas (ex: depósito antes da config)
 * Cria AffiliateDeposit e credita no balance para depósitos sem registro
 */
async function syncMissingAffiliateDeposits(affiliateId) {
  const affiliate = await User.findById(affiliateId)
  if (!affiliate || (affiliate.affiliateDepositBonusPercent || 0) <= 0) return 0

  const referrals = await Referral.find({ referrer: affiliateId })
  const referredUserIds = referrals.map(r => r.referred).filter(Boolean)
  if (referredUserIds.length === 0) return 0

  const deposits = await Transaction.find({
    user: { $in: referredUserIds },
    type: 'deposit',
    status: 'paid'
  }).sort({ paidAt: 1 })

  let totalCredited = 0
  for (const tx of deposits) {
    const existing = await AffiliateDeposit.findOne({ transaction: tx._id })
    if (existing) continue

    const referredUser = await User.findById(tx.user)
    if (!referredUser || referredUser.referredBy?.toString() !== affiliateId.toString()) continue

    // Verificar se é primeiro depósito (antes deste, o usuário não tinha depósitos)
    const prevDeposits = await Transaction.countDocuments({
      user: tx.user,
      type: 'deposit',
      status: 'paid',
      paidAt: { $lt: tx.paidAt || tx.createdAt }
    })
    const isFirstDeposit = prevDeposits === 0

    if (!affiliate.affiliateAllDeposits && !isFirstDeposit) continue

    const depositAmount = tx.netAmount ?? tx.amount ?? 0
    const bonusPercent = affiliate.affiliateDepositBonusPercent || 0
    const bonusAmount = Math.round((depositAmount * bonusPercent / 100) * 100) / 100
    if (bonusAmount <= 0) continue

    await AffiliateDeposit.create({
      affiliate: affiliateId,
      referredUser: tx.user,
      transaction: tx._id,
      depositAmount,
      isFirstDeposit,
      depositBonusPercent: bonusPercent,
      depositBonusAmount: bonusAmount
    })

    affiliate.balance = (affiliate.balance || 0) + bonusAmount
    totalCredited += bonusAmount
  }

  if (totalCredited > 0) await affiliate.save()
  return totalCredited
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

    // Sempre buscar TODOS os referidos para métricas de transação (depósitos/saques)
    // O período filtra quando a transação ocorreu (paidAt), não quando o referido foi cadastrado
    const referralsAll = await Referral.find({ referrer: userId })
      .populate('referred', 'username phone createdAt totalDeposits totalBets totalWithdrawals')
      .sort({ createdAt: -1 })

    const referredUserIds = referralsAll.map(r => r.referred?._id).filter(Boolean)

    // Novos subordinados: só os cadastrados no período (quando período != all)
    const referrals = (period !== 'all' && start && end)
      ? referralsAll.filter(r => r.createdAt && r.createdAt >= start && r.createdAt <= end)
      : referralsAll
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

    // Totals (all time) - sempre usar todos os referidos
    const totalDeposits = referralsAll.reduce((sum, r) => sum + (r.totalDeposits || 0), 0)
    const totalBets = referralsAll.reduce((sum, r) => sum + (r.totalBets || 0), 0)
    const totalRewards = referralsAll.reduce((sum, r) => sum + (r.rewardAmount || 0), 0)
    const totalReferrals = referralsAll.length
    const depositorsCount = referralsAll.filter(r => (r.totalDeposits || 0) > 0).length
    const qualifiedReferrals = referralsAll.filter(r => r.status === 'qualified').length
    const rewardedReferrals = referralsAll.filter(r => r.status === 'rewarded').length

    const depositsCount = depositsInPeriod[0]?.count || 0
    const depositsTotalInPeriod = depositsInPeriod[0]?.total || 0
    const withdrawalsCount = withdrawalsInPeriod[0]?.count || 0
    const withdrawalsTotalInPeriod = withdrawalsInPeriod[0]?.total || 0

    // Valid bets = totalBets from all referrals
    const validBets = totalBets
    // Direct W/L: simplified as (total rewards - something) or 0
    const directWL = totalRewards

    // Comissão de depósitos (vai para balance, registrada em AffiliateDeposit)
    let depositCommissions = await AffiliateDeposit.aggregate([
      { $match: { affiliate: userId } },
      { $group: { _id: null, total: { $sum: '$depositBonusAmount' } } }
    ])
    let totalDepositCommission = depositCommissions[0]?.total ?? 0

    // Sincroniza comissões faltantes (depósitos processados antes da config)
    if (totalDepositCommission === 0 && totalDeposits > 0) {
      await syncMissingAffiliateDeposits(userId)
      depositCommissions = await AffiliateDeposit.aggregate([
        { $match: { affiliate: userId } },
        { $group: { _id: null, total: { $sum: '$depositBonusAmount' } } }
      ])
      totalDepositCommission = depositCommissions[0]?.total ?? 0
    }

    res.json({
      success: true,
      data: {
        referralCode: user.referralCode,
        affiliateBalance: user.affiliateBalance || 0,
        totalDepositCommission,
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
        depositorsCount,
        qualifiedReferrals,
        rewardedReferrals,
        totalDeposits,
        totalBets,
        referrals: referralsAll.map(r => ({
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

        const depositCommissions = await AffiliateDeposit.aggregate([
          { $match: { affiliate: user._id } },
          { $group: { _id: null, total: { $sum: '$depositBonusAmount' } } }
        ])
        const totalDepositCommission = depositCommissions[0]?.total ?? 0

        return {
          id: user._id,
          username: user.username,
          referralCode: user.referralCode,
          affiliateBalance: user.affiliateBalance || 0,
          totalDepositCommission,
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

    const depositCommissions = await AffiliateDeposit.aggregate([
      { $match: { affiliate: user._id } },
      { $group: { _id: null, total: { $sum: '$depositBonusAmount' } } }
    ])
    const totalDepositCommission = depositCommissions[0]?.total ?? 0

    const stats = {
      totalReferrals: referrals.length,
      qualifiedReferrals: referrals.filter(r => r.status === 'qualified').length,
      rewardedReferrals: referrals.filter(r => r.status === 'rewarded').length,
      totalDeposits: referrals.reduce((sum, r) => sum + (r.totalDeposits || 0), 0),
      totalBets: referrals.reduce((sum, r) => sum + (r.totalBets || 0), 0),
      totalRewards: referrals.reduce((sum, r) => sum + (r.rewardAmount || 0), 0),
      totalDepositCommission
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          referralCode: user.referralCode,
          balance: user.balance ?? 0,
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
