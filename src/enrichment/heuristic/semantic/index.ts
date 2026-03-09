/**
 * Semantic detection subsystem.
 * Re-exports public API for pattern-based field detection.
 */

export { detectSemantics, detectCompositeSemantics, getBestMatch, clearSemanticCache } from './detector'

export type {
  SemanticCategory,
  ConfidenceLevel,
  ConfidenceResult,
  SignalMatch,
  SemanticPattern,
  CompositePattern,
} from './types'

export { SemanticCategory as SemanticCategoryValues, ConfidenceLevel as ConfidenceLevelValues } from './types'

export { getAllPatterns, getPattern, getCompositePatterns } from './patterns'
