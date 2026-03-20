import mongoose from 'mongoose'

const gatewayConfigSchema = new mongoose.Schema(
  {
    // Provedor: gatebox | nxgate | escalecyber
    provider: {
      type: String,
      enum: ['gatebox', 'nxgate', 'escalecyber'],
      default: 'gatebox'
    },
    // Gatebox credentials (username/password)
    username: {
      type: String,
      required: false
    },
    password: {
      type: String,
      required: false
    },
    // NxGate credentials (OAuth2: clientId + clientSecret + hmacSecret)
    // Escale Cyber usa apenas apiKey (X-API-Key)
    clientId: {
      type: String,
      required: false
    },
    apiKey: {
      type: String,
      required: false
    },
    hmacSecret: {
      type: String,
      required: false
    },
    webhookBaseUrl: {
      type: String,
      required: true
    },
    apiUrl: {
      type: String,
      default: 'https://api.gatebox.com.br'
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
        provider: 'gatebox',
        username: process.env.GATEBOX_USERNAME || '',
        password: process.env.GATEBOX_PASSWORD || '',
        clientId: process.env.NXGATE_CLIENT_ID || '',
        apiKey: process.env.NXGATE_CLIENT_SECRET || process.env.NXGATE_API_KEY || process.env.ESCALECYBER_API_KEY || '',
        webhookBaseUrl: process.env.WEBHOOK_BASE_URL || 'http://localhost:5000',
        apiUrl: 'https://api.gatebox.com.br',
        defaultCpf: process.env.GATEBOX_DEFAULT_CPF || '000.000.000-00'
      })
  }
  return config
}

export default mongoose.model('GatewayConfig', gatewayConfigSchema)
