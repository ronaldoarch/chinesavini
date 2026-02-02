import React, { useEffect, useRef, useState } from 'react'
import { useSupport } from '../contexts/SupportContext'
import './MenuModal.css'

function MenuModal({
  isOpen,
  onClose,
  onLoginClick,
  onRegisterClick,
  onOpenGames,
  onOpenProfile,
  onOpenBets,
  isLoggedIn,
  onLogout
}) {
  const { whatsappUrl, telegramUrl, instagramUrl } = useSupport()
  const [isClosing, setIsClosing] = useState(false)
  const closeTimerRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false)
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
      return
    }

    if (!isOpen) {
      setIsClosing(true)
      closeTimerRef.current = setTimeout(() => {
        setIsClosing(false)
      }, 350)
    }
  }, [isOpen])

  const handleClose = () => {
    onClose()
  }

  const handleLogin = () => {
    onClose()
    if (onLoginClick) onLoginClick()
  }

  const handleRegister = () => {
    onClose()
    if (onRegisterClick) onRegisterClick()
  }

  if (!isOpen && !isClosing) return null

  const modalClassName = `menu-modal ${(!isOpen && isClosing) ? 'is-closing' : ''}`

  return (
    <div className={modalClassName}>
      <button
        type="button"
        className="menu-close-btn"
        onClick={handleClose}
        aria-label="Fechar menu"
      >
        <i className="fa-solid fa-xmark"></i>
      </button>
      <div className="menu-content">
        <div className="menu-search">
          <input type="text" placeholder="Pesquisar" />
          <i className="fa-solid fa-magnifying-glass"></i>
        </div>

        <div className="menu-quick">
          <button
            className="menu-quick-item"
            type="button"
            onClick={() => {
              onClose()
              if (onOpenGames) onOpenGames('all')
            }}
          >
            <img src="/iconMenu/roleta.png" alt="Slots" />
            <span>Slots</span>
          </button>
          <button
            className="menu-quick-item"
            type="button"
            onClick={() => {
              onClose()
              if (onOpenGames) onOpenGames('recent')
            }}
          >
            <img src="/iconMenu/clock.png" alt="Recente" />
            <span>Recente</span>
          </button>
          <button
            className="menu-quick-item"
            type="button"
            onClick={() => {
              onClose()
              if (onOpenGames) onOpenGames('favorites')
            }}
          >
            <img src="/iconMenu/stars.png" alt="Favoritos" />
            <span>Favoritos</span>
          </button>
        </div>

        <div className="menu-list">
          {isLoggedIn && (
            <button
              className="menu-list-item"
              type="button"
              onClick={() => {
                onClose()
                if (onOpenProfile) onOpenProfile()
              }}
            >
              <i className="fa-solid fa-user"></i>
              <span>Perfil</span>
            </button>
          )}
          <button
            className="menu-list-item"
            type="button"
            onClick={() => {
              onClose()
              if (onOpenGames) onOpenGames('all')
            }}
          >
            <i className="fa-solid fa-gamepad"></i>
            <span>Todos os Jogos</span>
          </button>
          <button
            className="menu-list-item"
            type="button"
            onClick={() => {
              onClose()
              if (onOpenBets) onOpenBets()
            }}
          >
            <i className="fa-solid fa-coins"></i>
            <span>Apostas</span>
          </button>
        </div>

        {isLoggedIn && (
          <>
            <div className="menu-divider"></div>
            <div className="menu-list">
              <button
                className="menu-list-item"
                type="button"
                onClick={() => {
                  if (onLogout) onLogout()
                  onClose()
                }}
              >
                <i className="fa-solid fa-right-from-bracket"></i>
                <span>Sair</span>
              </button>
            </div>
          </>
        )}

        <div className="menu-divider"></div>

        <div className="menu-list">
          {whatsappUrl ? (
            <a
              className="menu-list-item"
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              onClick={onClose}
            >
              <i className="fa-brands fa-whatsapp"></i>
              <span>Suporte</span>
            </a>
          ) : (
            <span className="menu-list-item menu-list-item-disabled">
              <i className="fa-regular fa-circle-question"></i>
              <span>Suporte</span>
            </span>
          )}
        </div>

        {telegramUrl ? (
          <a
            className="menu-social telegram"
            href={telegramUrl}
            target="_blank"
            rel="noreferrer"
          >
            <i className="fa-brands fa-telegram"></i>
            Telegram
          </a>
        ) : (
          <span className="menu-social telegram menu-social-disabled">
            <i className="fa-brands fa-telegram"></i>
            Telegram
          </span>
        )}
        {instagramUrl ? (
          <a
            className="menu-social instagram"
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
          >
            <i className="fa-brands fa-instagram"></i>
            Instagram
          </a>
        ) : (
          <span className="menu-social instagram menu-social-disabled">
            <i className="fa-brands fa-instagram"></i>
            Instagram
          </span>
        )}
      </div>
    </div>
  )
}

export default MenuModal

