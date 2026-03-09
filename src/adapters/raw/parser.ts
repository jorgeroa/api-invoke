/**
 * Raw URL adapter — creates a ParsedAPI from a plain URL (no spec).
 * Auto-detects query parameters as configurable operation parameters.
 */

import type { ParsedAPI, Operation, Parameter } from '../../core/types'
import { SpecFormat } from '../../core/types'

/**
 * Parse a raw URL into a ParsedAPI with a single "query" operation.
 * Query parameters from the URL become configurable parameters.
 */
export function parseRawUrl(url: string): ParsedAPI {
  const parsed = new URL(url)
  const baseUrl = `${parsed.origin}${parsed.pathname}`

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

  // Add a "path" parameter for sub-path navigation
  parameters.push({
    name: 'path',
    in: 'path',
    required: false,
    description: 'Optional sub-path to append to the base URL',
    schema: { type: 'string' },
  })

  const operation: Operation = {
    id: 'query',
    path: '',
    method: 'GET',
    summary: `Query ${parsed.hostname}`,
    parameters,
    tags: [],
  }

  return {
    title: parsed.hostname,
    version: '1.0.0',
    baseUrl,
    operations: [operation],
    authSchemes: [],
    specFormat: SpecFormat.RAW_URL,
  }
}
