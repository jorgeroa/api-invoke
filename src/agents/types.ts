/**
 * Agent tool export types.
 * SDK-agnostic — no MCP SDK or Zod dependency.
 */

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

/** SDK-agnostic tool definition (works for MCP, OpenAI, etc.). */
export interface ToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, JsonSchemaProperty>
    required?: string[]
  }
}

/** OpenAI function calling format. */
export interface OpenAIFunctionDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, JsonSchemaProperty>
      required?: string[]
    }
  }
}

/** Options for response formatting. */
export interface FormatOptions {
  /** Max items in top-level arrays (default: 25) */
  maxItems?: number
  /** Max items in nested arrays (default: 10) */
  maxNestedItems?: number
  /** Max serialized JSON size in bytes (default: 50KB) */
  maxBytes?: number
  /** Return full response without truncation (default: false) */
  fullResponse?: boolean
}
