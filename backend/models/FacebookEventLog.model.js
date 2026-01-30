import mongoose from 'mongoose'

const facebookEventLogSchema = new mongoose.Schema(
  {
    eventName: { type: String, required: true }, // Lead, CompleteRegistration, Purchase, etc.
    eventId: { type: String }, // optional deduplication id
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    payload: { type: mongoose.Schema.Types.Mixed }, // event_name, user_data, custom_data sent
    response: { type: mongoose.Schema.Types.Mixed }, // Facebook API response
    status: { type: String, required: true }, // sent, success, error
    errorMessage: { type: String },
    sentAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
)

facebookEventLogSchema.index({ sentAt: -1 })
facebookEventLogSchema.index({ eventName: 1, sentAt: -1 })

const FacebookEventLog = mongoose.model('FacebookEventLog', facebookEventLogSchema)
export default FacebookEventLog
