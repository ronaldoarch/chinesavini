import React, { useEffect } from 'react'
import './GameFrame.css'

function GameFrame({ launchUrl, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!launchUrl) return null

  return (
    <div className="game-frame-overlay">
      <div className="game-frame-header">
        <button
          type="button"
          className="game-frame-close"
          onClick={onClose}
          aria-label="Fechar jogo"
        >
          <i className="fa-solid fa-arrow-left"></i>
          <span>Voltar</span>
        </button>
      </div>
      <iframe
        src={launchUrl}
        className="game-frame-iframe"
        title="Jogo"
        allow="autoplay; payment"
        allowFullScreen
      />
    </div>
  )
}

export default GameFrame
