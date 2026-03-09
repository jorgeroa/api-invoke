import { describe, it, expect } from 'vitest'
import { injectAuth, maskAuth } from './auth'

describe('injectAuth', () => {
  it('injects bearer token', () => {
    const result = injectAuth('https://api.example.com', {}, { type: 'bearer', token: 'abc123' })
    expect(result.headers['Authorization']).toBe('Bearer abc123')
  })

  it('injects basic auth', () => {
    const result = injectAuth('https://api.example.com', {}, { type: 'basic', username: 'user', password: 'pass' })
    expect(result.headers['Authorization']).toBe(`Basic ${btoa('user:pass')}`)
  })

  it('injects API key as header', () => {
    const result = injectAuth('https://api.example.com', {}, { type: 'apiKey', location: 'header', name: 'X-API-Key', value: 'secret' })
    expect(result.headers['X-API-Key']).toBe('secret')
  })

  it('injects API key as query param', () => {
    const result = injectAuth('https://api.example.com/data', {}, { type: 'apiKey', location: 'query', name: 'api_key', value: 'secret' })
    expect(result.url).toBe('https://api.example.com/data?api_key=secret')
  })

  it('injects oauth2 token', () => {
    const result = injectAuth('https://api.example.com', {}, { type: 'oauth2', accessToken: 'token123' })
    expect(result.headers['Authorization']).toBe('Bearer token123')
  })
})

describe('maskAuth', () => {
  it('masks bearer token', () => {
    expect(maskAuth({ type: 'bearer', token: 'abc123456' })).toBe('Bearer abc1***')
  })

  it('masks basic auth', () => {
    expect(maskAuth({ type: 'basic', username: 'user', password: 'secret' })).toBe('Basic user:***')
  })

  it('masks api key', () => {
    expect(maskAuth({ type: 'apiKey', location: 'header', name: 'X-API-Key', value: 'secret' })).toBe('X-API-Key: ***')
  })
})
