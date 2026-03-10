import { describe, it, expect } from 'vitest'
import { injectAuth, maskAuth } from './auth'
import { AuthType, HeaderName, ParamLocation } from './types'

describe('injectAuth', () => {
  it('injects bearer token', () => {
    const result = injectAuth('https://api.example.com', {}, { type: AuthType.BEARER, token: 'abc123' })
    expect(result.headers[HeaderName.AUTHORIZATION]).toBe('Bearer abc123')
  })

  it('injects basic auth', () => {
    const result = injectAuth('https://api.example.com', {}, { type: AuthType.BASIC, username: 'user', password: 'pass' })
    expect(result.headers[HeaderName.AUTHORIZATION]).toBe(`Basic ${btoa('user:pass')}`)
  })

  it('injects API key as header', () => {
    const result = injectAuth('https://api.example.com', {}, { type: AuthType.API_KEY, location: ParamLocation.HEADER, name: 'X-API-Key', value: 'secret' })
    expect(result.headers['X-API-Key']).toBe('secret')
  })

  it('injects API key as query param', () => {
    const result = injectAuth('https://api.example.com/data', {}, { type: AuthType.API_KEY, location: ParamLocation.QUERY, name: 'api_key', value: 'secret' })
    expect(result.url).toBe('https://api.example.com/data?api_key=secret')
  })

  it('injects oauth2 token', () => {
    const result = injectAuth('https://api.example.com', {}, { type: AuthType.OAUTH2, accessToken: 'token123' })
    expect(result.headers[HeaderName.AUTHORIZATION]).toBe('Bearer token123')
  })
  it('injects cookie auth', () => {
    const result = injectAuth('https://api.example.com', {}, { type: AuthType.COOKIE, name: 'session_id', value: 'abc123' })
    expect(result.headers[HeaderName.COOKIE]).toBe('session_id=abc123')
  })

  it('appends cookie auth to existing Cookie header', () => {
    const result = injectAuth('https://api.example.com', { [HeaderName.COOKIE]: 'existing=val' }, { type: AuthType.COOKIE, name: 'session_id', value: 'abc123' })
    expect(result.headers[HeaderName.COOKIE]).toBe('existing=val; session_id=abc123')
  })

  it('composes multiple auth schemes', () => {
    const result = injectAuth('https://api.example.com', {}, [
      { type: AuthType.BEARER, token: 'mytoken' },
      { type: AuthType.API_KEY, location: ParamLocation.HEADER, name: 'X-API-Key', value: 'secret' },
    ])
    expect(result.headers[HeaderName.AUTHORIZATION]).toBe('Bearer mytoken')
    expect(result.headers['X-API-Key']).toBe('secret')
  })
})

describe('maskAuth', () => {
  it('masks bearer token', () => {
    expect(maskAuth({ type: AuthType.BEARER, token: 'abc123456' })).toBe('Bearer abc1***')
  })

  it('masks basic auth', () => {
    expect(maskAuth({ type: AuthType.BASIC, username: 'user', password: 'secret' })).toBe('Basic user:***')
  })

  it('masks api key', () => {
    expect(maskAuth({ type: AuthType.API_KEY, location: ParamLocation.HEADER, name: 'X-API-Key', value: 'secret' })).toBe('X-API-Key: ***')
  })
})
