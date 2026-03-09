/**
 * Memoization cache for semantic field detection.
 */

import type { ConfidenceResult } from './types'

export interface DetectionCache {
  get(key: string): ConfidenceResult[] | undefined
  set(key: string, results: ConfidenceResult[]): void
  has(key: string): boolean
  clear(): void
  size: number
}

export function createCacheKey(
  fieldPath: string,
  fieldName: string,
  fieldType: string,
  sampleValues: unknown[],
  openapiHints?: { format?: string; description?: string }
): string {
  return JSON.stringify({
    fieldPath,
    fieldName,
    fieldType,
    sampleValues: sampleValues.slice(0, 3),
    openapiHints,
  })
}

export type DetectionFunction = (
  fieldPath: string,
  fieldName: string,
  fieldType: string,
  sampleValues: unknown[],
  openapiHints?: { format?: string; description?: string }
) => ConfidenceResult[]

export interface MemoizedDetector {
  detect: DetectionFunction
  cache: DetectionCache
}

export function createMemoizedDetector(detector: DetectionFunction): MemoizedDetector {
  const cacheMap = new Map<string, ConfidenceResult[]>()

  const cache: DetectionCache = {
    get(key: string) { return cacheMap.get(key) },
    set(key: string, results: ConfidenceResult[]) { cacheMap.set(key, results) },
    has(key: string) { return cacheMap.has(key) },
    clear() { cacheMap.clear() },
    get size() { return cacheMap.size },
  }

  const detect: DetectionFunction = (fieldPath, fieldName, fieldType, sampleValues, openapiHints) => {
    const key = createCacheKey(fieldPath, fieldName, fieldType, sampleValues, openapiHints)
    const cached = cache.get(key)
    if (cached !== undefined) return cached

    const results = detector(fieldPath, fieldName, fieldType, sampleValues, openapiHints)
    cache.set(key, results)
    return results
  }

  return { detect, cache }
}
