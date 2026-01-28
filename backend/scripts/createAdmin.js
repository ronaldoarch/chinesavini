import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.model.js'

dotenv.config()

const createAdmin = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fortune-bet')
    console.log('✅ Connected to MongoDB')

    // Get arguments from command line
    const args = process.argv.slice(2)
    const username = args[0]
    const role = args[1] || 'admin' // admin or superadmin

    if (!username) {
      console.error('❌ Por favor, forneça o username do usuário')
      console.log('Uso: node scripts/createAdmin.js <username> [admin|superadmin]')
      process.exit(1)
    }

    if (role !== 'admin' && role !== 'superadmin') {
      console.error('❌ Role deve ser "admin" ou "superadmin"')
      process.exit(1)
    }

    // Find user
    const user = await User.findOne({ username: username.toLowerCase() })

    if (!user) {
      console.error(`❌ Usuário "${username}" não encontrado`)
      console.log('💡 Crie o usuário primeiro através do registro normal')
      process.exit(1)
    }

    // Update user role
    user.role = role
    await user.save()

    console.log(`✅ Usuário "${username}" agora é ${role}`)
    console.log(`📧 Você pode fazer login em http://localhost:3000/admin.html`)

    process.exit(0)
  } catch (error) {
    console.error('❌ Erro:', error.message)
    process.exit(1)
  }
}

createAdmin()
