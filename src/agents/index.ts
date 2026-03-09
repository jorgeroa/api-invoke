/**
 * api-bridge-rt/agents — Agent tool export entry point.
 * SDK-agnostic tool definitions for MCP, OpenAI, and other frameworks.
 */

export { toMCPTools, operationToMCPTool } from './mcp'
export { toLLMTools } from './openai'
export { formatResponse } from './response-formatter'
export { generateToolDefinition, generateToolDefinitions } from './tool-builder'
export type { ToolDefinition, OpenAIFunctionDefinition, JsonSchemaProperty, FormatOptions } from './types'
