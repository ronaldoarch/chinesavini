import express from 'express'
import { protect } from '../middleware/auth.middleware.js'
import User from '../models/User.model.js'
import Transaction from '../models/Transaction.model.js'

const router = express.Router()

// VIP Level requirements
const VIP_LEVELS = [
  { level: 1, depositsRequired: 10, betsRequired: 50, bonus: 0 },
  { level: 2, depositsRequired: 30, betsRequired: 150, bonus: 3 },
  { level: 3, depositsRequired: 50, betsRequired: 250, bonus: 5 },
  { level: 4, depositsRequired: 100, betsRequired: 500, bonus: 10 },
  { level: 5, depositsRequired: 200, betsRequired: 800, bonus: 20 },
  { level: 6, depositsRequired: 500, betsRequired: 2500, bonus: 50 },
  { level: 7, depositsRequired: 1500, betsRequired: 7500, bonus: 100 },
  { level: 8, depositsRequired: 5000, betsRequired: 20000, bonus: 500 }
]

// @route   GET /api/vip/status
// @desc    Get VIP status and progress
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    
    // Calculate total deposits and bets
    const deposits = await Transaction.aggregate([
      {
        $match: {
          user: user._id,
          type: 'deposit',
          status: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ])

    const bets = await Transaction.aggregate([
      {
        $match: {
          user: user._id,
          type: 'bet',
          status: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ])

    const totalDeposits = deposits[0]?.total || 0
    const totalBets = bets[0]?.total || 0
    const currentLevel = user.vipLevel || 0
    const nextLevel = currentLevel < VIP_LEVELS.length ? VIP_LEVELS[currentLevel] : null

    // Calculate progress to next level
    let depositsProgress = 0
    let betsProgress = 0
    
    if (nextLevel) {
      depositsProgress = Math.min((totalDeposits / nextLevel.depositsRequired) * 100, 100)
      betsProgress = Math.min((totalBets / nextLevel.betsRequired) * 100, 100)
    }

    // Check which levels are unlocked
    const unlockedLevels = VIP_LEVELS.filter(level => {
      return totalDeposits >= level.depositsRequired && totalBets >= level.betsRequired
    }).map(level => level.level)

    // Check which bonuses have been claimed
    const claimedBonuses = user.claimedVipBonuses || []

    res.json({
      success: true,
      data: {
        currentLevel,
        totalDeposits,
        totalBets,
        depositsProgress,
        betsProgress,
        nextLevel,
        unlockedLevels,
        claimedBonuses,
        levels: VIP_LEVELS.map(level => ({
          ...level,
          unlocked: unlockedLevels.includes(level.level),
          claimed: claimedBonuses.includes(level.level)
        }))
      }
    })
  } catch (error) {
    console.error('Get VIP status error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar status VIP',
      error: error.message
    })
  }
})

// @route   POST /api/vip/claim/:level
// @desc    Claim VIP level bonus
// @access  Private
router.post('/claim/:level', protect, async (req, res) => {
  try {
    const level = parseInt(req.params.level)
    const vipLevel = VIP_LEVELS.find(l => l.level === level)

    if (!vipLevel) {
      return res.status(400).json({
        success: false,
        message: 'Nível VIP inválido'
      })
    }

    const user = await User.findById(req.user._id)

    // Check if bonus already claimed
    const claimedBonuses = user.claimedVipBonuses || []
    if (claimedBonuses.includes(level)) {
      return res.status(400).json({
        success: false,
        message: 'Bônus deste nível já foi resgatado'
      })
    }

    // Check if level requirements are met
    const deposits = await Transaction.aggregate([
      {
        $match: {
          user: user._id,
          type: 'deposit',
          status: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ])

    const bets = await Transaction.aggregate([
      {
        $match: {
          user: user._id,
          type: 'bet',
          status: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ])

    const totalDeposits = deposits[0]?.total || 0
    const totalBets = bets[0]?.total || 0

    if (totalDeposits < vipLevel.depositsRequired || totalBets < vipLevel.betsRequired) {
      return res.status(400).json({
        success: false,
        message: 'Requisitos do nível não foram atendidos'
      })
    }

    // Add bonus to balance (bônus VIP não é sacável)
    user.balance += vipLevel.bonus
    user.bonusBalance = (user.bonusBalance || 0) + vipLevel.bonus
    if (!user.claimedVipBonuses) {
      user.claimedVipBonuses = []
    }
    user.claimedVipBonuses.push(level)
    
    // Update VIP level if needed
    if (level > user.vipLevel) {
      user.vipLevel = level
    }
    
    await user.save()

    res.json({
      success: true,
      message: `Bônus de R$ ${vipLevel.bonus.toFixed(2)} resgatado com sucesso!`,
      data: {
        bonusAmount: vipLevel.bonus,
        newBalance: user.balance,
        newVipLevel: user.vipLevel
      }
    })
  } catch (error) {
    console.error('Claim VIP bonus error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao resgatar bônus VIP',
      error: error.message
    })
  }
})

// @route   POST /api/vip/claim-all
// @desc    Claim all available VIP bonuses
// @access  Private
router.post('/claim-all', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)

    // Calculate totals
    const deposits = await Transaction.aggregate([
      {
        $match: {
          user: user._id,
          type: 'deposit',
          status: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ])

    const bets = await Transaction.aggregate([
      {
        $match: {
          user: user._id,
          type: 'bet',
          status: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ])

    const totalDeposits = deposits[0]?.total || 0
    const totalBets = bets[0]?.total || 0
    const claimedBonuses = user.claimedVipBonuses || []

    // Find all claimable levels
    const claimableLevels = VIP_LEVELS.filter(level => {
      const isUnlocked = totalDeposits >= level.depositsRequired && totalBets >= level.betsRequired
      const notClaimed = !claimedBonuses.includes(level.level)
      return isUnlocked && notClaimed
    })

    if (claimableLevels.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum bônus disponível para resgatar'
      })
    }

    // Calculate total bonus
    const totalBonus = claimableLevels.reduce((sum, level) => sum + level.bonus, 0)
    const maxLevel = Math.max(...claimableLevels.map(l => l.level))

    // Add bonuses (bônus VIP não é sacável)
    user.balance += totalBonus
    user.bonusBalance = (user.bonusBalance || 0) + totalBonus
    if (!user.claimedVipBonuses) {
      user.claimedVipBonuses = []
    }
    claimableLevels.forEach(level => {
      if (!user.claimedVipBonuses.includes(level.level)) {
        user.claimedVipBonuses.push(level.level)
      }
    })
    
    if (maxLevel > user.vipLevel) {
      user.vipLevel = maxLevel
    }
    
    await user.save()

    res.json({
      success: true,
      message: `Todos os bônus resgatados! Total: R$ ${totalBonus.toFixed(2)}`,
      data: {
        totalBonus,
        claimedLevels: claimableLevels.map(l => l.level),
        newBalance: user.balance,
        newVipLevel: user.vipLevel
      }
    })
  } catch (error) {
    console.error('Claim all VIP bonuses error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao resgatar bônus VIP',
      error: error.message
    })
  }
})

export default router
