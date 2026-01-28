import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import './DepositHistoryModal.css'

function DepositHistoryModal({ isOpen, onClose, onBack }) {
  const { isAuthenticated } = useAuth()
  const [isClosing, setIsClosing] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false)
      if (isAuthenticated) {
        loadDeposits()
      }
    }
  }, [isOpen, isAuthenticated])
  
  const loadDeposits = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.getTransactions({ type: 'deposit' })
      if (response.success) {
        setTransactions(response.data.transactions || [])
      } else {
        setError(response.message || 'Erro ao carregar depósitos')
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar depósitos')
      setTransactions([])
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
  
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(',', '')
  }
  
  const getStatusLabel = (status) => {
    const statusMap = {
      pending: 'Pendente',
      paid: 'Pago',
      failed: 'Falhou',
      processing: 'Processando',
      cancelled: 'Cancelado'
    }
    return statusMap[status] || status
  }
  
  const getStatusClass = (status) => {
    const classMap = {
      pending: 'status-pending',
      paid: 'status-success',
      failed: 'status-failed',
      processing: 'status-processing',
      cancelled: 'status-cancelled'
    }
    return classMap[status] || 'status-pending'
  }

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 600)
  }

  if (!isOpen && !isClosing) return null

  return (
    <div className={`deposit-history-modal ${isClosing ? 'is-closing' : ''}`}>
      <div className="deposit-history-header">
        <button className="deposit-history-back" type="button" onClick={onBack} aria-label="Voltar">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <span className="deposit-history-title">Histórico de Depósitos</span>
        <button className="deposit-history-close" type="button" onClick={handleClose} aria-label="Fechar">
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div className="deposit-history-content">
        {loading ? (
          <div className="deposit-history-loading">
            <i className="fa-solid fa-spinner fa-spin"></i>
            <span>Carregando...</span>
          </div>
        ) : error ? (
          <div className="deposit-history-error">
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{error}</span>
            <button onClick={loadDeposits}>Tentar novamente</button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="deposit-history-empty">
            <i className="fa-solid fa-wallet"></i>
            <span>Nenhum depósito encontrado.</span>
          </div>
        ) : (
          transactions.map((transaction) => (
            <div key={transaction._id} className="deposit-history-card">
              <div className="deposit-history-grid">
                <div className="deposit-history-cell">
                  <span className="deposit-history-label">ID</span>
                  <div className="deposit-history-value">#{transaction._id.toString().slice(-6)}</div>
                </div>
                <div className="deposit-history-cell">
                  <span className="deposit-history-label">Data</span>
                  <div className="deposit-history-value">{formatDate(transaction.createdAt)}</div>
                </div>
                <div className="deposit-history-cell">
                  <span className="deposit-history-label">Valor</span>
                  <div className="deposit-history-value amount">{formatCurrency(transaction.amount)}</div>
                </div>
                <div className="deposit-history-cell">
                  <span className="deposit-history-label">Status</span>
                  <div className="deposit-history-value">
                    <span className={`status-badge ${getStatusClass(transaction.status)}`}>
                      {getStatusLabel(transaction.status)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default DepositHistoryModal
