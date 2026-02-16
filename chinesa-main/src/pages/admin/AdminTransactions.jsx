import React, { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import './AdminTransactions.css'

function AdminTransactions() {
  const { isAdmin } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    username: ''
  })
  const [selectedTransaction, setSelectedTransaction] = useState(null)

  useEffect(() => {
    if (isAdmin) {
      loadTransactions()
    }
  }, [isAdmin, page, filters])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const params = {
        page,
        limit: 50,
        ...(filters.type && { type: filters.type }),
        ...(filters.status && { status: filters.status }),
        ...(filters.username?.trim() && { username: filters.username.trim() })
      }
      const response = await api.getAdminTransactions(params)
      if (response.success) {
        setTransactions(response.data.transactions)
        setTotalPages(response.data.pagination.pages)
      } else {
        setError(response.message || 'Erro ao carregar transações')
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar transações')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (transactionId, newStatus) => {
    if (!confirm(`Tem certeza que deseja alterar o status para "${newStatus}"?`)) {
      return
    }

    try {
      const response = await api.updateTransactionStatus(transactionId, newStatus)
      if (response.success) {
        loadTransactions()
        if (selectedTransaction?._id === transactionId) {
          setSelectedTransaction(response.data.transaction)
        }
      } else {
        alert(response.message || 'Erro ao atualizar status')
      }
    } catch (err) {
      alert(err.message || 'Erro ao atualizar status')
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
        </div>
      </div>
    )
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>
          <i className="fa-solid fa-exchange-alt"></i>
          Gerenciar Transações
        </h1>
        <div className="filters">
          <input
            type="text"
            placeholder="Filtrar por usuário (username)"
            value={filters.username}
            onChange={(e) => {
              setFilters({ ...filters, username: e.target.value })
              setPage(1)
            }}
            className="filter-username"
          />
          <select
            value={filters.type}
            onChange={(e) => {
              setFilters({ ...filters, type: e.target.value })
              setPage(1)
            }}
          >
            <option value="">Todos os tipos</option>
            <option value="deposit">Depósito</option>
            <option value="withdraw">Saque</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => {
              setFilters({ ...filters, status: e.target.value })
              setPage(1)
            }}
          >
            <option value="">Todos os status</option>
            <option value="pending">Pendente</option>
            <option value="paid">Pago</option>
            <option value="failed">Falhou</option>
            <option value="processing">Processando</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <p>Carregando transações...</p>
        </div>
      ) : error ? (
        <div className="admin-error">
          <i className="fa-solid fa-circle-exclamation"></i>
          <p>{error}</p>
          <button onClick={loadTransactions}>Tentar novamente</button>
        </div>
      ) : (
        <>
          <div className="transactions-table-container">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Usuário</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-state">
                      Nenhuma transação encontrada
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr key={transaction._id}>
                      <td className="transaction-id">
                        {transaction._id.toString().slice(-8)}
                      </td>
                      <td>{transaction.user?.username || 'N/A'}</td>
                      <td>
                        <span className={`badge ${transaction.type === 'deposit' ? 'badge-success' : 'badge-warning'}`}>
                          {transaction.type === 'deposit' ? 'Depósito' : 'Saque'}
                        </span>
                      </td>
                      <td className="amount">{formatCurrency(transaction.amount)}</td>
                      <td>
                        <span className={`badge badge-${transaction.status}`}>
                          {transaction.status === 'paid' ? 'Pago' : 
                           transaction.status === 'pending' ? 'Pendente' : 
                           transaction.status === 'failed' ? 'Falhou' : 
                           transaction.status === 'processing' ? 'Processando' : 
                           transaction.status === 'cancelled' ? 'Cancelado' : transaction.status}
                        </span>
                      </td>
                      <td>{new Date(transaction.createdAt).toLocaleString('pt-BR')}</td>
                      <td>
                        <button
                          className="btn-action"
                          onClick={() => setSelectedTransaction(transaction)}
                        >
                          <i className="fa-solid fa-eye"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              <span>
                Página {page} de {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          )}
        </>
      )}

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}

function TransactionDetailModal({ transaction, onClose, onStatusChange }) {
  const [loading, setLoading] = useState(false)
  const [fullTransaction, setFullTransaction] = useState(transaction)

  useEffect(() => {
    loadFullTransaction()
  }, [transaction._id])

  const loadFullTransaction = async () => {
    try {
      setLoading(true)
      const response = await api.getAdminTransaction(transaction._id)
      if (response.success) {
        setFullTransaction(response.data.transaction)
      }
    } catch (err) {
      console.error('Error loading transaction:', err)
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Detalhes da Transação</h2>
          <button onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        {loading ? (
          <div className="admin-loading">
            <i className="fa-solid fa-spinner fa-spin"></i>
          </div>
        ) : (
          <div className="modal-body">
            <div className="detail-grid">
              <div className="detail-item">
                <label>ID da Transação:</label>
                <span className="transaction-id">{fullTransaction._id}</span>
              </div>
              <div className="detail-item">
                <label>ID Gateway:</label>
                <span>{fullTransaction.idTransaction || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <label>Usuário:</label>
                <span>{fullTransaction.user?.username || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <label>Telefone:</label>
                <span>{fullTransaction.user?.phone || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <label>Tipo:</label>
                <span className={`badge ${fullTransaction.type === 'deposit' ? 'badge-success' : 'badge-warning'}`}>
                  {fullTransaction.type === 'deposit' ? 'Depósito' : 'Saque'}
                </span>
              </div>
              <div className="detail-item">
                <label>Valor:</label>
                <span className="amount">{formatCurrency(fullTransaction.amount)}</span>
              </div>
              <div className="detail-item">
                <label>Taxa:</label>
                <span>{formatCurrency(fullTransaction.fee || 0)}</span>
              </div>
              <div className="detail-item">
                <label>Valor Líquido:</label>
                <span className="amount">{formatCurrency(fullTransaction.netAmount)}</span>
              </div>
              <div className="detail-item">
                <label>Status:</label>
                <span className={`badge badge-${fullTransaction.status}`}>
                  {fullTransaction.status === 'paid' ? 'Pago' : 
                   fullTransaction.status === 'pending' ? 'Pendente' : 
                   fullTransaction.status === 'failed' ? 'Falhou' : 
                   fullTransaction.status === 'processing' ? 'Processando' : 
                   fullTransaction.status === 'cancelled' ? 'Cancelado' : fullTransaction.status}
                </span>
              </div>
              <div className="detail-item">
                <label>Data de Criação:</label>
                <span>{new Date(fullTransaction.createdAt).toLocaleString('pt-BR')}</span>
              </div>
              {fullTransaction.paidAt && (
                <div className="detail-item">
                  <label>Data de Pagamento:</label>
                  <span>{new Date(fullTransaction.paidAt).toLocaleString('pt-BR')}</span>
                </div>
              )}
              {fullTransaction.expiresAt && (
                <div className="detail-item">
                  <label>Expira em:</label>
                  <span>{new Date(fullTransaction.expiresAt).toLocaleString('pt-BR')}</span>
                </div>
              )}
            </div>

            {fullTransaction.type === 'deposit' && fullTransaction.pixCopyPaste && (
              <div className="pix-info">
                <h3>Código PIX</h3>
                <div className="pix-code-display">
                  <code>{fullTransaction.pixCopyPaste}</code>
                </div>
              </div>
            )}

            {fullTransaction.type === 'withdraw' && (
              <div className="withdraw-info">
                <h3>Informações de Saque</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Chave PIX:</label>
                    <span>{fullTransaction.pixKey || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Tipo de Chave:</label>
                    <span>{fullTransaction.pixKeyType || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            {fullTransaction.webhookData && (
              <div className="webhook-info">
                <h3>Dados do Webhook</h3>
                <pre>{JSON.stringify(fullTransaction.webhookData, null, 2)}</pre>
              </div>
            )}

            <div className="status-actions">
              <h3>Alterar Status</h3>
              <div className="status-buttons">
                {['pending', 'paid', 'failed', 'processing', 'cancelled'].map((status) => (
                  <button
                    key={status}
                    className={`status-btn ${fullTransaction.status === status ? 'active' : ''}`}
                    onClick={() => onStatusChange(fullTransaction._id, status)}
                    disabled={fullTransaction.status === status}
                  >
                    {status === 'paid' ? 'Pago' : 
                     status === 'pending' ? 'Pendente' : 
                     status === 'failed' ? 'Falhou' : 
                     status === 'processing' ? 'Processando' : 
                     status === 'cancelled' ? 'Cancelado' : status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminTransactions
