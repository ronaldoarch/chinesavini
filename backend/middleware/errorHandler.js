export const errorHandler = (err, req, res, next) => {
  let error = { ...err }
  error.message = err.message

  // Log error for debugging
  console.error('Error:', err)

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Recurso não encontrado'
    error = { message, statusCode: 404 }
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0]
    let message = 'Valor duplicado'
    
    if (field === 'username') {
      message = 'Este username já está em uso'
    } else if (field === 'phone') {
      message = 'Este telefone já está cadastrado'
    } else if (field === 'referralCode') {
      message = 'Código de referência já existe'
    }
    
    error = { message, statusCode: 400 }
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ')
    error = { message, statusCode: 400 }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Token inválido'
    error = { message, statusCode: 401 }
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expirado'
    error = { message, statusCode: 401 }
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Erro no servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}
