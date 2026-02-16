import Referral from '../models/Referral.model.js'
import User from '../models/User.model.js'
import Chest from '../models/Chest.model.js'

class AffiliateService {
  /**
   * Update referral qualification when user makes deposit or bet
   */
  async updateReferralQualification(userId) {
    try {
      const user = await User.findById(userId)
      if (!user || !user.referredBy) {
        return
      }

      const referral = await Referral.findOne({ referred: userId })
      if (!referral) {
        return
      }

      // Calcular totais: depósitos da Transaction, apostas do User (GameTxnLog não grava em Transaction)
      const Transaction = (await import('../models/Transaction.model.js')).default

      const deposits = await Transaction.aggregate([
        {
          $match: {
            user: userId,
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

      const totalDeposits = deposits[0]?.total || 0
      // Apostas ficam em User.totalBets (atualizado pelo seamless), não em Transaction
      const totalBets = user.totalBets || 0

      // Update referral totals
      referral.totalDeposits = totalDeposits
      referral.totalBets = totalBets

      // Check if qualified (R$ 10+ deposits and R$ 100+ bets)
      const isQualified = totalDeposits >= 10 && totalBets >= 100

      if (isQualified && referral.status === 'pending') {
        referral.status = 'qualified'
        referral.qualifiedAt = new Date()

        // Update referrer stats
        const referrer = await User.findById(referral.referrer)
        if (referrer) {
          referrer.qualifiedReferrals = (referrer.qualifiedReferrals || 0) + 1
          await referrer.save()

          // Unlock invite chests
          await this.updateInviteChests(referrer._id)
        }
      }

      await referral.save()
    } catch (error) {
      console.error('Update referral qualification error:', error)
    }
  }

  /**
   * Update invite chests for a user based on qualified referrals
   */
  async updateInviteChests(userId) {
    try {
      const qualifiedReferrals = await Referral.countDocuments({
        referrer: userId,
        status: 'qualified'
      })

      // Update all invite chests
      const chests = await Chest.find({
        user: userId,
        type: 'invite'
      })

      for (const chest of chests) {
        const referralsRequired = chest.metadata?.referralsRequired || 0
        if (qualifiedReferrals >= referralsRequired && chest.status === 'locked') {
          chest.status = 'unlocked'
          chest.unlockedAt = new Date()
          await chest.save()
        }
      }
    } catch (error) {
      console.error('Update invite chests error:', error)
    }
  }

  /**
   * Calculate and update VIP level for user
   */
  async updateVipLevel(userId) {
    try {
      const user = await User.findById(userId)
      if (!user) return

      const Transaction = (await import('../models/Transaction.model.js')).default

      const deposits = await Transaction.aggregate([
        {
          $match: {
            user: userId,
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
            user: userId,
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

      // Update user totals
      user.totalDeposits = totalDeposits
      user.totalBets = totalBets

      // Calculate VIP level based on requirements
      const VIP_LEVELS = [
        { level: 1, depositsRequired: 10, betsRequired: 50 },
        { level: 2, depositsRequired: 30, betsRequired: 150 },
        { level: 3, depositsRequired: 50, betsRequired: 250 },
        { level: 4, depositsRequired: 100, betsRequired: 500 },
        { level: 5, depositsRequired: 200, betsRequired: 800 },
        { level: 6, depositsRequired: 500, betsRequired: 2500 },
        { level: 7, depositsRequired: 1500, betsRequired: 7500 },
        { level: 8, depositsRequired: 5000, betsRequired: 20000 }
      ]

      let newVipLevel = 0
      for (const level of VIP_LEVELS) {
        if (totalDeposits >= level.depositsRequired && totalBets >= level.betsRequired) {
          newVipLevel = level.level
        }
      }

      if (newVipLevel > user.vipLevel) {
        user.vipLevel = newVipLevel
      }

      await user.save()
    } catch (error) {
      console.error('Update VIP level error:', error)
    }
  }
}

export default new AffiliateService()
