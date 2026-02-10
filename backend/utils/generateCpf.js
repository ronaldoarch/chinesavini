/**
 * Gera um CPF aleatório com dígitos verificadores válidos.
 * Útil quando a Gatebox exige documento no saque PIX mas o usuário não informou CPF
 * (evita enviar 00000000000, que é rejeitado).
 * @returns {string} CPF com 11 dígitos (sem formatação)
 */
function generateValidCpf() {
  const randomDigits = () => Math.floor(Math.random() * 9) + 1 // 1-9 para evitar zeros à esquerda
  const arr = Array.from({ length: 9 }, randomDigits)

  // Primeiro dígito verificador: pesos 10,9,8,7,6,5,4,3,2
  let sum = arr.reduce((acc, d, i) => acc + d * (10 - i), 0)
  let rest = sum % 11
  arr.push(rest < 2 ? 0 : 11 - rest)

  // Segundo dígito verificador: pesos 11,10,...,2
  sum = arr.reduce((acc, d, i) => acc + d * (11 - i), 0)
  rest = sum % 11
  arr.push(rest < 2 ? 0 : 11 - rest)

  return arr.join('')
}

export default generateValidCpf
