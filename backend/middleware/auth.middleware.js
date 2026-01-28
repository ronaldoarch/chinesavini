import jwt from 'jsonwebtoken'
import User from '../models/User.model.js'

export const protect = async (req, res, next) => {
  try {
    let token

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Não autorizado. Token não fornecido.'
      })
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      // Get user from token
      req.user = await User.findById(decoded.id).select('-password')

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não encontrado.'
        })
      }

      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Conta desativada.'
        })
      }

      next()
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido ou expirado.'
      })
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao verificar autenticação.',
      error: error.message
    })
  }
}
