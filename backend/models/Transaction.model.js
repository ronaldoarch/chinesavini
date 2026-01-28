import mongoose from 'mongoose'

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['deposit', 'withdraw'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'cancelled', 'processing'],
      default: 'pending'
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Valor deve ser maior que zero']
    },
    fee: {
      type: Number,
      default: 0
    },
    netAmount: {
      type: Number,
      required: true
    },
    // Dados do PIX
    idTransaction: {
      type: String,
      sparse: true
    },
    qrCode: {
      type: String
    },
    qrCodeImage: {
      type: String
    },
    pixCopyPaste: {
      type: String
    },
    // Dados do pagador (depósito)
    payerName: {
      type: String
    },
    payerDocument: {
      type: String
    },
    // Dados do recebedor (saque)
    pixKey: {
      type: String
    },
    pixKeyType: {
      type: String,
      enum: ['CPF', 'CNPJ', 'PHONE', 'EMAIL', 'RANDOM']
    },
    // Webhook data
    webhookUrl: {
      type: String
    },
    webhookReceived: {
      type: Boolean,
      default: false
    },
    webhookData: {
      type: mongoose.Schema.Types.Mixed
    },
    // Timestamps
    expiresAt: {
      type: Date
    },
    paidAt: {
      type: Date
    },
    failedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
)

// Indexes
transactionSchema.index({ user: 1, createdAt: -1 })
transactionSchema.index({ idTransaction: 1 }, { unique: true, sparse: true })
transactionSchema.index({ status: 1 })
transactionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Method to check if transaction is expired
transactionSchema.methods.isExpired = function () {
  if (!this.expiresAt) return false
  return new Date() > this.expiresAt
}

// Method to update status
transactionSchema.methods.updateStatus = function (status, webhookData = null) {
  this.status = status
  if (webhookData) {
    this.webhookData = webhookData
    this.webhookReceived = true
  }
  
  if (status === 'paid') {
    this.paidAt = new Date()
  } else if (status === 'failed') {
    this.failedAt = new Date()
  }
  
  return this.save()
}

const Transaction = mongoose.model('Transaction', transactionSchema)

export default Transaction
