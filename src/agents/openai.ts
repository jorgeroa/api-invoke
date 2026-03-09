/**
 * OpenAI function calling format export.
 * Converts ParsedAPI → OpenAI-compatible function definitions.
 */

import type { ParsedAPI } from '../core/types'
import type { OpenAIFunctionDefinition } from './types'
import { generateToolDefinitions } from './tool-builder'

/**
 * Convert a ParsedAPI into OpenAI function calling format.
 */
export function toLLMTools(api: ParsedAPI): OpenAIFunctionDefinition[] {
  const tools = generateToolDefinitions(api.operations)

  return tools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }))
}
