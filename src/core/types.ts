/**
 * Core types for api-invoke.
 * Spec-agnostic — these work with any API format (OpenAPI, raw URL, future adapters).
 * All enums use `as const` objects for autocomplete + extensibility.
 */

import { ErrorKind } from './errors'

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
  COOKIE: 'cookie',
} as const
export type AuthType = (typeof AuthType)[keyof typeof AuthType]

export const SpecFormat = {
  OPENAPI_3: 'openapi-3',
  OPENAPI_2: 'openapi-2',
  RAW_URL: 'raw-url',
  MANUAL: 'manual',
} as const
export type SpecFormat = (typeof SpecFormat)[keyof typeof SpecFormat]

export const HeaderName = {
  ACCEPT: 'Accept',
  AUTHORIZATION: 'Authorization',
  CONTENT_TYPE: 'Content-Type',
  COOKIE: 'Cookie',
} as const
export type HeaderName = (typeof HeaderName)[keyof typeof HeaderName]

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
  /** Primary response content type (e.g. 'application/json', 'application/xml'). Set from spec or builder. */
  responseContentType?: ContentType | string
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

export const ContentType = {
  JSON: 'application/json',
  FORM_URLENCODED: 'application/x-www-form-urlencoded',
  MULTIPART: 'multipart/form-data',
  XML: 'application/xml',
  OCTET_STREAM: 'application/octet-stream',
  TEXT: 'text/plain',
} as const
export type ContentType = (typeof ContentType)[keyof typeof ContentType]

export interface RequestBody {
  required: boolean
  description?: string
  contentType: ContentType | string
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
  | { type: typeof AuthType.BEARER; token: string }
  | { type: typeof AuthType.BASIC; username: string; password: string }
  | { type: typeof AuthType.API_KEY; location: typeof ParamLocation.HEADER | typeof ParamLocation.QUERY; name: string; value: string }
  | { type: typeof AuthType.OAUTH2; accessToken: string }
  | { type: typeof AuthType.COOKIE; name: string; value: string }

// === Execution ===

/** HTTP-response error kinds for ExecutionResult (non-throwing mode). Client-side errors (CORS, NETWORK, TIMEOUT) always throw regardless of throwOnHttpError. */
export type ResultErrorKind = typeof ErrorKind.AUTH | typeof ErrorKind.RATE_LIMIT | typeof ErrorKind.HTTP

export interface ExecutionResult {
  status: number
  data: unknown
  /** Response content type (e.g. 'application/json', 'text/xml'). */
  contentType: string
  headers: Record<string, string>
  request: { method: string; url: string; headers: Record<string, string>; body?: string }
  elapsedMs: number
  /** Set when throwOnHttpError is false and the response is an error. Allows programmatic error classification without throwing. */
  errorKind?: ResultErrorKind
}

// === Enricher ===

export interface Enricher {
  readonly name: string
  enrichAPI(api: ParsedAPI): ParsedAPI | Promise<ParsedAPI>
}

// === Client Options ===

export interface ClientOptions {
  specUrl?: string
  auth?: Auth | Auth[]
  middleware?: Middleware[]
  fetch?: typeof globalThis.fetch
  enricher?: Enricher
  /** Default timeout in milliseconds for all operations. 0 = no timeout (default). */
  timeoutMs?: number
}

// === Middleware ===

export interface Middleware {
  name?: string
  onRequest?(url: string, init: RequestInit): { url: string; init: RequestInit } | Promise<{ url: string; init: RequestInit }>
  onResponse?(response: Response): Response | Promise<Response>
  onError?(error: Error): void
}
