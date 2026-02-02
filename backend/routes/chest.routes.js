import express from 'express'
import { protect } from '../middleware/auth.middleware.js'
import Chest from '../models/Chest.model.js'
import User from '../models/User.model.js'
import Referral from '../models/Referral.model.js'
import BonusConfig from '../models/BonusConfig.model.js'

const router = express.Router()

// Default chest tiers (used if config not set)
const DEFAULT_CHEST_TIERS = [
  { referralsRequired: 1, rewardAmount: 10 },
  { referralsRequired: 5, rewardAmount: 40 },
  { referralsRequired: 10, rewardAmount: 50 },
  { referralsRequired: 20, rewardAmount: 50 },
  { referralsRequired: 50, rewardAmount: 50 },
  { referralsRequired: 100, rewardAmount: 100 },
  { referralsRequired: 200, rewardAmount: 200 },
  { referralsRequired: 500, rewardAmount: 500 },
  { referralsRequired: 1000, rewardAmount: 1088 },
  { referralsRequired: 2000, rewardAmount: 2088 },
  { referralsRequired: 5000, rewardAmount: 5288 },
  { referralsRequired: 6000, rewardAmount: 10888 }
]

// @route   GET /api/chests
// @desc    Get user chests
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user._id

    const referrals = await Referral.countDocuments({ referrer: userId, status: 'qualified' })

    const bonusConfig = await BonusConfig.getConfig()
    const inviteChests = (bonusConfig.chestTiers && bonusConfig.chestTiers.length > 0)
      ? bonusConfig.chestTiers
      : DEFAULT_CHEST_TIERS

    const chests = []
    
    // Create or update invite chests
    for (const chestData of inviteChests) {
      let chest = await Chest.findOne({
        user: userId,
        type: 'invite',
        'metadata.referralsRequired': chestData.referralsRequired
      })

      if (!chest) {
        chest = await Chest.create({
          user: userId,
          type: 'invite',
          rewardAmount: chestData.rewardAmount,
          status: referrals >= chestData.referralsRequired ? 'unlocked' : 'locked',
          metadata: { referralsRequired: chestData.referralsRequired }
        })
      } else {
        // Update status if needed
        if (chest.status === 'locked' && referrals >= chestData.referralsRequired) {
          chest.status = 'unlocked'
          chest.unlockedAt = new Date()
          await chest.save()
        }
      }

      chests.push(chest)
    }

    res.json({
      success: true,
      data: {
        chests: chests.sort((a, b) => a.metadata.referralsRequired - b.metadata.referralsRequired),
        totalReferrals: referrals
      }
    })
  } catch (error) {
    console.error('Get chests error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar baús',
      error: error.message
    })
  }
})

// @route   POST /api/chests/:id/claim
// @desc    Claim chest reward
// @access  Private
router.post('/:id/claim', protect, async (req, res) => {
  try {
    const chest = await Chest.findById(req.params.id)
    
    if (!chest) {
      return res.status(404).json({
        success: false,
        message: 'Baú não encontrado'
      })
    }

    if (chest.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para resgatar este baú'
      })
    }

    if (chest.status === 'locked') {
      return res.status(400).json({
        success: false,
        message: 'Este baú ainda está bloqueado'
      })
    }

    if (chest.status === 'claimed') {
      return res.status(400).json({
        success: false,
        message: 'Este baú já foi resgatado'
      })
    }

    // Add reward to user balance (baús = bônus, não sacável)
    const user = await User.findById(req.user._id)
    if (chest.type === 'invite') {
      user.affiliateBalance += chest.rewardAmount
    } else {
      user.balance += chest.rewardAmount
      user.bonusBalance = (user.bonusBalance || 0) + chest.rewardAmount
    }
    await user.save()

    // Update chest status
    chest.status = 'claimed'
    chest.claimedAt = new Date()
    await chest.save()

    res.json({
      success: true,
      message: 'Recompensa resgatada com sucesso!',
      data: {
        rewardAmount: chest.rewardAmount,
        newBalance: chest.type === 'invite' ? user.affiliateBalance : user.balance
      }
    })
  } catch (error) {
    console.error('Claim chest error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao resgatar baú',
      error: error.message
    })
  }
})

export default router
