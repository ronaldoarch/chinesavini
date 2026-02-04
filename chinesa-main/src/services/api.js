const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

class ApiService {
  constructor() {
    // Ensure API_BASE_URL ends with /api
    let baseURL = API_BASE_URL
    if (!baseURL.endsWith('/api')) {
      // Remove trailing slash if present, then add /api
      baseURL = baseURL.replace(/\/$/, '') + '/api'
    }
    this.baseURL = baseURL
    console.log('🔗 API Base URL:', this.baseURL) // Debug log
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const isFormData = options.body instanceof FormData
    
    const config = {
      headers: {
        ...(!isFormData && { 'Content-Type': 'application/json' }),
        ...options.headers
      },
      ...options
    }

    // Add token if available
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro na requisição')
      }

      return data
    } catch (error) {
      throw error
    }
  }

  // Auth endpoints
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    })
  }

  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    })
  }

  async getCurrentUser() {
    return this.request('/auth/me', {
      method: 'GET'
    })
  }

  // Payment endpoints
  async createDeposit(depositData) {
    return this.request('/payments/deposit', {
      method: 'POST',
      body: JSON.stringify(depositData)
    })
  }

  async createWithdraw(withdrawData) {
    return this.request('/payments/withdraw', {
      method: 'POST',
      body: JSON.stringify(withdrawData)
    })
  }

  async getTransactions(params = {}) {
    const queryString = new URLSearchParams(params).toString()
    return this.request(`/payments/transactions?${queryString}`, {
      method: 'GET'
    })
  }

  async getTransaction(id) {
    return this.request(`/payments/transaction/${id}`, {
      method: 'GET'
    })
  }

  // Admin endpoints
  async getDashboard() {
    return this.request('/admin/dashboard', {
      method: 'GET'
    })
  }

  async getAdminUsers(params = {}) {
    const queryString = new URLSearchParams(params).toString()
    return this.request(`/admin/users?${queryString}`, {
      method: 'GET'
    })
  }

  async getAdminUser(id) {
    return this.request(`/admin/users/${id}`, {
      method: 'GET'
    })
  }

  async updateAdminUser(id, userData) {
    return this.request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    })
  }

  async getAdminTransactions(params = {}) {
    const queryString = new URLSearchParams(params).toString()
    return this.request(`/admin/transactions?${queryString}`, {
      method: 'GET'
    })
  }

  async getAdminTransaction(id) {
    return this.request(`/admin/transactions/${id}`, {
      method: 'GET'
    })
  }

  async updateTransactionStatus(id, status) {
    return this.request(`/admin/transactions/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    })
  }

  // Health check
  async healthCheck() {
    return this.request('/health', {
      method: 'GET'
    })
  }

  // Games endpoints
  async getGameConfig() {
    return this.request('/games/config', {
      method: 'GET'
    })
  }

  async updateGameConfig(configData) {
    return this.request('/games/config', {
      method: 'PUT',
      body: JSON.stringify(configData)
    })
  }

  async applyRTP() {
    return this.request('/games/apply-rtp', {
      method: 'POST'
    })
  }

  async getProviders() {
    return this.request('/games/providers', {
      method: 'GET'
    })
  }

  async getGames(providerCode) {
    return this.request(`/games/games/${providerCode}`, {
      method: 'GET'
    })
  }

  async getSelectedGames() {
    return this.request('/games/selected', {
      method: 'GET'
    })
  }

  async launchGame(providerCode, gameCode, lang = 'pt') {
    return this.request('/games/launch', {
      method: 'POST',
      body: JSON.stringify({ providerCode, gameCode, lang })
    })
  }

  async getGameBalance() {
    return this.request('/games/balance', {
      method: 'GET'
    })
  }

  async syncGameBalance() {
    return this.request('/games/sync-balance', {
      method: 'POST'
    })
  }

  async depositGameBalance(amount) {
    return this.request('/games/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount })
    })
  }

  async withdrawGameBalance(amount) {
    return this.request('/games/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount })
    })
  }

  // Gateway endpoints
  async getGatewayConfig() {
    return this.request('/gateway/config', {
      method: 'GET'
    })
  }

  async updateGatewayConfig(configData) {
    return this.request('/gateway/config', {
      method: 'PUT',
      body: JSON.stringify(configData)
    })
  }

  async testGateway(realTest = false) {
    return this.request('/gateway/test', {
      method: 'POST',
      ...(realTest && { body: JSON.stringify({ realTest: true }) })
    })
  }

  // Theme endpoints
  async getActiveTheme() {
    return this.request('/theme/active', {
      method: 'GET'
    })
  }

  async getThemes() {
    return this.request('/theme', {
      method: 'GET'
    })
  }

  async getTheme(id) {
    return this.request(`/theme/${id}`, {
      method: 'GET'
    })
  }

  async createTheme(themeData) {
    return this.request('/theme', {
      method: 'POST',
      body: JSON.stringify(themeData)
    })
  }

  async updateTheme(id, themeData) {
    return this.request(`/theme/${id}`, {
      method: 'PUT',
      body: JSON.stringify(themeData)
    })
  }

  async deleteTheme(id) {
    return this.request(`/theme/${id}`, {
      method: 'DELETE'
    })
  }

  async duplicateTheme(id) {
    return this.request(`/theme/${id}/duplicate`, {
      method: 'POST'
    })
  }

  // Chest endpoints
  async getChests() {
    return this.request('/chests', {
      method: 'GET'
    })
  }

  async claimChest(chestId) {
    return this.request(`/chests/${chestId}/claim`, {
      method: 'POST'
    })
  }

  // VIP endpoints
  async getVipStatus() {
    return this.request('/vip/status', {
      method: 'GET'
    })
  }

  async claimVipBonus(level) {
    return this.request(`/vip/claim/${level}`, {
      method: 'POST'
    })
  }

  async claimAllVipBonuses() {
    return this.request('/vip/claim-all', {
      method: 'POST'
    })
  }

  // Affiliate endpoints
  async getAffiliateStats(period = 'all') {
    const params = period && period !== 'all' ? `?period=${encodeURIComponent(period)}` : ''
    return this.request(`/affiliate/stats${params}`, {
      method: 'GET'
    })
  }

  async withdrawAffiliateBalance(amount) {
    return this.request('/affiliate/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount })
    })
  }

  async getAffiliatesAdmin(search = '', page = 1) {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (page) params.append('page', page)
    return this.request(`/affiliate/admin/all?${params.toString()}`, {
      method: 'GET'
    })
  }

  async getAffiliateDetailsAdmin(userId) {
    return this.request(`/affiliate/admin/${userId}`, {
      method: 'GET'
    })
  }

  async updateAffiliateConfig(userId, configData) {
    return this.request(`/affiliate/admin/${userId}/config`, {
      method: 'PUT',
      body: JSON.stringify(configData)
    })
  }

  // Banner endpoints
  async getBanners() {
    return this.request('/banners', {
      method: 'GET'
    })
  }

  async getLogo() {
    return this.request('/banners/logo', {
      method: 'GET'
    })
  }

  async getBannersAdmin() {
    return this.request('/banners/admin/all', {
      method: 'GET'
    })
  }

  async getLogoAdmin() {
    return this.request('/banners/admin/logo', {
      method: 'GET'
    })
  }

  async createBanner(formData) {
    return this.request('/banners/admin', {
      method: 'POST',
      body: formData,
      headers: {} // Let browser set Content-Type with boundary for FormData
    })
  }

  async updateBanner(id, formData) {
    return this.request(`/banners/admin/${id}`, {
      method: 'PUT',
      body: formData,
      headers: {} // Let browser set Content-Type with boundary for FormData
    })
  }

  async deleteBanner(id) {
    return this.request(`/banners/admin/${id}`, {
      method: 'DELETE'
    })
  }

  async uploadLogo(formData) {
    return this.request('/banners/admin/logo', {
      method: 'POST',
      body: formData,
      headers: {} // Let browser set Content-Type with boundary for FormData
    })
  }

  // Tracking (admin): webhooks e eventos Facebook
  async getTrackingWebhooks(params = {}) {
    const q = new URLSearchParams(params).toString()
    return this.request(`/admin/tracking/webhooks${q ? '?' + q : ''}`, { method: 'GET' })
  }

  async getTrackingFacebookEvents(params = {}) {
    const q = new URLSearchParams(params).toString()
    return this.request(`/admin/tracking/facebook-events${q ? '?' + q : ''}`, { method: 'GET' })
  }

  async getTrackingConfig() {
    return this.request('/admin/tracking/config', { method: 'GET' })
  }

  async updateTrackingConfig(configData) {
    return this.request('/admin/tracking/config', {
      method: 'PUT',
      body: JSON.stringify(configData)
    })
  }

  async getTrackingConfigPublic() {
    return this.request('/admin/tracking/config/public', { method: 'GET' })
  }

  // Bonus config (public for deposit modal)
  async getBonusConfig() {
    return this.request('/bonus/config', {
      method: 'GET'
    })
  }

  async getBonusConfigAdmin() {
    return this.request('/bonus/config/admin', {
      method: 'GET'
    })
  }

  async updateBonusConfig(configData) {
    return this.request('/bonus/config', {
      method: 'PUT',
      body: JSON.stringify(configData)
    })
  }

  // Popups (public active popup)
  async getActivePopup() {
    return this.request('/popups/active', {
      method: 'GET'
    })
  }

  async getPopups() {
    return this.request('/popups', {
      method: 'GET'
    })
  }

  async getPopup(id) {
    return this.request(`/popups/${id}`, {
      method: 'GET'
    })
  }

  async createPopup(data) {
    return this.request('/popups', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updatePopup(id, data) {
    return this.request(`/popups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async deletePopup(id) {
    return this.request(`/popups/${id}`, {
      method: 'DELETE'
    })
  }

  // Jackpot (public)
  async getJackpot() {
    return this.request('/jackpot', {
      method: 'GET'
    })
  }

  async updateJackpot(value) {
    return this.request('/jackpot', {
      method: 'PUT',
      body: JSON.stringify({ value })
    })
  }

  // Promotions (public + admin)
  async getPromotions() {
    return this.request('/promotions', { method: 'GET' })
  }

  async getPromotionsAdmin() {
    return this.request('/promotions/admin/all', { method: 'GET' })
  }

  async createPromotion(formData) {
    return this.request('/promotions/admin', {
      method: 'POST',
      body: formData,
      headers: {}
    })
  }

  async updatePromotion(id, formData) {
    return this.request(`/promotions/admin/${id}`, {
      method: 'PUT',
      body: formData,
      headers: {}
    })
  }

  async deletePromotion(id) {
    return this.request(`/promotions/admin/${id}`, {
      method: 'DELETE'
    })
  }

  // Support config (public + admin)
  async getSupportConfig() {
    return this.request('/support/config', { method: 'GET' })
  }

  async updateSupportConfig(data) {
    return this.request('/support/config', {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }
}

export default new ApiService()
