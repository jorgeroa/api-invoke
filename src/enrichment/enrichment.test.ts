import { describe, it, expect } from 'vitest'
import { heuristicEnricher, composeEnrichers } from './index'
import type { ParsedAPI } from '../core/types'

const mockApi: ParsedAPI = {
  title: 'Test API',
  version: '1.0',
  baseUrl: 'https://api.example.com',
  specFormat: 'openapi-3',
  authSchemes: [],
  operations: [
    {
      id: 'getUserById',
      path: '/users/{id}',
      method: 'GET',
      summary: 'Get a user by ID',
      parameters: [
        { name: 'id', in: 'path', required: true, description: 'User ID', schema: { type: 'string' } },
        { name: 'email', in: 'query', required: false, description: 'Filter by email', schema: { type: 'string' } },
      ],
      tags: ['Users'],
      responseSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
        },
      },
    },
    {
      id: 'listPosts',
      path: '/posts',
      method: 'GET',
      parameters: [
        { name: 'limit', in: 'query', required: false, description: '', schema: { type: 'integer' } },
      ],
      tags: ['Posts'],
    },
  ],
}

describe('heuristicEnricher', () => {
  it('enriches operation IDs to snake_case', () => {
    const enricher = heuristicEnricher()
    const result = enricher.enrichAPI(mockApi) as ParsedAPI
    expect(result.operations[0].id).toBe('get_user_by_id')
    expect(result.operations[1].id).toBe('list_posts')
  })

  it('enriches descriptions with summary and returns', () => {
    const enricher = heuristicEnricher()
    const result = enricher.enrichAPI(mockApi) as ParsedAPI
    expect(result.operations[0].description).toContain('Get a user by ID')
    expect(result.operations[0].description).toContain('Returns:')
  })

  it('enriches email parameter with example', () => {
    const enricher = heuristicEnricher()
    const result = enricher.enrichAPI(mockApi) as ParsedAPI
    const emailParam = result.operations[0].parameters.find(p => p.name === 'email')
    expect(emailParam?.description).toContain('user@example.com')
  })

  it('sorts parameters: path first, then required', () => {
    const enricher = heuristicEnricher()
    const result = enricher.enrichAPI(mockApi) as ParsedAPI
    expect(result.operations[0].parameters[0].name).toBe('id')
  })

  it('preserves original API metadata', () => {
    const enricher = heuristicEnricher()
    const result = enricher.enrichAPI(mockApi) as ParsedAPI
    expect(result.title).toBe('Test API')
    expect(result.baseUrl).toBe('https://api.example.com')
    expect(result.operations.length).toBe(2)
  })

  it('respects includePath option', () => {
    const enricher = heuristicEnricher({ includePath: true })
    const result = enricher.enrichAPI(mockApi) as ParsedAPI
    expect(result.operations[0].description).toContain('GET /users/{id}')
  })

  it('respects semanticDetection=false', () => {
    const enricher = heuristicEnricher({ semanticDetection: false })
    const result = enricher.enrichAPI(mockApi) as ParsedAPI
    const emailParam = result.operations[0].parameters.find(p => p.name === 'email')
    // Should not have example appended
    expect(emailParam?.description).toBe('Filter by email')
  })
})

describe('composeEnrichers', () => {
  it('chains enrichers in order', async () => {
    const first = heuristicEnricher()
    const second = {
      name: 'custom',
      enrichAPI(api: ParsedAPI): ParsedAPI {
        return {
          ...api,
          title: api.title + ' [enriched]',
        }
      },
    }

    const composed = composeEnrichers(first, second)
    const result = await composed.enrichAPI(mockApi)
    expect(result.title).toBe('Test API [enriched]')
    // First enricher should have run too
    expect(result.operations[0].id).toBe('get_user_by_id')
  })

  it('combines names', () => {
    const composed = composeEnrichers(
      heuristicEnricher(),
      { name: 'custom', enrichAPI: (api) => api },
    )
    expect(composed.name).toBe('heuristic+custom')
  })
})
