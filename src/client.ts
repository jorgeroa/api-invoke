/**
 * Main client — the public API for api-invoke.
 * Supports three tiers: full spec, raw URL, and zero-spec execution.
 */

import type { ParsedAPI, Operation, Auth, AuthScheme, ExecutionResult, StreamingExecutionResult, SSEEvent, ClientOptions, Middleware } from './core/types'
import { executeOperation, executeOperationStream } from './core/executor'
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

/**
 * High-level API client. Wraps a {@link ParsedAPI} and provides methods to execute operations by ID.
 * Created via {@link createClient} (recommended) or by constructing directly with a `ParsedAPI`.
 *
 * @example
 * ```ts
 * const client = await createClient('https://petstore.swagger.io/v2/swagger.json')
 * const result = await client.execute('getInventory')
 * console.log(result.data)
 * ```
 */
export class ApiInvokeClient {
  /** The parsed API specification backing this client. */
  readonly api: ParsedAPI
  private auth: Auth | Auth[] | undefined
  private middleware: Middleware[]
  private fetchFn: typeof globalThis.fetch
  private timeoutMs: number

  /**
   * @param api - Parsed API specification (from any adapter)
   * @param options - Client configuration (auth, middleware, fetch, timeout)
   */
  constructor(api: ParsedAPI, options: ClientOptions = {}) {
    this.api = api
    this.auth = options.auth
    this.middleware = options.middleware ?? []
    this.fetchFn = options.fetch ?? globalThis.fetch
    this.timeoutMs = options.timeoutMs ?? 0
  }

  /** The resolved base URL for this API. */
  get baseUrl(): string {
    return this.api.baseUrl
  }

  /** All available operations from the parsed spec. */
  get operations(): Operation[] {
    return this.api.operations
  }

  /** Authentication schemes declared in the spec. Useful for building auth UIs. */
  get authSchemes(): AuthScheme[] {
    return this.api.authSchemes
  }

  /**
   * Set authentication credentials for all subsequent requests.
   * @param auth - Single credential or array for composing multiple schemes
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
   * Find an operation by its ID.
   * @param operationId - The operation ID to search for (e.g. 'listUsers', 'get_users_userId')
   * @returns The operation, or undefined if not found
   */
  findOperation(operationId: string): Operation | undefined {
    return this.api.operations.find((op) => op.id === operationId)
  }

  /**
   * Execute an operation by ID with arguments.
   *
   * @param operationId - The operation ID from the parsed spec
   * @param args - Key-value pairs for path, query, header, and body parameters
   * @param options - Per-call overrides for auth, accept header, error behavior, and redirect mode
   * @returns The execution result with status, parsed data, and response metadata
   * @throws {ApiInvokeError} For network, CORS, timeout, and (by default) HTTP errors
   * @throws {Error} If the operation ID is not found
   *
   * @example
   * ```ts
   * const result = await client.execute('getUser', { userId: 123 })
   * console.log(result.status, result.data)
   * ```
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

  /**
   * Execute an operation as a stream, returning an async iterable of SSE events.
   * Errors always throw (no non-throwing mode for streams).
   *
   * @param operationId - The operation ID from the parsed spec
   * @param args - Key-value pairs for path, query, header, and body parameters
   * @param options - Per-call overrides for auth, accept header, abort signal, and event callback. The client-level `timeoutMs` applies to the initial connection.
   * @returns Streaming result with an async iterable `stream` property
   * @throws {ApiInvokeError} For network, CORS, timeout, and HTTP errors
   * @throws {Error} If the operation ID is not found
   *
   * @example
   * ```ts
   * const result = await client.executeStream('chatCompletion', {
   *   model: 'gpt-4', messages: [{ role: 'user', content: 'Hi' }], stream: true,
   * })
   * for await (const event of result.stream) {
   *   console.log(event.data)
   * }
   * ```
   */
  async executeStream(
    operationId: string,
    args: Record<string, unknown> = {},
    options?: { auth?: Auth | Auth[]; accept?: string; signal?: AbortSignal; onEvent?: (event: SSEEvent) => void },
  ): Promise<StreamingExecutionResult> {
    const operation = this.findOperation(operationId)
    if (!operation) {
      throw new Error(`Operation "${operationId}" not found. Available: ${this.api.operations.map((o) => o.id).join(', ')}`)
    }

    return executeOperationStream(this.api.baseUrl, operation, args, {
      auth: options?.auth ?? this.auth,
      middleware: this.middleware,
      fetch: this.fetchFn,
      timeoutMs: this.timeoutMs,
      accept: options?.accept,
      signal: options?.signal,
      onEvent: options?.onEvent,
    })
  }

}

/**
 * Create a client from an OpenAPI spec URL, spec object, or raw API URL.
 *
 * Auto-detection logic:
 * - OpenAPI spec URL (e.g. ends with `/openapi.json`) → parsed spec with all operations
 * - Raw URL → attempts content-based spec detection, falls back to single-operation raw mode
 * - Spec object (parsed JSON/YAML) → parsed directly
 *
 * @param input - OpenAPI spec URL, raw API URL, or pre-parsed spec object
 * @param options - Client configuration (auth, middleware, fetch, enricher, timeout)
 * @returns A configured {@link ApiInvokeClient} ready to execute operations
 * @throws {Error} If the spec cannot be fetched or parsed
 *
 * @example
 * ```ts
 * // From OpenAPI spec URL
 * const client = await createClient('https://petstore.swagger.io/v2/swagger.json')
 *
 * // From raw API URL
 * const client = await createClient('https://api.example.com/users?page=1')
 *
 * // From spec object
 * const client = await createClient(specJson, { auth: { type: 'bearer', token: 'sk-...' } })
 * ```
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
