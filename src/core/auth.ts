/**
 * Authentication injection into HTTP requests.
 * Supports Bearer, Basic, API Key (header/query), and OAuth2.
 */

import type { Auth } from './types'

export interface AuthenticatedRequest {
  url: string
  headers: Record<string, string>
}

/**
 * Inject authentication credentials into a request URL and headers.
 */
export function injectAuth(
  url: string,
  headers: Record<string, string>,
  auth: Auth,
): AuthenticatedRequest {
  const result = { url, headers: { ...headers } }

  switch (auth.type) {
    case 'bearer':
      result.headers['Authorization'] = `Bearer ${auth.token}`
      break

    case 'basic': {
      // btoa is available in all modern browsers and Node 16+
      const encoded = btoa(`${auth.username}:${auth.password}`)
      result.headers['Authorization'] = `Basic ${encoded}`
      break
    }

    case 'apiKey':
      if (auth.location === 'header') {
        result.headers[auth.name] = auth.value
      } else if (auth.location === 'query') {
        const u = new URL(url)
        u.searchParams.set(auth.name, auth.value)
        result.url = u.toString()
      }
      break

    case 'oauth2':
      result.headers['Authorization'] = `Bearer ${auth.accessToken}`
      break
  }

  return result
}

/**
 * Mask credential values for safe logging.
 */
export function maskAuth(auth: Auth): string {
  switch (auth.type) {
    case 'bearer': {
      const preview = auth.token.substring(0, 4)
      return `Bearer ${preview}***`
    }
    case 'basic':
      return `Basic ${auth.username}:***`
    case 'apiKey':
      return `${auth.name}: ***`
    case 'oauth2':
      return `OAuth2 ***`
  }
}
