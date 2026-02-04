import mongoose from 'mongoose'

const gatewayConfigSchema = new mongoose.Schema(
  {
    apiKey: {
      type: String,
      required: true
    },
    webhookBaseUrl: {
      type: String,
      required: true
    },
    apiUrl: {
      type: String,
      default: 'https://nxgate.com.br/api'
    },
    defaultCpf: {
      type: String,
      default: '000.000.000-00' // CPF genérico para todos os usuários
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
)

// Ensure only one config exists
gatewayConfigSchema.statics.getConfig = async function() {
  let config = await this.findOne()
  if (!config) {
      config = await this.create({
        apiKey: process.env.NXGATE_API_KEY || '',
        webhookBaseUrl: process.env.WEBHOOK_BASE_URL || 'http://localhost:5000',
        apiUrl: 'https://nxgate.com.br/api',
        defaultCpf: process.env.NXGATE_DEFAULT_CPF || '000.000.000-00'
      })
  }
  return config
}

export default mongoose.model('GatewayConfig', gatewayConfigSchema)
