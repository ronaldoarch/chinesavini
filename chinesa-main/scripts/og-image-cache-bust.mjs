/**
 * WhatsApp/Facebook guardam og:image por URL. Sem ?v= novo, continuam mostrando miniatura antiga.
 * Só acrescenta se a URL ainda não tiver parâmetro v=.
 */
export function appendOgImageCacheBust(url) {
  const u = String(url || '').trim()
  if (!u) return u
  if (/[?&]v=/.test(u)) return u
  const version =
    process.env.VITE_OG_IMAGE_VERSION?.trim() ||
    process.env.CI_COMMIT_SHA?.slice(0, 12) ||
    process.env.GITHUB_SHA?.slice(0, 12) ||
    String(Date.now())
  const sep = u.includes('?') ? '&' : '?'
  return `${u}${sep}v=${encodeURIComponent(version)}`
}
