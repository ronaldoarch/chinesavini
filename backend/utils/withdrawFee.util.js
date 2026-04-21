/**
 * Taxa fixa de PIX-out cobrada pelo PSP sobre o valor enviado ao destinatário.
 * Quando o gateway debita a taxa DO valor da transferência, é preciso enviar
 * valorSolicitado + taxa para que o usuário receba exatamente valorSolicitado.
 * O custo da taxa fica na conta do lojista no PSP (não é descontado do saldo do jogador além do solicitado).
 */

export function getGatewayPixOutFeeBrl() {
  const n = parseFloat(process.env.GATEWAY_PIX_OUT_FEE_BRL ?? '1.5')
  return Number.isFinite(n) && n >= 0 ? n : 1.5
}

/** Se true (padrão), netAmount/finanças assumem que o jogador recebe o valor integral solicitado; a taxa é do merchant. */
export function shouldAbsorbWithdrawGatewayPixFee() {
  return (process.env.WITHDRAW_ABSORB_GATEWAY_PIX_FEE ?? 'true').toLowerCase() !== 'false'
}

/**
 * Valor a enviar na API de saque do gateway (valor bruto da ordem PIX-out).
 * @param {number} requestedAmountReais - O que o usuário pediu e o que será debitado do saldo interno.
 */
export function getValorForWithdrawGatewayCall(requestedAmountReais) {
  const requested = Number(requestedAmountReais)
  if (!Number.isFinite(requested) || requested <= 0) return requested
  const fee = getGatewayPixOutFeeBrl()
  if (fee <= 0) return Math.round(requested * 100) / 100
  return Math.round((requested + fee) * 100) / 100
}
