import React, { useEffect, useState, useMemo } from 'react'
import api from '../services/api'
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
  onRefreshBalance,
  onLaunchGame,
  onPromotionsClick,
  onInviteClick,
  isMenuOpen,
  isLoggedIn,
  balance
}) {
  const [isClosing, setIsClosing] = useState(false)
  const [providersData, setProvidersData] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeProvider, setActiveProvider] = useState('all')
  const [activeTab, setActiveTab] = useState(initialTab || 'all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false)
      loadGames()
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

  const loadGames = async () => {
    try {
      setLoading(true)
      const response = await api.getSelectedGames()
      if (response.success && response.data?.providers?.length > 0) {
        setProvidersData(response.data.providers)
        setActiveProvider('all')
      } else {
        setProvidersData([])
      }
    } catch (error) {
      console.error('Error loading games:', error)
      setProvidersData([])
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 600)
  }

  const providers = useMemo(() => {
    const list = [{ id: 'all', code: 'all', label: 'Todos', initial: 'T' }]
    providersData.forEach((p) => {
      list.push({
        id: p.code,
        code: p.code,
        label: p.name || p.code,
        initial: (p.name || p.code).charAt(0).toUpperCase()
      })
    })
    return list
  }, [providersData])

  const allGames = useMemo(() => {
    const games = []
    providersData.forEach((provider) => {
      (provider.games || []).forEach((game, idx) => {
        games.push({
          id: `${provider.code}-${game.gameCode || idx}`,
          title: game.gameName || game.title || 'Jogo',
          gameCode: game.gameCode,
          providerCode: game.providerCode || provider.code,
          banner: game.banner
        })
      })
    })
    return games
  }, [providersData])

  const filteredGames = useMemo(() => {
    let list = allGames
    if (activeProvider !== 'all') {
      list = list.filter((g) => (g.providerCode || '').toUpperCase() === (activeProvider || '').toUpperCase())
    }
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase()
      list = list.filter((g) => (g.title || '').toLowerCase().includes(term))
    }
    return list
  }, [allGames, activeProvider, searchTerm])

  const itemsPerPage = 24
  const totalPages = Math.max(1, Math.ceil(filteredGames.length / itemsPerPage))
  const safePage = Math.min(Math.max(currentPage, 1), totalPages)
  const startIndex = (safePage - 1) * itemsPerPage
  const paginatedGames = filteredGames.slice(startIndex, startIndex + itemsPerPage)

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    setCurrentPage(1)
  }

  const handleProviderChange = (providerId) => {
    setActiveProvider(providerId)
    setCurrentPage(1)
  }

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  const handleGameClick = async (game) => {
    if (!isLoggedIn) {
      handleClose()
      setTimeout(() => onLoginClick?.(), 350)
      return
    }
    if (!game.providerCode || !game.gameCode) return
    try {
      const response = await api.launchGame(game.providerCode, game.gameCode, 'pt')
      if (response.success && response.data?.launchUrl) {
        if (onLaunchGame) {
          onLaunchGame(response.data.launchUrl)
        } else {
          window.open(response.data.launchUrl, '_blank')
        }
      } else {
        alert('Erro ao iniciar jogo. Tente novamente.')
      }
    } catch (error) {
      console.error('Launch game error:', error)
      alert('Erro ao iniciar jogo. Tente novamente.')
    }
  }

  if (!isOpen && !isClosing) return null

  return (
    <div className={`games-modal ${isClosing ? 'is-closing' : ''}`}>
      <Header
        onRegisterClick={onRegisterClick}
        onLoginClick={onLoginClick}
        onMenuClick={onMenuClick}
        onDepositClick={onDepositClick}
        onRefreshBalance={onRefreshBalance}
        isMenuOpen={isMenuOpen}
        isLoggedIn={isLoggedIn}
        balance={balance}
      />
      <div className="games-modal-body">
        <div className="games-modal-toolbar">
          <div className="games-modal-search">
            <input
              type="text"
              placeholder="Buscar jogos..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>
        </div>

        <div className="games-modal-content">
          <aside className="games-modal-sidebar">
            {providers.map((provider) => (
              <button
                key={provider.id}
                type="button"
                className={`games-provider${activeProvider === provider.id ? ' active' : ''}`}
                onClick={() => handleProviderChange(provider.id)}
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
              <>
                {loading ? (
                  <div className="games-modal-loading">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>Carregando jogos...</span>
                  </div>
                ) : paginatedGames.length === 0 ? (
                  <div className="games-modal-empty">
                    <i className="fa-regular fa-face-sad-tear"></i>
                    <span>
                      {providersData.length === 0
                        ? 'Nenhum jogo configurado. Configure os jogos no painel admin.'
                        : searchTerm.trim()
                          ? 'Nenhum jogo encontrado para esta busca.'
                          : 'Nenhum jogo neste provedor.'}
                    </span>
                  </div>
                ) : (
                  <div className="games-modal-grid">
                    {paginatedGames.map((game) => (
                      <button
                        key={game.id}
                        type="button"
                        className="games-modal-card"
                        onClick={() => handleGameClick(game)}
                      >
                        <div className="games-modal-thumb">
                          {game.banner ? (
                            <img src={game.banner} alt={game.title} />
                          ) : (
                            <span className="games-modal-thumb-placeholder">🎮</span>
                          )}
                        </div>
                        <span className="games-modal-title">{game.title}</span>
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === 'all' && !loading && filteredGames.length > 0 && totalPages > 1 && (
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
              </>
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
