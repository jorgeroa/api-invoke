import { describe, it, expect } from 'vitest'
import { generateToolName, sanitizeToolName } from './naming'
import type { Operation } from '../../core/types'

function makeOp(overrides: Partial<Operation>): Operation {
  return {
    id: '', path: '', method: 'GET', parameters: [], tags: [],
    ...overrides,
  }
}

describe('generateToolName', () => {
  it('converts operationId to snake_case', () => {
    expect(generateToolName(makeOp({ id: 'getUser' }))).toBe('get_user')
  })

  it('converts camelCase operationId', () => {
    expect(generateToolName(makeOp({ id: 'getUserProfile' }))).toBe('get_user_profile')
  })

  it('strips non-alphanumeric characters', () => {
    expect(generateToolName(makeOp({ id: 'get.user-profile' }))).toBe('get_user_profile')
  })

  it('falls back to method_path when id is empty', () => {
    expect(generateToolName(makeOp({ id: '', method: 'GET', path: '/users/{id}' }))).toBe('get_users_by_id')
  })

  it('handles nested paths', () => {
    expect(generateToolName(makeOp({ id: '', method: 'POST', path: '/users/{userId}/posts' }))).toBe('post_users_by_id_posts')
  })
})

describe('sanitizeToolName', () => {
  it('strips invalid characters', () => {
    expect(sanitizeToolName('hello world!')).toBe('hello_world')
  })

  it('truncates to 64 chars', () => {
    const longName = 'a'.repeat(100)
    expect(sanitizeToolName(longName).length).toBe(64)
  })

  it('collapses multiple underscores', () => {
    expect(sanitizeToolName('hello___world')).toBe('hello_world')
  })

  it('strips leading/trailing underscores', () => {
    expect(sanitizeToolName('_hello_world_')).toBe('hello_world')
  })
})
