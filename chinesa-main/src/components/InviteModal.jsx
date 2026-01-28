import React, { useEffect, useState } from 'react'
import './InviteModal.css'

function InviteModal({ isOpen, onClose }) {
  const [isClosing, setIsClosing] = useState(false)
  const [activeTab, setActiveTab] = useState('convite')
  const [showLoginNotice, setShowLoginNotice] = useState(false)
  const [isLinkCopied, setIsLinkCopied] = useState(false)
  const inviteLink = 'https://fortunebet.win/?ref=2ea83'

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false)
      setActiveTab('convite')
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

  useEffect(() => {
    if (!showLoginNotice) return
    const timer = setTimeout(() => setShowLoginNotice(false), 2500)
    return () => clearTimeout(timer)
  }, [showLoginNotice])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 600)
  }

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setIsLinkCopied(true)
      setTimeout(() => setIsLinkCopied(false), 1500)
    } catch (error) {
      setIsLinkCopied(false)
      // Silently ignore copy failures to avoid UI noise.
    }
  }

  if (!isOpen && !isClosing) return null

  const rewards = [
    { id: 1, people: 1, amount: 'R$ 10,00' },
    { id: 2, people: 5, amount: 'R$ 40,00' },
    { id: 3, people: 10, amount: 'R$ 50,00' },
    { id: 4, people: 15, amount: 'R$ 50,00' },
    { id: 5, people: 20, amount: 'R$ 50,00' },
    { id: 6, people: 25, amount: 'R$ 50,00' },
    { id: 7, people: 30, amount: 'R$ 50,00' },
    { id: 8, people: 35, amount: 'R$ 50,00' },
    { id: 9, people: 40, amount: 'R$ 50,00' },
    { id: 10, people: 45, amount: 'R$ 50,00' },
    { id: 11, people: 50, amount: 'R$ 50,00' },
    { id: 12, people: 60, amount: 'R$ 100,00' },
    { id: 13, people: 70, amount: 'R$ 100,00' },
    { id: 14, people: 80, amount: 'R$ 100,00' },
    { id: 15, people: 90, amount: 'R$ 100,00' },
    { id: 16, people: 100, amount: 'R$ 100,00' },
    { id: 17, people: 120, amount: 'R$ 200,00' },
    { id: 18, people: 140, amount: 'R$ 200,00' },
    { id: 19, people: 160, amount: 'R$ 200,00' },
    { id: 20, people: 180, amount: 'R$ 200,00' },
    { id: 21, people: 200, amount: 'R$ 200,00' },
    { id: 22, people: 250, amount: 'R$ 500,00' },
    { id: 23, people: 300, amount: 'R$ 500,00' },
    { id: 24, people: 350, amount: 'R$ 500,00' },
    { id: 25, people: 400, amount: 'R$ 500,00' },
    { id: 26, people: 450, amount: 'R$ 500,00' },
    { id: 27, people: 500, amount: 'R$ 500,00' },
    { id: 28, people: 600, amount: 'R$ 1.000,00' },
    { id: 29, people: 700, amount: 'R$ 1.000,00' },
    { id: 30, people: 800, amount: 'R$ 1.000,00' },
    { id: 31, people: 900, amount: 'R$ 1.000,00' },
    { id: 32, people: 1000, amount: 'R$ 1.088,00' },
    { id: 33, people: 1200, amount: 'R$ 2.088,00' },
    { id: 34, people: 1400, amount: 'R$ 2.088,00' },
    { id: 35, people: 1600, amount: 'R$ 2.088,00' },
    { id: 36, people: 1800, amount: 'R$ 2.088,00' },
    { id: 37, people: 2000, amount: 'R$ 2.088,00' },
    { id: 38, people: 2500, amount: 'R$ 5.288,00' },
    { id: 39, people: 3000, amount: 'R$ 5.288,00' },
    { id: 40, people: 3500, amount: 'R$ 5.288,00' },
    { id: 41, people: 4000, amount: 'R$ 5.288,00' },
    { id: 42, people: 4500, amount: 'R$ 5.288,00' },
    { id: 43, people: 5000, amount: 'R$ 5.288,00' },
    { id: 44, people: 6000, amount: 'R$ 10.888,00' }
  ]

  return (
    <div className={`invite-modal ${isClosing ? 'is-closing' : ''}`}>
      <div className="invite-header">
        <button className="invite-back" type="button" onClick={handleClose} aria-label="Voltar">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div className="invite-tabs">
          <button
            type="button"
            className={`invite-tab ${activeTab === 'convite' ? 'active' : ''}`}
            onClick={() => setActiveTab('convite')}
          >
            <i className="fa-solid fa-link"></i>
            Convite
          </button>
          <button
            type="button"
            className={`invite-tab ${activeTab === 'desempenho' ? 'active' : ''}`}
            onClick={() => setActiveTab('desempenho')}
          >
            <i className="fa-solid fa-chart-line"></i>
            Desempenho
          </button>
        </div>
      </div>

      <div className="invite-content">
        {activeTab === 'convite' && (
          <>
            <div className="bg-modal-chests invite-promo-card">
              <div className="promo-header-bar">
                <span className="promo-header-title chest-mobile-text">Informações da promoção</span>
              </div>
              <div className="invite-promo-content">
                <div className="invite-qr">
                  <div className="invite-qr-container">
                    <img src="/qr-code-temporario.png" width="80" height="80" alt="QR Code" />
                    <button className="btn btn-warning btn-sm invite-qr-save" type="button">Salvar</button>
                  </div>
                </div>
                <div className="invite-link">
                  <div className="invite-link-block">
                    <label className="chest-mobile-text-smaller">Meu link</label>
                    <div className="invite-link-wrapper">
                      <textarea className="invite-link-input" readOnly value={inviteLink} />
                      <button className="btn btn-outline-warning invite-copy-btn" type="button" onClick={handleCopyInvite}>
                        <i className={isLinkCopied ? 'fa-solid fa-circle-check' : 'fas fa-copy'}></i>
                      </button>
                    </div>
                  </div>
                  <div className="invite-share">
                    <div className="invite-share-icons">
                      <a href={`https://www.instagram.com/sharer.php?u=${encodeURIComponent(inviteLink)}`} target="_blank" className="invite-share-icon" rel="noreferrer">
                        <img src="/iconFooter/icon-ig.png" alt="Instagram" width="26" height="26" />
                      </a>
                      <a href={`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=Confira+este+site%21`} target="_blank" className="invite-share-icon" rel="noreferrer">
                        <img src="/iconFooter/icon-telegran.png" alt="Telegram" width="26" height="26" />
                      </a>
                      <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(inviteLink)}`} target="_blank" className="invite-share-icon" rel="noreferrer">
                        <i className="fa-brands fa-whatsapp"></i>
                      </a>
                      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}`} target="_blank" className="invite-share-icon" rel="noreferrer">
                        <i className="fa-brands fa-facebook-f"></i>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-modal-chests invite-balance-card">
              <div className="invite-balance-row">
                <span className="chest-mobile-text text-white">Saldo Afiliado</span>
                <span className="invite-balance-amount">R$ 0,00</span>
                <button type="button" className="btn btn-warning btn-sm invite-balance-action">Sacar</button>
                <button type="button" className="btn btn-outline-warning btn-sm">Transferir</button>
              </div>
            </div>

            <div className="invite-info">
              <div className="invite-info-title">
                O que é um número válido promocional? (Cumprir todos os requisitos indicados abaixo)
              </div>
              <div className="invite-info-item">Depósitos acumulados do subordinado R$ 10,00 ou mais</div>
              <div className="invite-info-title">Apostas acumuladas do subordinado R$ 100,00 ou mais</div>
            </div>
            <div className="invite-grid-wrapper">
              <div className="invite-grid">
                {rewards.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="invite-card"
                    onClick={() => setShowLoginNotice(true)}
                  >
                    <img src="/box-convidar.png" alt="Baú" />
                    <span className="invite-people">{item.people} pessoas</span>
                    <span className="invite-amount">{item.amount}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'desempenho' && (
          <div className="invite-performance">
            <div className="performance-filters">
              <button type="button" className="filter active">Tudo</button>
              <button type="button" className="filter">Hoje</button>
              <button type="button" className="filter">Ontem</button>
              <button type="button" className="filter">Semana</button>
              <button type="button" className="filter">Mês</button>
            </div>
            <div className="performance-search">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input type="text" placeholder="Pesquisar pelo ID do usuário..." />
              <button type="button" className="clear-btn">×</button>
            </div>
            <div className="performance-cards">
              <div className="performance-card">
                <span>Cadastros</span>
                <strong>0</strong>
              </div>
              <div className="performance-card">
                <span>Total Depósitos</span>
                <strong>R$ 0,00</strong>
              </div>
              <div className="performance-card">
                <span>Depositantes</span>
                <strong>0</strong>
              </div>
              <div className="performance-card">
                <span>Qualificados</span>
                <strong>0</strong>
              </div>
            </div>
            <div className="performance-empty">
              <i className="fa-solid fa-user-slash"></i>
              <span>Você ainda não tem referidos.</span>
            </div>
          </div>
        )}
        {showLoginNotice && (
          <div className="invite-login-notice" role="status">
            Você precisa estar logado para acessar este recurso.
          </div>
        )}
      </div>
    </div>
  )
}

export default InviteModal

