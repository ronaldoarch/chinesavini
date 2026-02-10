import mongoose from 'mongoose'

const pixAccountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    holderName: {
      type: String,
      required: [true, 'Nome do titular é obrigatório'],
      trim: true,
      maxlength: [100, 'Nome muito longo']
    },
    pixKeyType: {
      type: String,
      required: [true, 'Tipo de chave PIX é obrigatório'],
      enum: {
        values: ['CPF', 'CNPJ', 'PHONE', 'EMAIL', 'RANDOM'],
        message: 'Tipo de chave PIX inválido'
      }
    },
    pixKey: {
      type: String,
      required: [true, 'Chave PIX é obrigatória'],
      trim: true
    },
    /** CPF do titular (11 dígitos). Obrigatório quando a chave não é CPF/CNPJ — Gatebox valida correspondência no saque. */
    holderCpf: {
      type: String,
      trim: true,
      default: null
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
)

// Índice para garantir que um usuário não tenha chaves PIX duplicadas
pixAccountSchema.index({ user: 1, pixKey: 1 }, { unique: true })

// Validação customizada para chave PIX baseada no tipo
pixAccountSchema.pre('validate', function (next) {
  if (this.pixKeyType === 'CPF' || this.pixKeyType === 'CNPJ') {
    const digits = this.pixKey.replace(/\D/g, '')
    if (this.pixKeyType === 'CPF' && digits.length !== 11) {
      this.invalidate('pixKey', 'CPF deve ter 11 dígitos')
    } else if (this.pixKeyType === 'CNPJ' && digits.length !== 14) {
      this.invalidate('pixKey', 'CNPJ deve ter 14 dígitos')
    }
  } else if (this.pixKeyType === 'EMAIL') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(this.pixKey)) {
      this.invalidate('pixKey', 'Email inválido')
    }
  } else if (this.pixKeyType === 'PHONE') {
    const digits = this.pixKey.replace(/\D/g, '')
    if (digits.length !== 11) {
      this.invalidate('pixKey', 'Telefone deve ter 11 dígitos (com DDD)')
    }
  } else if (this.pixKeyType === 'RANDOM') {
    if (this.pixKey.length < 32 || this.pixKey.length > 77) {
      this.invalidate('pixKey', 'Chave aleatória deve ter entre 32 e 77 caracteres')
    }
  }
  next()
})

const PixAccount = mongoose.model('PixAccount', pixAccountSchema)

export default PixAccount
