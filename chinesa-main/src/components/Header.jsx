import React from 'react'
import './Header.css'

function Header({
  onRegisterClick,
  onLoginClick,
  onMenuClick,
  onDepositClick,
  isMenuOpen,
  isLoggedIn = false,
  balance = 'R$ 0,00'
}) {
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const handleRefreshBalance = (event) => {
    event.stopPropagation()
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 450)
  }

  return (
    <div className="header-bar">
      <div className="header-left">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 21 14"
          width="32"
          height="32"
          className={`menu-hamburger ${isMenuOpen ? 'is-open' : ''}`}
          aria-label="Menu"
          onClick={onMenuClick}
        >
          <defs>
            <clipPath id="clip0_55_1390">
              <path transform="translate(0 .788)" d="M0 0h20.413v12.425H0z"></path>
            </clipPath>
          </defs>
          <g clipPath="url(#clip0_55_1390)">
            <path d="M1.2 13.213a1.2 1.2 0 1 1 0-2.4h8a1.199 1.199 0 0 1 .848 2.048c-.225.225-.53.351-.848.351h-8zm12.322-.522a1.2 1.2 0 0 1 0-1.7l2.793-2.794H1.2a1.2 1.2 0 1 1 0-2.4h15.115l-2.793-2.794a1.202 1.202 0 1 1 1.7-1.7l4.841 4.84a1.199 1.199 0 0 1 0 1.7l-4.84 4.841a1.2 1.2 0 0 1-1.701 0v.007zM1.2 3.19a1.2 1.2 0 1 1 0-2.4h8a1.199 1.199 0 1 1 0 2.4h-8z" fill="currentColor"></path>
          </g>
        </svg>
        <a href="#" className="logo-link">
          <img src="/logo_plataforma.png" alt="FORTUNE BET" className="logo-img" loading="lazy" />
        </a>
      </div>
      <div className={`header-right${isLoggedIn ? ' is-logged-in' : ''}`}>
        {isLoggedIn ? (
          <div className="header-balance">
            <div className="balance-display" role="button" tabIndex={0} onClick={onDepositClick}>
              <div className="balance-content">
                <span className="balance-value">{balance}</span>
              </div>
              <i
                className={`fa-solid fa-arrows-rotate refresh-balance${isRefreshing ? ' is-rotating' : ''}`}
                aria-hidden="true"
                onClick={handleRefreshBalance}
              ></i>
            </div>
            <button className="balance-display search-button" type="button" aria-label="Buscar">
              <i className="fa-solid fa-magnifying-glass"></i>
            </button>
          </div>
        ) : (
          <>
            <button className="btn text-white fw-bold btn-login" onClick={onLoginClick}>Entrar</button>
            <button className="btn btn-warning register-button-radar" onClick={onRegisterClick}>
              Registrar
              <span className="register-badge-pix">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 315.4 315.6">
                  <path d="M245.9,241.3c-12.3,0-24.1-4.8-32.8-13.5l-47.4-47.4c-3.5-3.3-9-3.3-12.4,0l-47.5,47.5c-8.7,8.7-20.5,13.6-32.8,13.6h-9.3l60,60c18.7,18.7,49.1,18.7,67.8,0l60.1-60.1h-5.8.1ZM73.1,73.9c12.3,0,24.1,4.9,32.8,13.6l47.5,47.5c3.4,3.4,9,3.4,12.4,0l47.3-47.3c8.7-8.7,20.5-13.6,32.8-13.6h5.7l-60.1-60.1c-18.7-18.7-49.1-18.7-67.8,0h0l-59.9,59.9h9.3ZM301.4,123.8l-36.3-36.3c-.8.3-1.7.5-2.6.5h-16.5c-8.6,0-16.8,3.4-22.9,9.5l-47.3,47.3c-8.9,8.9-23.3,8.9-32.1,0l-47.5-47.5c-6.1-6.1-14.3-9.5-22.9-9.5h-20.3c-.8,0-1.7-.2-2.4-.5L14,123.8c-18.7,18.7-18.7,49.1,0,67.8l36.5,36.5c.8-.3,1.6-.5,2.4-.5h20.4c8.6,0,16.8-3.4,22.9-9.5l47.5-47.5c8.6-8.6,23.6-8.6,32.1,0l47.3,47.3c6.1,6.1,14.3,9.5,22.9,9.5h16.5c.9,0,1.8.2,2.6.5l36.3-36.3c18.7-18.7,18.7-49.1,0-67.8h0"></path>
                </svg>
                <span>PIX</span>
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default Header

