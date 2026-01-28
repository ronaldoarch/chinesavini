import React, { useEffect, useState } from 'react'
import './ProfileModal.css'

function ProfileModal({
  isOpen,
  onClose,
  onBack,
  onLogout,
  onOpenDeposit,
  onOpenBets,
  onOpenWithdraw,
  onOpenEditProfile,
  onOpenChangePassword,
  onOpenVip
}) {
  const [isClosing, setIsClosing] = useState(false)
  const [isIdCopied, setIsIdCopied] = useState(false)
  const profileId = '949136014'

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

  const handleOpenWithdraw = (tab) => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      if (onClose) onClose()
      if (onOpenWithdraw) onOpenWithdraw(tab)
    }, 600)
  }

  const handleOpenDeposit = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      if (onClose) onClose()
      if (onOpenDeposit) onOpenDeposit()
    }, 600)
  }

  const handleOpenBets = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      if (onClose) onClose()
      if (onOpenBets) onOpenBets()
    }, 600)
  }

  const handleOpenEditProfile = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      if (onClose) onClose()
      if (onOpenEditProfile) onOpenEditProfile()
    }, 600)
  }

  const handleOpenChangePassword = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      if (onClose) onClose()
      if (onOpenChangePassword) onOpenChangePassword()
    }, 600)
  }

  const handleOpenVip = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      if (onClose) onClose()
      if (onOpenVip) onOpenVip()
    }, 600)
  }

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(profileId)
      setIsIdCopied(true)
      setTimeout(() => setIsIdCopied(false), 1500)
    } catch (error) {
      setIsIdCopied(false)
    }
  }

  if (!isOpen && !isClosing) return null

  return (
    <div className={`profile-modal ${isClosing ? 'is-closing' : ''}`}>
      <div className="profile-header">
        <button className="profile-back" type="button" onClick={handleBack} aria-label="Voltar">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <span className="profile-title">Perfil</span>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-avatar">DI</div>
          <div className="profile-name">diago97</div>
          <div className="profile-id-row">
            <div className="profile-id">ID: {profileId}</div>
            <button
              type="button"
              className="profile-id-copy"
              onClick={handleCopyId}
              aria-label={isIdCopied ? 'ID copiado' : 'Copiar ID'}
            >
              <i className={isIdCopied ? 'fa-solid fa-circle-check' : 'fa-regular fa-copy'}></i>
            </button>
          </div>
        </div>

        <div className="profile-actions">
          <button className="profile-action" type="button" onClick={() => handleOpenWithdraw('saque')}>
            <i className="fa-solid fa-wallet"></i>
            <span>Saques</span>
          </button>
          <button className="profile-action" type="button" onClick={handleOpenDeposit}>
            <i className="fa-solid fa-sack-dollar"></i>
            <span>Depósitos</span>
          </button>
        </div>

        <div
          className="profile-vip"
          onClick={handleOpenVip}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') handleOpenVip()
          }}
          role="button"
          tabIndex={0}
        >
          <div className="profile-vip-header">
            <span className="profile-vip-badge">VIP0</span>
            <span className="profile-vip-title">Restantes VIP1</span>
            <i className="fa-solid fa-chevron-right"></i>
          </div>
          <div className="profile-vip-content">
            <img className="profile-vip-level" src="/level/level1.png" alt="VIP 1" />
            <div className="profile-vip-bars">
              <div className="profile-vip-progress">
                <div className="profile-vip-track">
                  <span className="profile-vip-fill" style={{ width: '0%' }}></span>
                  <span className="profile-vip-value">R$ 0,00/R$ 50,00</span>
                </div>
              </div>
              <div className="profile-vip-progress">
                <div className="profile-vip-track">
                  <span className="profile-vip-fill" style={{ width: '0%' }}></span>
                  <span className="profile-vip-value">R$ 0,00/R$ 10,00</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-list">
          <button className="profile-list-item" type="button" onClick={() => handleOpenWithdraw('contas')}>
            <div className="profile-list-left">
              <i className="fa-solid fa-user"></i>
              <span>Conta</span>
            </div>
            <i className="fa-solid fa-chevron-right"></i>
          </button>
          <button className="profile-list-item" type="button" onClick={handleOpenBets}>
            <div className="profile-list-left">
              <i className="fa-solid fa-dice"></i>
              <span>Apostas</span>
            </div>
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        </div>

        <div className="profile-list">
          <button className="profile-list-item" type="button" onClick={handleOpenEditProfile}>
            <div className="profile-list-left">
              <i className="fa-solid fa-id-card"></i>
              <span>Dados</span>
            </div>
            <i className="fa-solid fa-chevron-right"></i>
          </button>
          <button className="profile-list-item" type="button">
            <div className="profile-list-left">
              <i className="fa-solid fa-globe"></i>
              <span>Idioma</span>
            </div>
            <div className="profile-list-right">
              <span>Português</span>
              <i className="fa-solid fa-chevron-right"></i>
            </div>
          </button>
        </div>

        <div className="profile-list">
          <button className="profile-list-item" type="button">
            <div className="profile-list-left">
              <i className="fa-solid fa-bell"></i>
              <span>Notificações</span>
            </div>
            <i className="fa-solid fa-chevron-right"></i>
          </button>
          <button className="profile-list-item" type="button" onClick={handleOpenChangePassword}>
            <div className="profile-list-left">
              <i className="fa-solid fa-lock"></i>
              <span>Alterar Senha</span>
            </div>
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        </div>

        <button className="profile-logout" type="button" onClick={onLogout}>
          <i className="fa-solid fa-right-from-bracket"></i>
          <span>Sair</span>
        </button>
      </div>
    </div>
  )
}

export default ProfileModal
