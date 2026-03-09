/**
 * Flat auth configuration for CLI consumers.
 * Converts simple config objects (from CLI args, env vars, config files)
 * into api-bridge-rt's discriminated Auth union.
 */

import type { Auth } from './types'
import { AuthType, ParamLocation } from './types'

export const AuthConfigType = {
  BEARER: 'bearer',
  HEADER: 'header',
  API_KEY: 'apikey',
  NONE: 'none',
} as const
export type AuthConfigType = (typeof AuthConfigType)[keyof typeof AuthConfigType]

export interface AuthConfig {
  type: AuthConfigType
  token?: string
  headerName?: string
  headerValue?: string
  paramName?: string
  paramValue?: string
}

/**
 * Convert a flat AuthConfig to api-bridge-rt's Auth discriminated union.
 * Returns undefined if required credentials are missing or type is NONE.
 */
export function toAuth(config: AuthConfig): Auth | undefined {
  switch (config.type) {
    case AuthConfigType.BEARER:
      return config.token ? { type: AuthType.BEARER, token: config.token } : undefined
    case AuthConfigType.HEADER:
      return config.headerName && config.headerValue
        ? { type: AuthType.API_KEY, location: ParamLocation.HEADER, name: config.headerName, value: config.headerValue }
        : undefined
    case AuthConfigType.API_KEY:
      return config.paramName && config.paramValue
        ? { type: AuthType.API_KEY, location: ParamLocation.QUERY, name: config.paramName, value: config.paramValue }
        : undefined
    case AuthConfigType.NONE:
      return undefined
  }
}
