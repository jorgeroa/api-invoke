import { describe, it, expect } from 'vitest'
import { parseRawUrl, parseRawUrls } from './parser'

describe('parseRawUrl', () => {
  it('creates a single operation from a URL', () => {
    const api = parseRawUrl('https://api.example.com/users')
    expect(api.operations).toHaveLength(1)
    expect(api.operations[0].method).toBe('GET')
    expect(api.operations[0].path).toBe('/users')
  })

  it('extracts query params as parameters with defaults', () => {
    const api = parseRawUrl('https://api.example.com/users?page=1&limit=10')
    const params = api.operations[0].parameters
    expect(params).toHaveLength(2)
    expect(params[0].name).toBe('page')
    expect(params[0].schema.default).toBe('1')
    expect(params[1].name).toBe('limit')
    expect(params[1].schema.default).toBe('10')
  })

  it('uses hostname as title', () => {
    const api = parseRawUrl('https://api.example.com/data')
    expect(api.title).toBe('api.example.com')
  })
})

describe('parseRawUrls', () => {
  it('creates multiple operations from multiple URLs', () => {
    const api = parseRawUrls([
      { url: 'https://api.example.com/users', method: 'GET' },
      { url: 'https://api.example.com/users', method: 'POST' },
      { url: 'https://api.example.com/users/123', method: 'DELETE' },
    ])
    expect(api.operations).toHaveLength(3)
    expect(api.operations[0].method).toBe('GET')
    expect(api.operations[1].method).toBe('POST')
    expect(api.operations[2].method).toBe('DELETE')
  })

  it('derives baseUrl from first endpoint origin', () => {
    const api = parseRawUrls([
      { url: 'https://api.example.com/v1/users' },
    ])
    expect(api.baseUrl).toBe('https://api.example.com')
  })

  it('uses custom id and summary', () => {
    const api = parseRawUrls([
      { url: 'https://api.example.com/users', id: 'listUsers', summary: 'Get all users' },
    ])
    expect(api.operations[0].id).toBe('listUsers')
    expect(api.operations[0].summary).toBe('Get all users')
  })

  it('generates ids from method and path', () => {
    const api = parseRawUrls([
      { url: 'https://api.example.com/users', method: 'POST' },
    ])
    expect(api.operations[0].id).toBe('post_users')
  })

  it('throws for empty endpoints array', () => {
    expect(() => parseRawUrls([])).toThrow('At least one endpoint')
  })

  it('defaults method to GET', () => {
    const api = parseRawUrls([
      { url: 'https://api.example.com/data' },
    ])
    expect(api.operations[0].method).toBe('GET')
  })

  it('throws for mixed origins', () => {
    expect(() => parseRawUrls([
      { url: 'https://api.example.com/users' },
      { url: 'https://other-api.com/data' },
    ])).toThrow('same origin')
  })

  it('throws for invalid URLs with a helpful message', () => {
    expect(() => parseRawUrls([
      { url: 'not-a-url' },
    ])).toThrow('Invalid URL')
  })
})
