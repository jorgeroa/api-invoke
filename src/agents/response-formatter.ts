/**
 * Smart response truncation for agent tool outputs.
 * Prevents huge API responses from exceeding context windows.
 * Extracted from @api2aux/mcp-server with configurable limits.
 */

import type { FormatOptions } from './types'

const DEFAULT_MAX_ITEMS = 25
const DEFAULT_MAX_NESTED_ITEMS = 10
const DEFAULT_MAX_BYTES = 50 * 1024

interface TruncationMeta {
  truncated: boolean
  totalItems?: number
  shownItems?: number
}

/**
 * Format an API response with smart truncation.
 * Returns a JSON string with truncation metadata appended if needed.
 */
export function formatResponse(data: unknown, options?: FormatOptions): string {
  const maxItems = options?.maxItems ?? DEFAULT_MAX_ITEMS
  const maxNestedItems = options?.maxNestedItems ?? DEFAULT_MAX_NESTED_ITEMS
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES

  if (options?.fullResponse) {
    return JSON.stringify(data, null, 2)
  }

  const truncated = truncateData(data, maxItems, maxNestedItems)
  const json = JSON.stringify(truncated.data, null, 2)

  // Byte-aware truncation if still too large
  if (json.length > maxBytes) {
    const cut = json.slice(0, maxBytes)
    const lastNewline = cut.lastIndexOf('\n')
    const clean = lastNewline > 0 ? cut.slice(0, lastNewline) : cut
    const sizeStr = json.length > 1024 ? `${(json.length / 1024).toFixed(1)}KB` : `${json.length}B`
    return `${clean}\n\n... [truncated — full response is ${sizeStr}]`
  }

  if (truncated.meta.truncated) {
    const parts: string[] = []
    if (truncated.meta.totalItems !== undefined && truncated.meta.shownItems !== undefined) {
      parts.push(`showing ${truncated.meta.shownItems} of ${truncated.meta.totalItems} items`)
    }
    return `${json}\n\n... [${parts.join(', ')}]`
  }

  return json
}

function truncateData(
  data: unknown,
  maxItems: number,
  maxNestedItems: number,
): { data: unknown; meta: TruncationMeta } {
  const meta: TruncationMeta = { truncated: false }

  if (Array.isArray(data)) {
    if (data.length > maxItems) {
      meta.truncated = true
      meta.totalItems = data.length
      meta.shownItems = maxItems
      const items = data.slice(0, maxItems).map(item => truncateNested(item, maxNestedItems))
      return { data: items, meta }
    }
    const processed = data.map(item => truncateNested(item, maxNestedItems))
    return { data: processed, meta }
  }

  if (data !== null && typeof data === 'object') {
    const result = truncateNestedObject(data as Record<string, unknown>, maxNestedItems)
    return { data: result, meta }
  }

  return { data, meta }
}

function truncateNested(item: unknown, maxNestedItems: number): unknown {
  if (Array.isArray(item)) {
    if (item.length > maxNestedItems) {
      return [
        ...item.slice(0, maxNestedItems),
        `... and ${item.length - maxNestedItems} more items`,
      ]
    }
    return item.map(v => truncateNested(v, maxNestedItems))
  }

  if (item !== null && typeof item === 'object') {
    return truncateNestedObject(item as Record<string, unknown>, maxNestedItems)
  }

  return item
}

function truncateNestedObject(
  obj: Record<string, unknown>,
  maxNestedItems: number,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key] = truncateNested(value, maxNestedItems)
  }
  return result
}
