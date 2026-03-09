import { describe, it, expect } from 'vitest'
import { corsProxy } from './cors-proxy'

describe('corsProxy', () => {
  it('rewrites absolute HTTP URLs by default', () => {
    const mw = corsProxy()
    const result = mw.onRequest!('https://api.example.com/users', { method: 'GET' })
    expect(result).toEqual({
      url: `/api-proxy/${encodeURIComponent('https://api.example.com/users')}`,
      init: { method: 'GET' },
    })
  })

  it('does not rewrite relative URLs', () => {
    const mw = corsProxy()
    const result = mw.onRequest!('/users', { method: 'GET' })
    expect(result).toEqual({
      url: '/users',
      init: { method: 'GET' },
    })
  })

  it('supports custom rewrite function', () => {
    const mw = corsProxy({
      rewrite: (url) => `https://proxy.io/?url=${encodeURIComponent(url)}`,
    })
    const result = mw.onRequest!('https://api.example.com/data', { method: 'GET' })
    expect(result).toEqual({
      url: `https://proxy.io/?url=${encodeURIComponent('https://api.example.com/data')}`,
      init: { method: 'GET' },
    })
  })

  it('supports custom shouldProxy predicate', () => {
    const mw = corsProxy({
      shouldProxy: (url) => url.includes('blocked-api.com'),
    })

    const blocked = mw.onRequest!('https://blocked-api.com/data', { method: 'GET' })
    expect(blocked.url).toContain('api-proxy')

    const allowed = mw.onRequest!('https://open-api.com/data', { method: 'GET' })
    expect(allowed.url).toBe('https://open-api.com/data')
  })

  it('preserves init unchanged', () => {
    const mw = corsProxy()
    const init = { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } }
    const result = mw.onRequest!('https://api.example.com/users', init)
    expect(result.init).toBe(init)
  })

  it('has the name cors-proxy', () => {
    const mw = corsProxy()
    expect(mw.name).toBe('cors-proxy')
  })
})
