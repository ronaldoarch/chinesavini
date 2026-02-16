import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username é obrigatório'],
      unique: true,
      trim: true,
      minlength: [3, 'Username deve ter no mínimo 3 caracteres'],
      maxlength: [20, 'Username deve ter no máximo 20 caracteres'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username pode conter apenas letras, números e underscore']
    },
    phone: {
      type: String,
      required: [true, 'Telefone é obrigatório'],
      unique: true,
      trim: true,
      match: [/^\+55\d{10,11}$/, 'Telefone deve estar no formato brasileiro']
    },
    password: {
      type: String,
      required: [true, 'Senha é obrigatória'],
      minlength: [6, 'Senha deve ter no mínimo 6 caracteres']
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, 'Saldo não pode ser negativo']
    },
    bonusBalance: {
      type: Number,
      default: 0,
      min: [0, 'Saldo bônus não pode ser negativo']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    vipLevel: {
      type: Number,
      default: 0,
      min: 0,
      max: 8
    },
    claimedVipBonuses: {
      type: [Number],
      default: []
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'superadmin'],
      default: 'user'
    },
    totalDeposits: {
      type: Number,
      default: 0
    },
    totalWithdrawals: {
      type: Number,
      default: 0
    },
    totalBets: {
      type: Number,
      default: 0
    },
    affiliateBalance: {
      type: Number,
      default: 0,
      min: 0
    },
    totalReferrals: {
      type: Number,
      default: 0
    },
    qualifiedReferrals: {
      type: Number,
      default: 0
    },
    // Configuração de afiliado: bônus % sobre depósito (padrão 20%, admin pode mudar para 50% etc)
    affiliateDepositBonusPercent: {
      type: Number,
      default: 20,
      min: 0,
      max: 100
    },
    // Se true: ganha % sobre todos os depósitos. Se false: só sobre o primeiro depósito
    affiliateAllDeposits: {
      type: Boolean,
      default: false
    },
    lastLogin: {
      type: Date
    }
  },
  {
    timestamps: true
  }
)

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next()
  }

  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Generate referral code before saving
userSchema.pre('save', async function (next) {
  if (!this.referralCode) {
    // Generate a unique referral code based on username and random number
    const randomNum = Math.floor(Math.random() * 10000)
    this.referralCode = `${this.username}${randomNum}`.toLowerCase().substring(0, 10)
  }
  next()
})

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

// Method to format phone number
userSchema.methods.formatPhone = function () {
  const digits = this.phone.replace(/\D/g, '')
  if (digits.length === 13) {
    // +55 + 11 digits
    const ddd = digits.slice(2, 4)
    const firstPart = digits.slice(4, 9)
    const secondPart = digits.slice(9)
    return `(${ddd}) ${firstPart}-${secondPart}`
  }
  return this.phone
}

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.password
  return obj
}

const User = mongoose.model('User', userSchema)

export default User
