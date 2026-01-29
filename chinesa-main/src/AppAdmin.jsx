import React from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import AdminLayout from './components/AdminLayout'
import './styles/App.css'

function AppAdmin() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AdminLayout />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default AppAdmin
