import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import './InviteModal.css'

function InviteModal({ isOpen, onClose }) {
  const { user, isAuthenticated, updateUser } = useAuth()
  const [isClosing, setIsClosing] = useState(false)
  const [activeTab, setActiveTab] = useState('convite')
  const [period, setPeriod] = useState('all')
  const [showLoginNotice, setShowLoginNotice] = useState(false)
  const [isLinkCopied, setIsLinkCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [chests, setChests] = useState([])
  const [affiliateStats, setAffiliateStats] = useState(null)
  const [claimingChest, setClaimingChest] = useState(null)
  const [topAffiliateData, setTopAffiliateData] = useState(null)

  const PERIOD_OPTIONS = [
    { value: 'all', label: 'Tudo' },
    { value: 'this_week', label: 'Esta Semana' },
    { value: 'last_week', label: 'Última Semana' },
    { value: 'this_month', label: 'Este Mês' },
    { value: 'last_month', label: 'Mês passado' }
  ]
  
  // Get referral code from user or use default
  const referralCode = user?.referralCode || '0000000000'
  const baseUrl = window.location.origin
  const inviteLink = `${baseUrl}/?ref=${referralCode}`
  
  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value || 0)

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false)
      setActiveTab('convite')
      if (isAuthenticated) {
        loadChests()
        loadAffiliateStats(period)
        if ((user?.affiliateDepositBonusPercent ?? 0) >= 50) {
          api.getMyTopAffiliatePosition()
            .then((res) => {
              if (res.success && res.data?.eligible) {
                setTopAffiliateData(res.data)
              } else {
                setTopAffiliateData(null)
              }
            })
            .catch(() => setTopAffiliateData(null))
        } else {
          setTopAffiliateData(null)
        }
      } else {
        setTopAffiliateData(null)
      }
    }
  }, [isOpen, isAuthenticated, user?.affiliateDepositBonusPercent])

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

  const loadChests = async () => {
    try {
      setLoading(true)
      const response = await api.getChests()
      if (response.success) {
        setChests(response.data.chests || [])
      }
    } catch (error) {
      console.error('Error loading chests:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAffiliateStats = async (periodFilter = period) => {
    try {
      const response = await api.getAffiliateStats(periodFilter)
      if (response.success) {
        setAffiliateStats(response.data)
        if (response.data.affiliateBalance !== undefined) {
          updateUser({ affiliateBalance: response.data.affiliateBalance })
        }
      }
    } catch (error) {
      console.error('Error loading affiliate stats:', error)
    }
  }

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod)
    if (isAuthenticated) loadAffiliateStats(newPeriod)
  }

  const handleClaimChest = async (chestId) => {
    if (!isAuthenticated) {
      setShowLoginNotice(true)
      return
    }

    try {
      setClaimingChest(chestId)
      const response = await api.claimChest(chestId)
      if (response.success) {
        await loadChests()
        await loadAffiliateStats()
        // Refresh user data
        const userResponse = await api.getCurrentUser()
        if (userResponse.success) {
          updateUser(userResponse.data.user)
        }
      } else {
        alert(response.message || 'Erro ao resgatar baú')
      }
    } catch (error) {
      alert('Erro ao resgatar baú. Tente novamente.')
    } finally {
      setClaimingChest(null)
    }
  }

  const handleWithdrawAffiliate = async () => {
    if (!affiliateStats || affiliateStats.affiliateBalance <= 0) {
      alert('Saldo de afiliado insuficiente')
      return
    }

    const amount = affiliateStats.affiliateBalance
    if (!window.confirm(`Transferir R$ ${amount.toFixed(2)} do saldo de afiliado para saldo principal?`)) {
      return
    }

    try {
      setLoading(true)
      const response = await api.withdrawAffiliateBalance(amount)
      if (response.success) {
        await loadAffiliateStats()
        const userResponse = await api.getCurrentUser()
        if (userResponse.success) {
          updateUser(userResponse.data.user)
        }
        alert('Transferência realizada com sucesso!')
      } else {
        alert(response.message || 'Erro ao realizar transferência')
      }
    } catch (error) {
      alert('Erro ao realizar transferência. Tente novamente.')
    } finally {
      setLoading(false)
    }
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
            className={`invite-tab ${activeTab === 'meus-dados' ? 'active' : ''}`}
            onClick={() => { setActiveTab('meus-dados'); if (isAuthenticated) loadAffiliateStats(period) }}
          >
            <i className="fa-solid fa-database"></i>
            Meus Dados
          </button>
          <button
            type="button"
            className={`invite-tab ${activeTab === 'desempenho' ? 'active' : ''}`}
            onClick={() => { setActiveTab('desempenho'); if (isAuthenticated) loadAffiliateStats(period) }}
          >
            <i className="fa-solid fa-chart-line"></i>
            Desempenho
          </button>
          <button
            type="button"
            className={`invite-tab ${activeTab === 'comissao' ? 'active' : ''}`}
            onClick={() => { setActiveTab('comissao'); if (isAuthenticated) loadAffiliateStats() }}
          >
            <i className="fa-solid fa-coins"></i>
            Comissão
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
                <span className="invite-balance-amount">
                  {affiliateStats?.affiliateBalance !== undefined
                    ? new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 2
                      }).format(affiliateStats.affiliateBalance)
                    : user?.affiliateBalance !== undefined
                    ? new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 2
                      }).format(user.affiliateBalance)
                    : 'R$ 0,00'}
                </span>
              </div>
            </div>

            {topAffiliateData && (
              <div className="invite-top-affiliate-card">
                <div className="invite-top-affiliate-header">
                  <i className="fa-solid fa-trophy"></i>
                  <span>Top Afiliado</span>
                </div>
                <div className="invite-top-affiliate-body">
                  <div className="invite-top-affiliate-position">
                    {topAffiliateData.position != null
                      ? <>Você está em <strong>{topAffiliateData.position}º</strong> lugar</>
                      : <>No ranking ({topAffiliateData.totalInRanking} {topAffiliateData.totalInRanking === 1 ? 'afiliado' : 'afiliados'})</>}
                  </div>
                  <div className="invite-top-affiliate-details">
                    <span>Depósitos dos indicados: {formatCurrency(topAffiliateData.totalDeposits)}</span>
                    {topAffiliateData.prizeValue > 0 && (
                      <span className="invite-top-affiliate-prize">Prêmio atual: {formatCurrency(topAffiliateData.prizeValue)}</span>
                    )}
                  </div>
                  <small className="invite-top-affiliate-period">
                    Período: {new Date(topAffiliateData.config?.startDate).toLocaleDateString('pt-BR')} até {new Date(topAffiliateData.config?.endDate).toLocaleDateString('pt-BR')}
                  </small>
                </div>
              </div>
            )}

            <div className="invite-info">
              <div className="invite-info-title">
                O que é um número válido promocional? (Cumprir todos os requisitos indicados abaixo)
              </div>
              <div className="invite-info-item">Depósitos acumulados do subordinado R$ 10,00 ou mais</div>
              <div className="invite-info-title">Apostas acumuladas do subordinado R$ 100,00 ou mais</div>
            </div>
            {loading && chests.length === 0 ? (
              <div className="invite-loading">
                <i className="fa-solid fa-spinner fa-spin"></i>
                <span>Carregando baús...</span>
              </div>
            ) : (
              <div className="invite-grid-wrapper">
                <div className="invite-grid">
                  {chests.map((chest) => {
                    const referralsRequired = chest.metadata?.referralsRequired || 0
                    const isUnlocked = chest.status === 'unlocked'
                    const isClaimed = chest.status === 'claimed'
                    const isLocked = chest.status === 'locked'
                    
                    return (
                      <button
                        key={chest._id}
                        type="button"
                        className={`invite-card ${isClaimed ? 'claimed' : isUnlocked ? 'unlocked' : 'locked'}`}
                        onClick={() => {
                          if (!isAuthenticated) {
                            setShowLoginNotice(true)
                          } else if (isUnlocked && !isClaimed) {
                            handleClaimChest(chest._id)
                          } else if (isLocked) {
                            alert(`Este baú será desbloqueado quando você tiver ${referralsRequired} referidos qualificados`)
                          }
                        }}
                        disabled={claimingChest === chest._id || isClaimed}
                      >
                        <img src="/box-convidar.png" alt="Baú" />
                        <span className="invite-people">{referralsRequired} pessoas</span>
                        <span className="invite-amount">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            minimumFractionDigits: 2
                          }).format(chest.rewardAmount)}
                        </span>
                        {isClaimed && (
                          <span className="chest-status claimed-status">
                            <i className="fa-solid fa-check-circle"></i>
                            Resgatado
                          </span>
                        )}
                        {isUnlocked && !isClaimed && (
                          <span className="chest-status unlocked-status">
                            <i className="fa-solid fa-unlock"></i>
                            Clique para resgatar
                          </span>
                        )}
                        {isLocked && (
                          <span className="chest-status locked-status">
                            <i className="fa-solid fa-lock"></i>
                            Bloqueado
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'meus-dados' && (
          <div className="invite-performance invite-meus-dados">
            <h3 className="section-title">Dados do Subordinado</h3>
            <div className="performance-filters">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`filter ${period === opt.value ? 'active' : ''}`}
                  onClick={() => handlePeriodChange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="kpi-grid">
              <div className="kpi-item">
                <span>Novos subordinados</span>
                <strong>{affiliateStats?.newSubordinates ?? affiliateStats?.totalReferrals ?? 0}</strong>
              </div>
              <div className="kpi-item kpi-underline">
                <span>Depósitos</span>
                <strong>{affiliateStats?.depositsCount ?? 0}</strong>
              </div>
              <div className="kpi-item kpi-underline">
                <span>Primeiros Depósitos</span>
                <strong>{affiliateStats?.firstDepositsCount ?? 0}</strong>
              </div>
              <div className="kpi-item kpi-underline">
                <span>Usuários registrados com 1º depósito</span>
                <strong>{affiliateStats?.usersWithFirstDeposit ?? 0}</strong>
              </div>
              <div className="kpi-item">
                <span>Depósito (Total)</span>
                <strong>{formatCurrency(affiliateStats?.totalDepositsInPeriod ?? affiliateStats?.totalDeposits)}</strong>
              </div>
              <div className="kpi-item">
                <span>Valor do primeiro depósito</span>
                <strong>{formatCurrency(affiliateStats?.firstDepositValue)}</strong>
              </div>
              <div className="kpi-item">
                <span>Registro e 1º depósito</span>
                <strong>{formatCurrency(affiliateStats?.registrationAndFirstDeposit)}</strong>
              </div>
              <div className="kpi-item">
                <span>Valor do Saque</span>
                <strong>{formatCurrency(affiliateStats?.withdrawalsTotalInPeriod ?? 0)}</strong>
              </div>
              <div className="kpi-item kpi-underline">
                <span>Número de saques</span>
                <strong>{affiliateStats?.withdrawalsCount ?? 0}</strong>
              </div>
              <div className="kpi-item kpi-underline">
                <span>Apostas Válidas</span>
                <strong>{formatCurrency(affiliateStats?.validBets ?? affiliateStats?.totalBets)}</strong>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'desempenho' && (
          <div className="invite-performance">
            <div className="performance-filters">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`filter ${period === opt.value ? 'active' : ''}`}
                  onClick={() => handlePeriodChange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="performance-cards">
              <div className="performance-card">
                <span>Cadastros</span>
                <strong>{affiliateStats?.newSubordinates ?? affiliateStats?.totalReferrals ?? 0}</strong>
              </div>
              <div className="performance-card">
                <span>Total Depósitos</span>
                <strong>{formatCurrency(affiliateStats?.totalDepositsInPeriod ?? affiliateStats?.totalDeposits)}</strong>
              </div>
              <div className="performance-card">
                <span>Depositantes</span>
                <strong>{affiliateStats?.depositorsCount ?? 0}</strong>
              </div>
              <div className="performance-card" title="Referidos com R$ 10+ em depósitos e R$ 100+ em apostas">
                <span>Qualificados</span>
                <strong>{affiliateStats?.qualifiedReferrals ?? 0}</strong>
                <small>R$ 10+ depósitos e R$ 100+ apostas</small>
              </div>
            </div>
            {affiliateStats?.referrals && affiliateStats.referrals.length > 0 ? (
              <div className="referrals-list">
                <h3>Seus Referidos</h3>
                <div className="referrals-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Usuário</th>
                        <th>Status</th>
                        <th>Depósitos</th>
                        <th>Apostas</th>
                        <th>Recompensa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {affiliateStats.referrals.map((ref) => (
                        <tr key={ref.id}>
                          <td>{ref.referred?.username || 'N/A'}</td>
                          <td>
                            <span className={`status-badge ${ref.status}`}>
                              {ref.status === 'qualified' ? 'Qualificado' : ref.status === 'rewarded' ? 'Recompensado' : 'Pendente'}
                            </span>
                          </td>
                          <td>
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                              minimumFractionDigits: 2
                            }).format(ref.totalDeposits || 0)}
                          </td>
                          <td>
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                              minimumFractionDigits: 2
                            }).format(ref.totalBets || 0)}
                          </td>
                          <td>
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                              minimumFractionDigits: 2
                            }).format(ref.rewardAmount || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="performance-empty">
                <i className="fa-solid fa-user-slash"></i>
                <span>Você ainda não tem referidos.</span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'comissao' && (
          <div className="invite-performance invite-comissao">
            <h3 className="section-title">Comissão e Recompensas</h3>
            <div className="comissao-cards">
              <div className="comissao-card">
                <span>Comissão de Depósitos</span>
                <strong>{formatCurrency(affiliateStats?.totalDepositCommission)}</strong>
                <small>% sobre depósitos dos indicados (vai direto para seu saldo)</small>
              </div>
              <div className="comissao-card highlight">
                <span>Saldo Afiliado</span>
                <strong>{formatCurrency(affiliateStats?.affiliateBalance ?? user?.affiliateBalance)}</strong>
                <small>Recompensas de baús (qualificados)</small>
              </div>
              <div className="comissao-card">
                <span>Referidos qualificados</span>
                <strong>{affiliateStats?.qualifiedReferrals ?? 0}</strong>
              </div>
            </div>
            <p className="comissao-info">
              A comissão sobre depósitos vai direto para seu saldo principal. 
              Recompensas de baús ficam no Saldo Afiliado.
            </p>
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

