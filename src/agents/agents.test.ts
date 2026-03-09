import { describe, it, expect } from 'vitest'
import { toMCPTools, toLLMTools, formatResponse } from './index'
import type { ParsedAPI } from '../core/types'

const mockApi: ParsedAPI = {
  title: 'Test API',
  version: '1.0',
  baseUrl: 'https://api.example.com',
  specFormat: 'openapi-3',
  authSchemes: [],
  operations: [
    {
      id: 'listUsers',
      path: '/users',
      method: 'GET',
      summary: 'List all users',
      parameters: [
        { name: 'limit', in: 'query', required: false, description: 'Max results', schema: { type: 'integer' } },
      ],
      tags: ['Users'],
      responseSchema: {
        type: 'array',
        items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } },
      },
    },
    {
      id: 'getUser',
      path: '/users/{id}',
      method: 'GET',
      summary: 'Get user by ID',
      parameters: [
        { name: 'id', in: 'path', required: true, description: 'User ID', schema: { type: 'string' } },
      ],
      tags: ['Users'],
    },
  ],
}

describe('toMCPTools', () => {
  it('generates tool definitions for all operations', () => {
    const tools = toMCPTools(mockApi)
    expect(tools.length).toBe(2)
  })

  it('produces valid tool definition shape', () => {
    const tools = toMCPTools(mockApi)
    const tool = tools[0]
    expect(tool.name).toBe('list_users')
    expect(tool.description).toContain('List all users')
    expect(tool.inputSchema.type).toBe('object')
    expect(tool.inputSchema.properties['limit']).toBeDefined()
  })

  it('marks required parameters', () => {
    const tools = toMCPTools(mockApi)
    const getUserTool = tools.find(t => t.name === 'get_user')!
    expect(getUserTool.inputSchema.required).toContain('id')
  })
})

describe('toLLMTools', () => {
  it('wraps in OpenAI function calling format', () => {
    const tools = toLLMTools(mockApi)
    expect(tools.length).toBe(2)
    expect(tools[0].type).toBe('function')
    expect(tools[0].function.name).toBe('list_users')
    expect(tools[0].function.parameters.type).toBe('object')
  })

  it('includes description in function object', () => {
    const tools = toLLMTools(mockApi)
    expect(tools[0].function.description).toContain('List all users')
  })
})

describe('formatResponse', () => {
  it('returns pretty JSON for small responses', () => {
    const result = formatResponse({ id: 1, name: 'Alice' })
    expect(result).toBe('{\n  "id": 1,\n  "name": "Alice"\n}')
  })

  it('truncates top-level arrays', () => {
    const data = Array.from({ length: 50 }, (_, i) => ({ id: i }))
    const result = formatResponse(data, { maxItems: 5 })
    const parsed = JSON.parse(result.split('\n\n')[0])
    expect(parsed.length).toBe(5)
    expect(result).toContain('showing 5 of 50 items')
  })

  it('truncates nested arrays', () => {
    const data = { items: Array.from({ length: 20 }, (_, i) => i) }
    const result = formatResponse(data, { maxNestedItems: 3 })
    const parsed = JSON.parse(result)
    expect(parsed.items.length).toBe(4) // 3 items + "... and 17 more items"
    expect(parsed.items[3]).toContain('17 more items')
  })

  it('does byte-aware truncation for large responses', () => {
    const data = Array.from({ length: 10 }, () => ({ content: 'x'.repeat(10000) }))
    const result = formatResponse(data, { maxBytes: 1000 })
    expect(result).toContain('truncated')
    expect(result.length).toBeLessThan(2000)
  })

  it('returns full response when fullResponse=true', () => {
    const data = Array.from({ length: 50 }, (_, i) => ({ id: i }))
    const result = formatResponse(data, { fullResponse: true })
    const parsed = JSON.parse(result)
    expect(parsed.length).toBe(50)
  })

  it('handles null and primitives', () => {
    expect(formatResponse(null)).toBe('null')
    expect(formatResponse(42)).toBe('42')
    expect(formatResponse('hello')).toBe('"hello"')
  })
})
