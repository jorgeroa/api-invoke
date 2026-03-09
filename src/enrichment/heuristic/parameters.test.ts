import { describe, it, expect } from 'vitest'
import { parameterToJsonSchema, enhanceParameterDescription, detectCategoryByName, sortParameters } from './parameters'
import type { Parameter } from '../../core/types'

function makeParam(overrides: Partial<Parameter> & { name: string }): Parameter {
  return {
    in: 'query',
    required: false,
    description: '',
    schema: { type: 'string' },
    ...overrides,
  }
}

describe('parameterToJsonSchema', () => {
  it('converts string parameter', () => {
    const result = parameterToJsonSchema(makeParam({ name: 'q', schema: { type: 'string' } }))
    expect(result.type).toBe('string')
  })

  it('converts number parameter', () => {
    const result = parameterToJsonSchema(makeParam({ name: 'limit', schema: { type: 'integer' } }))
    expect(result.type).toBe('number')
  })

  it('converts boolean parameter', () => {
    const result = parameterToJsonSchema(makeParam({ name: 'active', schema: { type: 'boolean' } }))
    expect(result.type).toBe('boolean')
  })

  it('includes enum values', () => {
    const result = parameterToJsonSchema(makeParam({
      name: 'status',
      schema: { type: 'string', enum: ['active', 'inactive'] },
    }))
    expect(result.enum).toEqual(['active', 'inactive'])
  })

  it('includes description with format and default', () => {
    const result = parameterToJsonSchema(makeParam({
      name: 'date',
      description: 'A date',
      schema: { type: 'string', format: 'date', default: '2025-01-01' },
    }))
    expect(result.description).toContain('A date')
    expect(result.description).toContain('Format: date')
    expect(result.description).toContain('Default: 2025-01-01')
  })

  it('includes min/max constraints', () => {
    const result = parameterToJsonSchema(makeParam({
      name: 'limit',
      schema: { type: 'integer', minimum: 1, maximum: 100 },
    }))
    expect(result.minimum).toBe(1)
    expect(result.maximum).toBe(100)
  })
})

describe('detectCategoryByName', () => {
  it('detects email', () => {
    expect(detectCategoryByName('email')).toBe('email')
    expect(detectCategoryByName('e-mail')).toBe('email')
  })

  it('detects url', () => {
    expect(detectCategoryByName('url')).toBe('url')
    expect(detectCategoryByName('website')).toBe('url')
  })

  it('detects uuid', () => {
    expect(detectCategoryByName('uuid')).toBe('uuid')
  })

  it('detects date', () => {
    expect(detectCategoryByName('created_at')).toBe('date')
    expect(detectCategoryByName('date')).toBe('date')
  })

  it('returns null for unknown names', () => {
    expect(detectCategoryByName('foo_bar')).toBeNull()
    expect(detectCategoryByName('something')).toBeNull()
  })
})

describe('enhanceParameterDescription', () => {
  it('adds email example', () => {
    const result = enhanceParameterDescription(makeParam({
      name: 'email',
      description: 'User email',
      schema: { type: 'string' },
    }))
    expect(result).toContain('user@example.com')
  })

  it('adds date example', () => {
    const result = enhanceParameterDescription(makeParam({
      name: 'created_at',
      description: 'Creation date',
      schema: { type: 'string' },
    }))
    expect(result).toContain('2025-01-15')
  })

  it('does not enhance non-string params', () => {
    const result = enhanceParameterDescription(makeParam({
      name: 'email',
      description: 'Count',
      schema: { type: 'number' },
    }))
    expect(result).toBe('Count')
  })

  it('returns original if no match', () => {
    const result = enhanceParameterDescription(makeParam({
      name: 'foo',
      description: 'Some param',
      schema: { type: 'string' },
    }))
    expect(result).toBe('Some param')
  })
})

describe('sortParameters', () => {
  it('sorts path params first', () => {
    const params = [
      makeParam({ name: 'q', in: 'query', required: false }),
      makeParam({ name: 'id', in: 'path', required: true }),
    ]
    const sorted = sortParameters(params)
    expect(sorted[0].name).toBe('id')
  })

  it('sorts required before optional', () => {
    const params = [
      makeParam({ name: 'optional', in: 'query', required: false }),
      makeParam({ name: 'required', in: 'query', required: true }),
    ]
    const sorted = sortParameters(params)
    expect(sorted[0].name).toBe('required')
  })
})
