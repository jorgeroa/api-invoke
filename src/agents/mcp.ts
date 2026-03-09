/**
 * MCP tool export.
 * Converts ParsedAPI → SDK-agnostic ToolDefinition[].
 */

import type { ParsedAPI, Operation } from '../core/types'
import type { ToolDefinition } from './types'
import { generateToolDefinition, generateToolDefinitions } from './tool-builder'

/**
 * Convert a ParsedAPI into MCP-compatible tool definitions.
 * Returns plain objects — no @modelcontextprotocol/sdk dependency.
 */
export function toMCPTools(api: ParsedAPI): ToolDefinition[] {
  return generateToolDefinitions(api.operations)
}

/**
 * Convert a single Operation into an MCP-compatible tool definition.
 */
export function operationToMCPTool(op: Operation): ToolDefinition {
  return generateToolDefinition(op)
}
