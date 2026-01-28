import User from '../models/User.model.js'

export const isAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Não autorizado. Faça login primeiro.'
      })
    }

    const user = await User.findById(req.user._id)

    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas administradores podem acessar esta rota.'
      })
    }

    req.admin = user
    next()
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao verificar permissões de administrador.',
      error: error.message
    })
  }
}

export const isSuperAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Não autorizado. Faça login primeiro.'
      })
    }

    const user = await User.findById(req.user._id)

    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas super administradores podem acessar esta rota.'
      })
    }

    req.admin = user
    next()
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao verificar permissões de super administrador.',
      error: error.message
    })
  }
}
