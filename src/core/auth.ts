/**
 * Authentication injection into HTTP requests.
 * Supports Bearer, Basic, API Key (header/query), OAuth2, and Cookie.
 */

import type { Auth } from './types'
import { AuthType, HeaderName, ParamLocation } from './types'

/**
 * A request with authentication applied (URL may be modified for query-based auth).
 */
export interface AuthenticatedRequest {
  /** URL, potentially modified with query-based auth parameters. */
  url: string
  /** Headers with auth credentials injected. */
  headers: Record<string, string>
}

/**
 * Inject authentication credentials into a request URL and headers.
 * Accepts a single Auth or an array for composing multiple schemes (e.g. API key + bearer).
 *
 * @param url - The request URL
 * @param headers - Existing request headers (will be shallow-copied, not mutated)
 * @param auth - Credentials to inject (single or array)
 * @returns New URL and headers with auth applied
 */
export function injectAuth(
  url: string,
  headers: Record<string, string>,
  auth: Auth | Auth[],
): AuthenticatedRequest {
  if (Array.isArray(auth)) {
    // Apply auth schemes in order. Later entries override earlier ones for the same header (e.g. Authorization), but cookie auth appends.
    let result: AuthenticatedRequest = { url, headers: { ...headers } }
    for (const a of auth) {
      result = injectAuth(result.url, result.headers, a)
    }
    return result
  }

  const result = { url, headers: { ...headers } }

  switch (auth.type) {
    case AuthType.BEARER:
      result.headers[HeaderName.AUTHORIZATION] = `Bearer ${auth.token}`
      break

    case AuthType.BASIC: {
      // btoa is available in all modern browsers and Node 16+
      const encoded = btoa(`${auth.username}:${auth.password}`)
      result.headers[HeaderName.AUTHORIZATION] = `Basic ${encoded}`
      break
    }

    case AuthType.API_KEY:
      if (auth.location === ParamLocation.HEADER) {
        result.headers[auth.name] = auth.value
      } else if (auth.location === ParamLocation.QUERY) {
        const u = new URL(url)
        u.searchParams.set(auth.name, auth.value)
        result.url = u.toString()
      }
      break

    case AuthType.OAUTH2:
      result.headers[HeaderName.AUTHORIZATION] = `Bearer ${auth.accessToken}`
      break

    case AuthType.COOKIE: {
      const existing = result.headers[HeaderName.COOKIE]
      const cookie = `${encodeURIComponent(auth.name)}=${encodeURIComponent(auth.value)}`
      result.headers[HeaderName.COOKIE] = existing ? `${existing}; ${cookie}` : cookie
      break
    }
  }

  return result
}

/**
 * Mask credential values for safe logging. Shows the auth type and a redacted value.
 *
 * @param auth - The auth credentials to mask
 * @returns A human-readable string with sensitive values replaced by `***`
 */
export function maskAuth(auth: Auth): string {
  switch (auth.type) {
    case AuthType.BEARER: {
      if (auth.token.length <= 4) return 'Bearer ***'
      return `Bearer ${auth.token.substring(0, 4)}***`
    }
    case AuthType.BASIC:
      return `Basic ${auth.username}:***`
    case AuthType.API_KEY:
      return `${auth.name}: ***`
    case AuthType.OAUTH2:
      return `OAuth2 ***`
    case AuthType.COOKIE:
      return `Cookie ${auth.name}=***`
  }
}
