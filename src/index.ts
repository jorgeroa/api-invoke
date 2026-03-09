/**
 * api-bridge-rt — Runtime API Bridge
 *
 * Parse any API spec (or raw URL) at runtime and execute operations safely.
 */

// Main client
export { createClient, ApiBridgeClient } from './client'

// Core types
export type {
  ParsedAPI,
  Operation,
  Parameter,
  ParameterSchema,
  RequestBody,
  RequestBodySchema,
  Auth,
  AuthScheme,
  ExecutionResult,
  ClientOptions,
  Middleware,
  Enricher,
} from './core/types'

// Constants
export {
  HttpMethod,
  ParamLocation,
  AuthType,
  SpecFormat,
} from './core/types'

// Errors
export {
  ApiBridgeError,
  ErrorKind,
  corsError,
  networkError,
  authError,
  httpError,
  parseError,
  timeoutError,
} from './core/errors'

// Execution (Tier 3: zero-spec)
export { executeRaw } from './core/executor'

// URL utilities
export { buildUrl, deriveBaseUrl } from './core/url-builder'

// Auth utilities
export { injectAuth, maskAuth } from './core/auth'

// Middleware
export { withRetry, corsProxy, logging } from './middleware'
export type { RetryOptions, CorsProxyOptions, LoggingOptions } from './middleware'

// Adapters (for advanced usage)
export { parseOpenAPISpec } from './adapters/openapi/parser'
export { parseRawUrl } from './adapters/raw/parser'
