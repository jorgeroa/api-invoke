import { describe, it, expect } from 'vitest'
import { generateDescription, extractResponseFields, summarizeResponseSchema } from './descriptions'
import type { Operation } from '../../core/types'

function makeOp(overrides: Partial<Operation>): Operation {
  return {
    id: 'test', path: '/test', method: 'GET', parameters: [], tags: [],
    ...overrides,
  }
}

describe('generateDescription', () => {
  it('uses summary when available', () => {
    const desc = generateDescription(makeOp({ summary: 'Get user by ID' }))
    expect(desc).toBe('Get user by ID')
  })

  it('falls back to first sentence of description', () => {
    const desc = generateDescription(makeOp({ description: 'Gets a user. Returns all fields.' }))
    expect(desc).toBe('Gets a user.')
  })

  it('falls back to METHOD /path', () => {
    const desc = generateDescription(makeOp({ method: 'POST', path: '/users' }))
    expect(desc).toBe('POST /users')
  })

  it('includes tags', () => {
    const desc = generateDescription(makeOp({ summary: 'Get user', tags: ['Users', 'Admin'] }))
    expect(desc).toContain('Tags: Users, Admin')
  })

  it('includes response schema summary', () => {
    const desc = generateDescription(makeOp({
      summary: 'List users',
      responseSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
        },
      },
    }))
    expect(desc).toContain('Returns: { id: string, name: string }')
  })

  it('includes METHOD /path when includePath is set', () => {
    const desc = generateDescription(
      makeOp({ summary: 'Get user', method: 'GET', path: '/users/{id}' }),
      { includePath: true },
    )
    expect(desc).toContain('GET /users/{id}')
  })
})

describe('extractResponseFields', () => {
  it('extracts object property names', () => {
    const fields = extractResponseFields({
      type: 'object',
      properties: { id: { type: 'string' }, name: { type: 'string' } },
    })
    expect(fields).toEqual(['id', 'name'])
  })

  it('unwraps list wrapper patterns', () => {
    const fields = extractResponseFields({
      type: 'object',
      properties: {
        count: { type: 'number' },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: { index: { type: 'string' }, name: { type: 'string' } },
          },
        },
      },
    })
    expect(fields).toEqual(['index', 'name'])
  })

  it('extracts array item fields', () => {
    const fields = extractResponseFields({
      type: 'array',
      items: {
        type: 'object',
        properties: { a: { type: 'string' }, b: { type: 'number' } },
      },
    })
    expect(fields).toEqual(['a', 'b'])
  })

  it('returns null for non-object schemas', () => {
    expect(extractResponseFields(null)).toBeNull()
    expect(extractResponseFields({ type: 'string' })).toBeNull()
  })
})

describe('summarizeResponseSchema', () => {
  it('summarizes object with properties', () => {
    const result = summarizeResponseSchema({
      type: 'object',
      properties: {
        id: { type: 'string' },
        count: { type: 'number' },
      },
    })
    expect(result).toBe('{ id: string, count: number }')
  })

  it('summarizes array of objects', () => {
    const result = summarizeResponseSchema({
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' } },
      },
    })
    expect(result).toBe('{ name: string }[]')
  })

  it('includes enum values', () => {
    const result = summarizeResponseSchema({
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'inactive'] },
      },
    })
    expect(result).toBe('{ status: string (active|inactive) }')
  })

  it('returns null for empty/invalid schemas', () => {
    expect(summarizeResponseSchema(null)).toBeNull()
    expect(summarizeResponseSchema({ type: 'string' })).toBeNull()
  })
})
