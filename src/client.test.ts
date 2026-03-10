import { describe, it, expect, vi } from 'vitest'
import { createClient } from './client'

function mockFetchResponse(body: string, options: { ok?: boolean; status?: number; contentType?: string } = {}) {
  const { ok = true, status = 200, contentType = 'application/json' } = options
  return vi.fn().mockResolvedValue(
    new Response(body, {
      status,
      statusText: ok ? 'OK' : 'Error',
      headers: { 'content-type': contentType },
    })
  )
}

describe('tryContentDetection', () => {
  it('detects OpenAPI 3 spec by content', async () => {
    const spec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0' },
      paths: {
        '/users': {
          get: { operationId: 'listUsers', responses: { '200': { description: 'OK' } } },
        },
      },
    })
    const fetch = mockFetchResponse(spec)
    const client = await createClient('https://api.example.com/v1', { fetch })
    expect(client.operations.length).toBeGreaterThan(0)
    expect(client.operations.some(op => op.id === 'listUsers')).toBe(true)
  })

  it('detects Swagger 2 spec by content', async () => {
    const spec = JSON.stringify({
      swagger: '2.0',
      info: { title: 'Test', version: '1.0' },
      basePath: '/api',
      paths: {
        '/items': {
          get: { operationId: 'listItems', responses: { '200': { description: 'OK' } } },
        },
      },
    })
    const fetch = mockFetchResponse(spec)
    const client = await createClient('https://api.example.com/v1', { fetch })
    expect(client.operations.some(op => op.id === 'listItems')).toBe(true)
  })

  it('falls back to raw URL for non-spec JSON', async () => {
    const fetch = mockFetchResponse(JSON.stringify({ data: [1, 2, 3] }))
    const client = await createClient('https://api.example.com/v1/users', { fetch })
    // Raw URL mode produces a single generic operation
    expect(client.operations.length).toBe(1)
  })

  it('falls back to raw URL for non-JSON response', async () => {
    const fetch = mockFetchResponse('<html>Not JSON</html>', { contentType: 'text/html' })
    const client = await createClient('https://api.example.com/v1/users', { fetch })
    expect(client.operations.length).toBe(1)
  })

  it('falls back to raw URL on network failure', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const client = await createClient('https://api.example.com/v1/users', { fetch })
    expect(client.operations.length).toBe(1)
  })

  it('falls back to raw URL on non-OK response', async () => {
    const fetch = mockFetchResponse('Forbidden', { ok: false, status: 403 })
    const client = await createClient('https://api.example.com/v1/users', { fetch })
    expect(client.operations.length).toBe(1)
  })

  it('propagates spec parse errors when content is detected as a spec', async () => {
    // Content looks like a spec (has openapi key) but is malformed
    const fetch = mockFetchResponse(JSON.stringify({ openapi: '3.0.0' }))
    await expect(
      createClient('https://api.example.com/v1', { fetch })
    ).rejects.toThrow()
  })

  it('re-throws non-network errors from custom fetch', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('Custom fetch config error'))
    await expect(
      createClient('https://api.example.com/v1/users', { fetch })
    ).rejects.toThrow('Custom fetch config error')
  })

  it('falls back on AbortError', async () => {
    const fetch = vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError'))
    const client = await createClient('https://api.example.com/v1/users', { fetch })
    expect(client.operations.length).toBe(1)
  })
})
