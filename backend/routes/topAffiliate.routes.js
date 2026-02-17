import express from 'express'
import { body, validationResult } from 'express-validator'
import { protect } from '../middleware/auth.middleware.js'
import { isAdmin } from '../middleware/admin.middleware.js'
import User from '../models/User.model.js'
import Referral from '../models/Referral.model.js'
import Transaction from '../models/Transaction.model.js'
import TopAffiliateConfig from '../models/TopAffiliateConfig.model.js'

const router = express.Router()

/**
 * Calcula o ranking de afiliados 50%: total de depósitos dos indicados no período (paidAt)
 * Apenas afiliados com affiliateDepositBonusPercent >= 50
 */
async function getTopAffiliateRanking(startDate, endDate) {
  const affiliates50 = await User.find({
    affiliateDepositBonusPercent: { $gte: 50 },
    referralCode: { $exists: true, $ne: null }
  }).select('_id username referralCode affiliateDepositBonusPercent')

  const ranking = []
  for (const aff of affiliates50) {
    const referrals = await Referral.find({ referrer: aff._id }).select('referred')
    const referredIds = referrals.map(r => r.referred).filter(Boolean)

    if (referredIds.length === 0) {
      ranking.push({
        affiliateId: aff._id,
        username: aff.username,
        referralCode: aff.referralCode,
        totalDeposits: 0,
        depositsCount: 0
      })
      continue
    }

    const txMatch = {
      user: { $in: referredIds },
      type: 'deposit',
      status: 'paid',
      paidAt: { $gte: startDate, $lte: endDate }
    }

    const agg = await Transaction.aggregate([
      { $match: txMatch },
      { $group: { _id: null, total: { $sum: '$netAmount' }, count: { $sum: 1 } } }
    ])

    const totalDeposits = agg[0]?.total ?? 0
    const depositsCount = agg[0]?.count ?? 0

    ranking.push({
      affiliateId: aff._id,
      username: aff.username,
      referralCode: aff.referralCode,
      totalDeposits,
      depositsCount
    })
  }

  // Ordenar por totalDeposits decrescente
  ranking.sort((a, b) => b.totalDeposits - a.totalDeposits)

  // Atribuir posição
  return ranking.map((r, i) => ({
    ...r,
    position: i + 1
  }))
}

// ============ ADMIN ============

// @route   GET /api/top-affiliate/admin/config
// @desc    Get Top Affiliate config
// @access  Private/Admin
router.get('/admin/config', protect, isAdmin, async (req, res) => {
  try {
    const config = await TopAffiliateConfig.getConfig()
    res.json({
      success: true,
      data: {
        startDate: config.startDate,
        endDate: config.endDate,
        prizes: config.prizes || []
      }
    })
  } catch (error) {
    console.error('Top affiliate config get error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar configuração',
      error: error.message
    })
  }
})

// @route   PUT /api/top-affiliate/admin/config
// @desc    Update Top Affiliate config (dates + prizes)
// @access  Private/Admin
router.put(
  '/admin/config',
  protect,
  isAdmin,
  [
    body('startDate').isISO8601().withMessage('Data de início inválida'),
    body('endDate').isISO8601().withMessage('Data de fim inválida'),
    body('prizes').optional().isArray(),
    body('prizes.*.position').optional().isInt({ min: 1 }),
    body('prizes.*.prizeValue').optional().isFloat({ min: 0 })
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

      const { startDate, endDate, prizes } = req.body
      const config = await TopAffiliateConfig.getConfig()

      if (startDate) config.startDate = new Date(startDate)
      if (endDate) config.endDate = new Date(endDate)
      if (Array.isArray(prizes) && prizes.length > 0) {
        config.prizes = prizes
          .filter(p => p.position != null && p.prizeValue != null)
          .map(p => ({ position: parseInt(p.position, 10), prizeValue: parseFloat(p.prizeValue) || 0 }))
          .sort((a, b) => a.position - b.position)
      }

      await config.save()

      res.json({
        success: true,
        message: 'Configuração atualizada',
        data: {
          startDate: config.startDate,
          endDate: config.endDate,
          prizes: config.prizes
        }
      })
    } catch (error) {
      console.error('Top affiliate config update error:', error)
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar configuração',
        error: error.message
      })
    }
  }
)

// @route   GET /api/top-affiliate/admin/ranking
// @desc    Get full Top Affiliate ranking (admin)
// @access  Private/Admin
router.get('/admin/ranking', protect, isAdmin, async (req, res) => {
  try {
    const config = await TopAffiliateConfig.getConfig()
    const startDate = new Date(config.startDate)
    const endDate = new Date(config.endDate)

    const ranking = await getTopAffiliateRanking(startDate, endDate)

    // Adicionar prêmio de cada posição
    const prizeMap = {}
    ;(config.prizes || []).forEach(p => {
      prizeMap[p.position] = p.prizeValue
    })

    const rankingWithPrizes = ranking.map(r => ({
      ...r,
      prizeValue: prizeMap[r.position] ?? 0
    }))

    res.json({
      success: true,
      data: {
        config: {
          startDate: config.startDate,
          endDate: config.endDate,
          prizes: config.prizes
        },
        ranking: rankingWithPrizes
      }
    })
  } catch (error) {
    console.error('Top affiliate ranking error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar ranking',
      error: error.message
    })
  }
})

// ============ AFFILIATE (50% only) ============

// @route   GET /api/top-affiliate/my-position
// @desc    Get current user's position in Top Affiliate ranking (only for 50% affiliates)
// @access  Private
router.get('/my-position', protect, async (req, res) => {
  try {
    const user = req.user
    if ((user.affiliateDepositBonusPercent || 0) < 50) {
      return res.json({
        success: true,
        data: {
          eligible: false,
          message: 'Ranking Top Afiliado é apenas para afiliados com 50% de comissão'
        }
      })
    }

    const config = await TopAffiliateConfig.getConfig()
    const startDate = new Date(config.startDate)
    const endDate = new Date(config.endDate)

    const ranking = await getTopAffiliateRanking(startDate, endDate)
    const myEntry = ranking.find(r => r.affiliateId.toString() === user._id.toString())

    const prizeMap = {}
    ;(config.prizes || []).forEach(p => {
      prizeMap[p.position] = p.prizeValue
    })

    res.json({
      success: true,
      data: {
        eligible: true,
        config: {
          startDate: config.startDate,
          endDate: config.endDate
        },
        position: myEntry?.position ?? null,
        totalDeposits: myEntry?.totalDeposits ?? 0,
        depositsCount: myEntry?.depositsCount ?? 0,
        prizeValue: myEntry ? (prizeMap[myEntry.position] ?? 0) : 0,
        totalInRanking: ranking.length
      }
    })
  } catch (error) {
    console.error('Top affiliate my-position error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar sua posição',
      error: error.message
    })
  }
})

export default router
