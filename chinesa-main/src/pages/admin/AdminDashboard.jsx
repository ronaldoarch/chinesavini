import React, { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import './AdminDashboard.css'

function AdminDashboard() {
  const { user, isAdmin } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isAdmin) {
      setError('Acesso negado. Apenas administradores podem acessar esta página.')
      setLoading(false)
      return
    }

    loadDashboard()
  }, [isAdmin])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const response = await api.getDashboard()
      if (response.success) {
        setDashboard(response.data)
      } else {
        setError(response.message || 'Erro ao carregar dashboard')
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar dashboard')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value || 0)

  if (!isAdmin) {
    return (
      <div className="admin-container">
        <div className="admin-error">
          <i className="fa-solid fa-lock"></i>
          <h2>Acesso Negado</h2>
          <p>Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-loading">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <p>Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="admin-container">
        <div className="admin-error">
          <i className="fa-solid fa-circle-exclamation"></i>
          <p>{error}</p>
          <button onClick={loadDashboard}>Tentar novamente</button>
        </div>
      </div>
    )
  }

  if (!dashboard) return null

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>
          <i className="fa-solid fa-chart-line"></i>
          Dashboard Administrativo
        </h1>
        <div className="admin-user-info">
          <span>Bem-vindo, {user?.username}</span>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Users Stats */}
        <div className="dashboard-card">
          <div className="card-header">
            <i className="fa-solid fa-users"></i>
            <h3>Usuários</h3>
          </div>
          <div className="card-content">
            <div className="stat-item">
              <span className="stat-label">Total</span>
              <span className="stat-value">{dashboard.users.total}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Ativos</span>
              <span className="stat-value">{dashboard.users.active}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Novos Hoje</span>
              <span className="stat-value highlight">{dashboard.users.newToday}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Novos Este Mês</span>
              <span className="stat-value">{dashboard.users.newThisMonth}</span>
            </div>
          </div>
        </div>

        {/* Deposits Stats */}
        <div className="dashboard-card">
          <div className="card-header">
            <i className="fa-solid fa-arrow-down"></i>
            <h3>Depósitos</h3>
          </div>
          <div className="card-content">
            <div className="stat-item">
              <span className="stat-label">Total</span>
              <span className="stat-value">{formatCurrency(dashboard.transactions.deposits.total)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Quantidade</span>
              <span className="stat-value">{dashboard.transactions.deposits.count}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Hoje</span>
              <span className="stat-value highlight">{formatCurrency(dashboard.transactions.deposits.today)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Este Mês</span>
              <span className="stat-value">{formatCurrency(dashboard.transactions.deposits.thisMonth)}</span>
            </div>
            <div className="stat-item warning">
              <span className="stat-label">Pendentes</span>
              <span className="stat-value">{dashboard.transactions.deposits.pending}</span>
            </div>
          </div>
        </div>

        {/* Withdrawals Stats */}
        <div className="dashboard-card">
          <div className="card-header">
            <i className="fa-solid fa-arrow-up"></i>
            <h3>Saques</h3>
          </div>
          <div className="card-content">
            <div className="stat-item">
              <span className="stat-label">Total</span>
              <span className="stat-value">{formatCurrency(dashboard.transactions.withdrawals.total)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Quantidade</span>
              <span className="stat-value">{dashboard.transactions.withdrawals.count}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Hoje</span>
              <span className="stat-value highlight">{formatCurrency(dashboard.transactions.withdrawals.today)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Este Mês</span>
              <span className="stat-value">{formatCurrency(dashboard.transactions.withdrawals.thisMonth)}</span>
            </div>
            <div className="stat-item warning">
              <span className="stat-label">Pendentes</span>
              <span className="stat-value">{dashboard.transactions.withdrawals.pending}</span>
            </div>
          </div>
        </div>

        {/* Balance Stats */}
        <div className="dashboard-card">
          <div className="card-header">
            <i className="fa-solid fa-wallet"></i>
            <h3>Saldo Total</h3>
          </div>
          <div className="card-content">
            <div className="stat-item large">
              <span className="stat-value">{formatCurrency(dashboard.balance.total)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Saldo de todos os usuários</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="dashboard-section">
        <h2>
          <i className="fa-solid fa-clock-rotate-left"></i>
          Transações Recentes
        </h2>
        <div className="transactions-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuário</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    Nenhuma transação encontrada
                  </td>
                </tr>
              ) : (
                dashboard.recentTransactions.map((transaction) => (
                  <tr key={transaction._id}>
                    <td className="transaction-id">{transaction._id.toString().slice(-8)}</td>
                    <td>{transaction.user?.username || 'N/A'}</td>
                    <td>
                      <span className={`badge ${transaction.type === 'deposit' ? 'badge-success' : 'badge-warning'}`}>
                        {transaction.type === 'deposit' ? 'Depósito' : 'Saque'}
                      </span>
                    </td>
                    <td className="amount">{formatCurrency(transaction.amount)}</td>
                    <td>
                      <span className={`badge badge-${transaction.status}`}>
                        {transaction.status === 'paid' ? 'Pago' : transaction.status === 'pending' ? 'Pendente' : transaction.status === 'failed' ? 'Falhou' : transaction.status}
                      </span>
                    </td>
                    <td>{new Date(transaction.createdAt).toLocaleString('pt-BR')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
