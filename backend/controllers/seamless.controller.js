import User from '../models/User.model.js'
import GameTxnLog from '../models/GameTxnLog.model.js'
import igamewinService from '../services/igamewin.service.js'

/** Formato do saldo: reais (12) ou centavos (1200) conforme IGAMEWIN_BALANCE_IN_REAIS */
function balanceForGame(reais) {
  const inReais = (process.env.IGAMEWIN_BALANCE_IN_REAIS || 'true').toLowerCase() === 'true'
  return inReais ? Math.round(reais * 100) / 100 : Math.round(reais * 100)
}

/** API Link Guide: Seamless Site API - user_balance & transaction */
export async function handleSeamlessRequest(req, res) {
  try {
    const { method, user_code, agent_code } = req.body
    console.log('[Seamless]', method, 'user_code:', user_code, 'agent:', agent_code)
    if (!method || !user_code) {
      return res.status(400).json({ status: 0, msg: 'INVALID_PARAMETER' })
    }

    const user = await User.findById(user_code)
    if (!user) {
      console.warn('[Seamless] INVALID_USER - user_code:', user_code, 'not found')
      return res.status(404).json({ status: 0, msg: 'INVALID_USER', user_balance: 0 })
    }

    if (method === 'user_balance') {
      const balanceReais = Math.max(0, user.balance || 0)
      return res.json({ status: 1, user_balance: balanceForGame(balanceReais) })
    }

    if (method === 'transaction') {
      const isSamples = igamewinService.isSamplesMode()
      const { game_type, slot } = req.body
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
        return res.json({ status: 1, user_balance: balanceForGame(existing.balanceAfterReais || 0) })
      }

      if (isSamples) {
        await GameTxnLog.create({
          txnId,
          user: user._id,
          gameType: game_type,
          providerCode: slotData.provider_code,
          gameCode: slotData.game_code,
          txnType: slotData.txn_type || 'debit_credit',
          betCents,
          winCents,
          balanceAfterReais: user.balance || 0
        })
        return res.json({ status: 1, user_balance: balanceForGame(user.balance || 0) })
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
        return res.json({ status: 0, msg: 'INSUFFICIENT_USER_FUNDS', user_balance: 0 })
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

      return res.json({ status: 1, user_balance: balanceForGame(newBalance) })
    }

    return res.status(400).json({ status: 0, msg: 'INVALID_METHOD' })
  } catch (error) {
    console.error('Seamless API error:', error)
    return res.status(500).json({ status: 0, msg: 'INTERNAL_ERROR' })
  }
}
