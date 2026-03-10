import { describe, it, expect } from 'vitest'
import { buildUrl, deriveBaseUrl } from './url-builder'
import type { Operation } from './types'

describe('buildUrl', () => {
  const baseOp: Operation = {
    id: 'test',
    path: '/users/{id}',
    method: 'GET',
    parameters: [
      { name: 'id', in: 'path', required: true, description: '', schema: { type: 'string' } },
      { name: 'limit', in: 'query', required: false, description: '', schema: { type: 'number' } },
    ],
    tags: [],
  }

  it('interpolates path parameters', () => {
    const url = buildUrl('https://api.example.com', baseOp, { id: '42' })
    expect(url).toBe('https://api.example.com/users/42')
  })

  it('appends query parameters', () => {
    const url = buildUrl('https://api.example.com', baseOp, { id: '42', limit: 10 })
    expect(url).toBe('https://api.example.com/users/42?limit=10')
  })

  it('encodes path parameters', () => {
    const url = buildUrl('https://api.example.com', baseOp, { id: 'hello world' })
    expect(url).toBe('https://api.example.com/users/hello%20world')
  })

  it('handles trailing slash on baseUrl', () => {
    const url = buildUrl('https://api.example.com/', baseOp, { id: '42' })
    expect(url).toBe('https://api.example.com/users/42')
  })

  it('preserves baseUrl path prefix', () => {
    const url = buildUrl('https://api.example.com/v1', baseOp, { id: '42' })
    expect(url).toBe('https://api.example.com/v1/users/42')
  })
})

describe('default parameter values', () => {
  it('applies default when arg is not provided', () => {
    const op: Operation = {
      id: 'test',
      path: '/items',
      method: 'GET',
      parameters: [
        { name: 'format', in: 'query', required: false, description: '', schema: { type: 'string', default: 'json' } },
      ],
      tags: [],
    }
    const url = buildUrl('https://api.example.com', op, {})
    expect(url).toBe('https://api.example.com/items?format=json')
  })

  it('allows overriding default', () => {
    const op: Operation = {
      id: 'test',
      path: '/items',
      method: 'GET',
      parameters: [
        { name: 'format', in: 'query', required: false, description: '', schema: { type: 'string', default: 'json' } },
      ],
      tags: [],
    }
    const url = buildUrl('https://api.example.com', op, { format: 'xml' })
    expect(url).toBe('https://api.example.com/items?format=xml')
  })
})

describe('array/object query param serialization', () => {
  it('serializes arrays as comma-separated', () => {
    const op: Operation = {
      id: 'test',
      path: '/items',
      method: 'GET',
      parameters: [
        { name: 'tags', in: 'query', required: false, description: '', schema: { type: 'array' } },
      ],
      tags: [],
    }
    const url = buildUrl('https://api.example.com', op, { tags: ['a', 'b', 'c'] })
    expect(url).toContain('tags=a%2Cb%2Cc')
  })

  it('serializes objects as comma-separated key,value pairs', () => {
    const op: Operation = {
      id: 'test',
      path: '/items',
      method: 'GET',
      parameters: [
        { name: 'filter', in: 'query', required: false, description: '', schema: { type: 'object' } },
      ],
      tags: [],
    }
    const url = buildUrl('https://api.example.com', op, { filter: { status: 'active', role: 'admin' } })
    expect(url).toContain('filter=status%2Cactive%2Crole%2Cadmin')
  })

  it('handles plain string values normally', () => {
    const op: Operation = {
      id: 'test',
      path: '/items',
      method: 'GET',
      parameters: [
        { name: 'q', in: 'query', required: false, description: '', schema: { type: 'string' } },
      ],
      tags: [],
    }
    const url = buildUrl('https://api.example.com', op, { q: 'hello' })
    expect(url).toBe('https://api.example.com/items?q=hello')
  })
})

describe('deriveBaseUrl', () => {
  it('strips filename from spec URL', () => {
    expect(deriveBaseUrl('https://alphafold.ebi.ac.uk/api/openapi.json'))
      .toBe('https://alphafold.ebi.ac.uk/api')
  })

  it('handles root-level spec', () => {
    expect(deriveBaseUrl('https://api.example.com/openapi.json'))
      .toBe('https://api.example.com')
  })

  it('returns empty for invalid URL', () => {
    expect(deriveBaseUrl('not-a-url')).toBe('')
  })
})
