import mongoose from 'mongoose'

const supportConfigSchema = new mongoose.Schema(
  {
    whatsappUrl: { type: String, default: '' },
    telegramUrl: { type: String, default: '' },
    instagramUrl: { type: String, default: '' }
  },
  { timestamps: true }
)

supportConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne()
  if (!config) {
    config = await this.create({})
  }
  return config
}

export default mongoose.model('SupportConfig', supportConfigSchema)
