import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import connectDB from './config/database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import authRoutes from './routes/auth.routes.js'
import paymentRoutes from './routes/payment.routes.js'
import webhookRoutes from './routes/webhook.routes.js'
import adminRoutes from './routes/admin.routes.js'
import gamesRoutes from './routes/games.routes.js'
import gatewayRoutes from './routes/gateway.routes.js'
import themeRoutes from './routes/theme.routes.js'
import chestRoutes from './routes/chest.routes.js'
import vipRoutes from './routes/vip.routes.js'
import affiliateRoutes from './routes/affiliate.routes.js'
import bannerRoutes from './routes/banner.routes.js'
import bonusRoutes from './routes/bonus.routes.js'
import popupRoutes from './routes/popup.routes.js'
import jackpotRoutes from './routes/jackpot.routes.js'
import supportRoutes from './routes/support.routes.js'
import promotionRoutes from './routes/promotion.routes.js'
import trackingRoutes from './routes/tracking.routes.js'
import pixAccountRoutes from './routes/pixAccount.routes.js'
import { errorHandler } from './middleware/errorHandler.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Trust proxy - Required when behind a reverse proxy (Colify, Railway, etc.)
app.set('trust proxy', true)

// Connect to database
connectDB()

// Middleware
// Configure helmet to allow images and static files
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}))

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve uploaded images - use UPLOADS_PATH if set (for persistent storage volume mount)
const uploadsPath = process.env.UPLOADS_PATH || path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true })
  console.log('📁 Criado diretório uploads:', uploadsPath)
}
console.log('📁 Servindo uploads em:', uploadsPath)
app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res, filePath) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin')
    res.set('Access-Control-Allow-Origin', '*')
  }
}))
// Optional: serve frontend public for local dev (banners, etc.)
const publicPath = path.join(__dirname, '../chinesa-main/public')
app.use(express.static(publicPath, {
  setHeaders: (res, path) => {
    if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.gif') || path.endsWith('.webp')) {
      res.set('Cross-Origin-Resource-Policy', 'cross-origin')
      res.set('Access-Control-Allow-Origin', '*')
    }
  }
}))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/webhooks', webhookRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/games', gamesRoutes)
app.use('/api/gateway', gatewayRoutes)
app.use('/api/theme', themeRoutes)
app.use('/api/chests', chestRoutes)
app.use('/api/vip', vipRoutes)
app.use('/api/affiliate', affiliateRoutes)
app.use('/api/banners', bannerRoutes)
app.use('/api/bonus', bonusRoutes)
app.use('/api/popups', popupRoutes)
app.use('/api/jackpot', jackpotRoutes)
app.use('/api/support', supportRoutes)
app.use('/api/promotions', promotionRoutes)
app.use('/api/admin/tracking', trackingRoutes)
app.use('/api/pix-accounts', pixAccountRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'FortuneBet API is running' })
})

// Error handling middleware
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`)
})
