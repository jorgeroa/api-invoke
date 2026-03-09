/**
 * api-invoke — Parse any API spec and execute operations.
 */

// Main client
export { createClient, ApiInvokeClient } from './client'

// Core types
export type {
  ParsedAPI,
  Operation,
  Parameter,
  ParameterSchema,
  RequestBody,
  RequestBodySchema,
  RequestBodyProperty,
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
  ApiInvokeError,
  ErrorKind,
  corsError,
  networkError,
  authError,
  httpError,
  parseError,
  timeoutError,
} from './core/errors'

// Execution
export { executeOperation, executeRaw } from './core/executor'
export type { ExecuteOptions } from './core/executor'

// URL utilities
export { buildUrl, deriveBaseUrl } from './core/url-builder'

// Auth utilities
export { injectAuth, maskAuth } from './core/auth'
export { toAuth, AuthConfigType } from './core/auth-config'
export type { AuthConfig } from './core/auth-config'

// Middleware
export { withRetry, corsProxy, logging } from './middleware'
export type { RetryOptions, CorsProxyOptions, LoggingOptions } from './middleware'

// Adapters (for advanced usage)
export { parseOpenAPISpec } from './adapters/openapi/parser'
export { parseRawUrl } from './adapters/raw/parser'
