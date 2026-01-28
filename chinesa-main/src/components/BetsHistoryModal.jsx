import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import './BetsHistoryModal.css'

function BetsHistoryModal({ isOpen, onClose, onBack }) {
  const { isAuthenticated } = useAuth()
  const [isClosing, setIsClosing] = useState(false)
  const [bets, setBets] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false)
      if (isAuthenticated) {
        loadBets()
      }
    }
  }, [isOpen, isAuthenticated])
  
  const loadBets = async () => {
    try {
      setLoading(true)
      setError(null)
      // Por enquanto, não há rota de apostas - usar transações como placeholder
      // TODO: Criar rota de apostas no backend
      const response = await api.getTransactions({ type: 'deposit', limit: 10 })
      if (response.success) {
        // Por enquanto vazio - quando tiver rota de apostas, usar aqui
        setBets([])
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar apostas')
      setBets([])
    } finally {
      setLoading(false)
    }
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
    <div className={`bets-history-modal ${isClosing ? 'is-closing' : ''}`}>
      <div className="bets-history-header">
        <button className="bets-history-back" type="button" onClick={onBack} aria-label="Voltar">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <span className="bets-history-title">Histórico de Apostas</span>
        <button className="bets-history-close" type="button" onClick={handleClose} aria-label="Fechar">
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div className="bets-history-content">
        {loading ? (
          <div className="bets-loading">
            <i className="fa-solid fa-spinner fa-spin"></i>
            <span>Carregando...</span>
          </div>
        ) : error ? (
          <div className="bets-error">
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{error}</span>
            <button onClick={loadBets}>Tentar novamente</button>
          </div>
        ) : bets.length === 0 ? (
          <div className="bets-empty">
            <i className="fa-solid fa-dice"></i>
            <span>Nenhuma aposta encontrada.</span>
          </div>
        ) : (
          <div className="bets-list">
            {bets.map((bet) => (
              <div key={bet._id} className="bet-card">
                {/* Estrutura de aposta será implementada quando houver API */}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default BetsHistoryModal
