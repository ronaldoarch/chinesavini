import express from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { isAdmin } from '../middleware/admin.middleware.js'
import igamewinService from '../services/igamewin.service.js'
import GameConfig from '../models/GameConfig.model.js'
import User from '../models/User.model.js'
import GameTxnLog from '../models/GameTxnLog.model.js'

const router = express.Router()

/** Validate iGameWin seamless callback (agent_secret). No JWT - iGameWin calls us. */
function validateSeamlessAgent(req, res, next) {
  const agentCode = req.body?.agent_code
  const agentSecret = req.body?.agent_secret
  const expectedSecret = process.env.IGAMEWIN_AGENT_SECRET || ''
  const expectedCode = process.env.IGAMEWIN_AGENT_CODE || 'Midaslabs'
  if (!agentSecret || agentSecret !== expectedSecret || agentCode !== expectedCode) {
    return res.status(403).json({ status: 0, msg: 'INVALID_AGENT' })
  }
  next()
}

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
        agentCode: agentCode || process.env.IGAMEWIN_AGENT_CODE || 'Midaslabs',
        agentToken: agentToken || process.env.IGAMEWIN_AGENT_TOKEN || '',
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
      // Validate 15 games per provider
      const gamesByProvider = {}
      for (const game of selectedGames) {
        gamesByProvider[game.providerCode] = (gamesByProvider[game.providerCode] || 0) + 1
        if (gamesByProvider[game.providerCode] > 15) {
          return res.status(400).json({
            success: false,
            message: `Máximo de 15 jogos permitidos por provedor. O provedor ${game.providerCode} tem ${gamesByProvider[game.providerCode]} jogos selecionados.`
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

    // Create user in igamewin if not exists
    try {
      await igamewinService.createUser(userCode)
    } catch (error) {
      // User might already exist, continue
      console.log('User creation:', error.message)
    }

    const isSeamless = (process.env.IGAMEWIN_API_MODE || 'transfer').toLowerCase() === 'seamless'

    if (!isSeamless) {
      // Transfer mode: recover any balance stuck in igamewin from previous session
      try {
        const moneyInfo = await igamewinService.getMoneyInfo(userCode)
        if (moneyInfo.status === 1) {
          const igamewinBalanceReais = igamewinService.parseUserBalanceFromMoneyInfo(moneyInfo)
          if (igamewinBalanceReais > 0) {
            const withdrawRes = await igamewinService.withdrawUserBalance(userCode, igamewinBalanceReais)
            if (withdrawRes.status === 1) {
              user.balance = (user.balance || 0) + igamewinBalanceReais
              await user.save()
            }
          }
        }
      } catch (err) {
        console.warn('Recover igamewin balance:', err.message)
      }

      // Deposit user balance to igamewin so it appears in the game
      const amountToDeposit = Math.max(0, user.balance || 0)
      if (amountToDeposit > 0) {
        const depositRes = await igamewinService.depositUserBalance(userCode, amountToDeposit)
        if (depositRes.status === 1) {
          user.balance -= amountToDeposit
          user.bonusBalance = Math.min(user.bonusBalance || 0, user.balance)
          await user.save()
          await new Promise((r) => setTimeout(r, 500))
        } else {
          console.warn('Launch: deposit to igamewin failed', depositRes.msg || depositRes)
        }
      }
    }
    // Seamless mode: no deposit - iGameWin calls our /api/games/seamless for balance & transactions

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
      res.status(400).json({
        success: false,
        message: response.msg || 'Erro ao lançar jogo'
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
// @desc    Deposit to user game balance
// @access  Private
router.post('/deposit', protect, async (req, res) => {
  try {
    const { amount } = req.body
    const user = req.user

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valor inválido'
      })
    }

    if (user.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Saldo insuficiente'
      })
    }

    const userCode = user._id.toString()
    const response = await igamewinService.depositUserBalance(userCode, amount)

    if (response.status === 1) {
      // Update user balance (cap bonusBalance when balance decreases)
      user.balance -= amount
      user.bonusBalance = Math.min(user.bonusBalance || 0, user.balance)
      await user.save()

      res.json({
        success: true,
        message: 'Depósito realizado com sucesso',
        data: {
          userBalance: (response.user_balance ?? 0) / 100,
          agentBalance: (response.agent_balance ?? 0) / 100
        }
      })
    } else {
      res.status(400).json({
        success: false,
        message: response.msg || 'Erro ao realizar depósito'
      })
    }
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
// @desc    Withdraw from user game balance
// @access  Private
router.post('/withdraw', protect, async (req, res) => {
  try {
    const { amount } = req.body
    const user = req.user

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valor inválido'
      })
    }

    const userCode = user._id.toString()
    const response = await igamewinService.withdrawUserBalance(userCode, amount)

    if (response.status === 1) {
      // Update user balance
      user.balance += amount
      await user.save()

      res.json({
        success: true,
        message: 'Saque realizado com sucesso',
        data: {
          userBalance: (response.user_balance ?? 0) / 100,
          agentBalance: (response.agent_balance ?? 0) / 100
        }
      })
    } else {
      res.status(400).json({
        success: false,
        message: response.msg || 'Erro ao realizar saque'
      })
    }
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
// @desc    Withdraw balance from igamewin back to user (Transfer mode) or no-op (Seamless mode)
// @access  Private
router.post('/sync-balance', protect, async (req, res) => {
  try {
    const user = req.user
    const userCode = user._id.toString()
    const isSeamless = (process.env.IGAMEWIN_API_MODE || 'transfer').toLowerCase() === 'seamless'

    if (isSeamless) {
      return res.json({
        success: true,
        data: { balance: user.balance, synced: true }
      })
    }

    const moneyInfo = await igamewinService.getMoneyInfo(userCode)
    if (moneyInfo.status !== 1) {
      return res.json({
        success: true,
        data: { balance: user.balance, synced: false }
      })
    }

    const igamewinBalanceReais = igamewinService.parseUserBalanceFromMoneyInfo(moneyInfo)
    if (igamewinBalanceReais <= 0) {
      return res.json({
        success: true,
        data: { balance: user.balance, synced: true }
      })
    }

    const withdrawRes = await igamewinService.withdrawUserBalance(userCode, igamewinBalanceReais)
    if (withdrawRes.status === 1) {
      user.balance = (user.balance || 0) + igamewinBalanceReais
      await user.save()
      return res.json({
        success: true,
        data: {
          balance: user.balance,
          synced: true,
          amountRecovered: igamewinBalanceReais
        }
      })
    }

    res.json({
      success: true,
      data: { balance: user.balance, synced: false }
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
// @desc    iGameWin Seamless API callback - user_balance & transaction (no auth, validated by agent_secret)
// @access  Public (iGameWin server)
router.post('/seamless', validateSeamlessAgent, async (req, res) => {
  try {
    const { method, user_code } = req.body
    if (!method || !user_code) {
      return res.status(400).json({ status: 0, msg: 'INVALID_PARAMETER' })
    }

    const user = await User.findById(user_code)
    if (!user) {
      return res.status(404).json({ status: 0, msg: 'INVALID_USER', user_balance: 0 })
    }

    if (method === 'user_balance') {
      const balanceReais = Math.max(0, user.balance || 0)
      const balanceCents = Math.round(balanceReais * 100)
      return res.json({ status: 1, user_balance: balanceCents })
    }

    if (method === 'transaction') {
      const { game_type, slot, agent_balance, user_balance: igamewinUserBalance } = req.body
      const slotData = slot || req.body[game_type] || {}
      const txnId = slotData.txn_id
      const txnType = slotData.txn_type || 'debit_credit'
      const betCents = Number(slotData.bet_money ?? slotData.bet ?? 0)
      const winCents = Number(slotData.win_money ?? slotData.win ?? 0)

      if (!txnId) {
        return res.status(400).json({ status: 0, msg: 'INVALID_PARAMETER' })
      }

      const existing = await GameTxnLog.findOne({ txnId })
      if (existing) {
        const balanceCents = Math.round((existing.balanceAfterReais || 0) * 100)
        return res.json({ status: 1, user_balance: balanceCents })
      }

      let deltaReais = 0
      if (txnType === 'debit') {
        deltaReais = -betCents / 100
      } else if (txnType === 'credit') {
        deltaReais = winCents / 100
      } else {
        deltaReais = (winCents - betCents) / 100
      }

      const currentBalance = Math.max(0, user.balance || 0)
      const newBalance = currentBalance + deltaReais

      if (newBalance < 0) {
        return res.json({ status: 0, msg: 'INSUFFICIENT_USER_FUNDS', user_balance: Math.round(currentBalance * 100) })
      }

      user.balance = newBalance
      user.bonusBalance = Math.min(user.bonusBalance || 0, user.balance)
      if (deltaReais < 0) {
        user.totalBets = (user.totalBets || 0) + Math.abs(deltaReais)
      }
      await user.save()

      await GameTxnLog.create({
        txnId,
        user: user._id,
        gameType: game_type,
        providerCode: slotData.provider_code,
        gameCode: slotData.game_code,
        txnType,
        betCents,
        winCents,
        balanceAfterReais: newBalance
      })

      return res.json({ status: 1, user_balance: Math.round(newBalance * 100) })
    }

    return res.status(400).json({ status: 0, msg: 'INVALID_METHOD' })
  } catch (error) {
    console.error('Seamless API error:', error)
    return res.status(500).json({ status: 0, msg: 'INTERNAL_ERROR' })
  }
})

// @route   GET /api/games/balance
// @desc    Get user game balance
// @access  Private
router.get('/balance', protect, async (req, res) => {
  try {
    const user = req.user
    const userCode = user._id.toString()
    const response = await igamewinService.getMoneyInfo(userCode)

    if (response.status === 1) {
      res.json({
        success: true,
        data: {
          userBalance: (response.user?.balance ?? response.user_balance ?? 0) / 100,
          agentBalance: (response.agent?.balance ?? response.agent_balance ?? 0) / 100
        }
      })
    } else {
      res.status(400).json({
        success: false,
        message: response.msg || 'Erro ao buscar saldo'
      })
    }
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
