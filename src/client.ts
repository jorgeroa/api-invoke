/**
 * Main client — the public API for api-invoke.
 * Supports three tiers: full spec, raw URL, and zero-spec execution.
 */

import type { ParsedAPI, Operation, Auth, AuthScheme, ExecutionResult, ClientOptions, Middleware } from './core/types'
import { executeOperation } from './core/executor'
import { parseOpenAPISpec } from './adapters/openapi/parser'
import { parseRawUrl } from './adapters/raw/parser'

/**
 * Heuristic: detect if a URL points to an OpenAPI/Swagger spec.
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

export class ApiInvokeClient {
  readonly api: ParsedAPI
  private auth: Auth | undefined
  private middleware: Middleware[]
  private fetchFn: typeof globalThis.fetch

  constructor(api: ParsedAPI, options: ClientOptions = {}) {
    this.api = api
    this.auth = options.auth
    this.middleware = options.middleware ?? []
    this.fetchFn = options.fetch ?? globalThis.fetch
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
  setAuth(auth: Auth): void {
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
  ): Promise<ExecutionResult> {
    const operation = this.findOperation(operationId)
    if (!operation) {
      throw new Error(`Operation "${operationId}" not found. Available: ${this.api.operations.map((o) => o.id).join(', ')}`)
    }

    return executeOperation(this.api.baseUrl, operation, args, {
      auth: this.auth,
      middleware: this.middleware,
      fetch: this.fetchFn,
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
      // Fetch and parse OpenAPI spec
      const fetchFn = options.fetch ?? globalThis.fetch
      const response = await fetchFn(input)
      if (!response.ok) {
        throw new Error(`Failed to fetch spec: ${response.status} ${response.statusText}`)
      }
      const text = await response.text()
      let specObject: object
      try {
        specObject = JSON.parse(text)
      } catch {
        // YAML or other format — let SwaggerParser resolve the URL directly
        api = await parseOpenAPISpec(input, { specUrl: input })
        return finalize(api, options)
      }
      api = await parseOpenAPISpec(specObject, { specUrl: input })
    } else {
      // Raw URL mode
      api = parseRawUrl(input)
    }
  } else {
    // Spec object passed directly
    api = await parseOpenAPISpec(input, { specUrl: options.specUrl })
  }

  return finalize(api, options)
}

async function finalize(api: ParsedAPI, options: ClientOptions): Promise<ApiInvokeClient> {
  if (options.enricher) {
    api = await Promise.resolve(options.enricher.enrichAPI(api))
  }
  return new ApiInvokeClient(api, options)
}
