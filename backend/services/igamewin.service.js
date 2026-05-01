import axios from 'axios'
import GameConfig from '../models/GameConfig.model.js'

const IGAMEWIN_API_URL = 'https://igamewin.com/api/v1'

/** iGameWin API uses amounts in cents (e.g. 10000 = R$ 100.00). Our DB uses reais. */
const reaisToCents = (reais) => Math.round(Number(reais) * 100)
const centsToReais = (cents) => (Number(cents) || 0) / 100

/** Quando o agente iGameWin está em samples/demo mode: usuários são criados com is_demo, não movimentamos saldo real. */
function isSamplesMode() {
  const v = (process.env.IGAMEWIN_SAMPLES_MODE || '').toString().toLowerCase()
  return v === 'true' || v === '1' || v === 'yes'
}

/** API Link Guide: agent_code 4916vini, agent_token 2b887a93fcbd11f098a0bc2411881493 */
const DEFAULT_AGENT_CODE = '4916vini'
const DEFAULT_AGENT_TOKEN = '2b887a93fcbd11f098a0bc2411881493'

class IGameWinService {
  constructor() {
    this.agentCode = process.env.IGAMEWIN_AGENT_CODE || DEFAULT_AGENT_CODE
    this.agentToken = process.env.IGAMEWIN_AGENT_TOKEN || DEFAULT_AGENT_TOKEN
    this.agentSecret = process.env.IGAMEWIN_AGENT_SECRET || ''
  }

  async _getCredentials() {
    try {
      const config = await GameConfig.getConfig()
      if (config?.agentCode && config?.agentToken) {
        return { agentCode: config.agentCode, agentToken: config.agentToken }
      }
    } catch (e) {
      // fallback to env
    }
    return { agentCode: this.agentCode, agentToken: this.agentToken }
  }

  isSamplesMode() {
    return isSamplesMode()
  }

  async makeRequest(method, params = {}, retries = 2) {
    // Métodos de lançamento precisam de mais tempo; lista de jogos também pode demorar
    const heavyMethods = ['game_launch', 'game_list', 'provider_list']
    const timeout = heavyMethods.includes(method) ? 30000 : 15000

    const { agentCode, agentToken } = await this._getCredentials()
    const payload = {
      method,
      agent_code: agentCode,
      agent_token: agentToken,
      ...params
    }

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        const response = await axios.post(IGAMEWIN_API_URL, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout
        })
        return response.data
      } catch (error) {
        const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout')
        const isLastAttempt = attempt > retries
        if (isTimeout && !isLastAttempt) {
          console.warn(`IGameWin API timeout (${method}) — tentativa ${attempt}/${retries + 1}, aguardando...`)
          await new Promise(r => setTimeout(r, 1500 * attempt))
          continue
        }
        console.error(`IGameWin API Error (${method}):`, error.message)
        throw new Error(error.response?.data?.msg || error.message || 'Erro ao comunicar com API de jogos')
      }
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

  /** Returns user balance in reais (converted from API cents). */
  parseUserBalanceFromMoneyInfo(moneyInfo) {
    const raw = moneyInfo.user?.balance ?? moneyInfo.user_balance ?? moneyInfo.balance ?? 0
    return centsToReais(raw)
  }

  /** Returns agent balance in reais (money_info sem user_code). Doc: agent.balance em centavos. */
  parseAgentBalanceFromMoneyInfo(moneyInfo) {
    const raw = moneyInfo.agent?.balance ?? 0
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
    const response = await this.makeRequest('game_list', {
      provider_code: providerCode
    })
    // Normaliza: diferentes provedores podem usar chaves diferentes para a lista
    const rawGames = response.games || response.game_list || response.data || response.game_data || []
    // Normaliza campos de cada jogo para padrão consistente
    const games = Array.isArray(rawGames) ? rawGames.map(g => ({
      ...g,
      game_code: g.game_code || g.code || g.gameCode || g.game_id || g.id || '',
      game_name: g.game_name || g.name || g.gameName || g.title || '',
      banner: g.banner || g.img || g.image || g.thumbnail || g.icon || '',
      status: g.status ?? g.active ?? 1
    })) : []
    return { ...response, games }
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
