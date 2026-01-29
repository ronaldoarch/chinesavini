import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import AdminDashboard from '../pages/admin/AdminDashboard'
import AdminUsers from '../pages/admin/AdminUsers'
import AdminTransactions from '../pages/admin/AdminTransactions'
import './AdminLayout.css'

function AdminLayout() {
  const { user, isAdmin, isAuthenticated, loading, logout, refreshUser } = useAuth()
  const [activePage, setActivePage] = useState('dashboard')
  const [refreshing, setRefreshing] = useState(false)
  const [hasTriedRefresh, setHasTriedRefresh] = useState(false)
  
  // Add admin class to body for CSS overrides
  useEffect(() => {
    document.body.classList.add('admin-page')
    return () => {
      document.body.classList.remove('admin-page')
    }
  }, [])
  
  // Reset refresh flag when user changes
  useEffect(() => {
    setHasTriedRefresh(false)
  }, [user?.id])
  
  // Try to refresh user data if not admin but authenticated (only once per user)
  useEffect(() => {
    if (isAuthenticated && !isAdmin && user && !loading && !refreshing && !hasTriedRefresh) {
      // User is logged in but not admin - try refreshing once
      const tryRefresh = async () => {
        setRefreshing(true)
        setHasTriedRefresh(true)
        await refreshUser()
        setRefreshing(false)
      }
      tryRefresh()
    }
  }, [isAuthenticated, isAdmin, user, loading, refreshing, hasTriedRefresh, refreshUser])

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
          {refreshing ? (
            <p>Atualizando informações do usuário...</p>
          ) : (
            <>
              <p>Você não tem permissão para acessar o painel administrativo.</p>
              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px', textAlign: 'left' }}>
                <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
                  <strong>Usuário logado:</strong> {user?.username || 'N/A'}
                </p>
                <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
                  <strong>Role atual no token:</strong> <span style={{ color: user?.role === 'admin' || user?.role === 'superadmin' ? '#10b981' : '#ef4444' }}>{user?.role || 'user'}</span>
                </p>
                <p style={{ fontSize: '14px', opacity: 0.9 }}>
                  <strong>Role necessário:</strong> admin ou superadmin
                </p>
              </div>
              <p style={{ marginTop: '20px', fontSize: '14px', opacity: 0.8 }}>
                ⚠️ Se você acabou de tornar este usuário admin, o token precisa ser atualizado.
              </p>
              <div style={{ marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={async () => {
                    setRefreshing(true)
                    await refreshUser()
                    setRefreshing(false)
                    // Force reload after refresh
                    setTimeout(() => window.location.reload(), 1000)
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  🔄 Atualizar Token Agora
                </button>
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    window.location.href = '/'
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  🔐 Fazer Logout e Login Novamente
                </button>
              </div>
              <p style={{ marginTop: '20px', fontSize: '12px', opacity: 0.7, textAlign: 'center' }}>
                💡 <strong>Recomendado:</strong> Faça logout e login novamente para garantir que o token seja atualizado.
              </p>
            </>
          )}
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
