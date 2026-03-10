import { describe, it, expect } from 'vitest'
import { mapSecuritySchemes } from './security'

describe('mapSecuritySchemes', () => {
  it('maps bearer auth', () => {
    const schemes = mapSecuritySchemes({
      bearerAuth: { type: 'http', scheme: 'bearer' },
    })
    expect(schemes[0].authType).toBe('bearer')
  })

  it('maps apiKey in header', () => {
    const schemes = mapSecuritySchemes({
      apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
    })
    expect(schemes[0].authType).toBe('apiKey')
    expect(schemes[0].metadata.headerName).toBe('X-API-Key')
  })

  it('maps apiKey in query', () => {
    const schemes = mapSecuritySchemes({
      apiKey: { type: 'apiKey', in: 'query', name: 'api_key' },
    })
    expect(schemes[0].authType).toBe('queryParam')
    expect(schemes[0].metadata.paramName).toBe('api_key')
  })

  it('extracts OAuth2 metadata from OpenAPI 3.x', () => {
    const schemes = mapSecuritySchemes({
      oauth2: {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl: 'https://auth.example.com/authorize',
            tokenUrl: 'https://auth.example.com/token',
            refreshUrl: 'https://auth.example.com/refresh',
            scopes: { 'read:users': 'Read users', 'write:users': 'Write users' },
          },
        },
      } as never,
    })
    expect(schemes[0].authType).toBe('oauth2')
    expect(schemes[0].metadata.authorizationUrl).toBe('https://auth.example.com/authorize')
    expect(schemes[0].metadata.tokenUrl).toBe('https://auth.example.com/token')
    expect(schemes[0].metadata.refreshUrl).toBe('https://auth.example.com/refresh')
    expect(schemes[0].metadata.scopes).toBe('read:users,write:users')
  })

  it('extracts OAuth2 metadata from client credentials flow', () => {
    const schemes = mapSecuritySchemes({
      oauth2: {
        type: 'oauth2',
        flows: {
          clientCredentials: {
            tokenUrl: 'https://auth.example.com/token',
            scopes: { 'api:access': 'API access' },
          },
        },
      } as never,
    })
    expect(schemes[0].authType).toBe('oauth2')
    expect(schemes[0].metadata.tokenUrl).toBe('https://auth.example.com/token')
    expect(schemes[0].metadata.authorizationUrl).toBeUndefined()
  })

  it('extracts OAuth2 metadata from Swagger 2.0', () => {
    const schemes = mapSecuritySchemes({
      oauth2: {
        type: 'oauth2',
        flow: 'accessCode',
        authorizationUrl: 'https://auth.example.com/authorize',
        tokenUrl: 'https://auth.example.com/token',
        scopes: { read: 'Read access' },
      } as never,
    })
    expect(schemes[0].authType).toBe('oauth2')
    expect(schemes[0].metadata.authorizationUrl).toBe('https://auth.example.com/authorize')
    expect(schemes[0].metadata.tokenUrl).toBe('https://auth.example.com/token')
    expect(schemes[0].metadata.scopes).toBe('read')
  })
})
