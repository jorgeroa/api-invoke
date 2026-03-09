/**
 * Core types for api-invoke.
 * Spec-agnostic — these work with any API format (OpenAPI, raw URL, future adapters).
 * All enums use `as const` objects for autocomplete + extensibility.
 */

// === Constants ===

export const HttpMethod = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
  HEAD: 'HEAD',
  OPTIONS: 'OPTIONS',
} as const
export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod]

export const ParamLocation = {
  PATH: 'path',
  QUERY: 'query',
  HEADER: 'header',
  COOKIE: 'cookie',
} as const
export type ParamLocation = (typeof ParamLocation)[keyof typeof ParamLocation]

export const AuthType = {
  BEARER: 'bearer',
  BASIC: 'basic',
  API_KEY: 'apiKey',
  QUERY_PARAM: 'queryParam',
  OAUTH2: 'oauth2',
} as const
export type AuthType = (typeof AuthType)[keyof typeof AuthType]

export const SpecFormat = {
  OPENAPI_3: 'openapi-3',
  OPENAPI_2: 'openapi-2',
  RAW_URL: 'raw-url',
} as const
export type SpecFormat = (typeof SpecFormat)[keyof typeof SpecFormat]

// === Parsed API (spec-agnostic) ===

export interface ParsedAPI {
  title: string
  version: string
  baseUrl: string
  operations: Operation[]
  authSchemes: AuthScheme[]
  specFormat: SpecFormat | string
  /** Raw spec version string from the spec (e.g. '3.0.3', '2.0') */
  rawSpecVersion?: string
}

export interface Operation {
  id: string
  path: string
  method: HttpMethod | string
  summary?: string
  description?: string
  parameters: Parameter[]
  requestBody?: RequestBody
  responseSchema?: unknown
  tags: string[]
}

export interface Parameter {
  name: string
  in: ParamLocation
  required: boolean
  description: string
  schema: ParameterSchema
}

export interface ParameterSchema {
  type: string
  format?: string
  enum?: unknown[]
  default?: unknown
  example?: unknown
  minimum?: number
  maximum?: number
  maxLength?: number
}

export interface RequestBody {
  required: boolean
  description?: string
  schema: RequestBodySchema
}

export interface RequestBodySchema {
  type: string
  raw: unknown
  properties?: Record<string, RequestBodyProperty>
  required?: string[]
}

export interface RequestBodyProperty {
  type: string
  format?: string
  description?: string
  enum?: unknown[]
  default?: unknown
  example?: unknown
  nested?: boolean
}

// === Authentication ===

export interface AuthScheme {
  name: string
  authType: AuthType | null
  metadata: Record<string, string>
  description: string
}

export type Auth =
  | { type: 'bearer'; token: string }
  | { type: 'basic'; username: string; password: string }
  | { type: 'apiKey'; location: 'header' | 'query'; name: string; value: string }
  | { type: 'oauth2'; accessToken: string }

// === Execution ===

export interface ExecutionResult {
  status: number
  data: unknown
  headers: Record<string, string>
  request: { method: string; url: string; headers: Record<string, string> }
  elapsedMs: number
}

// === Enricher ===

export interface Enricher {
  readonly name: string
  enrichAPI(api: ParsedAPI): ParsedAPI | Promise<ParsedAPI>
}

// === Client Options ===

export interface ClientOptions {
  specUrl?: string
  auth?: Auth
  middleware?: Middleware[]
  fetch?: typeof globalThis.fetch
  enricher?: Enricher
}

// === Middleware ===

export interface Middleware {
  name?: string
  onRequest?(url: string, init: RequestInit): { url: string; init: RequestInit } | Promise<{ url: string; init: RequestInit }>
  onResponse?(response: Response): Response | Promise<Response>
  onError?(error: Error): void
}
