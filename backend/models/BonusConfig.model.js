import mongoose from 'mongoose'

const depositTierSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  bonusPercent: { type: Number, required: true, min: 0, max: 100 }
}, { _id: false })

const chestTierSchema = new mongoose.Schema({
  referralsRequired: { type: Number, required: true },
  rewardAmount: { type: Number, required: true, min: 0 }
}, { _id: false })

const bonusConfigSchema = new mongoose.Schema(
  {
    // Valor mínimo de depósito (R$)
    minDeposit: {
      type: Number,
      default: 10,
      min: 1,
      max: 100000
    },
    // Valor máximo de depósito (R$)
    maxDeposit: {
      type: Number,
      default: 10000,
      min: 1,
      max: 1000000
    },
    // Valor mínimo de saque (R$)
    minWithdraw: {
      type: Number,
      default: 20,
      min: 1,
      max: 100000
    },
    // Valor máximo de saque (R$)
    maxWithdraw: {
      type: Number,
      default: 5000,
      min: 1,
      max: 1000000
    },
    // Bônus no primeiro depósito (% sobre o valor) - usuários normais
    firstDepositBonusPercent: {
      type: Number,
      default: 20,
      min: 0,
      max: 100
    },
    // Faixas de valor de depósito com % de bônus (ex: R$ 20 = +2%)
    depositTiers: {
      type: [depositTierSchema],
      default: [
        { amount: 10, bonusPercent: 0 },
        { amount: 20, bonusPercent: 2 },
        { amount: 30, bonusPercent: 2 },
        { amount: 40, bonusPercent: 2 },
        { amount: 50, bonusPercent: 5 },
        { amount: 75, bonusPercent: 5 },
        { amount: 100, bonusPercent: 10 }
      ]
    },
    // Bônus exclusivo para afiliados (% ou valor fixo - usar percent sobre depósito do indicado)
    affiliateBonusPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    // Recompensas dos baús por número de indicados qualificados
    chestTiers: {
      type: [chestTierSchema],
      default: [
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
    }
  },
  { timestamps: true }
)

bonusConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne()
  if (!config) {
    config = await this.create({})
  }
  return config
}

export default mongoose.model('BonusConfig', bonusConfigSchema)
