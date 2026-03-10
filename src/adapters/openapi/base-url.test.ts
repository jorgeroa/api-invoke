import { describe, it, expect } from 'vitest'
import { extractOpenAPI3BaseUrl, extractSwagger2BaseUrl } from './base-url'
import type { OpenAPIV3, OpenAPIV2 } from 'openapi-types'

describe('extractOpenAPI3BaseUrl', () => {
  it('returns server URL', () => {
    const api = { servers: [{ url: 'https://api.example.com/v1' }] } as OpenAPIV3.Document
    expect(extractOpenAPI3BaseUrl(api)).toBe('https://api.example.com/v1')
  })

  it('returns empty for missing servers', () => {
    const api = {} as OpenAPIV3.Document
    expect(extractOpenAPI3BaseUrl(api)).toBe('')
  })

  it('returns empty for relative URLs', () => {
    const api = { servers: [{ url: '/api/v1' }] } as OpenAPIV3.Document
    expect(extractOpenAPI3BaseUrl(api)).toBe('')
  })

  it('interpolates server variables with defaults', () => {
    const api = {
      servers: [{
        url: 'https://{region}.api.example.com/{version}',
        variables: {
          region: { default: 'us-east-1' },
          version: { default: 'v2' },
        },
      }],
    } as unknown as OpenAPIV3.Document
    expect(extractOpenAPI3BaseUrl(api)).toBe('https://us-east-1.api.example.com/v2')
  })

  it('uses first enum value when no default', () => {
    const api = {
      servers: [{
        url: 'https://{env}.example.com',
        variables: {
          env: { enum: ['staging', 'production'] },
        },
      }],
    } as unknown as OpenAPIV3.Document
    expect(extractOpenAPI3BaseUrl(api)).toBe('https://staging.example.com')
  })
})

describe('extractSwagger2BaseUrl', () => {
  it('constructs URL from host and basePath', () => {
    const api = { host: 'api.example.com', basePath: '/v1', schemes: ['https'] } as OpenAPIV2.Document
    expect(extractSwagger2BaseUrl(api)).toBe('https://api.example.com/v1')
  })

  it('returns empty for missing host', () => {
    const api = {} as OpenAPIV2.Document
    expect(extractSwagger2BaseUrl(api)).toBe('')
  })

  it('defaults scheme to https', () => {
    const api = { host: 'api.example.com' } as OpenAPIV2.Document
    expect(extractSwagger2BaseUrl(api)).toBe('https://api.example.com')
  })
})
