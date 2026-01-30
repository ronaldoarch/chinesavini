import mongoose from 'mongoose'

const webhookLogSchema = new mongoose.Schema(
  {
    source: { type: String, required: true }, // 'pix', 'pix-withdraw', etc.
    path: { type: String, required: true },
    method: { type: String, default: 'POST' },
    bodySummary: { type: String }, // first N chars of body (no sensitive data)
    bodyKeys: [String], // top-level keys for quick filter
    status: { type: String, default: 'received' }, // received, processed, error
    responseStatus: { type: Number }, // 200, 400, etc.
    processedAt: { type: Date },
    errorMessage: { type: String },
    idTransaction: { type: String },
    ip: { type: String }
  },
  { timestamps: true }
)

webhookLogSchema.index({ createdAt: -1 })
webhookLogSchema.index({ source: 1, createdAt: -1 })

const WebhookLog = mongoose.model('WebhookLog', webhookLogSchema)
export default WebhookLog
