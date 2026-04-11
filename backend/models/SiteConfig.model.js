import mongoose from 'mongoose'

const siteConfigSchema = new mongoose.Schema(
  {
    siteName: {
      type: String,
      trim: true,
      default: 'Plataforma',
      maxlength: [80, 'Nome do site muito longo']
    },
    // Texto extra para preview de link (WhatsApp, Telegram, etc.) — embutido no HTML no build
    shareDescription: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Descrição muito longa']
    },
    // URL absoluta opcional para og:image; vazio = build usa logo ativa (GET /api/site-config logoImagePath)
    shareImageUrl: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'URL da imagem muito longa']
    }
  },
  { timestamps: true }
)

siteConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne()
  if (!config) {
    config = await this.create({})
  }
  return config
}

export default mongoose.model('SiteConfig', siteConfigSchema)
