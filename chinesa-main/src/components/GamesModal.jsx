import React, { useEffect, useState } from 'react'
import Header from './Header'
import Footer from './Footer'
import BottomNavigation from './BottomNavigation'
import './GamesModal.css'

function GamesModal({
  isOpen,
  onClose,
  initialTab = 'all',
  onRegisterClick,
  onLoginClick,
  onMenuClick,
  onDepositClick,
  onPromotionsClick,
  onInviteClick,
  isMenuOpen,
  isLoggedIn,
  balance
}) {
  const [isClosing, setIsClosing] = useState(false)
  const [activeProvider, setActiveProvider] = useState('pg')
  const [activeTab, setActiveTab] = useState(initialTab || 'all')

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])
  const [currentPage, setCurrentPage] = useState(1)

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

  const games = [
    { id: 1, title: 'FORTUNE TIGER', provider: 'PG Soft' },
    { id: 2, title: 'FORTUNE RABBIT', provider: 'PG Soft' },
    { id: 3, title: 'FORTUNE OX', provider: 'PG Soft' },
    { id: 4, title: 'FORTUNE MOUSE', provider: 'PG Soft' },
    { id: 5, title: 'FORTUNE SNAKE', provider: 'PG Soft' },
    { id: 6, title: 'FORTUNE DRAGON', provider: 'PG Soft' },
    { id: 7, title: 'FORTUNE GODS', provider: 'PG Soft' },
    { id: 8, title: 'CASH MANIA', provider: 'PG Soft' },
    { id: 9, title: 'DOUBLE FORTUNE', provider: 'PG Soft' },
    { id: 10, title: 'GANESHA', provider: 'PG Soft' },
    { id: 11, title: 'MAHJONG WAYS 2', provider: 'PG Soft' },
    { id: 12, title: 'BIKINI PARADISE', provider: 'PG Soft' },
    { id: 13, title: 'DRAGON HATCH', provider: 'PG Soft' },
    { id: 14, title: 'LEPRECHAUN', provider: 'PG Soft' },
    { id: 15, title: 'Bounty', provider: 'PG Soft' },
    { id: 16, title: 'TREASURE', provider: 'PG Soft' },
    { id: 17, title: 'Lucky Neko', provider: 'PG Soft' },
    { id: 18, title: 'Ganesha Fortune', provider: 'PG Soft' },
    { id: 19, title: 'Mahjong Ways', provider: 'PG Soft' },
    { id: 20, title: 'Candy Bonanza', provider: 'PG Soft' },
    { id: 21, title: 'Pirate King', provider: 'PG Soft' },
    { id: 22, title: 'Wild Bandito', provider: 'PG Soft' },
    { id: 23, title: 'Sweet Bonanza', provider: 'PG Soft' },
    { id: 24, title: 'Gates of Olympus', provider: 'PG Soft' },
    { id: 25, title: 'Book of Dead', provider: 'PG Soft' },
    { id: 26, title: 'Viking Runecraft', provider: 'PG Soft' },
    { id: 27, title: 'Fish Prawn Crab', provider: 'PG Soft' },
    { id: 28, title: 'Thai River Wonders', provider: 'PG Soft' },
    { id: 29, title: 'Phoenix Rises', provider: 'PG Soft' },
    { id: 30, title: 'Gladiator Legends', provider: 'PG Soft' },
    { id: 31, title: 'Majestic Treasures', provider: 'PG Soft' },
    { id: 32, title: 'Sun & Moon', provider: 'PG Soft' },
    { id: 33, title: 'Tropical Tiki', provider: 'PG Soft' },
    { id: 34, title: 'Ocean Explorer', provider: 'PG Soft' },
    { id: 35, title: 'Galaxy Spin', provider: 'PG Soft' },
    { id: 36, title: 'Dragon Tiger', provider: 'PG Soft' },
    { id: 37, title: 'Jade Blossom', provider: 'PG Soft' },
    { id: 38, title: 'Lucky Phoenix', provider: 'PG Soft' },
    { id: 39, title: 'Mystic Genie', provider: 'PG Soft' },
    { id: 40, title: 'Golden Lotus', provider: 'PG Soft' },
    { id: 41, title: 'Safari Adventure', provider: 'PG Soft' },
    { id: 42, title: 'Neon City', provider: 'PG Soft' },
    { id: 43, title: 'Temple Quest', provider: 'PG Soft' },
    { id: 44, title: 'Fortune Wheel', provider: 'PG Soft' },
    { id: 45, title: 'Royal Tiger', provider: 'PG Soft' },
    { id: 46, title: 'Treasure Vault', provider: 'PG Soft' },
    { id: 47, title: 'Lucky Coins', provider: 'PG Soft' },
    { id: 48, title: 'Mega Riches', provider: 'PG Soft' }
  ]

  const providers = [
    { id: 'all', label: 'Todos', initial: 'T' },
    { id: 'pg', label: 'PG Soft', initial: 'P' },
    { id: 'pp', label: 'Pragmatic Play', initial: 'P' },
    { id: 'tada', label: 'Tada', initial: 'T' },
    { id: 'jili', label: 'Jili Games', initial: 'J' },
    { id: 'jdb', label: 'Jdb', initial: 'J' },
    { id: 'popok', label: 'PopOk', initial: 'P' }
  ]

  const itemsPerPage = 24
  const totalPages = Math.max(1, Math.ceil(games.length / itemsPerPage))
  const safePage = Math.min(Math.max(currentPage, 1), totalPages)
  const startIndex = (safePage - 1) * itemsPerPage
  const paginatedGames = games.slice(startIndex, startIndex + itemsPerPage)

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    setCurrentPage(1)
  }

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  return (
    <div className={`games-modal ${isClosing ? 'is-closing' : ''}`}>
      <Header
        onRegisterClick={onRegisterClick}
        onLoginClick={onLoginClick}
        onMenuClick={onMenuClick}
        onDepositClick={onDepositClick}
        isMenuOpen={isMenuOpen}
        isLoggedIn={isLoggedIn}
        balance={balance}
      />
      <div className="games-modal-body">
        <div className="games-modal-toolbar">
          <div className="games-modal-search">
            <input type="text" placeholder="Buscar jogos..." />
            <button type="button">Buscar</button>
          </div>
        </div>

        <div className="games-modal-content">
          <aside className="games-modal-sidebar">
            {providers.map((provider) => (
              <button
                key={provider.id}
                type="button"
                className={`games-provider${activeProvider === provider.id ? ' active' : ''}`}
                onClick={() => setActiveProvider(provider.id)}
              >
                <span className="provider-logo">{provider.initial}</span>
                <span className="provider-name">{provider.label}</span>
              </button>
            ))}
          </aside>

          <div className="games-modal-main">
            <div className="games-modal-tabs">
              <button
                className={`games-modal-tab${activeTab === 'all' ? ' active' : ''}`}
                type="button"
                onClick={() => handleTabChange('all')}
              >
                <img src="/iconMenu/roleta.png" alt="Todos" />
                <span>Todos</span>
              </button>
              <button
                className={`games-modal-tab${activeTab === 'recent' ? ' active' : ''}`}
                type="button"
                onClick={() => handleTabChange('recent')}
              >
                <img src="/iconMenu/clock.png" alt="Recente" />
                <span>Recente</span>
              </button>
              <button
                className={`games-modal-tab${activeTab === 'favorites' ? ' active' : ''}`}
                type="button"
                onClick={() => handleTabChange('favorites')}
              >
                <img src="/iconMenu/stars.png" alt="Favoritos" />
                <span>Favoritos</span>
              </button>
            </div>

            {activeTab === 'all' ? (
              <div className="games-modal-grid">
                {paginatedGames.map((game) => (
                  <div key={game.id} className="games-modal-card">
                    <div className="games-modal-thumb" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="games-modal-empty">
                <i className="fa-regular fa-face-sad-tear"></i>
                <span>
                  {activeTab === 'favorites'
                    ? 'Você ainda não tem jogos favoritos.'
                    : 'Você ainda não jogou nenhum jogo recentemente.'}
                </span>
              </div>
            )}

            {activeTab === 'all' && totalPages > 1 && (
              <div className="games-modal-pagination">
                <button
                  type="button"
                  className="page-btn"
                  disabled={safePage === 1}
                  onClick={() => handlePageChange(safePage - 1)}
                >
                  «
                </button>
                {Array.from({ length: totalPages }, (_, index) => {
                  const page = index + 1
                  return (
                    <button
                      key={page}
                      type="button"
                      className={`page-btn${safePage === page ? ' active' : ''}`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  )
                })}
                <button
                  type="button"
                  className="page-btn"
                  disabled={safePage === totalPages}
                  onClick={() => handlePageChange(safePage + 1)}
                >
                  »
                </button>
              </div>
            )}
          </div>
        </div>

        <Footer />
      </div>
      <BottomNavigation
        onLoginClick={onLoginClick}
        onRegisterClick={onRegisterClick}
        onPromotionsClick={onPromotionsClick}
        onDepositClick={onDepositClick}
        onInviteClick={onInviteClick}
        isLoggedIn={isLoggedIn}
      />
    </div>
  )
}

export default GamesModal
