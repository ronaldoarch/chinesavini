/**
 * Mapeia campos de rastreamento PIX vindos de webhooks (NxGate, Gatebox, SarrixPay, Escale Cyber, etc.).
 * Nomes variam entre gateways — buscamos em objetos comuns na raiz e em data/transaction/beneficiary.
 */

const E2E_KEYS = [
  'endToEndId',
  'EndToEndId',
  'end_to_end_id',
  'e2eId',
  'e2e_id',
  'EndToEnd',
  'pspEndToEndId',
  'psp_end_to_end_id',
  'endToEnd',
  'idEndToEnd',
  'transactionIdentification'
]

const PIX_KEY_KEYS = [
  'pixKey',
  'pix_key',
  'destinationPixKey',
  'receiverPixKey',
  'chave_pix',
  'pixDestination',
  'beneficiaryPixKey',
  'key'
]

const PIX_TYPE_KEYS = ['pixKeyType', 'pix_key_type', 'tipo_chave', 'pixKeyTypeDestination']

function isPlainObject(x) {
  return x !== null && typeof x === 'object' && !Array.isArray(x)
}

/** Coleta objetos aninhados típicos de payloads de gateway (sem recursão profunda). */
function collectLayers(body) {
  const b = body || {}
  const layers = []
  const add = (o) => {
    if (isPlainObject(o)) layers.push(o)
  }
  add(b)
  add(b.data)
  add(b.transaction)
  add(b.invoice)
  add(b.payload)
  add(b.reference)
  if (isPlainObject(b.data)) {
    add(b.data.transaction)
    add(b.data.payment)
    add(b.data.pix)
    add(b.data.beneficiary)
    add(b.data.payee)
    add(b.data.payer)
    add(b.data.receiver)
  }
  return layers
}

function pickFromLayers(layers, keys) {
  for (const layer of layers) {
    for (const k of keys) {
      const v = layer[k]
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        return String(v).trim()
      }
    }
  }
  return ''
}

/** Mascara chave PIX para log (não armazenar valor completo). */
export function maskPixKey(raw) {
  const s = String(raw || '').trim()
  if (!s) return ''
  const digits = s.replace(/\D/g, '')
  if (digits.length >= 8) return `···${digits.slice(-4)}`
  const at = s.indexOf('@')
  if (at > 0) {
    const local = s.slice(0, at)
    const dom = s.slice(at + 1)
    const head = local.slice(0, Math.min(2, local.length))
    return `${head}···@${dom}`
  }
  if (s.length > 12) return `${s.slice(0, 4)}···${s.slice(-4)}`
  return '···'
}

/**
 * Extrai identificadores de rastreamento BACEN / gateway a partir do body do webhook.
 * @returns {{ endToEndId: string, pixKeyMasked: string, pixKeyType: string }}
 */
export function extractPixWebhookTracking(body) {
  const layers = collectLayers(body)
  const endToEndId = pickFromLayers(layers, E2E_KEYS)
  const rawPixKey = pickFromLayers(layers, PIX_KEY_KEYS)
  const pixKeyType = pickFromLayers(layers, PIX_TYPE_KEYS)
  return {
    endToEndId,
    pixKeyMasked: rawPixKey ? maskPixKey(rawPixKey) : '',
    pixKeyType: pixKeyType || ''
  }
}
