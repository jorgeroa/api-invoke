/**
 * URL and parameter construction utilities.
 * Handles path parameter interpolation, query params, header params, cookie params, and slash normalization.
 */

import type { Operation, Parameter } from './types'
import { ParamLocation } from './types'

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
    if (param.in === ParamLocation.PATH && args[param.name] !== undefined) {
      path = path.replace(
        `{${param.name}}`,
        encodeURIComponent(String(args[param.name])),
      )
    }
  }

  // Join base URL and path, avoiding double slashes
  const fullBase = baseUrl.replace(/\/$/, '')
  const fullPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${fullBase}${fullPath}`)

  // Append query parameters (with defaults, array/object serialization)
  for (const param of operation.parameters) {
    if (param.in === ParamLocation.QUERY) {
      const value = args[param.name] ?? param.schema.default
      if (value !== undefined && value !== null) {
        serializeQueryParam(url, param.name, value)
      }
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
    if (param.in === ParamLocation.HEADER && args[param.name] !== undefined) {
      headers[param.name] = String(args[param.name])
    }
  }
  return headers
}

/**
 * Extract cookie parameters from operation args as a Cookie header value.
 * Uses schema defaults when the arg is not explicitly supplied.
 * Returns undefined if no cookie params are present or provided.
 */
export function extractCookieParams(
  parameters: Parameter[],
  args: Record<string, unknown>,
): string | undefined {
  const cookies: string[] = []
  for (const param of parameters) {
    if (param.in === ParamLocation.COOKIE) {
      const value = args[param.name] ?? param.schema.default
      if (value !== undefined && value !== null) {
        cookies.push(`${encodeURIComponent(param.name)}=${encodeURIComponent(String(value))}`)
      }
    }
  }
  return cookies.length > 0 ? cookies.join('; ') : undefined
}

/**
 * Serialize a query parameter value onto a URL.
 * Arrays use comma-separated format (OpenAPI "form" style, explode=false).
 * Objects use comma-separated key,value pairs (OpenAPI "form" style, explode=false).
 * DeepObject style (e.g. filter[key]=value) is not yet supported.
 */
function serializeQueryParam(url: URL, name: string, value: unknown): void {
  if (Array.isArray(value)) {
    url.searchParams.set(name, value.map(String).join(','))
  } else if (typeof value === 'object' && value !== null) {
    const pairs = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => {
        if (typeof v === 'object' && v !== null) {
          throw new Error(
            `Cannot serialize nested object for query parameter "${name}.${k}". Only flat key-value objects are supported.`
          )
        }
        if (typeof v === 'symbol' || typeof v === 'function') {
          throw new Error(
            `Cannot serialize ${typeof v} value for query parameter "${name}.${k}". Use a string or number.`
          )
        }
        return `${k},${String(v)}`
      })
    url.searchParams.set(name, pairs.join(','))
  } else {
    url.searchParams.set(name, String(value))
  }
}
