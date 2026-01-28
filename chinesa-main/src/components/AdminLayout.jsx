import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import AdminDashboard from '../pages/admin/AdminDashboard'
import AdminUsers from '../pages/admin/AdminUsers'
import AdminTransactions from '../pages/admin/AdminTransactions'
import './AdminLayout.css'

function AdminLayout() {
  const { user, isAdmin, isAuthenticated, loading, logout } = useAuth()
  const [activePage, setActivePage] = useState('dashboard')

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-loading">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <p>Verificando permissões...</p>
        </div>
      </div>
    )
  }

  // Show message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="admin-container">
        <div className="admin-error">
          <i className="fa-solid fa-lock"></i>
          <h2>Acesso Negado</h2>
          <p>Você precisa fazer login para acessar o painel administrativo.</p>
          <button
            type="button"
            onClick={() => {
              // Redirect to main app login
              window.location.href = '/'
            }}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Ir para Login
          </button>
        </div>
      </div>
    )
  }

  // Show message if not admin
  if (!isAdmin) {
    return (
      <div className="admin-container">
        <div className="admin-error">
          <i className="fa-solid fa-lock"></i>
          <h2>Acesso Negado</h2>
          <p>Você não tem permissão para acessar o painel administrativo.</p>
          <p style={{ marginTop: '10px', fontSize: '14px', opacity: 0.8 }}>
            Usuário logado: <strong>{user?.username}</strong> (Role: <strong>{user?.role || 'user'}</strong>)
          </p>
          <p style={{ marginTop: '10px', fontSize: '14px', opacity: 0.8 }}>
            Para acessar, você precisa ter role <strong>admin</strong> ou <strong>superadmin</strong>.
          </p>
          <button
            type="button"
            onClick={() => {
              window.location.href = '/'
            }}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Voltar para o Site
          </button>
        </div>
      </div>
    )
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <AdminDashboard />
      case 'users':
        return <AdminUsers />
      case 'transactions':
        return <AdminTransactions />
      default:
        return <AdminDashboard />
    }
  }

  return (
    <div className="admin-layout">
      <nav className="admin-sidebar">
        <div className="sidebar-header">
          <h2>
            <i className="fa-solid fa-shield-halved"></i>
            Admin Panel
          </h2>
        </div>
        <ul className="sidebar-menu">
          <li>
            <button
              className={activePage === 'dashboard' ? 'active' : ''}
              onClick={() => setActivePage('dashboard')}
            >
              <i className="fa-solid fa-chart-line"></i>
              <span>Dashboard</span>
            </button>
          </li>
          <li>
            <button
              className={activePage === 'users' ? 'active' : ''}
              onClick={() => setActivePage('users')}
            >
              <i className="fa-solid fa-users"></i>
              <span>Usuários</span>
            </button>
          </li>
          <li>
            <button
              className={activePage === 'transactions' ? 'active' : ''}
              onClick={() => setActivePage('transactions')}
            >
              <i className="fa-solid fa-exchange-alt"></i>
              <span>Transações</span>
            </button>
          </li>
        </ul>
        <div className="sidebar-footer">
          <button onClick={logout} className="logout-btn">
            <i className="fa-solid fa-sign-out-alt"></i>
            <span>Sair</span>
          </button>
        </div>
      </nav>
      <main className="admin-main">
        {renderPage()}
      </main>
    </div>
  )
}

export default AdminLayout
