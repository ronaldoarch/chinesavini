import mongoose from 'mongoose'

/** Tracks processed iGameWin transactions for idempotency (avoid double debit/credit) */
const gameTxnLogSchema = new mongoose.Schema(
  {
    txnId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    gameType: { type: String },
    providerCode: { type: String },
    gameCode: { type: String },
    txnType: { type: String },
    betCents: { type: Number, default: 0 },
    winCents: { type: Number, default: 0 },
    balanceAfterReais: { type: Number }
  },
  { timestamps: true }
)

gameTxnLogSchema.index({ user: 1, createdAt: -1 })

const GameTxnLog = mongoose.model('GameTxnLog', gameTxnLogSchema)
export default GameTxnLog
