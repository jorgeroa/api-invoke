/**
 * Parameter schema utilities.
 * Converts parameters to JSON Schema and enhances with semantic hints.
 * Extracted from @api2aux/tool-utils + @api2aux/mcp-server semantic-enrichment.
 */

import type { Parameter } from '../../core/types'

/** JSON Schema property for tool input schemas. */
export interface JsonSchemaProperty {
  type: string
  description?: string
  enum?: string[]
  default?: unknown
  minimum?: number
  maximum?: number
  maxLength?: number
}

/**
 * Well-known parameter name patterns that map to semantic categories.
 * Used for input parameter enhancement when sample values aren't available.
 */
const NAME_CATEGORY_MAP: Array<[RegExp, string]> = [
  [/^e[-_]?mail$/i, 'email'],
  [/^(url|uri|href|link|website)$/i, 'url'],
  [/^(uuid|guid)$/i, 'uuid'],
  [/^(image[-_]?url|photo[-_]?url|avatar[-_]?url|thumbnail[-_]?url|icon[-_]?url)$/i, 'image_url'],
  [/^(phone|telephone|mobile|cell)$/i, 'phone'],
  [/^(price|cost|amount|total|subtotal)$/i, 'price'],
  [/^(rating|score|stars)$/i, 'rating'],
  [/^(date|created[-_]?at|updated[-_]?at|timestamp|born|birthday|dob)$/i, 'date'],
  [/^(name|full[-_]?name|first[-_]?name|last[-_]?name|display[-_]?name)$/i, 'name'],
  [/^(color|colour)$/i, 'color'],
]

/** Semantic examples for common categories. */
const SEMANTIC_EXAMPLES: Record<string, string> = {
  email: 'user@example.com',
  uuid: '123e4567-e89b-12d3-a456-426614174000',
  url: 'https://example.com',
  phone: '+1-555-0123',
  price: '29.99',
  rating: '4.5',
  date: '2025-01-15',
  name: 'John Doe',
  image_url: 'https://example.com/image.jpg',
  color: '#FF5733',
}

/**
 * Detect semantic category from parameter name using regex patterns.
 */
export function detectCategoryByName(name: string): string | null {
  for (const [pattern, category] of NAME_CATEGORY_MAP) {
    if (pattern.test(name)) return category
  }
  return null
}

/**
 * Convert a Parameter into a JSON Schema property.
 */
export function parameterToJsonSchema(param: Parameter): JsonSchemaProperty {
  const prop: JsonSchemaProperty = {
    type: param.schema.type === 'integer' || param.schema.type === 'number' ? 'number' : 'string',
  }

  if (param.schema.type === 'boolean') {
    prop.type = 'boolean'
  }

  const descParts: string[] = []
  if (param.description) descParts.push(param.description)
  if (param.schema.format) descParts.push(`Format: ${param.schema.format}`)
  if (param.schema.default !== undefined) descParts.push(`Default: ${String(param.schema.default)}`)
  if (param.schema.example !== undefined) descParts.push(`Example: ${String(param.schema.example)}`)
  if (descParts.length > 0) prop.description = descParts.join('. ')

  if (param.schema.enum && param.schema.enum.length > 0) {
    prop.enum = param.schema.enum.map(String)
  }

  if (param.schema.minimum !== undefined) prop.minimum = param.schema.minimum
  if (param.schema.maximum !== undefined) prop.maximum = param.schema.maximum
  if (param.schema.maxLength !== undefined) prop.maxLength = param.schema.maxLength

  return prop
}

/**
 * Enhance a parameter description with semantic example if detectable.
 * Returns enhanced description or original if no semantic match.
 */
export function enhanceParameterDescription(param: Parameter): string {
  if (param.schema.type !== 'string') return param.description

  const category = detectCategoryByName(param.name)
  if (!category) return param.description

  const example = SEMANTIC_EXAMPLES[category]
  if (!example) return param.description

  const base = param.description || param.name
  return `${base}. Example: ${example}`
}

/**
 * Sort parameters: path params first, then required, then optional.
 */
export function sortParameters<T extends { in: string; required: boolean }>(params: T[]): T[] {
  return [...params].sort((a, b) => {
    if (a.in === 'path' && b.in !== 'path') return -1
    if (b.in === 'path' && a.in !== 'path') return 1
    if (a.required && !b.required) return -1
    if (b.required && !a.required) return 1
    return 0
  })
}
