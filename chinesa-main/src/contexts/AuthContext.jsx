import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await api.getCurrentUser()
      if (response.success) {
        setUser(response.data.user)
        setIsAuthenticated(true)
      } else {
        localStorage.removeItem('token')
      }
    } catch (error) {
      console.error('Auth check error:', error)
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (username, password) => {
    try {
      setError(null)
      const response = await api.login({ username, password })

      if (response.success) {
        localStorage.setItem('token', response.data.token)
        setUser(response.data.user)
        setIsAuthenticated(true)
        return { success: true, data: response.data }
      }

      return { success: false, message: response.message }
    } catch (error) {
      const message = error.message || 'Erro ao fazer login'
      setError(message)
      return { success: false, message }
    }
  }

  const register = async (userData) => {
    try {
      setError(null)
      const response = await api.register(userData)

      if (response.success) {
        localStorage.setItem('token', response.data.token)
        setUser(response.data.user)
        setIsAuthenticated(true)
        return { success: true, data: response.data }
      }

      return { success: false, message: response.message, errors: response.errors }
    } catch (error) {
      const message = error.message || 'Erro ao realizar cadastro'
      setError(message)
      return { success: false, message }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setIsAuthenticated(false)
    setError(null)
  }

  const updateUser = (userData) => {
    setUser((prev) => ({ ...prev, ...userData }))
  }

  const refreshUser = async () => {
    try {
      const response = await api.getCurrentUser()
      if (response.success) {
        setUser(response.data.user)
        return { success: true, user: response.data.user }
      }
      return { success: false }
    } catch (error) {
      console.error('Error refreshing user:', error)
      return { success: false, error: error.message }
    }
  }
  
  // Auto-refresh user data when role might have changed
  useEffect(() => {
    if (isAuthenticated && user) {
      // Refresh user data every 30 seconds to catch role changes
      const interval = setInterval(() => {
        refreshUser()
      }, 30000) // 30 seconds
      
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, user])

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'
  const isSuperAdmin = user?.role === 'superadmin'

  const value = {
    user,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    loading,
    error,
    login,
    register,
    logout,
    updateUser,
    checkAuth,
    refreshUser
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
