import { describe, it, expect } from 'vitest'
import { normalizeType } from './parser'

describe('normalizeType', () => {
  it('returns first non-null type from array', () => {
    expect(normalizeType(['string', 'null'])).toBe('string')
  })

  it('handles null-first ordering', () => {
    expect(normalizeType(['null', 'integer'])).toBe('integer')
  })

  it('falls back when array contains only null', () => {
    expect(normalizeType(['null'])).toBe('string')
  })

  it('falls back for empty array', () => {
    expect(normalizeType([])).toBe('string')
  })

  it('passes through plain strings', () => {
    expect(normalizeType('boolean')).toBe('boolean')
  })

  it('falls back for undefined', () => {
    expect(normalizeType(undefined)).toBe('string')
  })

  it('falls back for null', () => {
    expect(normalizeType(null)).toBe('string')
  })

  it('respects custom fallback', () => {
    expect(normalizeType(undefined, 'object')).toBe('object')
  })

  it('respects custom fallback for null-only array', () => {
    expect(normalizeType(['null'], 'object')).toBe('object')
  })
})
