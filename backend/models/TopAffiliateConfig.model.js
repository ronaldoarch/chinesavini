import mongoose from 'mongoose'

const prizeSchema = new mongoose.Schema({
  position: { type: Number, required: true, min: 1 },
  prizeValue: { type: Number, required: true, min: 0 }
}, { _id: false })

const topAffiliateConfigSchema = new mongoose.Schema(
  {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    // Premiação por posição (1º, 2º, 3º...) — entregue por fora da plataforma
    prizes: {
      type: [prizeSchema],
      default: [
        { position: 1, prizeValue: 500 },
        { position: 2, prizeValue: 300 },
        { position: 3, prizeValue: 200 },
        { position: 4, prizeValue: 100 },
        { position: 5, prizeValue: 50 }
      ]
    }
  },
  { timestamps: true }
)

topAffiliateConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne().sort({ createdAt: -1 })
  if (!config) {
    config = await this.create({
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias
    })
  }
  return config
}

export default mongoose.model('TopAffiliateConfig', topAffiliateConfigSchema)
