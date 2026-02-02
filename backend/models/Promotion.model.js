import mongoose from 'mongoose'

const promotionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    imageUrl: { type: String, required: true },
    actionType: { type: String, default: 'deposit', enum: ['deposit', 'withdraw', 'invite'] },
    bonusType: {
      type: String,
      default: '',
      enum: ['', 'first-deposit', 'deposit-tier', 'affiliate', 'chest']
    },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
)

promotionSchema.index({ order: 1 })
promotionSchema.index({ isActive: 1, order: 1 })

export default mongoose.model('Promotion', promotionSchema)
