import { describe, it, expect, beforeEach } from 'vitest'
import { detectSemantics, getBestMatch, clearSemanticCache } from './detector'

beforeEach(() => {
  clearSemanticCache()
})

describe('detectSemantics', () => {
  it('detects price field', () => {
    const results = detectSemantics('product.price', 'price', 'number', [19.99])
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].category).toBe('price')
    expect(results[0].level).toBe('high')
  })

  it('detects email field', () => {
    const results = detectSemantics('user.email', 'email', 'string', ['test@example.com'])
    expect(results[0].category).toBe('email')
    expect(results[0].level).toBe('high')
  })

  it('detects URL field', () => {
    const results = detectSemantics('item.url', 'url', 'string', ['https://example.com'])
    expect(results[0].category).toBe('url')
    expect(results[0].level).toBe('high')
  })

  it('detects date field', () => {
    const results = detectSemantics('item.date', 'date', 'string', ['2025-01-15'])
    expect(results[0].category).toBe('date')
    expect(results[0].level).toBe('high')
  })

  it('detects rating field', () => {
    const results = detectSemantics('item.rating', 'rating', 'number', [4.5])
    expect(results[0].category).toBe('rating')
    expect(results[0].level).toBe('high')
  })

  it('detects status field', () => {
    const results = detectSemantics('item.status', 'status', 'string', ['active'])
    expect(results[0].category).toBe('status')
    expect(results[0].level).toBe('high')
  })

  it('returns max 3 results', () => {
    const results = detectSemantics('item.name', 'name', 'string', ['John Doe'])
    expect(results.length).toBeLessThanOrEqual(3)
  })

  it('caches results', () => {
    const r1 = detectSemantics('x.price', 'price', 'number', [10])
    const r2 = detectSemantics('x.price', 'price', 'number', [10])
    expect(r1).toBe(r2) // Same reference = cached
  })

  it('detects image field', () => {
    const results = detectSemantics('item.image', 'image', 'string', ['https://example.com/photo.jpg'])
    expect(results[0].category).toBe('image')
  })

  it('detects geo field', () => {
    const results = detectSemantics('item.latitude', 'latitude', 'number', [40.7128])
    expect(results[0].category).toBe('geo')
  })
})

describe('getBestMatch', () => {
  it('returns high confidence result', () => {
    const results = detectSemantics('item.email', 'email', 'string', ['a@b.com'])
    const best = getBestMatch(results)
    expect(best).not.toBeNull()
    expect(best!.category).toBe('email')
  })

  it('returns null for empty results', () => {
    expect(getBestMatch([])).toBeNull()
  })

  it('returns null when no high confidence', () => {
    // A random field name shouldn't get high confidence
    const results = detectSemantics('x.xyz', 'xyz', 'string', ['hello'])
    const best = getBestMatch(results)
    expect(best).toBeNull()
  })
})
