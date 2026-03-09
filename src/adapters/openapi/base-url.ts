/**
 * Base URL resolution for OpenAPI specs.
 * Handles servers array (3.x), host+basePath (2.0), and fallback to spec URL.
 */

import type { OpenAPIV3, OpenAPIV2 } from 'openapi-types'

/**
 * Extract base URL from OpenAPI 3.x servers array.
 * Returns '' for relative URLs (must be resolved by the consumer with spec URL).
 */
export function extractOpenAPI3BaseUrl(api: OpenAPIV3.Document): string {
  const url = api.servers?.[0]?.url ?? ''
  // Relative server URLs (e.g. "/api/v1") can't be used as absolute base URLs
  if (url && !url.startsWith('http')) return ''
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
