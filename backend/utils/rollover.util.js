/**
 * Rollover configurável (admin): volume de apostas antes de liberar saque.
 * Em depósitos PIX, a base é o valor depositado (multiplicador × depósito).
 * Em créditos só de bônus (VIP, baús), usa-se o valor creditado como base.
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

/** Volume (R$) a exigir: multiplicador × base (ex.: depósito em R$ no webhook de PIX). */
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
