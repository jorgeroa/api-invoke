/**
 * Manual API definition builder — define APIs without writing a full OpenAPI spec.
 * Supports multiple endpoints, methods, parameters, and request bodies.
 *
 * Usage:
 *   const api = defineAPI('My API')
 *     .baseUrl('https://api.example.com')
 *     .get('/users', { id: 'listUsers', summary: 'List all users' })
 *     .post('/users', {
 *       id: 'createUser',
 *       body: { contentType: 'application/json', properties: { name: 'string', email: 'string' } },
 *     })
 *     .build()
 */

import type { ParsedAPI, Operation, Parameter, RequestBody, RequestBodyProperty } from '../../core/types'
import { ContentType, SpecFormat } from '../../core/types'

export interface EndpointOptions {
  id?: string
  summary?: string
  description?: string
  params?: Record<string, ParamDef | string>
  body?: BodyDef
  responseContentType?: string
  tags?: string[]
}

export type ParamDef = {
  in?: 'query' | 'path' | 'header'
  required?: boolean
  type?: string
  description?: string
  default?: unknown
}

export type BodyDef = {
  contentType?: string
  required?: boolean
  properties?: Record<string, string | PropertyDef>
  required_fields?: string[]
}

export type PropertyDef = {
  type: string
  description?: string
  format?: string
  enum?: unknown[]
}

export class APIBuilder {
  private _title: string
  private _version = '1.0.0'
  private _baseUrl = ''
  private _operations: Operation[] = []

  constructor(title: string) {
    this._title = title
  }

  version(v: string): this {
    this._version = v
    return this
  }

  baseUrl(url: string): this {
    this._baseUrl = url
    return this
  }

  get(path: string, options: EndpointOptions = {}): this {
    return this.endpoint('GET', path, options)
  }

  post(path: string, options: EndpointOptions = {}): this {
    return this.endpoint('POST', path, options)
  }

  put(path: string, options: EndpointOptions = {}): this {
    return this.endpoint('PUT', path, options)
  }

  patch(path: string, options: EndpointOptions = {}): this {
    return this.endpoint('PATCH', path, options)
  }

  delete(path: string, options: EndpointOptions = {}): this {
    return this.endpoint('DELETE', path, options)
  }

  endpoint(method: string, path: string, options: EndpointOptions = {}): this {
    const id = options.id ?? `${method.toLowerCase()}_${path.replace(/[{}\/]/g, '_').replace(/^_|_$/g, '').replace(/_+/g, '_')}`

    // Auto-detect path params from {param} placeholders
    const pathParamNames = [...path.matchAll(/\{(\w+)\}/g)].map(m => m[1])

    const parameters: Parameter[] = []

    // Add path params from path template
    for (const name of pathParamNames) {
      const explicit = options.params?.[name]
      const def = typeof explicit === 'string'
        ? { type: explicit }
        : explicit ?? {}
      parameters.push({
        name,
        in: 'path',
        required: true,
        description: def.description ?? '',
        schema: { type: def.type ?? 'string', default: def.default },
      })
    }

    // Add remaining params (query/header)
    if (options.params) {
      for (const [name, raw] of Object.entries(options.params)) {
        if (pathParamNames.includes(name)) continue // already added
        const def = typeof raw === 'string' ? { type: raw } : raw
        parameters.push({
          name,
          in: def.in ?? 'query',
          required: def.required ?? false,
          description: def.description ?? '',
          schema: { type: def.type ?? 'string', default: def.default },
        })
      }
    }

    // Build request body
    let requestBody: RequestBody | undefined
    if (options.body) {
      const properties: Record<string, RequestBodyProperty> = {}
      if (options.body.properties) {
        for (const [name, raw] of Object.entries(options.body.properties)) {
          if (typeof raw === 'string') {
            properties[name] = { type: raw }
          } else {
            properties[name] = {
              type: raw.type,
              description: raw.description,
              format: raw.format,
              enum: raw.enum,
            }
          }
        }
      }
      requestBody = {
        required: options.body.required ?? true,
        contentType: options.body.contentType ?? ContentType.JSON,
        schema: {
          type: 'object',
          raw: {},
          properties,
          required: options.body.required_fields,
        },
      }
    }

    this._operations.push({
      id,
      path,
      method: method.toUpperCase(),
      summary: options.summary,
      description: options.description,
      parameters,
      requestBody,
      responseContentType: options.responseContentType,
      tags: options.tags ?? [],
    })

    return this
  }

  build(): ParsedAPI {
    return {
      title: this._title,
      version: this._version,
      baseUrl: this._baseUrl,
      operations: this._operations,
      authSchemes: [],
      specFormat: SpecFormat.RAW_URL,
    }
  }
}

export function defineAPI(title: string): APIBuilder {
  return new APIBuilder(title)
}
