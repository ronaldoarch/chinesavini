import React, { useEffect, useState } from 'react'
import './VipModal.css'

const vipLevels = [
  { id: 1, bets: 'R$ 50,00', deposits: 'R$ 10,00', bonus: 'R$ 0,00', image: '/level/level1.png' },
  { id: 2, bets: 'R$ 150,00', deposits: 'R$ 30,00', bonus: 'R$ 3,00', image: '/level/level2.png' },
  { id: 3, bets: 'R$ 250,00', deposits: 'R$ 50,00', bonus: 'R$ 5,00', image: '/level/level3.png' },
  { id: 4, bets: 'R$ 500,00', deposits: 'R$ 100,00', bonus: 'R$ 10,00', image: '/level/level4.png' },
  { id: 5, bets: 'R$ 800,00', deposits: 'R$ 200,00', bonus: 'R$ 20,00', image: '/level/level5.png' },
  { id: 6, bets: 'R$ 2.500,00', deposits: 'R$ 500,00', bonus: 'R$ 50,00', image: '/level/level6.png' },
  { id: 7, bets: 'R$ 7.500,00', deposits: 'R$ 1.500,00', bonus: 'R$ 100,00', image: '/level/level7.png' }
]

function VipModal({ isOpen, onClose, onBack }) {
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (isOpen) setIsClosing(false)
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
      if (onClose) onClose()
    }, 600)
  }

  const handleBack = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      if (onBack) onBack()
    }, 600)
  }

  if (!isOpen && !isClosing) return null

  return (
    <div className={`vip-modal ${isClosing ? 'is-closing' : ''}`}>
      <div className="vip-modal-header">
        <button className="vip-modal-back" type="button" onClick={handleBack} aria-label="Voltar">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <span className="vip-modal-title">VIP</span>
      </div>

      <div className="vip-content">
        <div className="vip-summary">
          <div className="vip-summary-icon">
            <img src="/bottom/icon_vip.png" alt="VIP" />
          </div>
          <div className="vip-summary-info">
            <div className="vip-summary-item">
              <span>Depósitos para promoção</span>
              <div className="vip-progress">
                <span className="vip-progress-fill" style={{ width: '0%' }}></span>
                <span className="vip-progress-text" style={{ fontSize: '11px' }}>R$ 0,00/R$ 10,00</span>
              </div>
            </div>
            <div className="vip-summary-item">
              <span>Apostas para promoção</span>
              <div className="vip-progress">
                <span className="vip-progress-fill" style={{ width: '0%' }}></span>
                <span className="vip-progress-text" style={{ fontSize: '11px' }}>R$ 0,00/R$ 50,00</span>
              </div>
            </div>
          </div>
        </div>

        <button className="vip-redeem" type="button">
          <i className="fa-solid fa-gift"></i>
          <span>Resgatar tudo</span>
        </button>

        <div className="vip-levels">
          {vipLevels.map((level) => (
            <div key={level.id} className="vip-level-card">
              <div className="vip-level-row">
                <div className="vip-level-label">Nível</div>
                <div className="vip-level-cell">
                  <div className="vip-level-cell-content">
                    <img src={level.image} alt={`Nível ${level.id}`} />
                    <span>Nível {level.id}</span>
                  </div>
                </div>
              </div>
              <div className="vip-level-row">
                <div className="vip-level-label">Apostas</div>
                <div className="vip-bets-cell">{level.bets}</div>
              </div>
              <div className="vip-level-row">
                <div className="vip-level-label">Depósitos</div>
                <div className="vip-deposits-cell">{level.deposits}</div>
              </div>
              <div className="vip-level-row">
                <div className="vip-level-label">Bônus</div>
                <div className="vip-reward-cell">{level.bonus}</div>
              </div>
              <div className="vip-level-row">
                <div className="vip-level-label">Ação</div>
                <div className="vip-action-cell">
                  <span className="vip-action-status">
                    <i className="fa-solid fa-lock"></i>
                    Bloqueado
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default VipModal
