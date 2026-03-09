import { describe, it, expect } from 'vitest'
import { generateToolDefinition, generateToolDefinitions } from './tool-builder'
import type { Operation } from '../core/types'

function makeOp(overrides: Partial<Operation>): Operation {
  return {
    id: 'test_op', path: '/test', method: 'GET', parameters: [], tags: [],
    ...overrides,
  }
}

describe('generateToolDefinition', () => {
  it('generates name from operation id', () => {
    const def = generateToolDefinition(makeOp({ id: 'getUserById' }))
    expect(def.name).toBe('get_user_by_id')
  })

  it('generates description from summary', () => {
    const def = generateToolDefinition(makeOp({ summary: 'Get a user' }))
    expect(def.description).toContain('Get a user')
  })

  it('uses existing description if present', () => {
    const def = generateToolDefinition(makeOp({ description: 'Custom description' }))
    expect(def.description).toBe('Custom description')
  })

  it('includes parameters as JSON Schema properties', () => {
    const def = generateToolDefinition(makeOp({
      parameters: [
        { name: 'id', in: 'path', required: true, description: 'User ID', schema: { type: 'string' } },
        { name: 'limit', in: 'query', required: false, description: 'Max results', schema: { type: 'integer' } },
      ],
    }))
    expect(def.inputSchema.properties['id']).toBeDefined()
    expect(def.inputSchema.properties['id'].type).toBe('string')
    expect(def.inputSchema.properties['limit'].type).toBe('number')
    expect(def.inputSchema.required).toEqual(['id'])
  })

  it('includes request body as body property', () => {
    const def = generateToolDefinition(makeOp({
      requestBody: {
        required: true,
        description: 'User data',
        schema: { type: 'object', raw: {} },
      },
    }))
    expect(def.inputSchema.properties['body']).toBeDefined()
    expect(def.inputSchema.properties['body'].description).toContain('User data')
    expect(def.inputSchema.required).toContain('body')
  })

  it('generates inputSchema with type object', () => {
    const def = generateToolDefinition(makeOp({}))
    expect(def.inputSchema.type).toBe('object')
  })

  it('omits required array when no required params', () => {
    const def = generateToolDefinition(makeOp({
      parameters: [
        { name: 'q', in: 'query', required: false, description: '', schema: { type: 'string' } },
      ],
    }))
    expect(def.inputSchema.required).toBeUndefined()
  })
})

describe('generateToolDefinitions', () => {
  it('generates definitions for multiple operations', () => {
    const ops = [
      makeOp({ id: 'listUsers' }),
      makeOp({ id: 'getUser' }),
    ]
    const defs = generateToolDefinitions(ops)
    expect(defs.length).toBe(2)
    expect(defs[0].name).toBe('list_users')
    expect(defs[1].name).toBe('get_user')
  })
})
