/**
 * Raw URL adapter — creates a ParsedAPI from one or more plain URL endpoints (no spec).
 * Supports custom methods, IDs, and summaries per endpoint.
 * Auto-detects query parameters as configurable operation parameters.
 */

import type { ParsedAPI, Operation, Parameter } from '../../core/types'
import { HttpMethod, ParamLocation, SpecFormat } from '../../core/types'

/**
 * A raw URL endpoint definition (no spec required).
 */
export interface RawEndpoint {
  /** Full URL for the endpoint (must be absolute). */
  url: string
  /** HTTP method. Default: 'GET'. */
  method?: string
  /** Custom operation ID. Auto-generated from method + path if omitted. */
  id?: string
  /** Short summary. Defaults to `'{METHOD} {hostname}{path}'`. */
  summary?: string
}

/**
 * Parse a raw URL into a {@link ParsedAPI} with a single operation.
 * Query parameters from the URL become configurable operation parameters.
 *
 * @param url - Absolute URL (e.g. 'https://api.example.com/users?page=1')
 * @returns A ParsedAPI with a single GET operation
 * @throws {Error} If the URL is not a valid absolute URL
 */
export function parseRawUrl(url: string): ParsedAPI {
  return parseRawUrls([{ url }])
}

/**
 * Parse multiple raw URL endpoints into a single {@link ParsedAPI}.
 * All endpoints must share the same origin. Query parameters become configurable operation parameters.
 *
 * @param endpoints - Array of raw endpoint definitions
 * @returns A ParsedAPI with one operation per endpoint
 * @throws {Error} If endpoints is empty, URLs are invalid, or origins don't match
 */
export function parseRawUrls(endpoints: RawEndpoint[]): ParsedAPI {
  if (endpoints.length === 0) {
    throw new Error('At least one endpoint is required')
  }

  // Derive baseUrl from first endpoint
  let firstParsed: URL
  try {
    firstParsed = new URL(endpoints[0].url)
  } catch {
    throw new Error(`Invalid URL "${endpoints[0].url}". Expected an absolute URL like "https://api.example.com/path".`)
  }
  const baseUrl = firstParsed.origin

  const operations: Operation[] = endpoints.map((ep) => {
    let parsed: URL
    try {
      parsed = new URL(ep.url)
    } catch {
      throw new Error(`Invalid URL "${ep.url}". Expected an absolute URL like "https://api.example.com/path".`)
    }

    if (parsed.origin !== firstParsed.origin) {
      throw new Error(
        `All endpoints must share the same origin. Got "${parsed.origin}" but expected "${firstParsed.origin}"`
      )
    }
    const method = (ep.method ?? HttpMethod.GET).toUpperCase()
    const pathname = parsed.pathname

    const parameters: Parameter[] = []

    // Extract query params as configurable parameters
    for (const [key, value] of parsed.searchParams.entries()) {
      parameters.push({
        name: key,
        in: ParamLocation.QUERY,
        required: false,
        description: `Default: ${value}`,
        schema: { type: 'string', default: value },
      })
    }

    const id = ep.id
      ?? `${method.toLowerCase()}_${pathname.replace(/^\//, '').replace(/[\/]/g, '_') || 'root'}`

    return {
      id,
      path: pathname,
      method,
      summary: ep.summary ?? `${method} ${parsed.hostname}${pathname}`,
      parameters,
      tags: [],
    }
  })

  return {
    title: firstParsed.hostname,
    version: '1.0.0',
    baseUrl,
    operations,
    authSchemes: [],
    specFormat: SpecFormat.RAW_URL,
  }
}
