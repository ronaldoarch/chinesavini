import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import AdminDashboard from '../pages/admin/AdminDashboard'
import AdminUsers from '../pages/admin/AdminUsers'
import AdminTransactions from '../pages/admin/AdminTransactions'
import './AdminLayout.css'

function AdminLayout() {
  const { isAdmin, logout } = useAuth()
  const [activePage, setActivePage] = useState('dashboard')

  if (!isAdmin) {
    return (
      <div className="admin-container">
        <div className="admin-error">
          <i className="fa-solid fa-lock"></i>
          <h2>Acesso Negado</h2>
          <p>Você não tem permissão para acessar o painel administrativo.</p>
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
