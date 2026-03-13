/**
 * Base URL resolution for OpenAPI specs.
 * Handles servers array (3.x), host+basePath (2.0), and fallback to spec URL.
 */

import type { OpenAPIV3, OpenAPIV2 } from 'openapi-types'

/**
 * Extract base URL from OpenAPI 3.x servers array.
 * Interpolates server variables using their default value or first enum value.
 * Resolves relative server URLs (e.g. "/", "/api/v1") against the spec URL when provided.
 * Returns '' when no server is defined or a relative URL can't be resolved.
 *
 * @param api - The parsed OpenAPI 3.x document
 * @param specUrl - Optional spec URL used to resolve relative server URLs
 */
export function extractOpenAPI3BaseUrl(api: OpenAPIV3.Document, specUrl?: string): string {
  const server = api.servers?.[0]
  if (!server) return ''

  let url = server.url

  // Interpolate server variables with defaults
  if (server.variables) {
    for (const [name, variable] of Object.entries(server.variables)) {
      const value = variable.default ?? variable.enum?.[0]
      if (value === undefined) return ''
      url = url.replaceAll(`{${name}}`, String(value))
    }
  }

  // Resolve relative server URLs against the spec URL
  if (url && !url.startsWith('http')) {
    if (!specUrl) return ''
    try {
      const resolved = new URL(url, specUrl)
      return resolved.origin + resolved.pathname.replace(/\/$/, '')
    } catch {
      return ''
    }
  }

  return url
}

/**
 * Extract base URL from Swagger 2.0 host, basePath, and schemes.
 * Returns '' when host is missing (must be resolved by the consumer with spec URL).
 */
export function extractSwagger2BaseUrl(api: OpenAPIV2.Document): string {
  const host = api.host
  if (!host) return ''
  const scheme = api.schemes?.[0] ?? 'https'
  const basePath = api.basePath ?? ''
  return `${scheme}://${host}${basePath}`
}
