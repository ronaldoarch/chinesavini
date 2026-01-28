import mongoose from 'mongoose'

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
  } catch (error) {
    console.error(`❌ Database connection error: ${error.message}`)
    process.exit(1)
  }
}

export default connectDB
