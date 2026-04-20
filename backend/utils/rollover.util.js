/**
 * Rollover global (BonusConfig): mesma regra para todos; o multiplicador não é “por usuário”.
 * O valor pendente (`user.wageringRequirement`) é só o progresso individual até zerar.
 *
 * Base da exigência: multiplicador × valor em R$ do bônus creditado (depósito PIX com bônus,
 * VIP, baús, etc.). Com rollover desligado, todo o saldo é tratado como sacável.
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

/** Volume (R$) a exigir: multiplicador × base em R$ (ex.: bônus creditado no depósito PIX). */
export function wageringToAddFromRolloverBase(bonusConfig, baseAmountReais) {
  if (!bonusConfig || bonusConfig.rolloverEnabled !== true) {
    return 0
  }
  const m = Number(bonusConfig.rolloverMultiplier)
  if (!Number.isFinite(m) || m <= 0) {
    return 0
  }
  const base = Number(baseAmountReais)
  if (!Number.isFinite(base) || base <= 0) {
    return 0
  }
  return base * m
}

/** Mesma regra que {@link wageringToAddFromRolloverBase}; nome legível para VIP/baús (base = valor creditado). */
export const wageringToAddFromBonus = wageringToAddFromRolloverBase
