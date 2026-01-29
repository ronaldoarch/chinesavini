import mongoose from 'mongoose'

const themeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: false
    },
    colors: {
      primaryPurple: { type: String, default: '#3f1453' },
      secondaryPurple: { type: String, default: '#561878' },
      darkPurple: { type: String, default: '#43135d' },
      lightPurple: { type: String, default: '#7a2b9e' },
      gold: { type: String, default: '#c59728' },
      yellow: { type: String, default: '#FFC107' },
      green: { type: String, default: '#4CAF50' },
      red: { type: String, default: '#FF0000' },
      orange: { type: String, default: '#FFA500' },
      grey: { type: String, default: '#9E9E9E' },
      textWhite: { type: String, default: '#FFFFFF' },
      textGrey: { type: String, default: '#9E9E9E' },
      bottomNavBg: { type: String, default: '#3F1453' },
      bottomNavBorder: { type: String, default: 'rgba(197, 151, 40, 0.2)' },
      bottomNavIcon: { type: String, default: '#E1B54A' },
      bottomNavText: { type: String, default: '#E1B54A' },
      headerBg: { type: String, default: '#3F1453' },
      headerBorderColor: { type: String, default: 'rgba(197, 151, 40, 0.2)' },
      headerIcon: { type: String, default: '#E1B54A' },
      headerText: { type: String, default: '#FFFFFF' },
      footerBg: { type: String, default: '#3F1453' },
      footerBorder: { type: String, default: 'rgba(197, 151, 40, 0.2)' },
      footerText: { type: String, default: '#FFFFFF' },
      footerMuted: { type: String, default: 'rgba(255, 255, 255, 0.7)' }
    },
    icons: {
      // Store icon paths/URLs if needed
      logo: { type: String, default: '/logo_plataforma.png' },
      // Add more icon references as needed
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
)

// Ensure only one active theme
themeSchema.pre('save', async function(next) {
  if (this.isActive && this.isModified('isActive')) {
    await mongoose.model('Theme').updateMany(
      { _id: { $ne: this._id } },
      { $set: { isActive: false } }
    )
  }
  next()
})

// Get active theme
themeSchema.statics.getActiveTheme = async function() {
  let theme = await this.findOne({ isActive: true })
  if (!theme) {
    // Create default theme if none exists
    theme = await this.create({
      name: 'Tema Padrão',
      isActive: true,
      colors: {
        primaryPurple: '#3f1453',
        secondaryPurple: '#561878',
        darkPurple: '#43135d',
        lightPurple: '#7a2b9e',
        gold: '#c59728',
        yellow: '#FFC107',
        green: '#4CAF50',
        red: '#FF0000',
        orange: '#FFA500',
        grey: '#9E9E9E',
        textWhite: '#FFFFFF',
        textGrey: '#9E9E9E',
        bottomNavBg: '#3F1453',
        bottomNavBorder: 'rgba(197, 151, 40, 0.2)',
        bottomNavIcon: '#E1B54A',
        bottomNavText: '#E1B54A',
        headerBg: '#3F1453',
        headerBorderColor: 'rgba(197, 151, 40, 0.2)',
        headerIcon: '#E1B54A',
        headerText: '#FFFFFF',
        footerBg: '#3F1453',
        footerBorder: 'rgba(197, 151, 40, 0.2)',
        footerText: '#FFFFFF',
        footerMuted: 'rgba(255, 255, 255, 0.7)'
      }
    })
  }
  return theme
}

export default mongoose.model('Theme', themeSchema)
