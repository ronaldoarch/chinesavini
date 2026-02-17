import express from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { isAdmin } from '../middleware/admin.middleware.js'
import igamewinService from '../services/igamewin.service.js'
import GameConfig from '../models/GameConfig.model.js'
import seamlessRoutes from './seamless.routes.js'

const router = express.Router()

// @route   GET /api/games/config
// @desc    Get game configuration
// @access  Private/Admin
router.get('/config', protect, isAdmin, async (req, res) => {
  try {
    const config = await GameConfig.getConfig()
    res.json({
      success: true,
      data: config
    })
  } catch (error) {
    console.error('Get config error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar configuração',
      error: error.message
    })
  }
})

// @route   PUT /api/games/config
// @desc    Update game configuration
// @access  Private/Admin
router.put('/config', protect, isAdmin, async (req, res) => {
  try {
    const { agentCode, agentToken, agentSecret, selectedProviders, selectedGames, agentRTP } = req.body

    let config = await GameConfig.findOne()
    
    if (!config) {
      config = new GameConfig({
        agentCode: agentCode || process.env.IGAMEWIN_AGENT_CODE || '4916vini',
        agentToken: agentToken || process.env.IGAMEWIN_AGENT_TOKEN || '2b887a93fcbd11f098a0bc2411881493',
        agentSecret: agentSecret || process.env.IGAMEWIN_AGENT_SECRET || ''
      })
    }

    if (agentCode) config.agentCode = agentCode
    if (agentToken) config.agentToken = agentToken
    if (agentSecret) config.agentSecret = agentSecret
    if (selectedProviders) {
      if (selectedProviders.length > 3) {
        return res.status(400).json({
          success: false,
          message: 'Máximo de 3 provedores permitidos'
        })
      }
      config.selectedProviders = selectedProviders
    }
    if (selectedGames) {
      // Validate 20 games per provider
      const gamesByProvider = {}
      for (const game of selectedGames) {
        gamesByProvider[game.providerCode] = (gamesByProvider[game.providerCode] || 0) + 1
        if (gamesByProvider[game.providerCode] > 20) {
          return res.status(400).json({
            success: false,
            message: `Máximo de 20 jogos permitidos por provedor. O provedor ${game.providerCode} tem ${gamesByProvider[game.providerCode]} jogos selecionados.`
          })
        }
      }
      config.selectedGames = selectedGames
    }
    
    // Handle RTP configuration
    if (agentRTP !== undefined) {
      if (agentRTP !== null && (agentRTP < 0 || agentRTP > 100)) {
        return res.status(400).json({
          success: false,
          message: 'RTP deve estar entre 0 e 100'
        })
      }
      config.agentRTP = agentRTP === '' ? null : agentRTP
    }

    await config.save()

    // Apply RTP if configured
    if (config.agentRTP !== null && config.agentRTP !== undefined) {
      try {
        await igamewinService.controlRTP(config.agentRTP)
        console.log(`RTP aplicado com sucesso: ${config.agentRTP}%`)
      } catch (rtpError) {
        console.error('Erro ao aplicar RTP:', rtpError)
        // Don't fail the request, just log the error
      }
    }

    res.json({
      success: true,
      message: 'Configuração atualizada com sucesso',
      data: config
    })
  } catch (error) {
    console.error('Update config error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar configuração',
      error: error.message
    })
  }
})

// @route   POST /api/games/apply-rtp
// @desc    Apply RTP configuration to iGameWin
// @access  Private/Admin
router.post('/apply-rtp', protect, isAdmin, async (req, res) => {
  try {
    const config = await GameConfig.getConfig()
    
    if (config.agentRTP === null || config.agentRTP === undefined) {
      return res.status(400).json({
        success: false,
        message: 'RTP não configurado. Configure o RTP primeiro na página de configuração de jogos.'
      })
    }

    const result = await igamewinService.controlRTP(config.agentRTP)
    
    if (result.status === 1) {
      res.json({
        success: true,
        message: `RTP de ${config.agentRTP}% aplicado com sucesso`,
        data: result
      })
    } else {
      res.status(400).json({
        success: false,
        message: result.msg || 'Erro ao aplicar RTP',
        data: result
      })
    }
  } catch (error) {
    console.error('Apply RTP error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao aplicar RTP',
      error: error.message
    })
  }
})

// @route   GET /api/games/providers
// @desc    Get available providers
// @access  Private/Admin
router.get('/providers', protect, isAdmin, async (req, res) => {
  try {
    const response = await igamewinService.getProviderList()
    if (response.status === 1) {
      res.json({
        success: true,
        data: response.providers
      })
    } else {
      res.status(400).json({
        success: false,
        message: response.msg || 'Erro ao buscar provedores'
      })
    }
  } catch (error) {
    console.error('Get providers error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar provedores',
      error: error.message
    })
  }
})

// @route   GET /api/games/games/:providerCode
// @desc    Get games from a provider
// @access  Private/Admin
router.get('/games/:providerCode', protect, isAdmin, async (req, res) => {
  try {
    const { providerCode } = req.params
    const response = await igamewinService.getGameList(providerCode)
    if (response.status === 1) {
      res.json({
        success: true,
        data: response.games
      })
    } else {
      res.status(400).json({
        success: false,
        message: response.msg || 'Erro ao buscar jogos'
      })
    }
  } catch (error) {
    console.error('Get games error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar jogos',
      error: error.message
    })
  }
})

// @route   GET /api/games/selected
// @desc    Get selected games for home page
// @access  Public
router.get('/selected', async (req, res) => {
  try {
    const config = await GameConfig.getConfig()
    
    // Get provider names
    let providerNames = {}
    if (config.selectedProviders.length > 0) {
      try {
        const providersResponse = await igamewinService.getProviderList()
        if (providersResponse.status === 1 && providersResponse.providers) {
          providersResponse.providers.forEach(provider => {
            providerNames[provider.code] = provider.name
          })
        }
      } catch (err) {
        console.error('Error fetching provider names:', err)
      }
    }
    
    // Group games by provider
    const gamesByProvider = {}
    config.selectedGames.forEach(game => {
      if (!gamesByProvider[game.providerCode]) {
        gamesByProvider[game.providerCode] = []
      }
      gamesByProvider[game.providerCode].push(game)
    })
    
    // Build providers array with their games
    const providersData = config.selectedProviders.map(providerCode => ({
      code: providerCode,
      name: providerNames[providerCode] || providerCode,
      games: gamesByProvider[providerCode] || []
    }))
    
    res.json({
      success: true,
      data: {
        providers: providersData
      }
    })
  } catch (error) {
    console.error('Get selected games error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar jogos selecionados',
      error: error.message
    })
  }
})

// @route   POST /api/games/launch
// @desc    Launch a game - syncs user balance to igamewin so it appears in the game
// @access  Private
router.post('/launch', protect, async (req, res) => {
  try {
    const { providerCode, gameCode, lang = 'pt' } = req.body
    const user = req.user

    if (!providerCode || !gameCode) {
      return res.status(400).json({
        success: false,
        message: 'Provider code e game code são obrigatórios'
      })
    }

    const userCode = user._id.toString()
    const isSamples = igamewinService.isSamplesMode()

    // Create user in igamewin if not exists (samples mode = is_demo true, doc iGameWin)
    try {
      await igamewinService.createUser(userCode, isSamples)
    } catch (error) {
      console.log('User creation:', error.message)
    }

    // Seamless: saldo fica no nosso DB; iGameWin chama /api/games/seamless para user_balance e transaction
    // Samples: agente em demo — não movimentamos saldo real

    // Launch game
    const response = await igamewinService.launchGame(userCode, providerCode, gameCode, lang)

    if (response.status === 1) {
      res.json({
        success: true,
        data: {
          launchUrl: response.launch_url
        }
      })
    } else {
      const msg = response.msg || 'Erro ao lançar jogo'
      if (msg === 'ERROR_GET_BALANCE_END_POINT') {
        console.warn('iGameWin ERROR_GET_BALANCE_END_POINT: verifique Site EndPoint no painel (ex: https://api.midas777.fun ou https://api.midas777.fun/api)')
      }
      res.status(400).json({
        success: false,
        message: msg
      })
    }
  } catch (error) {
    console.error('Launch game error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao lançar jogo',
      error: error.message
    })
  }
})

// @route   POST /api/games/deposit
// @desc    Seamless: no-op (saldo no nosso DB; iGameWin chama /seamless)
// @access  Private
router.post('/deposit', protect, async (req, res) => {
  try {
    const user = req.user
    if (igamewinService.isSamplesMode()) {
      return res.json({
        success: true,
        message: 'Samples mode: depósito não enviado',
        data: { userBalance: user.balance, agentBalance: 0 }
      })
    }
    return res.json({
      success: true,
      message: 'Seamless: saldo gerenciado via callback',
      data: { userBalance: user.balance, agentBalance: 0 }
    })
  } catch (error) {
    console.error('Deposit error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao realizar depósito',
      error: error.message
    })
  }
})

// @route   POST /api/games/withdraw
// @desc    Seamless: no-op (saldo no nosso DB; iGameWin chama /seamless)
// @access  Private
router.post('/withdraw', protect, async (req, res) => {
  try {
    const user = req.user
    if (igamewinService.isSamplesMode()) {
      return res.json({
        success: true,
        message: 'Samples mode: saque não enviado',
        data: { userBalance: user.balance, agentBalance: 0 }
      })
    }
    return res.json({
      success: true,
      message: 'Seamless: saldo gerenciado via callback',
      data: { userBalance: user.balance, agentBalance: 0 }
    })
  } catch (error) {
    console.error('Withdraw error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao realizar saque',
      error: error.message
    })
  }
})

// @route   POST /api/games/sync-balance
// @desc    Seamless: no-op (saldo no nosso DB; retorna balance atual)
// @access  Private
router.post('/sync-balance', protect, async (req, res) => {
  try {
    const user = req.user
    return res.json({
      success: true,
      data: { balance: user.balance, synced: true }
    })
  } catch (error) {
    console.error('Sync balance error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao sincronizar saldo',
      error: error.message
    })
  }
})

// @route   POST /api/games/seamless
// @desc    API Link Guide: Seamless Site API - user_balance & transaction
router.use('/seamless', seamlessRoutes)

// @route   GET /api/games/agent-balance
// @desc    money_info sem user_code - saldo do agente na iGameWin (doc: Get Balance of Agent)
// @access  Private/Admin
router.get('/agent-balance', protect, isAdmin, async (req, res) => {
  try {
    const response = await igamewinService.getMoneyInfo()
    if (response.status === 1) {
      const balanceReais = igamewinService.parseAgentBalanceFromMoneyInfo(response)
      res.json({
        success: true,
        data: {
          agentCode: response.agent?.agent_code,
          balance: balanceReais,
          balanceCents: response.agent?.balance ?? 0
        }
      })
    } else {
      res.status(400).json({
        success: false,
        message: response.msg || 'Erro ao buscar saldo do agente'
      })
    }
  } catch (error) {
    console.error('Get agent balance error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar saldo do agente',
      error: error.message
    })
  }
})

// @route   GET /api/games/balance
// @desc    Seamless: retorna saldo do usuário (nosso DB)
// @access  Private
router.get('/balance', protect, async (req, res) => {
  try {
    const user = req.user
    res.json({
      success: true,
      data: {
        userBalance: user.balance || 0,
        agentBalance: 0
      }
    })
  } catch (error) {
    console.error('Get balance error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar saldo',
      error: error.message
    })
  }
})

export default router
