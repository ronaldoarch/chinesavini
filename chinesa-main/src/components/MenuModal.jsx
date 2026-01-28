import React, { useEffect, useRef, useState } from 'react'
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
              if (onOpenGames) onOpenGames()
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
              if (onOpenGames) onOpenGames()
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
              if (onOpenGames) onOpenGames()
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
              if (onOpenGames) onOpenGames()
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
          <button className="menu-list-item" type="button">
            <i className="fa-solid fa-download"></i>
            <span>Baixar App</span>
          </button>
          <button className="menu-list-item" type="button">
            <i className="fa-regular fa-circle-question"></i>
            <span>Suporte</span>
          </button>
        </div>

        <button className="menu-social telegram" type="button">
          <i className="fa-brands fa-telegram"></i>
          Telegram
        </button>
        <button className="menu-social instagram" type="button">
          <i className="fa-brands fa-instagram"></i>
          Instagram
        </button>
      </div>
    </div>
  )
}

export default MenuModal

