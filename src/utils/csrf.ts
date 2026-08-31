const CSRF_TOKEN_COOKIE = 'XSRF-TOKEN'
const CSRF_TOKEN_HEADER = 'X-CSRF-Token'
const CSRF_TOKEN_ALT_HEADER = 'X-XSRF-Token'

export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  const metaTag = document.querySelector('meta[name="csrf-token"]')
  const metaToken = metaTag?.getAttribute('content')
  if (metaToken) {
    return metaToken
  }

  const match = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${CSRF_TOKEN_COOKIE}=`))

  if (!match) {
    return null
  }

  return decodeURIComponent(match.split('=')[1] ?? '') || null
}

export function setCsrfToken(token: string): void {
  if (typeof document === 'undefined') {
    return
  }

  document.cookie = `${CSRF_TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; SameSite=Lax`
  const metaTag = document.querySelector('meta[name="csrf-token"]')
  if (metaTag) {
    metaTag.setAttribute('content', token)
    return
  }

  const newMetaTag = document.createElement('meta')
  newMetaTag.setAttribute('name', 'csrf-token')
  newMetaTag.setAttribute('content', token)
  document.head.appendChild(newMetaTag)
}

export function generateCsrfToken(): string {
  const randomValues =
    typeof crypto !== 'undefined' && 'getRandomValues' in crypto
      ? crypto.getRandomValues(new Uint32Array(2))
      : [Date.now(), Math.random()]

  const value = Array.from(randomValues)
    .map((part) => String(part))
    .join('')
    .replace(/[^a-zA-Z0-9]/g, '')

  const token = `csrf-${value || Date.now().toString(36)}`
  setCsrfToken(token)
  return token
}

export function shouldAttachCsrf(method?: string): boolean {
  const normalizedMethod = (method ?? 'GET').toUpperCase()
  return !['GET', 'HEAD', 'OPTIONS'].includes(normalizedMethod)
}

export function applyCsrfHeaders(headers: HeadersInit = {}): Headers {
  const normalizedHeaders = new Headers(headers)

  if (!shouldAttachCsrf(normalizedHeaders.get('X-HTTP-Method-Override') ?? undefined)) {
    const method = normalizedHeaders.get('method')
    if (method && !shouldAttachCsrf(method)) {
      return normalizedHeaders
    }
  }

  const token = getCsrfToken() ?? generateCsrfToken()
  normalizedHeaders.set(CSRF_TOKEN_HEADER, token)
  normalizedHeaders.set(CSRF_TOKEN_ALT_HEADER, token)
  normalizedHeaders.set('X-Requested-With', 'XMLHttpRequest')

  return normalizedHeaders
}
