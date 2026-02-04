import React from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { SupportProvider } from './contexts/SupportContext'
import { useFacebookPixel } from './hooks/useFacebookPixel'
import api from './services/api'
import Header from './components/Header'
import NavigationIcons from './components/NavigationIcons'
import BonusBanner from './components/BonusBanner'
import JackpotDisplay from './components/JackpotDisplay'
import GamesSection from './components/GamesSection'
import Footer from './components/Footer'
import BottomNavigation from './components/BottomNavigation'
import ScrollToTopButton from './components/ScrollToTopButton'
import AuthModal from './components/AuthModal'
import PromotionsModal from './components/PromotionsModal'
import MenuModal from './components/MenuModal'
import InviteModal from './components/InviteModal'
import DepositModal from './components/DepositModal'
import PixPaymentModal from './components/PixPaymentModal'
import DepositHistoryModal from './components/DepositHistoryModal'
import GamesModal from './components/GamesModal'
import BetsHistoryModal from './components/BetsHistoryModal'
import ProfileModal from './components/ProfileModal'
import WithdrawModal from './components/WithdrawModal'
import EditProfileModal from './components/EditProfileModal'
import ChangePasswordModal from './components/ChangePasswordModal'
import VipModal from './components/VipModal'
import PopupPromoModal from './components/PopupPromoModal'
import GameFrame from './components/GameFrame'
import './styles/App.css'

function AppContent() {
  const { isAuthenticated, user, logout, refreshUser } = useAuth()
  const { trackEvent } = useFacebookPixel()
  const [isAuthOpen, setIsAuthOpen] = React.useState(false)
  const [authTab, setAuthTab] = React.useState('register')
  const [isPromotionsOpen, setIsPromotionsOpen] = React.useState(false)
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  const [isInviteOpen, setIsInviteOpen] = React.useState(false)
  const [isDepositOpen, setIsDepositOpen] = React.useState(false)
  const [isPixOpen, setIsPixOpen] = React.useState(false)
  const [isDepositHistoryOpen, setIsDepositHistoryOpen] = React.useState(false)
  const [isGamesOpen, setIsGamesOpen] = React.useState(false)
  const [gamesInitialTab, setGamesInitialTab] = React.useState('all')
  const [isBetsHistoryOpen, setIsBetsHistoryOpen] = React.useState(false)
  const [isProfileOpen, setIsProfileOpen] = React.useState(false)
  const [isWithdrawOpen, setIsWithdrawOpen] = React.useState(false)
  const [withdrawTab, setWithdrawTab] = React.useState('saque')
  const [isEditProfileOpen, setIsEditProfileOpen] = React.useState(false)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = React.useState(false)
  const [isVipOpen, setIsVipOpen] = React.useState(false)
  const [pixAmount, setPixAmount] = React.useState(0)
  const [pixTransaction, setPixTransaction] = React.useState(null)
  const [promoPopup, setPromoPopup] = React.useState(null)
  const [gameLaunchUrl, setGameLaunchUrl] = React.useState(null)

  React.useEffect(() => {
    api.getActivePopup()
      .then((res) => {
        if (!res.success || !res.data) return
        const popup = res.data
        if (popup.showOncePerSession) {
          try {
            if (sessionStorage.getItem('popup_seen_' + popup._id)) return
          } catch (_) {}
        }
        setPromoPopup(popup)
      })
      .catch(() => {})
  }, [])

  const closePromoPopup = () => {
    if (promoPopup && promoPopup.showOncePerSession) {
      try {
        sessionStorage.setItem('popup_seen_' + promoPopup._id, '1')
      } catch (_) {}
    }
    setPromoPopup(null)
  }

  // Format balance
  const formatBalance = (amount) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(amount || 0)
  }

  const balance = user ? formatBalance(user.balance) : 'R$ 0,00'

  const handleRefreshBalance = async () => {
    if (isAuthenticated) await refreshUser()
  }

  const handleLaunchGame = (url) => {
    setGameLaunchUrl(url)
  }

  const handleCloseGame = async () => {
    setGameLaunchUrl(null)
    if (isAuthenticated) {
      try {
        await api.syncGameBalance()
      } catch (_) {}
      refreshUser()
    }
  }

  const lastSyncRef = React.useRef(0)
  React.useEffect(() => {
    if (!isAuthenticated) return
    const MIN_SYNC_INTERVAL_MS = 3000
    const onVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - lastSyncRef.current < MIN_SYNC_INTERVAL_MS) return
      lastSyncRef.current = now
      try {
        await api.syncGameBalance()
      } catch (_) {}
      refreshUser()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [isAuthenticated, refreshUser])

  const openRegister = () => {
    setAuthTab('register')
    setIsAuthOpen(true)
  }

  const openLogin = () => {
    setAuthTab('login')
    setIsAuthOpen(true)
  }

  const closeAuth = () => setIsAuthOpen(false)
  const handleAuthSuccess = () => {
    // Auth context will handle the state update
    // Track CompleteRegistration event when user successfully registers/logs in
    if (isAuthenticated && user) {
      trackEvent('CompleteRegistration', { status: true })
    }
  }
  const openPromotions = () => setIsPromotionsOpen(true)
  const closePromotions = () => setIsPromotionsOpen(false)
  const openMenu = () => setIsMenuOpen((prev) => !prev)
  const closeMenu = () => setIsMenuOpen(false)
  const openInvite = () => setIsInviteOpen(true)
  const closeInvite = () => setIsInviteOpen(false)
  const openDeposit = () => setIsDepositOpen(true)
  const closeDeposit = () => setIsDepositOpen(false)
  const openDepositHistory = () => setIsDepositHistoryOpen(true)
  const closeDepositHistory = () => setIsDepositHistoryOpen(false)
  const openPix = (amountValue, transaction = null) => {
    setPixAmount(amountValue || 0)
    setPixTransaction(transaction)
    setIsPixOpen(true)
  }
  const closePix = () => {
    setIsPixOpen(false)
    if (isAuthenticated) refreshUser()
  }
  const handlePixBack = () => {
    closePix()
    openDeposit()
  }
  const handleDepositConfirm = ({ amountValue, transaction }) => {
    closeDeposit()
    openPix(amountValue, transaction)
  }
  const handleDepositHistoryBack = () => {
    closeDepositHistory()
    openDeposit()
  }
  const openGames = (initialTab = 'all') => {
    setGamesInitialTab(initialTab || 'all')
    setIsGamesOpen(true)
    if (isAuthenticated) refreshUser()
  }
  const closeGames = () => setIsGamesOpen(false)
  const openBetsHistory = () => setIsBetsHistoryOpen(true)
  const closeBetsHistory = () => setIsBetsHistoryOpen(false)
  const handleBetsHistoryBack = () => {
    closeBetsHistory()
    openMenu()
  }
  const openProfile = () => setIsProfileOpen(true)
  const closeProfile = () => setIsProfileOpen(false)
  const handleProfileBack = () => {
    closeProfile()
    openMenu()
  }
  const openEditProfile = () => setIsEditProfileOpen(true)
  const closeEditProfile = () => setIsEditProfileOpen(false)
  const handleEditProfileBack = () => {
    closeEditProfile()
    openProfile()
  }
  const openChangePassword = () => setIsChangePasswordOpen(true)
  const closeChangePassword = () => setIsChangePasswordOpen(false)
  const handleChangePasswordBack = () => {
    closeChangePassword()
    openProfile()
  }
  const openVip = () => setIsVipOpen(true)
  const closeVip = () => setIsVipOpen(false)
  const openWithdraw = (tab = 'saque') => {
    setWithdrawTab(tab)
    setIsWithdrawOpen(true)
  }
  const closeWithdraw = () => setIsWithdrawOpen(false)
  const handleWithdrawBack = () => {
    closeWithdraw()
    openProfile()
  }

  const closeAllModals = () => {
    setIsAuthOpen(false)
    setIsPromotionsOpen(false)
    setIsMenuOpen(false)
    setIsInviteOpen(false)
    setIsDepositOpen(false)
    setIsPixOpen(false)
    setIsDepositHistoryOpen(false)
    setIsGamesOpen(false)
    setIsBetsHistoryOpen(false)
    setIsProfileOpen(false)
    setIsWithdrawOpen(false)
    setIsEditProfileOpen(false)
    setIsChangePasswordOpen(false)
    setIsVipOpen(false)
    setGameLaunchUrl(null)
    closePromoPopup()
  }

  const handleHomeClick = () => {
    closeAllModals()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleNavPromotionsClick = () => {
    closeAllModals()
    openPromotions()
  }

  const handleNavInviteClick = () => {
    closeAllModals()
    openInvite()
  }

  const handleNavDepositClick = () => {
    closeAllModals()
    openDeposit()
  }

  const handleNavRegisterClick = () => {
    closeAllModals()
    openRegister()
  }

  const handleNavProfileClick = () => {
    closeAllModals()
    openProfile()
  }

  const handleNavLoginClick = () => {
    closeAllModals()
    openLogin()
  }

  return (
    <div className="app">
      <Header
        onRegisterClick={openRegister}
        onLoginClick={openLogin}
        onMenuClick={openMenu}
        onDepositClick={openDeposit}
        onRefreshBalance={handleRefreshBalance}
        isMenuOpen={isMenuOpen}
        isLoggedIn={isAuthenticated}
        balance={balance}
      />
      <NavigationIcons onVipClick={openVip} onPromotionsClick={openPromotions} onInviteClick={openInvite} />
      <BonusBanner />
      <JackpotDisplay />
      <GamesSection onViewAll={openGames} onLaunchGame={handleLaunchGame} />
      <Footer />
      <ScrollToTopButton />
      <BottomNavigation
        onLoginClick={handleNavLoginClick}
        onRegisterClick={handleNavRegisterClick}
        onHomeClick={handleHomeClick}
        onPromotionsClick={handleNavPromotionsClick}
        onDepositClick={handleNavDepositClick}
        onInviteClick={handleNavInviteClick}
        onProfileClick={handleNavProfileClick}
        isLoggedIn={isAuthenticated}
      />
      <AuthModal
        isOpen={isAuthOpen}
        initialTab={authTab}
        onClose={closeAuth}
        onAuthSuccess={handleAuthSuccess}
      />
      <PromotionsModal
        isOpen={isPromotionsOpen}
        onClose={closePromotions}
        onDepositClick={() => {
          closePromotions()
          openDeposit()
        }}
        onWithdrawClick={() => {
          closePromotions()
          openWithdraw('saque')
        }}
        onInviteClick={() => {
          closePromotions()
          openInvite()
        }}
      />
      <DepositModal
        isOpen={isDepositOpen}
        onClose={closeDeposit}
        onConfirmDeposit={handleDepositConfirm}
        onOpenHistory={() => {
          closeDeposit()
          openDepositHistory()
        }}
      />
      <PixPaymentModal
        isOpen={isPixOpen}
        onClose={closePix}
        onBack={handlePixBack}
        amountValue={pixAmount}
        transaction={pixTransaction}
      />
      <DepositHistoryModal
        isOpen={isDepositHistoryOpen}
        onClose={closeDepositHistory}
        onBack={handleDepositHistoryBack}
      />
      <GamesModal
        isOpen={isGamesOpen}
        onClose={closeGames}
        initialTab={gamesInitialTab}
        onRegisterClick={openRegister}
        onLoginClick={openLogin}
        onMenuClick={openMenu}
        onDepositClick={openDeposit}
        onRefreshBalance={handleRefreshBalance}
        onLaunchGame={handleLaunchGame}
        onPromotionsClick={openPromotions}
        onInviteClick={openInvite}
        isMenuOpen={isMenuOpen}
        isLoggedIn={isAuthenticated}
        balance={balance}
      />
      <MenuModal
        isOpen={isMenuOpen}
        onClose={closeMenu}
        onLoginClick={openLogin}
        onRegisterClick={openRegister}
        onOpenGames={openGames}
        onOpenProfile={() => {
          closeMenu()
          openProfile()
        }}
        onOpenBets={() => {
          closeMenu()
          openBetsHistory()
        }}
        isLoggedIn={isAuthenticated}
        onLogout={() => {
          logout()
          closeMenu()
        }}
      />
      <BetsHistoryModal
        isOpen={isBetsHistoryOpen}
        onClose={closeBetsHistory}
        onBack={handleBetsHistoryBack}
      />
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={closeProfile}
        onBack={handleProfileBack}
        onLogout={() => {
          logout()
          closeProfile()
        }}
        onOpenDeposit={openDeposit}
        onOpenBets={openBetsHistory}
        onOpenWithdraw={(tab) => {
          closeProfile()
          openWithdraw(tab)
        }}
        onOpenEditProfile={() => {
          closeProfile()
          openEditProfile()
        }}
        onOpenChangePassword={() => {
          closeProfile()
          openChangePassword()
        }}
        onOpenVip={() => {
          closeProfile()
          openVip()
        }}
      />
      <WithdrawModal
        isOpen={isWithdrawOpen}
        initialTab={withdrawTab}
        onClose={closeWithdraw}
        onBack={handleWithdrawBack}
      />
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={closeEditProfile}
        onBack={handleEditProfileBack}
      />
      <VipModal isOpen={isVipOpen} onClose={closeVip} onBack={closeVip} />
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={closeChangePassword}
        onBack={handleChangePasswordBack}
      />
      <InviteModal isOpen={isInviteOpen} onClose={closeInvite} />
      <PopupPromoModal popup={promoPopup} onClose={closePromoPopup} />
      <GameFrame launchUrl={gameLaunchUrl} onClose={handleCloseGame} />
    </div>
  )
}

// Component to initialize Facebook Pixel
function FacebookPixelInitializer() {
  useFacebookPixel() // Just initialize, don't need return value here
  return null
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SupportProvider>
          <FacebookPixelInitializer />
          <AppContent />
        </SupportProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App

