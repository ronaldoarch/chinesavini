import React from 'react'
import { AuthProvider } from './contexts/AuthContext'
import AdminLayout from './components/AdminLayout'
import './styles/App.css'

function AppAdmin() {
  return (
    <AuthProvider>
      <AdminLayout />
    </AuthProvider>
  )
}

export default AppAdmin
