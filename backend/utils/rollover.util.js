/**
 * Rollover configurável (admin): volume de apostas necessário sobre o valor do bônus.
 * Quando desativado, todo o saldo é sacável (modelo antigo por bonusBalance desligado).
 */

export function computeWithdrawableBalance(user, bonusConfig) {
  const bal = Math.max(0, Number(user.balance) || 0)
  if (!bonusConfig || bonusConfig.rolloverEnabled !== true) {
    return bal
  }
  const wr = Math.max(0, Number(user.wageringRequirement) || 0)
  if (wr > 0) {
    return 0
  }
  return bal
}

/** Volume (R$) a exigir ao creditar um bônus promocional */
export function wageringToAddFromBonus(bonusConfig, bonusAmountReais) {
  if (!bonusConfig || bonusConfig.rolloverEnabled !== true) {
    return 0
  }
  const m = Number(bonusConfig.rolloverMultiplier)
  if (!Number.isFinite(m) || m <= 0) {
    return 0
  }
  const b = Number(bonusAmountReais)
  if (!Number.isFinite(b) || b <= 0) {
    return 0
  }
  return b * m
}
