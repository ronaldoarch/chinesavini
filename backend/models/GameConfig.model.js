import mongoose from 'mongoose'

const gameConfigSchema = new mongoose.Schema(
  {
    agentCode: {
      type: String,
      required: true,
      unique: true,
      default: 'Midaslabs'
    },
    agentToken: {
      type: String,
      required: true
    },
    agentSecret: {
      type: String,
      required: true
    },
    selectedProviders: {
      type: [String],
      default: [],
      validate: {
        validator: function(v) {
          return v.length <= 3
        },
        message: 'Máximo de 3 provedores permitidos'
      }
    },
    selectedGames: {
      type: [
        {
          providerCode: String,
          gameCode: String,
          gameName: String,
          banner: String
        }
      ],
      default: [],
      validate: {
        validator: function(v) {
          // Validate 15 games per provider
          const gamesByProvider = {}
          for (const game of v) {
            gamesByProvider[game.providerCode] = (gamesByProvider[game.providerCode] || 0) + 1
            if (gamesByProvider[game.providerCode] > 15) {
              return false
            }
          }
          return true
        },
        message: 'Máximo de 15 jogos por provedor permitidos'
      }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    // RTP (Return to Player) do agente - valor entre 0 e 100 (percentual)
    agentRTP: {
      type: Number,
      default: null,
      min: 0,
      max: 100
    }
  },
  {
    timestamps: true
  }
)

// Ensure only one config exists
gameConfigSchema.statics.getConfig = async function() {
  let config = await this.findOne()
  if (!config) {
    config = await this.create({
      agentCode: process.env.IGAMEWIN_AGENT_CODE || 'Midaslabs',
      agentToken: process.env.IGAMEWIN_AGENT_TOKEN || '',
      agentSecret: process.env.IGAMEWIN_AGENT_SECRET || ''
    })
  }
  return config
}

export default mongoose.model('GameConfig', gameConfigSchema)
