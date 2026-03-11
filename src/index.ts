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
  ResultErrorKind,
  SSEEvent,
  StreamingExecutionResult,
  ClientOptions,
  Middleware,
  Enricher,
} from './core/types'

// Constants
export {
  HttpMethod,
  ParamLocation,
  AuthType,
  ContentType,
  HeaderName,
  SpecFormat,
} from './core/types'

// Errors
export {
  ApiInvokeError,
  API_INVOKE_ERROR_NAME,
  ErrorKind,
  corsError,
  networkError,
  authError,
  httpError,
  parseError,
  timeoutError,
} from './core/errors'

// Execution
export { executeOperation, executeRaw, executeOperationStream, executeRawStream, buildRequest } from './core/executor'
export type { ExecuteOptions, BuildRequestOptions, BuiltRequest } from './core/executor'

// SSE parser (advanced usage)
export { parseSSE } from './core/sse'

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
export { parseRawUrl, parseRawUrls } from './adapters/raw/parser'
export type { RawEndpoint } from './adapters/raw/parser'
export { defineAPI, APIBuilder } from './adapters/manual/builder'
export type { EndpointOptions, ParamDef, BodyDef, PropertyDef } from './adapters/manual/builder'
