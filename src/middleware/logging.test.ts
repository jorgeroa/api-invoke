import { describe, it, expect, vi } from 'vitest'
import { logging } from './logging'

describe('logging', () => {
  it('logs request method and URL', () => {
    const log = vi.fn()
    const mw = logging({ log })
    mw.onRequest!('https://api.example.com/users', { method: 'GET' })
    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0][0]).toContain('GET')
    expect(log.mock.calls[0][0]).toContain('https://api.example.com/users')
  })

  it('masks Authorization header', () => {
    const log = vi.fn()
    const mw = logging({ log })
    mw.onRequest!('https://api.example.com/users', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer sk-secret-token-12345' },
    })
    const output = log.mock.calls[0][0]
    expect(output).toContain('Bearer ***')
    expect(output).not.toContain('sk-secret-token-12345')
  })

  it('masks sensitive query parameters', () => {
    const log = vi.fn()
    const mw = logging({ log })
    mw.onRequest!('https://api.example.com/users?api_key=secret123&page=1', { method: 'GET' })
    const output = log.mock.calls[0][0]
    expect(output).toContain('api_key=***')
    expect(output).not.toContain('secret123')
    expect(output).toContain('page=1')
  })

  it('masks custom sensitive headers', () => {
    const log = vi.fn()
    const mw = logging({ log, sensitiveHeaders: ['X-Custom-Secret'] })
    mw.onRequest!('https://api.example.com/users', {
      method: 'GET',
      headers: { 'X-Custom-Secret': 'mysecret', 'Accept': 'application/json' },
    })
    const output = log.mock.calls[0][0]
    expect(output).not.toContain('mysecret')
    expect(output).toContain('application/json')
  })

  it('masks custom sensitive params', () => {
    const log = vi.fn()
    const mw = logging({ log, sensitiveParams: ['session_id'] })
    mw.onRequest!('https://api.example.com/users?session_id=abc123', { method: 'GET' })
    const output = log.mock.calls[0][0]
    expect(output).not.toContain('abc123')
  })

  it('logs response status', () => {
    const log = vi.fn()
    const mw = logging({ log })
    const response = new Response('{}', { status: 200, statusText: 'OK' })
    mw.onResponse!(response)
    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0][0]).toContain('200')
  })

  it('logs errors', () => {
    const log = vi.fn()
    const mw = logging({ log })
    mw.onError!(new Error('Connection refused'))
    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0][0]).toContain('Connection refused')
  })

  it('does not log body by default', () => {
    const log = vi.fn()
    const mw = logging({ log })
    mw.onRequest!('https://api.example.com/users', { method: 'POST', body: '{"secret":"data"}' })
    const output = log.mock.calls[0][0]
    expect(output).not.toContain('secret')
  })

  it('logs body when logBody is true', () => {
    const log = vi.fn()
    const mw = logging({ log, logBody: true })
    mw.onRequest!('https://api.example.com/users', { method: 'POST', body: '{"name":"Alice"}' })
    const output = log.mock.calls[0][0]
    expect(output).toContain('Alice')
  })

  it('supports custom prefix', () => {
    const log = vi.fn()
    const mw = logging({ log, prefix: 'my-app' })
    mw.onRequest!('https://api.example.com/users', { method: 'GET' })
    expect(log.mock.calls[0][0]).toContain('[my-app]')
  })

  it('returns url and init unchanged from onRequest', () => {
    const mw = logging({ log: () => {} })
    const init = { method: 'GET' }
    const result = mw.onRequest!('https://api.example.com/users', init)
    expect(result).toEqual({ url: 'https://api.example.com/users', init })
  })

  it('returns response unchanged from onResponse', () => {
    const mw = logging({ log: () => {} })
    const response = new Response('{}', { status: 200 })
    const result = mw.onResponse!(response)
    expect(result).toBe(response)
  })

  it('has the name logging', () => {
    const mw = logging()
    expect(mw.name).toBe('logging')
  })
})
