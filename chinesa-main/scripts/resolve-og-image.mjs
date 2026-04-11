/**
 * Monta URL absoluta para og:image a partir do path da logo (igual ao Header do app).
 * - /uploads/... → origem da API (arquivo no backend)
 * - /algo.png → origem do site (arquivo estático do frontend, ex. /logo_plataforma.png)
 * - https://... → mantém
 */
export function resolveAbsoluteOgImage(imagePath, siteUrl, apiBase) {
  const pathStr = String(imagePath || '').trim()
  const front = String(siteUrl || '').trim().replace(/\/$/, '')
  const base = String(apiBase || '').trim().replace(/\/$/, '')
  const apiOrigin = base.replace(/\/api\/?$/, '')

  if (!pathStr) return ''
  if (pathStr.startsWith('http://') || pathStr.startsWith('https://')) return pathStr

  if (pathStr.startsWith('/uploads')) {
    if (!apiOrigin) return ''
    return `${apiOrigin}${pathStr}`
  }
  const uploadsIndex = pathStr.indexOf('/uploads/')
  if (uploadsIndex !== -1) {
    if (!apiOrigin) return ''
    return `${apiOrigin}${pathStr.slice(uploadsIndex)}`
  }

  if (!front) return ''
  return pathStr.startsWith('/') ? `${front}${pathStr}` : `${front}/${pathStr}`
}
