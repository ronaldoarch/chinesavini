import React, { useEffect, useState } from 'react'
import './BetsHistoryModal.css'

function BetsHistoryModal({ isOpen, onClose, onBack }) {
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
        <div className="bets-empty">
          <i className="fa-solid fa-dice"></i>
          <span>Nenhuma aposta encontrada.</span>
        </div>
      </div>
    </div>
  )
}

export default BetsHistoryModal
