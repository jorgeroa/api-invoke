/**
 * Confidence scoring algorithm for semantic field detection.
 * Uses regex-only name matching (no embedding strategy).
 *
 * Signal weights:
 *   - Name matching (regex): 0.40
 *   - Type constraint: 0.20
 *   - Value validators: 0.25-0.30
 *   - Format hints: 0.10-0.15 (only when OpenAPI hints present)
 */

import type {
  SemanticPattern,
  ConfidenceResult,
  ConfidenceLevel,
  SignalMatch,
} from './types'

const NAME_MATCH_WEIGHT = 0.40

export function calculateConfidence(
  fieldName: string,
  fieldType: string,
  sampleValues: unknown[],
  openapiHints: { format?: string; description?: string } | undefined,
  pattern: SemanticPattern
): ConfidenceResult {
  const signals: SignalMatch[] = []
  let totalScore = 0
  let maxPossibleScore = 0

  // 1. Name matching via regex (simplified from embedding strategy)
  let nameScore = 0
  for (const np of pattern.namePatterns) {
    if (np.regex.test(fieldName)) {
      nameScore = Math.max(nameScore, np.weight / NAME_MATCH_WEIGHT)
      // Normalized: np.weight is typically 0.4, so nameScore = 1.0 for full match
    }
  }
  const nameContribution = nameScore * NAME_MATCH_WEIGHT
  maxPossibleScore += NAME_MATCH_WEIGHT

  signals.push({
    name: 'nameMatch:regex',
    matched: nameScore > 0,
    weight: NAME_MATCH_WEIGHT,
    contribution: nameContribution,
  })
  totalScore += nameContribution

  // 2. Type constraint
  if (pattern.typeConstraint.weight > 0) {
    const typeMatched = pattern.typeConstraint.allowed.includes(fieldType)
    maxPossibleScore += pattern.typeConstraint.weight

    signals.push({
      name: 'typeConstraint',
      matched: typeMatched,
      weight: pattern.typeConstraint.weight,
      contribution: typeMatched ? pattern.typeConstraint.weight : 0,
    })

    if (typeMatched) {
      totalScore += pattern.typeConstraint.weight
    }
  }

  // 3. Value validators
  for (const validator of pattern.valueValidators) {
    maxPossibleScore += validator.weight

    const anyMatch = sampleValues.some(value => {
      try {
        return validator.validator(value)
      } catch {
        return false
      }
    })

    signals.push({
      name: `valueValidator:${validator.name}`,
      matched: anyMatch,
      weight: validator.weight,
      contribution: anyMatch ? validator.weight : 0,
    })

    if (anyMatch) {
      totalScore += validator.weight
    }
  }

  // 4. Format hints (only count when OpenAPI hints are present)
  if (openapiHints?.format && pattern.formatHints.length > 0) {
    for (const hint of pattern.formatHints) {
      maxPossibleScore += hint.weight
      const formatMatched = openapiHints.format === hint.format

      signals.push({
        name: `formatHint:${hint.format}`,
        matched: formatMatched,
        weight: hint.weight,
        contribution: formatMatched ? hint.weight : 0,
      })

      if (formatMatched) {
        totalScore += hint.weight
      }
    }
  }

  const confidence = maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0

  let level: ConfidenceLevel
  if (confidence >= pattern.thresholds.high) {
    level = 'high'
  } else if (confidence >= pattern.thresholds.medium) {
    level = 'medium'
  } else if (confidence > 0) {
    level = 'low'
  } else {
    level = 'none'
  }

  return { category: pattern.category, confidence, level, signals }
}
