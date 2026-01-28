import React from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
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
import './styles/App.css'

function AppContent() {
  const { isAuthenticated, user, logout } = useAuth()
  const [isAuthOpen, setIsAuthOpen] = React.useState(false)
  const [authTab, setAuthTab] = React.useState('register')
  const [isPromotionsOpen, setIsPromotionsOpen] = React.useState(false)
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  const [isInviteOpen, setIsInviteOpen] = React.useState(false)
  const [isDepositOpen, setIsDepositOpen] = React.useState(false)
  const [isPixOpen, setIsPixOpen] = React.useState(false)
  const [isDepositHistoryOpen, setIsDepositHistoryOpen] = React.useState(false)
  const [isGamesOpen, setIsGamesOpen] = React.useState(false)
  const [isBetsHistoryOpen, setIsBetsHistoryOpen] = React.useState(false)
  const [isProfileOpen, setIsProfileOpen] = React.useState(false)
  const [isWithdrawOpen, setIsWithdrawOpen] = React.useState(false)
  const [withdrawTab, setWithdrawTab] = React.useState('saque')
  const [isEditProfileOpen, setIsEditProfileOpen] = React.useState(false)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = React.useState(false)
  const [isVipOpen, setIsVipOpen] = React.useState(false)
  const [pixAmount, setPixAmount] = React.useState(0)
  const [pixTransaction, setPixTransaction] = React.useState(null)

  // Format balance
  const formatBalance = (amount) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(amount || 0)
  }

  const balance = user ? formatBalance(user.balance) : 'R$ 0,00'

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
  const closePix = () => setIsPixOpen(false)
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
  const openGames = () => setIsGamesOpen(true)
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

  return (
    <div className="app">
      <Header
        onRegisterClick={openRegister}
        onLoginClick={openLogin}
        onMenuClick={openMenu}
        onDepositClick={openDeposit}
        isMenuOpen={isMenuOpen}
        isLoggedIn={isAuthenticated}
        balance={balance}
      />
      <NavigationIcons onVipClick={openVip} onPromotionsClick={openPromotions} onInviteClick={openInvite} />
      <BonusBanner />
      <JackpotDisplay />
      <GamesSection onViewAll={openGames} />
      <Footer />
      <ScrollToTopButton />
      <BottomNavigation
        onLoginClick={openLogin}
        onRegisterClick={openRegister}
        onPromotionsClick={openPromotions}
        onDepositClick={openDeposit}
        onProfileClick={() => {
          closeMenu()
          openProfile()
        }}
        isLoggedIn={isAuthenticated}
      />
      <AuthModal
        isOpen={isAuthOpen}
        initialTab={authTab}
        onClose={closeAuth}
        onAuthSuccess={handleAuthSuccess}
      />
      <PromotionsModal isOpen={isPromotionsOpen} onClose={closePromotions} />
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
        onRegisterClick={openRegister}
        onLoginClick={openLogin}
        onMenuClick={openMenu}
        onDepositClick={openDeposit}
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
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App

