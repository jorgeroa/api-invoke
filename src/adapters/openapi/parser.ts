/**
 * Parse OpenAPI 2.0/3.x specs into the spec-agnostic ParsedAPI format.
 * Extracted and consolidated from api2aux/semantic-analysis.
 */

import SwaggerParser from '@apidevtools/swagger-parser'
import type { OpenAPIV3, OpenAPIV2 } from 'openapi-types'
import type {
  ParsedAPI,
  Operation,
  Parameter,
  ParameterSchema,
  RequestBody,
  RequestBodySchema,
  RequestBodyProperty,
  ParamLocation,
} from '../../core/types'
import { SpecFormat } from '../../core/types'
import { extractOpenAPI3BaseUrl, extractSwagger2BaseUrl } from './base-url'
import { mapSecuritySchemes } from './security'
import { deriveBaseUrl } from '../../core/url-builder'

const SUPPORTED_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const

/**
 * Parse an OpenAPI/Swagger spec into a ParsedAPI.
 *
 * @param specUrlOrObject - URL string or parsed spec object
 * @param options.specUrl - Original spec URL (used for base URL fallback when spec has no servers)
 */
export async function parseOpenAPISpec(
  specUrlOrObject: string | object,
  options?: { specUrl?: string },
): Promise<ParsedAPI> {
  try {
    const apiRaw = await SwaggerParser.dereference(specUrlOrObject as string)
    const api = apiRaw as unknown as OpenAPIV3.Document | OpenAPIV2.Document

    const isOpenAPI3 = 'openapi' in api
    const specVersion = isOpenAPI3
      ? (api as OpenAPIV3.Document).openapi
      : (api as OpenAPIV2.Document).swagger

    const title = api.info.title
    const version = api.info.version

    let baseUrl = isOpenAPI3
      ? extractOpenAPI3BaseUrl(api as OpenAPIV3.Document)
      : extractSwagger2BaseUrl(api as OpenAPIV2.Document)

    // Fallback: derive base URL from spec URL when spec doesn't provide one
    const sourceUrl = options?.specUrl ?? (typeof specUrlOrObject === 'string' ? specUrlOrObject : undefined)
    if (!baseUrl && sourceUrl) {
      baseUrl = deriveBaseUrl(sourceUrl)
    }

    const operations = extractOperations(api, isOpenAPI3)
    const authSchemes = extractSecuritySchemes(api, isOpenAPI3)

    return {
      title,
      version,
      baseUrl,
      operations,
      authSchemes,
      specFormat: isOpenAPI3 ? SpecFormat.OPENAPI_3 : SpecFormat.OPENAPI_2,
      rawSpecVersion: specVersion,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const urlInfo = typeof specUrlOrObject === 'string' ? ` from ${specUrlOrObject}` : ''
    throw new Error(`Failed to parse OpenAPI spec${urlInfo}: ${message}`)
  }
}

function extractOperations(
  api: OpenAPIV3.Document | OpenAPIV2.Document,
  isOpenAPI3: boolean,
): Operation[] {
  const operations: Operation[] = []
  if (!api.paths) return operations

  for (const [path, pathItem] of Object.entries(api.paths)) {
    if (!pathItem) continue
    const pathLevelParams = 'parameters' in pathItem ? pathItem.parameters ?? [] : []

    for (const method of SUPPORTED_METHODS) {
      if (!(method in pathItem) || !(pathItem as Record<string, unknown>)[method]) continue

      const op = (pathItem as Record<string, unknown>)[method] as OpenAPIV3.OperationObject | OpenAPIV2.OperationObject
      const operationParams = op.parameters ?? []
      const allParams = [...pathLevelParams, ...operationParams].filter(
        (p) => (p as { in: string }).in !== 'body', // Swagger 2.0 body params are handled via requestBody
      )

      const parameters = allParams.map((param) =>
        parseParameter(param as OpenAPIV3.ParameterObject | OpenAPIV2.Parameter, isOpenAPI3),
      )

      const requestBody = extractRequestBody(op, isOpenAPI3)
      const responseSchema = extractResponseSchema(op, isOpenAPI3)

      // Generate a stable ID from operationId or method+path
      const id = op.operationId
        ?? `${method}_${path.replace(/[{}\/]/g, '_').replace(/^_|_$/g, '').replace(/_+/g, '_')}`

      operations.push({
        id,
        path,
        method: method.toUpperCase(),
        summary: op.summary,
        description: op.description,
        parameters,
        requestBody,
        responseSchema,
        tags: op.tags ?? [],
      })
    }
  }

  return operations
}

function parseParameter(
  param: OpenAPIV3.ParameterObject | OpenAPIV2.Parameter,
  isOpenAPI3: boolean,
): Parameter {
  const name = param.name
  const location = param.in as ParamLocation
  const required = param.required ?? location === 'path'
  const description = param.description ?? ''

  let schema: ParameterSchema

  if (isOpenAPI3) {
    const p = param as OpenAPIV3.ParameterObject
    const s = p.schema as OpenAPIV3.SchemaObject | undefined
    schema = {
      type: s?.type?.toString() ?? 'string',
      format: s?.format,
      enum: s?.enum,
      default: s?.default,
      example: p.example ?? s?.example,
      minimum: s?.minimum,
      maximum: s?.maximum,
      maxLength: s?.maxLength,
    }
  } else {
    const p = param as OpenAPIV2.GeneralParameterObject
    schema = {
      type: ('type' in p ? p.type : undefined) ?? 'string',
      format: 'format' in p ? p.format : undefined,
      enum: 'enum' in p ? p.enum : undefined,
      default: 'default' in p ? p.default : undefined,
      example: 'x-example' in p ? (p as Record<string, unknown>)['x-example'] : undefined,
      minimum: 'minimum' in p ? p.minimum : undefined,
      maximum: 'maximum' in p ? p.maximum : undefined,
      maxLength: 'maxLength' in p ? p.maxLength : undefined,
    }
  }

  return { name, in: location, required, description, schema }
}

function extractRequestBody(
  operation: OpenAPIV3.OperationObject | OpenAPIV2.OperationObject,
  isOpenAPI3: boolean,
): RequestBody | undefined {
  if (isOpenAPI3) {
    const op = operation as OpenAPIV3.OperationObject
    if (!op.requestBody) return undefined
    const body = op.requestBody as OpenAPIV3.RequestBodyObject
    const jsonContent = body.content?.['application/json']
    if (!jsonContent?.schema) return undefined
    return {
      required: body.required ?? false,
      description: body.description,
      schema: flattenSchema(jsonContent.schema as OpenAPIV3.SchemaObject),
    }
  } else {
    const op = operation as OpenAPIV2.OperationObject
    const bodyParam = op.parameters?.find(
      (p: unknown) => (p as { in: string }).in === 'body',
    ) as OpenAPIV2.InBodyParameterObject | undefined
    if (!bodyParam?.schema) return undefined
    return {
      required: bodyParam.required ?? false,
      description: bodyParam.description,
      schema: flattenSchema(bodyParam.schema as unknown as OpenAPIV3.SchemaObject),
    }
  }
}

function flattenSchema(schema: OpenAPIV3.SchemaObject): RequestBodySchema {
  const result: RequestBodySchema = {
    type: (schema.type as string) ?? 'object',
    raw: schema,
  }

  if (schema.type === 'object' && schema.properties) {
    result.properties = {}
    result.required = schema.required

    for (const [name, propSchema] of Object.entries(schema.properties)) {
      const prop = propSchema as OpenAPIV3.SchemaObject
      const isNested = prop.type === 'object' || prop.type === 'array'
      result.properties[name] = {
        type: (prop.type as string) ?? 'string',
        format: prop.format,
        description: prop.description,
        enum: prop.enum,
        default: prop.default,
        example: prop.example,
        nested: isNested || undefined,
      } satisfies RequestBodyProperty
    }
  }

  return result
}

function extractResponseSchema(
  operation: OpenAPIV3.OperationObject | OpenAPIV2.OperationObject,
  isOpenAPI3: boolean,
): unknown {
  const response200 = operation.responses?.['200']
  if (!response200) return undefined

  if (isOpenAPI3) {
    const resp = response200 as OpenAPIV3.ResponseObject
    return resp.content?.['application/json']?.schema
  } else {
    return (response200 as OpenAPIV2.ResponseObject).schema
  }
}

function extractSecuritySchemes(
  api: OpenAPIV3.Document | OpenAPIV2.Document,
  isOpenAPI3: boolean,
) {
  if (isOpenAPI3) {
    const openapi3 = api as OpenAPIV3.Document
    const rawSchemes = openapi3.components?.securitySchemes ?? {}
    const schemes: Record<string, OpenAPIV3.SecuritySchemeObject> = {}
    for (const [name, scheme] of Object.entries(rawSchemes)) {
      if (scheme && !('$ref' in scheme)) {
        schemes[name] = scheme as OpenAPIV3.SecuritySchemeObject
      }
    }
    return mapSecuritySchemes(schemes)
  } else {
    const swagger2 = api as OpenAPIV2.Document
    return mapSecuritySchemes(swagger2.securityDefinitions ?? {})
  }
}
