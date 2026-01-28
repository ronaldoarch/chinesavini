import React, { useEffect, useState } from 'react'
import './DepositHistoryModal.css'

function DepositHistoryModal({ isOpen, onClose, onBack }) {
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false)
    }
  }, [isOpen])

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

  const items = [
    { id: '#75', date: '27/01/26 20:29', amount: 'R$ 20,00', status: 'Pendente' },
    { id: '#74', date: '27/01/26 20:23', amount: 'R$ 20,00', status: 'Pendente' }
  ]

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
        {items.map((item) => (
          <div key={item.id} className="deposit-history-card">
            <div className="deposit-history-grid">
              <div className="deposit-history-cell">
                <span className="deposit-history-label">ID</span>
                <div className="deposit-history-value">{item.id}</div>
              </div>
              <div className="deposit-history-cell">
                <span className="deposit-history-label">Data</span>
                <div className="deposit-history-value">{item.date}</div>
              </div>
              <div className="deposit-history-cell">
                <span className="deposit-history-label">Valor</span>
                <div className="deposit-history-value amount">{item.amount}</div>
              </div>
              <div className="deposit-history-cell">
                <span className="deposit-history-label">Status</span>
                <div className="deposit-history-value">
                  <span className="status-badge status-pending">{item.status}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DepositHistoryModal
