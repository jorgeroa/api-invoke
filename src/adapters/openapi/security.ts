/**
 * Maps OpenAPI/Swagger security schemes to api-bridge-rt auth types.
 */

import type { OpenAPIV3, OpenAPIV2 } from 'openapi-types'
import type { AuthScheme } from '../../core/types'

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
    if (apiKeyScheme.in === 'header') {
      return { name, authType: 'apiKey', metadata: { headerName: apiKeyScheme.name }, description: baseDescription }
    }
    if (apiKeyScheme.in === 'query') {
      return { name, authType: 'queryParam', metadata: { paramName: apiKeyScheme.name }, description: baseDescription }
    }
    if (apiKeyScheme.in === 'cookie') {
      return { name, authType: null, metadata: {}, description: `${baseDescription} (unsupported: cookie-based auth)` }
    }
  }

  // http type (OpenAPI 3.x only)
  if (scheme.type === 'http') {
    const httpScheme = scheme as OpenAPIV3.HttpSecurityScheme
    if (httpScheme.scheme === 'bearer') {
      return { name, authType: 'bearer', metadata: {}, description: baseDescription }
    }
    if (httpScheme.scheme === 'basic') {
      return { name, authType: 'basic', metadata: {}, description: baseDescription }
    }
  }

  // basic type (Swagger 2.0 only)
  if (scheme.type === 'basic') {
    return { name, authType: 'basic', metadata: {}, description: baseDescription }
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
