/**
 * Semantic detection engine.
 * Main entry point for detecting semantic categories of API fields.
 * Simplified: regex-only matching (no embedding strategy, no plugin system).
 */

import { getAllPatterns, getCompositePatterns } from './patterns'
import { calculateConfidence } from './scorer'
import { createMemoizedDetector, type MemoizedDetector } from './cache'
import type { ConfidenceResult, CompositePattern } from './types'

/**
 * Internal detection function (before memoization).
 */
function detectSemanticsInternal(
  _fieldPath: string,
  fieldName: string,
  fieldType: string,
  sampleValues: unknown[],
  openapiHints?: { format?: string; description?: string }
): ConfidenceResult[] {
  const patterns = getAllPatterns()
  const results: ConfidenceResult[] = []

  for (const pattern of patterns) {
    const result = calculateConfidence(fieldName, fieldType, sampleValues, openapiHints, pattern)
    if (result.confidence > 0) {
      results.push(result)
    }
  }

  results.sort((a, b) => b.confidence - a.confidence)
  return results.slice(0, 3)
}

let memoizedDetector: MemoizedDetector | null = null

function getMemoizedDetector(): MemoizedDetector {
  if (!memoizedDetector) {
    memoizedDetector = createMemoizedDetector(detectSemanticsInternal)
  }
  return memoizedDetector
}

/**
 * Detect semantic categories for a field.
 * Returns up to 3 best-matching categories sorted by confidence.
 */
export function detectSemantics(
  fieldPath: string,
  fieldName: string,
  fieldType: string,
  sampleValues: unknown[],
  openapiHints?: { format?: string; description?: string }
): ConfidenceResult[] {
  return getMemoizedDetector().detect(fieldPath, fieldName, fieldType, sampleValues, openapiHints)
}

/**
 * Detect composite patterns for array fields.
 */
export function detectCompositeSemantics(
  _fieldPath: string,
  fieldName: string,
  itemFields: Array<{ name: string; type: string }>,
  sampleItems: unknown[]
): ConfidenceResult | null {
  const composites = getCompositePatterns()
  let bestMatch: ConfidenceResult | null = null

  for (const pattern of composites) {
    const result = evaluateCompositePattern(fieldName, itemFields, sampleItems, pattern)
    if (result && (!bestMatch || result.confidence > bestMatch.confidence)) {
      bestMatch = result
    }
  }

  return bestMatch
}

function evaluateCompositePattern(
  fieldName: string,
  itemFields: Array<{ name: string; type: string }>,
  sampleItems: unknown[],
  pattern: CompositePattern
): ConfidenceResult | null {
  const signals = []
  let totalScore = 0
  let maxPossibleScore = 0

  // 1. Name pattern match
  if (pattern.namePatterns.length > 0) {
    let bestNameMatch = 0
    const maxNameWeight = Math.max(...pattern.namePatterns.map(p => p.weight))
    maxPossibleScore += maxNameWeight

    for (const np of pattern.namePatterns) {
      if (np.regex.test(fieldName) && np.weight > bestNameMatch) {
        bestNameMatch = np.weight
      }
    }

    signals.push({ name: 'namePattern', matched: bestNameMatch > 0, weight: maxNameWeight, contribution: bestNameMatch })
    totalScore += bestNameMatch
  }

  // 2. Type constraint
  if (pattern.typeConstraint.weight > 0) {
    maxPossibleScore += pattern.typeConstraint.weight
    signals.push({ name: 'typeConstraint:array', matched: true, weight: pattern.typeConstraint.weight, contribution: pattern.typeConstraint.weight })
    totalScore += pattern.typeConstraint.weight
  }

  // 3. Required fields structure
  const structureWeight = 0.4
  maxPossibleScore += structureWeight

  let allMatched = true
  for (const required of pattern.requiredFields) {
    const found = itemFields.some(f => required.nameRegex.test(f.name) && f.type === required.type)
    if (!found) allMatched = false
  }

  signals.push({ name: 'requiredFields', matched: allMatched, weight: structureWeight, contribution: allMatched ? structureWeight : 0 })
  if (allMatched) totalScore += structureWeight

  // 4. Min items
  if (sampleItems.length < pattern.minItems) totalScore *= 0.5

  const confidence = maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0
  if (confidence === 0) return null

  let level: 'high' | 'medium' | 'low' | 'none'
  if (confidence >= pattern.thresholds.high) level = 'high'
  else if (confidence >= pattern.thresholds.medium) level = 'medium'
  else if (confidence > 0) level = 'low'
  else level = 'none'

  return { category: pattern.category, confidence, level, signals }
}

/**
 * Get the best matching result if it meets the high confidence threshold.
 */
export function getBestMatch(results: ConfidenceResult[]): ConfidenceResult | null {
  if (results.length === 0) return null
  const best = results[0]
  return best && best.level === 'high' ? best : null
}

/**
 * Clear the semantic detection cache.
 */
export function clearSemanticCache(): void {
  if (memoizedDetector) {
    memoizedDetector.cache.clear()
  }
}
