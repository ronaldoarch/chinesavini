import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { appendOgImageCacheBust } from './scripts/og-image-cache-bust.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadMetaGenerated() {
  const p = path.resolve(__dirname, '.env.meta.generated')
  if (!fs.existsSync(p)) return {}
  const out = {}
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    }
    out[key] = val
  }
  return out
}

function escapeAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}

function metaForHtml(mode) {
  const env = loadEnv(mode, process.cwd(), '')
  const meta = loadMetaGenerated()
  const title =
    meta.VITE_HTML_TITLE ||
    env.VITE_HTML_TITLE ||
    env.VITE_OG_TITLE ||
    'Plataforma'
  const ogTitle = meta.VITE_OG_TITLE || env.VITE_OG_TITLE || title
  const siteUrl = (
    meta.VITE_OG_URL ||
    env.VITE_PUBLIC_SITE_URL ||
    env.VITE_SITE_URL ||
    ''
  )
    .trim()
    .replace(/\/$/, '')
  const desc =
    meta.VITE_OG_DESCRIPTION ||
    env.VITE_OG_DESCRIPTION ||
    `${ogTitle} oferece os melhores jogos online. Cadastre-se e jogue com segurança.`
  let image = meta.VITE_OG_IMAGE || env.VITE_OG_IMAGE || ''
  if (!image) {
    const apiBase = (env.VITE_API_URL || '').trim().replace(/\/$/, '')
    const apiOrigin = apiBase.replace(/\/api\/?$/, '')
    if (apiOrigin) image = `${apiOrigin}/api/banners/logo-opengraph`
    else if (siteUrl) image = `${siteUrl}/logo_plataforma.png`
  }
  image = appendOgImageCacheBust(image)
  return { title, ogTitle, desc, siteUrl, image }
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: 'inject-share-meta-html',
      transformIndexHtml(html, ctx) {
        const isAdmin =
          (ctx.path && ctx.path.includes('admin.html')) ||
          (ctx.filename && ctx.filename.includes('admin.html'))
        const m = metaForHtml(mode)
        const htmlTitle = isAdmin ? `Admin — ${m.title}` : m.title
        let out = html.replace(/__META_HTML_TITLE__/g, escapeAttr(htmlTitle))
        if (!isAdmin) {
          out = out
            .replace(/__META_OG_TITLE__/g, escapeAttr(m.ogTitle))
            .replace(/__META_OG_DESCRIPTION__/g, escapeAttr(m.desc))
            .replace(/__META_OG_URL__/g, escapeAttr(m.siteUrl))
            .replace(/__META_OG_IMAGE__/g, escapeAttr(m.image))
        }
        return out
      }
    }
  ],
  server: {
    port: 3000,
    open: true
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        admin: './admin.html'
      }
    }
  }
}))
