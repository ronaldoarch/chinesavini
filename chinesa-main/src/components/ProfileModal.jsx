import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
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
  const { user } = useAuth()
  const [isClosing, setIsClosing] = useState(false)
  const [isIdCopied, setIsIdCopied] = useState(false)
  
  // Get user data
  const profileId = user?.id?.toString().slice(-9) || user?._id?.toString().slice(-9) || '000000000'
  const username = user?.username || 'Usuário'
  const userInitials = username.substring(0, 2).toUpperCase()
  const vipLevel = user?.vipLevel || 0
  const nextVipLevel = vipLevel + 1
  
  // Calculate VIP progress (mockado por enquanto - precisa de API)
  const vipProgress1 = 0 // user?.vipProgress1 || 0
  const vipTarget1 = 50
  const vipProgress2 = 0 // user?.vipProgress2 || 0
  const vipTarget2 = 10
  
  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value || 0)

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
      const idToCopy = user?.id?.toString() || user?._id?.toString() || profileId
      await navigator.clipboard.writeText(idToCopy)
      setIsIdCopied(true)
      setTimeout(() => setIsIdCopied(false), 1500)
    } catch (error) {
      setIsIdCopied(false)
    }
  }
  
  const calculateVipProgress = (current, target) => {
    if (!target || target === 0) return 0
    return Math.min((current / target) * 100, 100)
  }
  
  const vipProgress1Percent = calculateVipProgress(vipProgress1, vipTarget1)
  const vipProgress2Percent = calculateVipProgress(vipProgress2, vipTarget2)

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
          <div className="profile-avatar">{userInitials}</div>
          <div className="profile-name">{username}</div>
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
            <span className="profile-vip-badge">VIP{vipLevel}</span>
            <span className="profile-vip-title">Restantes VIP{nextVipLevel}</span>
            <i className="fa-solid fa-chevron-right"></i>
          </div>
          <div className="profile-vip-content">
            <img className="profile-vip-level" src={`/level/level${nextVipLevel}.png`} alt={`VIP ${nextVipLevel}`} />
            <div className="profile-vip-bars">
              <div className="profile-vip-progress">
                <div className="profile-vip-track">
                  <span className="profile-vip-fill" style={{ width: `${vipProgress1Percent}%` }}></span>
                  <span className="profile-vip-value">{formatCurrency(vipProgress1)}/{formatCurrency(vipTarget1)}</span>
                </div>
              </div>
              <div className="profile-vip-progress">
                <div className="profile-vip-track">
                  <span className="profile-vip-fill" style={{ width: `${vipProgress2Percent}%` }}></span>
                  <span className="profile-vip-value">{formatCurrency(vipProgress2)}/{formatCurrency(vipTarget2)}</span>
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
