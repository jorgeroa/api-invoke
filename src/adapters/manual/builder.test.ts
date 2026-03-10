import { describe, it, expect } from 'vitest'
import { defineAPI } from './builder'

describe('defineAPI builder', () => {
  it('creates a basic API with GET endpoint', () => {
    const api = defineAPI('Test API')
      .baseUrl('https://api.example.com')
      .get('/users', { id: 'listUsers', summary: 'List users' })
      .build()

    expect(api.title).toBe('Test API')
    expect(api.baseUrl).toBe('https://api.example.com')
    expect(api.operations).toHaveLength(1)
    expect(api.operations[0].id).toBe('listUsers')
    expect(api.operations[0].method).toBe('GET')
    expect(api.operations[0].path).toBe('/users')
  })

  it('supports multiple endpoints and methods', () => {
    const api = defineAPI('CRUD API')
      .baseUrl('https://api.example.com')
      .get('/users', { id: 'listUsers' })
      .post('/users', { id: 'createUser' })
      .get('/users/{id}', { id: 'getUser' })
      .put('/users/{id}', { id: 'updateUser' })
      .delete('/users/{id}', { id: 'deleteUser' })
      .build()

    expect(api.operations).toHaveLength(5)
    expect(api.operations.map(o => o.method)).toEqual(['GET', 'POST', 'GET', 'PUT', 'DELETE'])
  })

  it('auto-detects path parameters from path template', () => {
    const api = defineAPI('Test')
      .baseUrl('https://api.example.com')
      .get('/users/{userId}/posts/{postId}')
      .build()

    const op = api.operations[0]
    const pathParams = op.parameters.filter(p => p.in === 'path')
    expect(pathParams).toHaveLength(2)
    expect(pathParams[0].name).toBe('userId')
    expect(pathParams[0].required).toBe(true)
    expect(pathParams[1].name).toBe('postId')
  })

  it('adds query parameters', () => {
    const api = defineAPI('Test')
      .baseUrl('https://api.example.com')
      .get('/users', {
        params: {
          limit: { type: 'number', required: false, default: 10 },
          sort: 'string',
        },
      })
      .build()

    const op = api.operations[0]
    const queryParams = op.parameters.filter(p => p.in === 'query')
    expect(queryParams).toHaveLength(2)
    expect(queryParams[0].name).toBe('limit')
    expect(queryParams[0].schema.default).toBe(10)
    expect(queryParams[1].name).toBe('sort')
    expect(queryParams[1].schema.type).toBe('string')
  })

  it('builds request body with properties', () => {
    const api = defineAPI('Test')
      .baseUrl('https://api.example.com')
      .post('/users', {
        body: {
          properties: {
            name: 'string',
            age: { type: 'number', description: 'User age' },
          },
          required_fields: ['name'],
        },
      })
      .build()

    const op = api.operations[0]
    expect(op.requestBody).toBeDefined()
    expect(op.requestBody!.contentType).toBe('application/json')
    expect(op.requestBody!.schema.properties!['name'].type).toBe('string')
    expect(op.requestBody!.schema.properties!['age'].description).toBe('User age')
    expect(op.requestBody!.schema.required).toEqual(['name'])
  })

  it('supports form-urlencoded body', () => {
    const api = defineAPI('Test')
      .baseUrl('https://api.example.com')
      .post('/oauth/token', {
        body: {
          contentType: 'application/x-www-form-urlencoded',
          properties: { grant_type: 'string', client_id: 'string' },
        },
      })
      .build()

    expect(api.operations[0].requestBody!.contentType).toBe('application/x-www-form-urlencoded')
  })

  it('generates stable IDs from method and path', () => {
    const api = defineAPI('Test')
      .baseUrl('https://api.example.com')
      .get('/users/{id}/posts')
      .build()

    expect(api.operations[0].id).toBe('get_users_id_posts')
  })

  it('sets version', () => {
    const api = defineAPI('Test')
      .version('2.0.0')
      .baseUrl('https://api.example.com')
      .build()

    expect(api.version).toBe('2.0.0')
  })

  it('supports PATCH method', () => {
    const api = defineAPI('Test')
      .baseUrl('https://api.example.com')
      .patch('/users/{id}', { id: 'patchUser' })
      .build()

    expect(api.operations[0].method).toBe('PATCH')
  })

  it('supports responseContentType', () => {
    const api = defineAPI('Test')
      .baseUrl('https://api.example.com')
      .get('/report', { responseContentType: 'application/pdf' })
      .build()

    expect(api.operations[0].responseContentType).toBe('application/pdf')
  })
})
