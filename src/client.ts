/**
 * Main client — the public API for api-invoke.
 * Supports three tiers: full spec, raw URL, and zero-spec execution.
 */

import type { ParsedAPI, Operation, Auth, AuthScheme, ExecutionResult, ClientOptions, Middleware } from './core/types'
import { executeOperation } from './core/executor'
import { parseOpenAPISpec } from './adapters/openapi/parser'
import { parseRawUrl } from './adapters/raw/parser'

/**
 * Heuristic: detect if a URL points to an OpenAPI/Swagger spec by URL pattern.
 */
function isSpecUrl(url: string): boolean {
  const lower = url.toLowerCase()
  return (
    lower.endsWith('/openapi.json') ||
    lower.endsWith('/openapi.yaml') ||
    lower.endsWith('/openapi.yml') ||
    lower.endsWith('/swagger.json') ||
    lower.endsWith('/swagger.yaml') ||
    lower.endsWith('/swagger.yml') ||
    lower.endsWith('/spec.json') ||
    lower.endsWith('/spec.yaml') ||
    lower.endsWith('/spec.yml') ||
    lower.endsWith('/api-docs') ||
    lower.endsWith('/api-docs.json') ||
    lower.endsWith('/api-docs.yaml') ||
    lower.endsWith('/v2/api-docs') ||
    lower.endsWith('/v3/api-docs') ||
    lower.includes('swagger') ||
    lower.includes('openapi')
  )
}

/**
 * Heuristic: detect if a parsed JSON object looks like an OpenAPI/Swagger spec by content.
 */
function isSpecContent(obj: Record<string, unknown>): boolean {
  return (
    typeof obj.openapi === 'string' ||
    typeof obj.swagger === 'string'
  )
}

export class ApiInvokeClient {
  readonly api: ParsedAPI
  private auth: Auth | Auth[] | undefined
  private middleware: Middleware[]
  private fetchFn: typeof globalThis.fetch
  private timeoutMs: number

  constructor(api: ParsedAPI, options: ClientOptions = {}) {
    this.api = api
    this.auth = options.auth
    this.middleware = options.middleware ?? []
    this.fetchFn = options.fetch ?? globalThis.fetch
    this.timeoutMs = options.timeoutMs ?? 0
  }

  /** The resolved base URL for this API */
  get baseUrl(): string {
    return this.api.baseUrl
  }

  /** All available operations */
  get operations(): Operation[] {
    return this.api.operations
  }

  /** Detected auth schemes from the spec */
  get authSchemes(): AuthScheme[] {
    return this.api.authSchemes
  }

  /**
   * Set authentication credentials.
   */
  setAuth(auth: Auth | Auth[]): void {
    this.auth = auth
  }

  /**
   * Clear authentication credentials.
   */
  clearAuth(): void {
    this.auth = undefined
  }

  /**
   * Find an operation by ID.
   */
  findOperation(operationId: string): Operation | undefined {
    return this.api.operations.find((op) => op.id === operationId)
  }

  /**
   * Execute an operation by ID with arguments.
   */
  async execute(
    operationId: string,
    args: Record<string, unknown> = {},
    options?: { auth?: Auth | Auth[]; accept?: string; throwOnHttpError?: boolean; redirect?: RequestInit['redirect'] },
  ): Promise<ExecutionResult> {
    const operation = this.findOperation(operationId)
    if (!operation) {
      throw new Error(`Operation "${operationId}" not found. Available: ${this.api.operations.map((o) => o.id).join(', ')}`)
    }

    return executeOperation(this.api.baseUrl, operation, args, {
      auth: options?.auth ?? this.auth,
      middleware: this.middleware,
      fetch: this.fetchFn,
      timeoutMs: this.timeoutMs,
      accept: options?.accept,
      throwOnHttpError: options?.throwOnHttpError,
      redirect: options?.redirect,
    })
  }

}

/**
 * Create a client from an OpenAPI spec URL, spec object, or raw API URL.
 *
 * - OpenAPI spec URL → parsed spec with all operations
 * - Raw URL → single "query" operation with detected params
 * - Spec object → parsed directly
 */
export async function createClient(
  input: string | object,
  options: ClientOptions = {},
): Promise<ApiInvokeClient> {
  let api: ParsedAPI

  if (typeof input === 'string') {
    if (isSpecUrl(input)) {
      api = await fetchAndParseSpec(input, options)
    } else {
      // URL doesn't match spec patterns — try content-based detection
      api = await tryContentDetection(input, options)
    }
  } else {
    // Spec object passed directly
    api = await parseOpenAPISpec(input, { specUrl: options.specUrl })
  }

  return finalize(api, options)
}

async function fetchAndParseSpec(url: string, options: ClientOptions): Promise<ParsedAPI> {
  const fetchFn = options.fetch ?? globalThis.fetch
  const response = await fetchFn(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch spec: ${response.status} ${response.statusText}`)
  }
  const text = await response.text()
  let specObject: object
  try {
    specObject = JSON.parse(text)
  } catch {
    // YAML or other format — let SwaggerParser resolve the URL directly
    return parseOpenAPISpec(url, { specUrl: url })
  }
  return parseOpenAPISpec(specObject, { specUrl: url })
}

/**
 * Attempt content-based spec detection by fetching the URL and inspecting the response body.
 * Falls back to raw URL mode if the URL is unreachable or the response is not a recognized spec format.
 * If content IS detected as a spec, parse errors propagate (not swallowed).
 */
async function tryContentDetection(url: string, options: ClientOptions): Promise<ParsedAPI> {
  const fetchFn = options.fetch ?? globalThis.fetch

  let response: Response
  try {
    response = await fetchFn(url)
  } catch (error) {
    // Only fall back for network-class errors; re-throw programming errors
    if (error instanceof TypeError || (error instanceof DOMException && error.name === 'AbortError')) {
      return parseRawUrl(url)
    }
    throw error
  }

  if (!response.ok) {
    return parseRawUrl(url)
  }

  let text: string
  try {
    text = await response.text()
  } catch {
    // Body read failed (e.g. network interruption during streaming)
    return parseRawUrl(url)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    // Not JSON (YAML is only detected by URL pattern, not content probe)
    return parseRawUrl(url)
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return parseRawUrl(url)
  }

  const obj = parsed as Record<string, unknown>
  if (isSpecContent(obj)) {
    // Content IS a spec — let parse errors propagate
    return parseOpenAPISpec(obj, { specUrl: url })
  }

  return parseRawUrl(url)
}

async function finalize(api: ParsedAPI, options: ClientOptions): Promise<ApiInvokeClient> {
  if (options.enricher) {
    api = await Promise.resolve(options.enricher.enrichAPI(api))
  }
  return new ApiInvokeClient(api, options)
}
