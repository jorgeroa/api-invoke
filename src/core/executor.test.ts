import { describe, it, expect, vi } from 'vitest'
import { executeOperation, executeRaw } from './executor'
import type { Operation } from './types'
import { ContentType } from './types'

function mockFetch(status = 200, data: unknown = {}, headers: Record<string, string> = {}) {
  const responseHeaders = new Headers({ 'content-type': 'application/json', ...headers })
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(data), { status, statusText: 'OK', headers: responseHeaders })
  )
}

const baseUrl = 'https://api.example.com'

const getOp: Operation = {
  id: 'getUser',
  path: '/users/{id}',
  method: 'GET',
  parameters: [
    { name: 'id', in: 'path', required: true, description: '', schema: { type: 'string' } },
    { name: 'limit', in: 'query', required: false, description: '', schema: { type: 'number' } },
  ],
  tags: [],
}

const postOp: Operation = {
  id: 'createUser',
  path: '/users',
  method: 'POST',
  parameters: [],
  requestBody: {
    required: true,
    contentType: ContentType.JSON,
    schema: {
      type: 'object',
      raw: {},
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
      },
      required: ['name'],
    },
  },
  tags: [],
}

const formOp: Operation = {
  id: 'createToken',
  path: '/oauth/token',
  method: 'POST',
  parameters: [],
  requestBody: {
    required: true,
    contentType: ContentType.FORM_URLENCODED,
    schema: {
      type: 'object',
      raw: {},
      properties: {
        grant_type: { type: 'string' },
        client_id: { type: 'string' },
        client_secret: { type: 'string' },
      },
    },
  },
  tags: [],
}

// === Required param validation ===

describe('required param validation', () => {
  it('throws when required path param is missing', async () => {
    const fetch = mockFetch()
    await expect(
      executeOperation(baseUrl, getOp, {}, { fetch })
    ).rejects.toThrow('Missing required parameter: id for operation "getUser"')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('passes when required param is provided', async () => {
    const fetch = mockFetch(200, { id: '42', name: 'Alice' })
    const result = await executeOperation(baseUrl, getOp, { id: '42' }, { fetch })
    expect(result.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('lists multiple missing params', async () => {
    const op: Operation = {
      id: 'test',
      path: '/items/{a}/{b}',
      method: 'GET',
      parameters: [
        { name: 'a', in: 'path', required: true, description: '', schema: { type: 'string' } },
        { name: 'b', in: 'path', required: true, description: '', schema: { type: 'string' } },
      ],
      tags: [],
    }
    await expect(
      executeOperation(baseUrl, op, {}, { fetch: mockFetch() })
    ).rejects.toThrow('Missing required parameters: a, b')
  })
})

// === Body property assembly ===

describe('body property assembly from flat args', () => {
  it('assembles body from flat args when no explicit body key', async () => {
    const fetch = mockFetch()
    await executeOperation(baseUrl, postOp, { name: 'Alice', email: 'alice@example.com' }, { fetch })

    const [, init] = fetch.mock.calls[0]
    expect(JSON.parse(init.body)).toEqual({ name: 'Alice', email: 'alice@example.com' })
    expect(init.headers['Content-Type']).toBe('application/json')
  })

  it('uses explicit body key over flat args', async () => {
    const fetch = mockFetch()
    const explicitBody = { name: 'Bob', extra: true }
    await executeOperation(baseUrl, postOp, { body: explicitBody, name: 'Alice' }, { fetch })

    const [, init] = fetch.mock.calls[0]
    expect(JSON.parse(init.body)).toEqual({ name: 'Bob', extra: true })
  })

  it('ignores flat args not in requestBody schema', async () => {
    const fetch = mockFetch()
    await executeOperation(baseUrl, postOp, { name: 'Alice', unknownField: 'ignored' }, { fetch })

    const [, init] = fetch.mock.calls[0]
    expect(JSON.parse(init.body)).toEqual({ name: 'Alice' })
  })
})

// === Form-urlencoded body ===

describe('form-urlencoded body support', () => {
  it('serializes body as URLSearchParams for form-urlencoded operations', async () => {
    const fetch = mockFetch()
    await executeOperation(baseUrl, formOp, {
      grant_type: 'client_credentials',
      client_id: 'my-id',
      client_secret: 'my-secret',
    }, { fetch })

    const [url, init] = fetch.mock.calls[0]
    expect(url).toContain('/oauth/token')
    expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded')

    const params = new URLSearchParams(init.body)
    expect(params.get('grant_type')).toBe('client_credentials')
    expect(params.get('client_id')).toBe('my-id')
    expect(params.get('client_secret')).toBe('my-secret')
  })

  it('sends JSON for JSON content type operations', async () => {
    const fetch = mockFetch()
    await executeOperation(baseUrl, postOp, { name: 'Alice' }, { fetch })

    const [, init] = fetch.mock.calls[0]
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ name: 'Alice' })
  })
})

// === Timeout ===

describe('timeout enforcement', () => {
  it('throws timeoutError when request exceeds timeout', async () => {
    const fetch = vi.fn().mockImplementation(() =>
      new Promise((_, reject) => {
        setTimeout(() => reject(new DOMException('The operation was aborted.', 'AbortError')), 5)
      })
    )

    await expect(
      executeOperation(baseUrl, { ...getOp, parameters: [] }, {}, { fetch, timeoutMs: 1 })
    ).rejects.toMatchObject({
      name: 'ApiInvokeError',
      kind: 'timeout',
    })
  })

  it('does not timeout when request completes in time', async () => {
    const fetch = mockFetch(200, { ok: true })
    const result = await executeOperation(
      baseUrl, { ...getOp, parameters: [] }, {}, { fetch, timeoutMs: 5000 }
    )
    expect(result.status).toBe(200)
  })
})

// === AbortSignal ===

describe('AbortSignal support', () => {
  it('passes signal to fetch', async () => {
    const controller = new AbortController()
    const fetch = mockFetch()
    await executeOperation(
      baseUrl, { ...getOp, parameters: [] }, {}, { fetch, signal: controller.signal }
    )

    const [, init] = fetch.mock.calls[0]
    expect(init.signal).toBe(controller.signal)
  })
})

// === executeRaw ===

describe('executeRaw', () => {
  it('executes a raw GET request', async () => {
    const fetch = mockFetch(200, { users: [] })
    const result = await executeRaw('https://api.example.com/users', { fetch })
    expect(result.status).toBe(200)
    expect(result.data).toEqual({ users: [] })
  })

  it('passes timeout and signal', async () => {
    const controller = new AbortController()
    const fetch = mockFetch()
    await executeRaw('https://api.example.com/users', {
      fetch,
      timeoutMs: 5000,
      signal: controller.signal,
    })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})

// === ExecutionResult ===

describe('ExecutionResult', () => {
  it('includes request metadata', async () => {
    const fetch = mockFetch(200, { id: 1 })
    const result = await executeOperation(baseUrl, getOp, { id: '42' }, { fetch })

    expect(result.request.method).toBe('GET')
    expect(result.request.url).toContain('/users/42')
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0)
  })

  it('includes response headers', async () => {
    const fetch = mockFetch(200, {}, { 'x-request-id': 'abc-123' })
    const result = await executeOperation(
      baseUrl, { ...getOp, parameters: [] }, {}, { fetch }
    )
    expect(result.headers['x-request-id']).toBe('abc-123')
  })

  it('includes contentType from response', async () => {
    const fetch = mockFetch(200, { ok: true })
    const result = await executeOperation(
      baseUrl, { ...getOp, parameters: [] }, {}, { fetch }
    )
    expect(result.contentType).toBe('application/json')
  })

  it('includes contentType for non-JSON responses', async () => {
    const responseHeaders = new Headers({ 'content-type': 'text/xml' })
    const fetch = vi.fn().mockResolvedValue(
      new Response('<root/>', { status: 200, headers: responseHeaders })
    )
    const result = await executeOperation(
      baseUrl, { ...getOp, parameters: [] }, {}, { fetch }
    )
    expect(result.contentType).toBe('text/xml')
    expect(result.data).toBe('<root/>')
  })
})

// === Accept header ===

describe('Accept header', () => {
  it('defaults to application/json', async () => {
    const fetch = mockFetch()
    await executeOperation(baseUrl, { ...getOp, parameters: [] }, {}, { fetch })
    const [, init] = fetch.mock.calls[0]
    expect(init.headers['Accept']).toBe('application/json')
  })

  it('uses operation responseContentType', async () => {
    const fetch = mockFetch()
    const op: Operation = { ...getOp, parameters: [], responseContentType: 'application/xml' }
    await executeOperation(baseUrl, op, {}, { fetch })
    const [, init] = fetch.mock.calls[0]
    expect(init.headers['Accept']).toBe('application/xml')
  })

  it('uses explicit accept option over operation default', async () => {
    const fetch = mockFetch()
    const op: Operation = { ...getOp, parameters: [], responseContentType: 'application/xml' }
    await executeOperation(baseUrl, op, {}, { fetch, accept: 'text/plain' })
    const [, init] = fetch.mock.calls[0]
    expect(init.headers['Accept']).toBe('text/plain')
  })
})

// === Binary response ===

describe('binary response handling', () => {
  it('returns ArrayBuffer for binary content types', async () => {
    const binaryData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer
    const responseHeaders = new Headers({ 'content-type': 'image/png' })
    const fetch = vi.fn().mockResolvedValue(
      new Response(binaryData, { status: 200, headers: responseHeaders })
    )
    const result = await executeOperation(
      baseUrl, { ...getOp, parameters: [] }, {}, { fetch }
    )
    expect(result.contentType).toBe('image/png')
    expect(result.data).toBeInstanceOf(ArrayBuffer)
  })

  it('returns ArrayBuffer for audio content', async () => {
    const responseHeaders = new Headers({ 'content-type': 'audio/mpeg' })
    const fetch = vi.fn().mockResolvedValue(
      new Response(new ArrayBuffer(8), { status: 200, headers: responseHeaders })
    )
    const result = await executeOperation(
      baseUrl, { ...getOp, parameters: [] }, {}, { fetch }
    )
    expect(result.data).toBeInstanceOf(ArrayBuffer)
  })
})

// === throwOnHttpError ===

describe('throwOnHttpError', () => {
  it('returns error responses as data when false', async () => {
    const fetch = mockFetch(404, { error: 'not found' })
    const result = await executeOperation(
      baseUrl, { ...getOp, parameters: [] }, {}, { fetch, throwOnHttpError: false }
    )
    expect(result.status).toBe(404)
    expect(result.data).toEqual({ error: 'not found' })
  })

  it('throws on 401 by default', async () => {
    const fetch = mockFetch(401, { error: 'unauthorized' })
    await expect(
      executeOperation(baseUrl, { ...getOp, parameters: [] }, {}, { fetch })
    ).rejects.toMatchObject({ kind: 'auth' })
  })
})
