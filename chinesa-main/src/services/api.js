const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const config = {
      headers: {
        'Content-Type': 'application/json',
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
}

export default new ApiService()
