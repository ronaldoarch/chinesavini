#!/usr/bin/env node
/**
 * Busca GET /api/site-config e gera .env.meta.generated para o Vite embutir
 * Open Graph no index.html (WhatsApp / Telegram / Facebook).
 *
 * Variáveis úteis no build (Coolify, etc.):
 *   VITE_API_URL          — ex: https://api.seudominio.com/api (com /api no final)
 *   VITE_PUBLIC_SITE_URL  — URL pública do frontend, ex: https://seudominio.com (sem barra final)
 *
 * Se a API não responder, usa só as env acima + defaults.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function escapeEnvValue(val) {
  if (val == null || val === '') return ''
  const s = String(val)
  if (/[\s#"']/.test(s)) return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  return s
}

async function main() {
  const apiBase = (process.env.VITE_API_URL || process.env.INJECT_API_URL || '').trim()
  const siteUrl = (process.env.VITE_PUBLIC_SITE_URL || process.env.VITE_SITE_URL || '')
    .trim()
    .replace(/\/$/, '')

  let siteName = 'Plataforma'
  let shareDescription = ''
  let shareImageUrl = ''

  if (apiBase) {
    try {
      const base = apiBase.replace(/\/$/, '')
      const url = base.endsWith('/api') ? `${base}/site-config` : `${base}/api/site-config`
      const ac = new AbortController()
      const timer = setTimeout(() => ac.abort(), 15000)
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: ac.signal
      }).finally(() => clearTimeout(timer))
      if (res.ok) {
        const json = await res.json()
        const d = json.data || {}
        if (d.siteName && String(d.siteName).trim()) siteName = String(d.siteName).trim()
        if (d.shareDescription != null) shareDescription = String(d.shareDescription).trim()
        if (d.shareImageUrl != null) shareImageUrl = String(d.shareImageUrl).trim()
      } else {
        console.warn('[inject-share-meta] API status', res.status, url)
      }
    } catch (e) {
      console.warn('[inject-share-meta] Sem dados da API:', e.message)
    }
  } else {
    console.warn('[inject-share-meta] VITE_API_URL não definido; usando só env públicas e defaults.')
  }

  const ogTitle = siteName
  const ogDesc =
    shareDescription ||
    `${siteName} oferece os melhores jogos online. Cadastre-se e jogue com segurança.`
  const ogImage =
    shareImageUrl ||
    (siteUrl ? `${siteUrl}/logo_plataforma.png` : '')

  const lines = [
    `VITE_HTML_TITLE=${escapeEnvValue(siteName)}`,
    `VITE_OG_TITLE=${escapeEnvValue(ogTitle)}`,
    `VITE_OG_DESCRIPTION=${escapeEnvValue(ogDesc)}`,
    `VITE_OG_URL=${escapeEnvValue(siteUrl)}`,
    `VITE_OG_IMAGE=${escapeEnvValue(ogImage)}`
  ]

  const out = path.join(root, '.env.meta.generated')
  fs.writeFileSync(out, `${lines.join('\n')}\n`, 'utf8')
  console.log('[inject-share-meta] OK →', out)
}

main().catch((e) => {
  console.error('[inject-share-meta]', e)
  process.exit(1)
})
