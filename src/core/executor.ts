/**
 * HTTP request execution with error classification.
 * Pluggable: uses global fetch by default, can be overridden.
 */

import type { Auth, ExecutionResult, Middleware, Operation } from './types'
import { buildUrl, extractHeaderParams } from './url-builder'
import { injectAuth } from './auth'
import {
  authError,
  corsError,
  httpError,
  networkError,
  parseError,
} from './errors'

export interface ExecuteOptions {
  auth?: Auth
  middleware?: Middleware[]
  fetch?: typeof globalThis.fetch
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

  // Build URL and headers
  let url = buildUrl(baseUrl, operation, args)
  const method = operation.method.toUpperCase()

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...extractHeaderParams(operation.parameters, args),
  }

  // Add body
  let body: string | undefined
  if (args['body'] && method !== 'GET') {
    body = typeof args['body'] === 'string' ? args['body'] : JSON.stringify(args['body'])
    headers['Content-Type'] = 'application/json'
  }

  // Inject auth
  if (options.auth) {
    const authed = injectAuth(url, headers, options.auth)
    url = authed.url
    Object.assign(headers, authed.headers)
  }

  let init: RequestInit = { method, headers, body }

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
    if (options.middleware) {
      for (const mw of options.middleware) {
        if (mw.onError) mw.onError(error as Error)
      }
    }

    if (error instanceof TypeError) {
      // TypeError: Failed to fetch — CORS or network issue
      // Heuristic: try no-cors to distinguish
      try {
        const probe = await fetchFn(url, { mode: 'no-cors' })
        if (probe.type === 'opaque') throw corsError(url)
      } catch (probeError) {
        if (probeError instanceof Error && probeError.name === 'ApiBridgeError') throw probeError
      }
      throw networkError(url)
    }
    throw networkError(url)
  }

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

  // Check for auth errors
  if (response.status === 401 || response.status === 403) {
    throw authError(url, response.status as 401 | 403)
  }

  // Check for HTTP errors
  if (!response.ok) {
    throw httpError(url, response.status, response.statusText)
  }

  // Parse response
  let data: unknown
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      data = await response.json()
    } catch {
      throw parseError(url)
    }
  } else {
    const text = await response.text()
    // Try JSON parsing for responses without proper content-type
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  return {
    status: response.status,
    data,
    headers: responseHeaders,
    request: { method, url, headers },
    elapsedMs,
  }
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
  })
}
