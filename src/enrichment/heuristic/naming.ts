/**
 * Tool naming utilities.
 * Generates consistent, snake_case tool names from operations.
 * Extracted from @api2aux/tool-utils.
 */

import type { Operation } from '../../core/types'

/**
 * Generate a tool name from an operation.
 * Prefers operation ID (converted to snake_case), falls back to method_path.
 */
export function generateToolName(op: Operation): string {
  if (op.id) {
    return op.id
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .toLowerCase()
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
  }

  const pathSegments = op.path
    .replace(/\{[^}]+\}/g, 'by_id')
    .split('/')
    .filter(Boolean)
    .join('_')

  return `${op.method.toLowerCase()}_${pathSegments}`
}

/**
 * Sanitize a tool name: strip invalid chars, truncate to 64 chars.
 */
export function sanitizeToolName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 64)
}
