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

  it('handles baseUrl with path prefix', () => {
    const url = buildUrl('https://api.example.com/v1', baseOp, { id: '42' })
    expect(url).toBe('https://api.example.com/users/42')
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
