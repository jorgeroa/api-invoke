/**
 * OAuth2 token refresh fetch wrapper.
 * Intercepts 401 responses, refreshes the token, and retries the request.
 */

import { refreshOAuth2Token } from '../core/auth'
import type { OAuth2TokenResult } from '../core/auth'

export interface OAuthRefreshOptions {
  /** OAuth2 token endpoint URL. */
  tokenUrl: string
  /** Refresh token to exchange for a new access token. */
  refreshToken: string
  /** OAuth2 client ID (if required by the token endpoint). */
  clientId?: string
  /** OAuth2 client secret (if required by the token endpoint). */
  clientSecret?: string
  /** OAuth2 scopes to request. */
  scopes?: string[]
  /** Called after a successful token refresh. Use this to persist the new tokens. */
  onTokenRefresh?: (tokens: OAuth2TokenResult) => void
}

/**
 * Create a fetch wrapper that auto-refreshes OAuth2 tokens on 401 responses.
 * On a 401, exchanges the refresh token for a new access token and retries the original request.
 *
 * @param options - Refresh configuration (token URL, refresh token, client credentials)
 * @param baseFetch - Base fetch function to wrap. Defaults to `globalThis.fetch`.
 * @returns A fetch-compatible function with auto-refresh behavior
 *
 * @example
 * ```ts
 * const client = await createClient(specUrl, {
 *   auth: { type: AuthType.OAUTH2, accessToken: 'current-token' },
 *   fetch: withOAuthRefresh({
 *     tokenUrl: 'https://auth.example.com/token',
 *     refreshToken: 'rt_...',
 *     onTokenRefresh: (tokens) => saveTokens(tokens),
 *   }),
 * })
 * ```
 */
export function withOAuthRefresh(
  options: OAuthRefreshOptions,
  baseFetch?: typeof globalThis.fetch,
): typeof globalThis.fetch {
  const fetchFn = baseFetch ?? globalThis.fetch
  let currentRefreshToken = options.refreshToken

  return async function oauthRefreshFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const response = await fetchFn(input, init)

    if (response.status !== 401) return response

    // Attempt token refresh
    let tokens: OAuth2TokenResult
    try {
      tokens = await refreshOAuth2Token(options.tokenUrl, currentRefreshToken, {
        clientId: options.clientId,
        clientSecret: options.clientSecret,
        scopes: options.scopes,
        fetch: fetchFn,
      })
    } catch {
      // Refresh failed — return the original 401
      return response
    }

    if (tokens.refreshToken) currentRefreshToken = tokens.refreshToken
    options.onTokenRefresh?.(tokens)

    // Retry original request with new token
    const retryHeaders = new Headers(init?.headers)
    retryHeaders.set('Authorization', `Bearer ${tokens.accessToken}`)
    return fetchFn(input, { ...init, headers: Object.fromEntries(retryHeaders.entries()) })
  }
}
