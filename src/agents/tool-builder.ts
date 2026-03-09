/**
 * Tool definition builder.
 * Converts Operation → ToolDefinition using enrichment utilities.
 */

import type { Operation } from '../core/types'
import type { ToolDefinition, JsonSchemaProperty } from './types'
import { generateToolName, sanitizeToolName } from '../enrichment/heuristic/naming'
import { generateDescription } from '../enrichment/heuristic/descriptions'
import { parameterToJsonSchema } from '../enrichment/heuristic/parameters'

/**
 * Generate a ToolDefinition from an Operation.
 * If the operation has already been enriched, uses existing id/description.
 */
export function generateToolDefinition(op: Operation): ToolDefinition {
  const properties: Record<string, JsonSchemaProperty> = {}
  const required: string[] = []

  for (const param of op.parameters) {
    properties[param.name] = parameterToJsonSchema(param)
    if (param.required) {
      required.push(param.name)
    }
  }

  if (op.requestBody) {
    const bodyDesc = op.requestBody.description || 'Request body (JSON)'
    properties['body'] = {
      type: 'string',
      description: `${bodyDesc}. Pass as JSON string.`,
    }
    if (op.requestBody.required) {
      required.push('body')
    }
  }

  // Use existing description if enriched, otherwise generate
  const name = sanitizeToolName(generateToolName(op))
  const description = op.description || generateDescription(op)

  return {
    name,
    description,
    inputSchema: {
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {}),
    },
  }
}

/**
 * Generate ToolDefinitions for multiple operations.
 */
export function generateToolDefinitions(operations: Operation[]): ToolDefinition[] {
  return operations.map(op => generateToolDefinition(op))
}
