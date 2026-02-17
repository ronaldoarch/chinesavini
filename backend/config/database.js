import mongoose from 'mongoose'
import User from '../models/User.model.js'
import Transaction from '../models/Transaction.model.js'

const connectDB = async () => {
  try {
    // Support both MongoDB and PostgreSQL connection strings
    // If DATABASE_URL is provided (PostgreSQL), use it; otherwise use MONGODB_URI
    const dbUri = process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/fortune-bet'
    
    // Check if it's a PostgreSQL connection string
    if (dbUri.startsWith('postgres://') || dbUri.startsWith('postgresql://')) {
      // For PostgreSQL, we'll still use Mongoose but with a MongoDB-compatible connection
      // In production, you might want to switch to Sequelize or Prisma
      console.log('⚠️  PostgreSQL detected. MongoDB/Mongoose is being used.')
      console.log('💡 Consider migrating to Sequelize or Prisma for PostgreSQL support.')
    }
    
    const conn = await mongoose.connect(dbUri)

    console.log(`✅ Database Connected: ${conn.connection.host || 'Connected'}`)

    // Migração: usuários já cadastrados sem o campo recebem 20% (admin altera para 50% os afiliados escolhidos)
    const result = await User.updateMany(
      { affiliateDepositBonusPercent: { $exists: false } },
      { $set: { affiliateDepositBonusPercent: 20 } }
    )
    if (result.modifiedCount > 0) {
      console.log(`📋 Migração: ${result.modifiedCount} usuário(s) atualizado(s) com bônus padrão 20%`)
    }

    // Remover índice TTL de transações (evita exclusão automática do histórico)
    try {
      await Transaction.collection.dropIndex('expiresAt_1')
      console.log('📋 Removido índice TTL de transações (histórico preservado)')
    } catch (e) {
      if (!/index.*not found|IndexNotFound/i.test(e.message || '')) {
        console.warn('⚠️ Índice TTL de transações:', e.message)
      }
    }
  } catch (error) {
    console.error(`❌ Database connection error: ${error.message}`)
    process.exit(1)
  }
}

export default connectDB
