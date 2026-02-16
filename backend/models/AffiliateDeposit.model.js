import mongoose from 'mongoose'

/**
 * Rastreia depósitos de usuários indicados por afiliados
 * Usado para calcular bônus % sobre depósito (comissão do afiliado)
 */
const affiliateDepositSchema = new mongoose.Schema(
  {
    affiliate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    referredUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: true,
      unique: true
    },
    depositAmount: {
      type: Number,
      required: true,
      min: 0
    },
    isFirstDeposit: {
      type: Boolean,
      default: false
    },
    // Percentual de bônus aplicado neste depósito
    depositBonusPercent: {
      type: Number,
      default: 0
    },
    // Valor do bônus pago ao afiliado (vai para saldo real sacável)
    depositBonusAmount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
)

// Índices compostos
affiliateDepositSchema.index({ affiliate: 1, referredUser: 1, createdAt: -1 })
affiliateDepositSchema.index({ referredUser: 1, isFirstDeposit: 1 })

export default mongoose.model('AffiliateDeposit', affiliateDepositSchema)
