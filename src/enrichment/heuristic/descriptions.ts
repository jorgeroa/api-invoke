/**
 * Description building utilities.
 * Generates human-readable tool descriptions from operation metadata.
 * Extracted from @api2aux/tool-utils.
 */

import type { Operation } from '../../core/types'
import type { DescriptionOptions } from '../types'

/**
 * Extract meaningful field names from a JSON Schema response schema.
 * Unwraps common list-wrapper patterns like { count, results: [{...items}] }
 * to return the actual entity/DTO fields, not the pagination wrapper.
 */
export function extractResponseFields(schema: unknown): string[] | null {
  if (!schema || typeof schema !== 'object') return null

  const s = schema as Record<string, unknown>

  if (s.type === 'object' && s.properties && typeof s.properties === 'object') {
    const props = s.properties as Record<string, Record<string, unknown>>
    const keys = Object.keys(props)

    // Unwrap list wrappers: if the object has few top-level fields and one is
    // an array-of-objects, return the array item fields (the actual DTO).
    if (keys.length <= 4) {
      for (const key of keys) {
        const prop = props[key]
        if (prop && prop.type === 'array' && prop.items && typeof prop.items === 'object') {
          const items = prop.items as Record<string, unknown>
          if (items.properties && typeof items.properties === 'object') {
            return Object.keys(items.properties as Record<string, unknown>)
          }
        }
      }
    }

    return keys
  }

  if (s.type === 'array' && s.items && typeof s.items === 'object') {
    const items = s.items as Record<string, unknown>
    if (items.properties && typeof items.properties === 'object') {
      return Object.keys(items.properties as Record<string, unknown>)
    }
  }

  for (const combiner of ['allOf', 'oneOf', 'anyOf']) {
    if (Array.isArray(s[combiner])) {
      for (const sub of s[combiner] as unknown[]) {
        const fields = extractResponseFields(sub)
        if (fields) return fields
      }
    }
  }

  return null
}

/**
 * Summarize a JSON Schema response DTO into a compact, LLM-friendly string.
 * Includes field names, types, descriptions, enums, and nested structure.
 */
export function summarizeResponseSchema(schema: unknown, depth = 0): string | null {
  if (!schema || typeof schema !== 'object' || depth > 3) return null

  const s = schema as Record<string, unknown>

  // Handle combiners
  for (const combiner of ['allOf', 'oneOf', 'anyOf']) {
    if (Array.isArray(s[combiner])) {
      for (const sub of s[combiner] as unknown[]) {
        const result = summarizeResponseSchema(sub, depth)
        if (result) return result
      }
    }
  }

  // Array of objects
  if (s.type === 'array' && s.items && typeof s.items === 'object') {
    const itemSummary = summarizeResponseSchema(s.items, depth)
    if (itemSummary) return `${itemSummary}[]`
    return null
  }

  // Object with properties — the main case
  if (s.type === 'object' && s.properties && typeof s.properties === 'object') {
    const props = s.properties as Record<string, Record<string, unknown>>
    const entries = Object.entries(props)
    if (entries.length === 0) return null

    // Unwrap list wrappers (e.g. { count, results: [{...}] })
    if (entries.length <= 4 && depth === 0) {
      for (const [, prop] of entries) {
        if (prop.type === 'array' && prop.items && typeof prop.items === 'object') {
          const items = prop.items as Record<string, unknown>
          if (items.properties) {
            const inner = summarizeResponseSchema(prop, depth)
            if (inner) return inner
          }
        }
      }
    }

    const fieldStrs: string[] = []
    for (const [name, prop] of entries) {
      fieldStrs.push(summarizeProperty(name, prop, depth))
    }

    const max = depth === 0 ? 20 : 6
    if (fieldStrs.length > max) {
      const shown = fieldStrs.slice(0, max)
      shown.push(`+${fieldStrs.length - max} more`)
      return `{ ${shown.join(', ')} }`
    }

    return `{ ${fieldStrs.join(', ')} }`
  }

  return null
}

/**
 * Summarize a single property into a compact string.
 */
function summarizeProperty(name: string, prop: Record<string, unknown>, depth: number): string {
  const type = prop.type as string | undefined
  const desc = prop.description as string | undefined
  const enumVals = prop.enum as unknown[] | undefined

  // Nested object
  if (type === 'object' && prop.properties) {
    const nested = summarizeResponseSchema(prop, depth + 1)
    if (nested) return `${name}: ${nested}`
  }

  // Array
  if (type === 'array' && prop.items && typeof prop.items === 'object') {
    const items = prop.items as Record<string, unknown>
    if (items.properties) {
      const nested = summarizeResponseSchema(items, depth + 1)
      if (nested) return `${name}: ${nested}[]`
    }
    const itemType = items.type as string | undefined
    return `${name}: ${itemType || 'any'}[]`
  }

  // Simple field
  let str = `${name}: ${type || 'any'}`

  if (enumVals && enumVals.length <= 6) {
    str += ` (${enumVals.join('|')})`
  } else if (desc && desc.length <= 60) {
    str += ` (${desc})`
  }

  return str
}

/**
 * Build a human-readable description for a tool from operation metadata.
 * Includes summary/description, tags, and response DTO schema.
 */
export function generateDescription(op: Operation, opts?: DescriptionOptions): string {
  const parts: string[] = []

  if (op.summary) {
    parts.push(op.summary)
  } else if (op.description) {
    const firstSentence = op.description.split(/\.\s/)[0]
    parts.push(firstSentence ? firstSentence + '.' : op.description)
  } else {
    parts.push(`${op.method.toUpperCase()} ${op.path}`)
  }

  if (opts?.includePath && (op.summary || op.description)) {
    parts.push(`${op.method.toUpperCase()} ${op.path}`)
  }

  if (op.tags.length > 0) {
    parts.push(`Tags: ${op.tags.join(', ')}`)
  }

  // Include full DTO schema summary for LLM context
  const dtoSummary = summarizeResponseSchema(op.responseSchema)
  if (dtoSummary) {
    parts.push(`Returns: ${dtoSummary}`)
  } else {
    const fields = extractResponseFields(op.responseSchema)
    if (fields && fields.length > 0) {
      const displayed = fields.length > 15
        ? [...fields.slice(0, 15), `+${fields.length - 15} more`]
        : fields
      parts.push(`Returns: ${displayed.join(', ')}`)
    }
  }

  return parts.join(' | ')
}
