/**
 * Maps OpenAPI/Swagger security schemes to api-bridge-rt auth types.
 */

import type { OpenAPIV3, OpenAPIV2 } from 'openapi-types'
import type { AuthScheme } from '../../core/types'
import { AuthType, ParamLocation } from '../../core/types'

/**
 * Map OpenAPI/Swagger security schemes to AuthScheme array.
 */
export function mapSecuritySchemes(
  schemes: Record<string, OpenAPIV3.SecuritySchemeObject | OpenAPIV2.SecuritySchemeObject>,
): AuthScheme[] {
  const results: AuthScheme[] = []
  for (const [name, scheme] of Object.entries(schemes)) {
    results.push(mapSingleScheme(name, scheme))
  }
  return results
}

function mapSingleScheme(
  name: string,
  scheme: OpenAPIV3.SecuritySchemeObject | OpenAPIV2.SecuritySchemeObject,
): AuthScheme {
  const baseDescription = scheme.description || name

  // apiKey type (both OpenAPI 3.x and Swagger 2.0)
  if (scheme.type === 'apiKey') {
    const apiKeyScheme = scheme as OpenAPIV3.ApiKeySecurityScheme | OpenAPIV2.SecuritySchemeApiKey
    if (apiKeyScheme.in === ParamLocation.HEADER) {
      return { name, authType: AuthType.API_KEY, metadata: { headerName: apiKeyScheme.name }, description: baseDescription }
    }
    if (apiKeyScheme.in === ParamLocation.QUERY) {
      return { name, authType: AuthType.QUERY_PARAM, metadata: { paramName: apiKeyScheme.name }, description: baseDescription }
    }
    if (apiKeyScheme.in === ParamLocation.COOKIE) {
      return { name, authType: null, metadata: {}, description: `${baseDescription} (unsupported: cookie-based auth)` }
    }
  }

  // http type (OpenAPI 3.x only)
  if (scheme.type === 'http') {
    const httpScheme = scheme as OpenAPIV3.HttpSecurityScheme
    if (httpScheme.scheme === AuthType.BEARER) {
      return { name, authType: AuthType.BEARER, metadata: {}, description: baseDescription }
    }
    if (httpScheme.scheme === AuthType.BASIC) {
      return { name, authType: AuthType.BASIC, metadata: {}, description: baseDescription }
    }
  }

  // basic type (Swagger 2.0 only)
  if (scheme.type === 'basic') {
    return { name, authType: AuthType.BASIC, metadata: {}, description: baseDescription }
  }

  // oauth2
  if (scheme.type === 'oauth2') {
    return { name, authType: null, metadata: {}, description: `${baseDescription} (unsupported: OAuth 2.0 requires browser-based authorization)` }
  }

  // openIdConnect
  if (scheme.type === 'openIdConnect') {
    return { name, authType: null, metadata: {}, description: `${baseDescription} (unsupported: OpenID Connect)` }
  }

  return { name, authType: null, metadata: {}, description: `${baseDescription} (unsupported: unknown scheme type)` }
}
