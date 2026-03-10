/**
 * Raw URL adapter — creates a ParsedAPI from one or more plain URL endpoints (no spec).
 * Supports custom methods, IDs, and summaries per endpoint.
 * Auto-detects query parameters as configurable operation parameters.
 */

import type { ParsedAPI, Operation, Parameter } from '../../core/types'
import { SpecFormat } from '../../core/types'

export interface RawEndpoint {
  url: string
  method?: string
  id?: string
  summary?: string
}

/**
 * Parse a raw URL into a ParsedAPI with a single operation.
 * Delegates to parseRawUrls. Query parameters from the URL become configurable parameters.
 */
export function parseRawUrl(url: string): ParsedAPI {
  return parseRawUrls([{ url }])
}

/**
 * Parse multiple raw URL endpoints into a ParsedAPI.
 * Each endpoint can specify its own method, id, and summary.
 */
export function parseRawUrls(endpoints: RawEndpoint[]): ParsedAPI {
  if (endpoints.length === 0) {
    throw new Error('At least one endpoint is required')
  }

  // Derive baseUrl from first endpoint
  const firstParsed = new URL(endpoints[0].url)
  const baseUrl = firstParsed.origin

  const operations: Operation[] = endpoints.map((ep) => {
    const parsed = new URL(ep.url)

    if (parsed.origin !== firstParsed.origin) {
      throw new Error(
        `All endpoints must share the same origin. Got "${parsed.origin}" but expected "${firstParsed.origin}"`
      )
    }
    const method = (ep.method ?? 'GET').toUpperCase()
    const pathname = parsed.pathname

    const parameters: Parameter[] = []

    // Extract query params as configurable parameters
    for (const [key, value] of parsed.searchParams.entries()) {
      parameters.push({
        name: key,
        in: 'query',
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
