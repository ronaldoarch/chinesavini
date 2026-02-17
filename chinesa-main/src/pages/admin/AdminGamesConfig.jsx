import React, { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import './AdminGamesConfig.css'

function AdminGamesConfig() {
  const { isAdmin } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  
  const [config, setConfig] = useState({
    agentCode: '',
    agentToken: '',
    agentSecret: '',
    agentRTP: null,
    selectedProviders: [],
    selectedGames: []
  })
  const [applyingRTP, setApplyingRTP] = useState(false)
  
  const [providers, setProviders] = useState([])
  const [gamesByProvider, setGamesByProvider] = useState({})
  const [loadingProviders, setLoadingProviders] = useState(false)
  const [loadingGames, setLoadingGames] = useState({})
  const [loadingAllGames, setLoadingAllGames] = useState(false)
  const [gameSearchProvider, setGameSearchProvider] = useState('')
  const [gameSearchName, setGameSearchName] = useState('')

  useEffect(() => {
    if (!isAdmin) {
      setError('Acesso negado. Apenas administradores podem acessar esta página.')
      setLoading(false)
      return
    }

    loadConfig()
    loadProviders()
  }, [isAdmin])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const response = await api.getGameConfig()
      if (response.success) {
        setConfig({
          agentCode: response.data.agentCode || '',
          agentToken: response.data.agentToken || '',
          agentSecret: response.data.agentSecret || '',
          agentRTP: response.data.agentRTP !== undefined ? response.data.agentRTP : null,
          selectedProviders: response.data.selectedProviders || [],
          selectedGames: response.data.selectedGames || []
        })
        
        // Load all games from selected providers in parallel
        if (response.data.selectedProviders?.length > 0) {
          await loadAllGames(response.data.selectedProviders)
        }
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar configuração')
    } finally {
      setLoading(false)
    }
  }

  const loadProviders = async () => {
    try {
      setLoadingProviders(true)
      const response = await api.getProviders()
      if (response.success) {
        setProviders(response.data || [])
      }
    } catch (err) {
      console.error('Error loading providers:', err)
    } finally {
      setLoadingProviders(false)
    }
  }

  const loadGames = async (providerCode, forceReload = false) => {
    if (!forceReload && gamesByProvider[providerCode]) {
      return // Already loaded
    }

    try {
      setLoadingGames(prev => ({ ...prev, [providerCode]: true }))
      const response = await api.getGames(providerCode)
      if (response.success) {
        setGamesByProvider(prev => ({
          ...prev,
          [providerCode]: response.data || []
        }))
      }
    } catch (err) {
      console.error(`Error loading games for ${providerCode}:`, err)
    } finally {
      setLoadingGames(prev => ({ ...prev, [providerCode]: false }))
    }
  }

  const loadAllGames = async (providerCodes) => {
    const codes = providerCodes || config.selectedProviders
    if (!codes?.length) return

    try {
      setLoadingAllGames(true)
      const results = await Promise.all(
        codes.map(async (providerCode) => {
          const response = await api.getGames(providerCode)
          return { providerCode, games: response.success ? (response.data || []) : [] }
        })
      )
      setGamesByProvider(prev => {
        const next = { ...prev }
        results.forEach(({ providerCode, games }) => {
          next[providerCode] = games
        })
        return next
      })
    } catch (err) {
      console.error('Error loading all games:', err)
      setError('Erro ao carregar jogos dos provedores')
    } finally {
      setLoadingAllGames(false)
    }
  }

  const handleProviderToggle = async (providerCode) => {
    const isSelected = config.selectedProviders.includes(providerCode)
    
    if (isSelected) {
      // Remove provider and its games
      setConfig(prev => ({
        ...prev,
        selectedProviders: prev.selectedProviders.filter(p => p !== providerCode),
        selectedGames: prev.selectedGames.filter(g => g.providerCode !== providerCode)
      }))
    } else {
      // Add provider (max 3)
      if (config.selectedProviders.length >= 3) {
        setError('Máximo de 3 provedores permitidos')
        setTimeout(() => setError(null), 3000)
        return
      }
      
      setConfig(prev => ({
        ...prev,
        selectedProviders: [...prev.selectedProviders, providerCode]
      }))
      
      // Load all games from all selected providers (including the new one)
      await loadAllGames([...config.selectedProviders, providerCode])
    }
  }

  const getGamesCountByProvider = (providerCode) => {
    return config.selectedGames.filter(g => g.providerCode === providerCode).length
  }

  const handleProviderMoveUp = (providerCode) => {
    const idx = config.selectedProviders.indexOf(providerCode)
    if (idx <= 0) return
    const newOrder = [...config.selectedProviders]
    ;[newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]]
    setConfig(prev => ({ ...prev, selectedProviders: newOrder }))
  }

  const handleProviderMoveDown = (providerCode) => {
    const idx = config.selectedProviders.indexOf(providerCode)
    if (idx < 0 || idx >= config.selectedProviders.length - 1) return
    const newOrder = [...config.selectedProviders]
    ;[newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]]
    setConfig(prev => ({ ...prev, selectedProviders: newOrder }))
  }

  const handleSetProviderFirst = (providerCode) => {
    const newOrder = config.selectedProviders.filter(p => p !== providerCode)
    newOrder.unshift(providerCode)
    setConfig(prev => ({ ...prev, selectedProviders: newOrder }))
  }

  const handleGameToggle = (game) => {
    const code = game.game_code || game.gameCode
    const isSelected = config.selectedGames.some(
      g => g.providerCode === game.providerCode && g.gameCode === code
    )
    
    if (isSelected) {
      setConfig(prev => ({
        ...prev,
        selectedGames: prev.selectedGames.filter(
          g => !(g.providerCode === game.providerCode && g.gameCode === code)
        )
      }))
    } else {
      // Check limit per provider (20 games per provider)
      const currentCount = getGamesCountByProvider(game.providerCode)
      if (currentCount >= 20) {
        setError(`Máximo de 20 jogos permitidos por provedor. O provedor ${game.providerCode} já tem 20 jogos selecionados.`)
        setTimeout(() => setError(null), 3000)
        return
      }
      
      setConfig(prev => ({
        ...prev,
        selectedGames: [...prev.selectedGames, {
          providerCode: game.providerCode,
          gameCode: game.game_code,
          gameName: game.game_name,
          banner: game.banner
        }]
      }))
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      
      const response = await api.updateGameConfig(config)
      
      if (response.success) {
        setSuccess('Configuração salva com sucesso!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(response.message || 'Erro ao salvar configuração')
      }
    } catch (err) {
      setError(err.message || 'Erro ao salvar configuração')
    } finally {
      setSaving(false)
    }
  }

  const handleApplyRTP = async () => {
    if (config.agentRTP === null || config.agentRTP === undefined || config.agentRTP === '') {
      setError('Configure um valor de RTP antes de aplicar')
      setTimeout(() => setError(null), 3000)
      return
    }

    try {
      setApplyingRTP(true)
      setError(null)
      setSuccess(null)
      
      const response = await api.applyRTP()
      
      if (response.success) {
        setSuccess(`RTP de ${config.agentRTP}% aplicado com sucesso!`)
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(response.message || 'Erro ao aplicar RTP')
      }
    } catch (err) {
      setError(err.message || 'Erro ao aplicar RTP')
    } finally {
      setApplyingRTP(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="admin-container">
        <div className="admin-error">
          <i className="fa-solid fa-lock"></i>
          <h2>Acesso Negado</h2>
          <p>Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-loading">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <p>Carregando configuração...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>
          <i className="fa-solid fa-gamepad"></i>
          Configuração de Jogos
        </h1>
      </div>

      {error && (
        <div className="alert alert-error">
          <i className="fa-solid fa-circle-exclamation"></i>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <i className="fa-solid fa-circle-check"></i>
          {success}
        </div>
      )}

      <div className="config-section">
        <h2>
          <i className="fa-solid fa-key"></i>
          Credenciais do Agente
        </h2>
        <div className="config-form">
          <div className="form-group">
            <label>Agent Code</label>
            <input
              type="text"
              value={config.agentCode}
              onChange={(e) => setConfig(prev => ({ ...prev, agentCode: e.target.value }))}
              placeholder="Midaslabs"
            />
          </div>
          <div className="form-group">
            <label>Agent Token</label>
            <input
              type="password"
              value={config.agentToken}
              onChange={(e) => setConfig(prev => ({ ...prev, agentToken: e.target.value }))}
              placeholder="Token do agente"
            />
          </div>
          <div className="form-group">
            <label>Agent Secret</label>
            <input
              type="password"
              value={config.agentSecret}
              onChange={(e) => setConfig(prev => ({ ...prev, agentSecret: e.target.value }))}
              placeholder="Secret do agente"
            />
          </div>
          <div className="form-group">
            <label>RTP do Agente (%)</label>
            <div className="rtp-input-group">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={config.agentRTP === null ? '' : config.agentRTP}
                onChange={(e) => {
                  const value = e.target.value === '' ? null : parseFloat(e.target.value)
                  setConfig(prev => ({ ...prev, agentRTP: value }))
                }}
                placeholder="Ex: 95.5"
              />
              <button
                type="button"
                className="apply-rtp-btn"
                onClick={handleApplyRTP}
                disabled={applyingRTP || config.agentRTP === null || config.agentRTP === undefined || config.agentRTP === ''}
                title="Aplicar RTP imediatamente"
              >
                {applyingRTP ? (
                  <><i className="fa-solid fa-spinner fa-spin"></i> Aplicando...</>
                ) : (
                  <><i className="fa-solid fa-play"></i> Aplicar RTP</>
                )}
              </button>
            </div>
            <small>Valor entre 0 e 100. O RTP será aplicado automaticamente ao salvar, ou clique em "Aplicar RTP" para aplicar imediatamente.</small>
          </div>
        </div>
      </div>

      <div className="config-section">
        <h2>
          <i className="fa-solid fa-layer-group"></i>
          Provedores Selecionados ({config.selectedProviders.length}/3)
        </h2>
        <p className="section-description">
          Selecione até 3 provedores de jogos
        </p>
        
        {loadingProviders ? (
          <div className="loading-providers">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Carregando provedores...
          </div>
        ) : (
          <div className="providers-grid">
            {providers.map(provider => (
              <div
                key={provider.code}
                className={`provider-card ${config.selectedProviders.includes(provider.code) ? 'selected' : ''} ${provider.status === 0 ? 'disabled' : ''}`}
                onClick={() => provider.status === 1 && handleProviderToggle(provider.code)}
              >
                <div className="provider-checkbox">
                  <input
                    type="checkbox"
                    checked={config.selectedProviders.includes(provider.code)}
                    onChange={() => {}}
                    disabled={provider.status === 0}
                  />
                </div>
                <div className="provider-info">
                  <h3>{provider.name}</h3>
                  <span className={`provider-status ${provider.status === 1 ? 'active' : 'maintenance'}`}>
                    {provider.status === 1 ? 'Ativo' : 'Manutenção'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {config.selectedProviders.length > 0 && (
        <div className="config-section provider-order-section">
          <h2>
            <i className="fa-solid fa-sort"></i>
            Ordem dos Provedores
          </h2>
          <p className="section-description">
            Defina qual provedor aparece primeiro na página inicial. Use as setas para reordenar.
          </p>
          <div className="provider-order-list">
            {config.selectedProviders.map((providerCode, idx) => {
              const provider = providers.find(p => p.code === providerCode)
              return (
                <div key={providerCode} className="provider-order-item">
                  <span className="provider-order-position">{idx + 1}º</span>
                  <span className="provider-order-name">{provider?.name || providerCode}</span>
                  <div className="provider-order-actions">
                    <button
                      type="button"
                      className="provider-order-btn"
                      onClick={() => handleSetProviderFirst(providerCode)}
                      title="Definir como primeiro"
                      disabled={idx === 0}
                    >
                      <i className="fa-solid fa-arrow-up"></i> 1º
                    </button>
                    <button
                      type="button"
                      className="provider-order-btn"
                      onClick={() => handleProviderMoveUp(providerCode)}
                      title="Subir"
                      disabled={idx === 0}
                    >
                      <i className="fa-solid fa-chevron-up"></i>
                    </button>
                    <button
                      type="button"
                      className="provider-order-btn"
                      onClick={() => handleProviderMoveDown(providerCode)}
                      title="Descer"
                      disabled={idx === config.selectedProviders.length - 1}
                    >
                      <i className="fa-solid fa-chevron-down"></i>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {config.selectedProviders.length > 0 && (
        <div className="config-section">
          <h2>
            <i className="fa-solid fa-dice"></i>
            Jogos Selecionados
          </h2>
          <p className="section-description">
            Selecione até 20 jogos por provedor. Pesquise por provedor ou nome do jogo para encontrar e ativar.
          </p>

          <div className="games-search-section">
            <div className="games-search-row">
              <div className="games-search-field">
                <label>Provedor</label>
                <select
                  value={gameSearchProvider}
                  onChange={(e) => setGameSearchProvider(e.target.value)}
                  className="games-search-select"
                >
                  <option value="">Todos os provedores</option>
                  {config.selectedProviders.map(code => {
                    const p = providers.find(x => x.code === code)
                    return (
                      <option key={code} value={code}>{p?.name || code}</option>
                    )
                  })}
                </select>
              </div>
              <div className="games-search-field">
                <label>Nome do jogo</label>
                <input
                  type="text"
                  value={gameSearchName}
                  onChange={(e) => setGameSearchName(e.target.value)}
                  placeholder="Buscar por nome..."
                  className="games-search-input"
                />
              </div>
              <button
                type="button"
                className="load-all-games-btn"
                onClick={() => loadAllGames()}
                disabled={loadingAllGames}
              >
                {loadingAllGames ? (
                  <><i className="fa-solid fa-spinner fa-spin"></i> Carregando...</>
                ) : (
                  <><i className="fa-solid fa-refresh"></i> Carregar todos os jogos</>
                )}
              </button>
            </div>
          </div>

          {loadingAllGames ? (
            <div className="loading-games">
              <i className="fa-solid fa-spinner fa-spin"></i>
              Carregando jogos de todos os provedores...
            </div>
          ) : (() => {
            const allGames = config.selectedProviders.flatMap(providerCode => {
              const games = gamesByProvider[providerCode] || []
              return games.map(g => ({ ...g, providerCode }))
            })
            const filtered = allGames.filter(g => {
              const matchProvider = !gameSearchProvider || g.providerCode === gameSearchProvider
              const matchName = !gameSearchName.trim() || 
                (g.game_name || '').toLowerCase().includes(gameSearchName.trim().toLowerCase())
              return matchProvider && matchName
            })

            return filtered.length === 0 ? (
              <p className="no-games">
                {allGames.length === 0
                  ? 'Nenhum jogo disponível. Clique em "Carregar todos os jogos".'
                  : 'Nenhum jogo encontrado com os filtros aplicados.'}
              </p>
            ) : (
              <>
                <p className="games-filtered-info">
                  Mostrando {filtered.length} de {allGames.length} jogos
                  {gameSearchProvider && (
                    <span> • Provedor: {providers.find(p => p.code === gameSearchProvider)?.name || gameSearchProvider}</span>
                  )}
                  {gameSearchName.trim() && <span> • Busca: "{gameSearchName.trim()}"</span>}
                </p>
                <div className="games-grid">
                  {filtered.map(game => {
                    const isSelected = config.selectedGames.some(
                      g => g.providerCode === game.providerCode && g.gameCode === game.game_code
                    )
                    const provider = providers.find(p => p.code === game.providerCode)
                    return (
                      <div
                        key={`${game.providerCode}-${game.game_code}`}
                        className={`game-card ${isSelected ? 'selected' : ''} ${game.status === 0 ? 'disabled' : ''}`}
                        onClick={() => game.status !== 0 && handleGameToggle(game)}
                      >
                        <div
                          className="game-checkbox"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (game.status !== 0) handleGameToggle(game)
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            disabled={game.status === 0}
                            onClick={(e) => e.preventDefault()}
                          />
                        </div>
                        <span className="game-provider-badge">{provider?.name || game.providerCode}</span>
                        {game.banner && (
                          <img src={game.banner} alt={game.game_name} className="game-banner" />
                        )}
                        <div className="game-info">
                          <h4>{game.game_name}</h4>
                          <span className={`game-status ${game.status === 1 ? 'active' : 'maintenance'}`}>
                            {game.status === 1 ? 'Disponível' : 'Manutenção'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </div>
      )}

      <div className="config-actions">
        <button
          onClick={handleSave}
          disabled={saving}
          className="save-btn"
        >
          {saving ? (
            <>
              <i className="fa-solid fa-spinner fa-spin"></i>
              Salvando...
            </>
          ) : (
            <>
              <i className="fa-solid fa-save"></i>
              Salvar Configuração
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default AdminGamesConfig
