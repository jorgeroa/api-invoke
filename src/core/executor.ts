/**
 * HTTP request execution with error classification.
 * Pluggable: uses global fetch by default, can be overridden.
 */

import type { Auth, ExecutionResult, Middleware, Operation } from './types'
import { ContentType, HttpMethod } from './types'
import { buildUrl, extractHeaderParams } from './url-builder'
import { injectAuth } from './auth'
import {
  ErrorKind,
  authError,
  corsError,
  httpError,
  networkError,
  parseError,
  timeoutError,
} from './errors'

export interface ExecuteOptions {
  auth?: Auth
  middleware?: Middleware[]
  fetch?: typeof globalThis.fetch
  /** If false, return ExecutionResult for all HTTP statuses instead of throwing. Default: true. */
  throwOnHttpError?: boolean
  /** Timeout in milliseconds. 0 = no timeout (default). */
  timeoutMs?: number
  /** AbortSignal to cancel the request. */
  signal?: AbortSignal
  /** Override the Accept header. Defaults to operation.responseContentType or 'application/json'. */
  accept?: string
}

/**
 * Execute an API call for an operation with arguments.
 * Builds the URL, injects auth, applies middleware, classifies errors.
 */
export async function executeOperation(
  baseUrl: string,
  operation: Operation,
  args: Record<string, unknown>,
  options: ExecuteOptions = {},
): Promise<ExecutionResult> {
  const fetchFn = options.fetch ?? globalThis.fetch

  // Validate required parameters
  const missing = operation.parameters
    .filter(p => p.required && args[p.name] === undefined)
    .map(p => p.name)
  if (missing.length > 0) {
    throw new Error(
      `Missing required parameter${missing.length > 1 ? 's' : ''}: ${missing.join(', ')} for operation "${operation.id}"`
    )
  }

  // Build URL and headers
  let url = buildUrl(baseUrl, operation, args)
  const method = operation.method.toUpperCase()

  const accept = options.accept || operation.responseContentType || 'application/json'
  const headers: Record<string, string> = {
    'Accept': accept,
    ...extractHeaderParams(operation.parameters, args),
  }

  // Assemble body from flat args if no explicit 'body' key and operation has a requestBody
  let bodyData = args['body']
  if (!bodyData && operation.requestBody && method !== HttpMethod.GET) {
    const bodyProps = operation.requestBody.schema.properties
    if (bodyProps) {
      const assembled: Record<string, unknown> = {}
      for (const propName of Object.keys(bodyProps)) {
        if (args[propName] !== undefined) {
          assembled[propName] = args[propName]
        }
      }
      if (Object.keys(assembled).length > 0) {
        bodyData = assembled
      }
    }
  }

  // Serialize body based on content type
  let body: string | undefined
  if (bodyData && method !== HttpMethod.GET) {
    const contentType = operation.requestBody?.contentType ?? ContentType.JSON

    if (contentType === ContentType.FORM_URLENCODED) {
      const params = new URLSearchParams()
      const obj = typeof bodyData === 'object' && bodyData !== null ? bodyData as Record<string, unknown> : {}
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined && value !== null) {
          params.set(key, String(value))
        }
      }
      body = params.toString()
      headers['Content-Type'] = ContentType.FORM_URLENCODED
    } else {
      body = typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData)
      headers['Content-Type'] = ContentType.JSON
    }
  }

  // Inject auth
  if (options.auth) {
    const authed = injectAuth(url, headers, options.auth)
    url = authed.url
    Object.assign(headers, authed.headers)
  }

  // Build abort signal (timeout + caller signal)
  let signal: AbortSignal | undefined = options.signal
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  if (options.timeoutMs && options.timeoutMs > 0) {
    const controller = new AbortController()
    timeoutId = setTimeout(() => controller.abort(), options.timeoutMs)

    if (options.signal) {
      // Combine caller signal with timeout signal
      options.signal.addEventListener('abort', () => controller.abort(), { once: true })
    }
    signal = controller.signal
  }

  let init: RequestInit = { method, headers, body, signal }

  // Apply request middleware
  if (options.middleware) {
    for (const mw of options.middleware) {
      if (mw.onRequest) {
        const result = await mw.onRequest(url, init)
        url = result.url
        init = result.init
      }
    }
  }

  // Execute
  const start = performance.now()
  let response: Response

  try {
    response = await fetchFn(url, init)
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId)

    if (options.middleware) {
      for (const mw of options.middleware) {
        if (mw.onError) mw.onError(error as Error)
      }
    }

    // Abort errors (timeout or caller cancellation)
    if (error instanceof DOMException && error.name === 'AbortError') {
      if (options.timeoutMs && options.timeoutMs > 0) {
        throw timeoutError(url)
      }
      throw error // Caller-initiated abort — re-throw as-is
    }

    if (error instanceof TypeError) {
      // TypeError: Failed to fetch — CORS or network issue
      // Heuristic: try no-cors to distinguish (browser-only)
      try {
        const probe = await fetchFn(url, { mode: 'no-cors' })
        if (probe.type === 'opaque') throw corsError(url)
      } catch (probeError) {
        // Re-throw if the probe identified a CORS error; swallow other probe failures
        // since the probe is a best-effort heuristic (browser-only)
        if (probeError instanceof Error && probeError.name === 'ApiInvokeError') throw probeError
      }
      throw networkError(url)
    }
    throw networkError(url)
  }

  if (timeoutId) clearTimeout(timeoutId)
  const elapsedMs = Math.round(performance.now() - start)

  // Apply response middleware
  if (options.middleware) {
    for (const mw of options.middleware) {
      if (mw.onResponse) {
        response = await mw.onResponse(response)
      }
    }
  }

  // Collect response headers
  const responseHeaders: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value
  })

  // Parse response body based on content type
  // Handles JSON (including +json variants like application/vnd.api+json), binary, and XML
  let data: unknown
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json') || contentType.includes('+json')) {
    const cloned = response.clone()
    try {
      data = await response.json()
    } catch {
      if (options.throwOnHttpError !== false) throw parseError(url)
      try {
        data = await cloned.text()
      } catch {
        data = null
      }
    }
  } else if (isBinaryContentType(contentType)) {
    try {
      data = await response.arrayBuffer()
    } catch {
      throw parseError(url, 'binary')
    }
  } else if (contentType.includes('/xml') || contentType.includes('+xml')) {
    try {
      data = await response.text()
    } catch {
      throw parseError(url, 'XML')
    }
  } else {
    let text: string
    try {
      text = await response.text()
    } catch {
      throw parseError(url, 'text')
    }
    // Try JSON parsing for responses without proper content-type
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  const result: ExecutionResult = {
    status: response.status,
    data,
    contentType,
    headers: responseHeaders,
    request: { method, url, headers },
    elapsedMs,
  }

  // Check for HTTP errors
  if (options.throwOnHttpError !== false) {
    if (response.status === 401 || response.status === 403) {
      throw authError(url, response.status as 401 | 403, data)
    }
    if (!response.ok) {
      throw httpError(url, response.status, response.statusText, data)
    }
  } else if (!response.ok) {
    // Non-throwing mode: classify the error for programmatic handling
    if (response.status === 401 || response.status === 403) {
      result.errorKind = ErrorKind.AUTH
    } else if (response.status === 429) {
      result.errorKind = ErrorKind.RATE_LIMIT
    } else {
      result.errorKind = ErrorKind.HTTP
    }
  }

  return result
}

/**
 * Execute a raw HTTP request (Tier 3: zero spec).
 * Still provides error classification, response parsing, and timing.
 */
export async function executeRaw(
  url: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: string
    auth?: Auth
    middleware?: Middleware[]
    fetch?: typeof globalThis.fetch
    timeoutMs?: number
    signal?: AbortSignal
    accept?: string
  } = {},
): Promise<ExecutionResult> {
  // Create a synthetic operation for the raw request
  const operation: Operation = {
    id: 'raw',
    path: '',
    method: (options.method ?? 'GET') as string,
    parameters: [],
    tags: [],
  }

  return executeOperation(url, operation, { body: options.body }, {
    auth: options.auth,
    middleware: options.middleware,
    fetch: options.fetch,
    timeoutMs: options.timeoutMs,
    signal: options.signal,
    accept: options.accept,
  })
}

const BINARY_CONTENT_PATTERNS = [
  'application/octet-stream',
  'application/pdf',
  'application/zip',
  'audio/',
  'image/',
  'video/',
]

function isBinaryContentType(contentType: string): boolean {
  return BINARY_CONTENT_PATTERNS.some(p => contentType.includes(p))
}
