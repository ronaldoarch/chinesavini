import axios from 'axios'

const IGAMEWIN_API_URL = 'https://igamewin.com/api/v1'

/** iGameWin API uses amounts in cents (e.g. 10000 = R$ 100.00). Our DB uses reais. */
const reaisToCents = (reais) => Math.round(Number(reais) * 100)
const centsToReais = (cents) => (Number(cents) || 0) / 100

/** Quando o agente iGameWin está em samples/demo mode: usuários são criados com is_demo, não movimentamos saldo real. */
function isSamplesMode() {
  const v = (process.env.IGAMEWIN_SAMPLES_MODE || '').toString().toLowerCase()
  return v === 'true' || v === '1' || v === 'yes'
}

class IGameWinService {
  constructor() {
    this.agentCode = process.env.IGAMEWIN_AGENT_CODE || 'Midaslabs'
    this.agentToken = process.env.IGAMEWIN_AGENT_TOKEN || '092b6406e28211f0b8f1bc2411881493'
    this.agentSecret = process.env.IGAMEWIN_AGENT_SECRET || '19e4c979a7a5a4f70ffc30b510312317'
  }

  isSamplesMode() {
    return isSamplesMode()
  }

  async makeRequest(method, params = {}) {
    try {
      const payload = {
        method,
        agent_code: this.agentCode,
        agent_token: this.agentToken,
        ...params
      }

      const response = await axios.post(IGAMEWIN_API_URL, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      })

      return response.data
    } catch (error) {
      console.error('IGameWin API Error:', error.message)
      throw new Error(error.response?.data?.msg || 'Erro ao comunicar com API de jogos')
    }
  }

  // Transfer API Methods — em samples mode criamos sempre como is_demo (doc iGameWin)
  async createUser(userCode, isDemo = null) {
    const params = { user_code: userCode }
    const useDemo = isDemo !== null ? isDemo : isSamplesMode()
    if (useDemo) {
      params.is_demo = true
    }
    return this.makeRequest('user_create', params)
  }

  async depositUserBalance(userCode, amountInReais) {
    return this.makeRequest('user_deposit', {
      user_code: userCode,
      amount: reaisToCents(amountInReais)
    })
  }

  async withdrawUserBalance(userCode, amountInReais) {
    return this.makeRequest('user_withdraw', {
      user_code: userCode,
      amount: reaisToCents(amountInReais)
    })
  }

  async resetUserBalance(userCode, allUsers = false) {
    const params = allUsers ? { all_users: true } : { user_code: userCode }
    return this.makeRequest('user_withdraw_reset', params)
  }

  async setDemo(userCode) {
    return this.makeRequest('set_demo', { user_code: userCode })
  }

  async launchGame(userCode, providerCode, gameCode, lang = 'pt') {
    return this.makeRequest('game_launch', {
      user_code: userCode,
      provider_code: providerCode,
      game_code: gameCode,
      lang: lang
    })
  }

  /** Returns balance in reais (converted from API cents). Use raw response for agent-only or all_users. */
  parseUserBalanceFromMoneyInfo(moneyInfo) {
    const raw = moneyInfo.user?.balance ?? moneyInfo.user_balance ?? moneyInfo.balance ?? 0
    return centsToReais(raw)
  }

  async getMoneyInfo(userCode = null, allUsers = false) {
    const params = {}
    if (allUsers) {
      params.all_users = true
    } else if (userCode) {
      params.user_code = userCode
    }
    return this.makeRequest('money_info', params)
  }

  async getProviderList() {
    return this.makeRequest('provider_list')
  }

  async getGameList(providerCode) {
    return this.makeRequest('game_list', {
      provider_code: providerCode
    })
  }

  async getGameHistory(userCode, gameType, start, end, page = 0, perPage = 1000) {
    return this.makeRequest('get_game_log', {
      user_code: userCode,
      game_type: gameType,
      start: start,
      end: end,
      page: page,
      perPage: perPage
    })
  }

  // Control API Methods
  async controlRTP(rtp, userCode = null, userCodes = null) {
    const params = { rtp }
    if (userCodes && Array.isArray(userCodes)) {
      params.user_code = userCodes
    } else if (userCode) {
      params.user_code = userCode
    }
    return this.makeRequest('control_rtp', params)
  }

  async controlDemoSpin(demoSpinStart, demoSpinEnd, userCode = null, userCodes = null) {
    const params = {
      demo_spin_start: demoSpinStart,
      demo_spin_end: demoSpinEnd
    }
    if (userCodes && Array.isArray(userCodes)) {
      params.user_code = userCodes
    } else if (userCode) {
      params.user_code = userCode
    }
    return this.makeRequest('control_demo_spin', params)
  }

  // Seamless API Methods (Site API - iGameWin calls OUR backend)
  async getUserBalance(userCode) {
    // This should be called from your site API endpoint
    // Not directly from igamewin
    return {
      method: 'user_balance',
      agent_code: this.agentCode,
      agent_secret: this.agentSecret,
      user_code: userCode
    }
  }

  async processTransaction(agentBalance, userCode, userBalance, gameType, transactionData) {
    // This should be called from your site API endpoint
    // Not directly from igamewin
    return {
      method: 'transaction',
      agent_code: this.agentCode,
      agent_secret: this.agentSecret,
      agent_balance: agentBalance,
      user_code: userCode,
      user_balance: userBalance,
      game_type: gameType,
      ...transactionData
    }
  }
}

export default new IGameWinService()
