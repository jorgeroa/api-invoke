/**
 * Classified API errors with human/agent-readable suggestions.
 * Each error has a `kind` for programmatic handling and `retryable` for retry logic.
 */

export const ErrorKind = {
  CORS: 'cors',
  NETWORK: 'network',
  AUTH: 'auth',
  HTTP: 'http',
  PARSE: 'parse',
  RATE_LIMIT: 'rate-limit',
  TIMEOUT: 'timeout',
} as const
export type ErrorKind = (typeof ErrorKind)[keyof typeof ErrorKind]

export class ApiInvokeError extends Error {
  readonly kind: ErrorKind | string
  readonly status?: number
  readonly suggestion: string
  readonly retryable: boolean
  /** Response body from the API (when available). Contains structured error details. */
  readonly responseBody?: unknown

  constructor(opts: {
    kind: ErrorKind | string
    message: string
    suggestion: string
    retryable?: boolean
    status?: number
    responseBody?: unknown
  }) {
    super(opts.message)
    this.name = 'ApiInvokeError'
    this.kind = opts.kind
    this.suggestion = opts.suggestion
    this.retryable = opts.retryable ?? false
    this.status = opts.status
    this.responseBody = opts.responseBody
  }
}

export function corsError(url: string): ApiInvokeError {
  return new ApiInvokeError({
    kind: ErrorKind.CORS,
    message: `Cannot access ${url} — blocked by CORS policy.`,
    suggestion: 'This API does not allow browser requests. Use a CORS proxy or server-side execution.',
    retryable: false,
  })
}

export function networkError(url: string): ApiInvokeError {
  return new ApiInvokeError({
    kind: ErrorKind.NETWORK,
    message: `Network error while fetching ${url}.`,
    suggestion: 'Check your internet connection and verify the URL is correct.',
    retryable: true,
  })
}

export function authError(url: string, status: 401 | 403, responseBody?: unknown): ApiInvokeError {
  return new ApiInvokeError({
    kind: ErrorKind.AUTH,
    message: status === 401
      ? `Authentication failed for ${url} (401)`
      : `Authorization denied for ${url} (403)`,
    suggestion: status === 401
      ? 'Check your credentials. The server rejected your authentication.'
      : 'Your credentials are valid but you lack permission for this resource.',
    retryable: false,
    status,
    responseBody,
  })
}

export function httpError(url: string, status: number, statusText: string, responseBody?: unknown): ApiInvokeError {
  const retryable = status === 429 || status >= 500
  const kind = status === 429 ? ErrorKind.RATE_LIMIT : ErrorKind.HTTP

  let suggestion: string
  if (status === 404) {
    suggestion = 'The endpoint was not found. Check the URL path.'
  } else if (status === 429) {
    suggestion = 'Rate limited. Wait and retry.'
  } else if (status >= 500) {
    suggestion = 'The API server is having issues. Try again later.'
  } else {
    suggestion = `The API returned an error (${status}). Verify the request.`
  }

  return new ApiInvokeError({
    kind,
    message: `API returned ${status} ${statusText} for ${url}.`,
    suggestion,
    retryable,
    status,
    responseBody,
  })
}

export function parseError(url: string, expectedType = 'JSON'): ApiInvokeError {
  return new ApiInvokeError({
    kind: ErrorKind.PARSE,
    message: `Failed to parse response from ${url} as ${expectedType}.`,
    suggestion: `The API response body could not be read as ${expectedType}. Verify the endpoint returns the expected content type.`,
    retryable: false,
  })
}

export function timeoutError(url: string): ApiInvokeError {
  return new ApiInvokeError({
    kind: ErrorKind.TIMEOUT,
    message: `Request to ${url} timed out.`,
    suggestion: 'The server took too long to respond. Try again or increase the timeout.',
    retryable: true,
  })
}
