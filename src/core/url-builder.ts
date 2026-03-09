/**
 * URL construction utilities.
 * Handles path parameter interpolation, query params, and slash normalization.
 */

import type { Operation, Parameter } from './types'

/**
 * Build a full URL from base URL, operation path, and arguments.
 * Handles path params, query params, and slash normalization.
 */
export function buildUrl(
  baseUrl: string,
  operation: Operation,
  args: Record<string, unknown>,
): string {
  // Interpolate path parameters
  let path = operation.path
  for (const param of operation.parameters) {
    if (param.in === 'path' && args[param.name] !== undefined) {
      path = path.replace(
        `{${param.name}}`,
        encodeURIComponent(String(args[param.name])),
      )
    }
  }

  // Join base URL and path, avoiding double slashes
  const fullBase = baseUrl.replace(/\/$/, '')
  const fullPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(fullPath, fullBase.includes('://') ? fullBase : `https://${fullBase}`)

  // Append query parameters
  for (const param of operation.parameters) {
    if (param.in === 'query' && args[param.name] !== undefined) {
      url.searchParams.set(param.name, String(args[param.name]))
    }
  }

  return url.toString()
}

/**
 * Derive a base URL from a spec URL by stripping the filename.
 * e.g., "https://api.example.com/v1/openapi.json" → "https://api.example.com/v1"
 */
export function deriveBaseUrl(specUrl: string): string {
  try {
    const u = new URL(specUrl)
    u.pathname = u.pathname.replace(/\/[^/]*$/, '')
    const base = u.origin + u.pathname
    return base.replace(/\/$/, '')
  } catch {
    return ''
  }
}

/**
 * Extract header parameters from operation args.
 */
export function extractHeaderParams(
  parameters: Parameter[],
  args: Record<string, unknown>,
): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const param of parameters) {
    if (param.in === 'header' && args[param.name] !== undefined) {
      headers[param.name] = String(args[param.name])
    }
  }
  return headers
}
