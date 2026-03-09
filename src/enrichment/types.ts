/**
 * Enrichment types.
 * Re-exports Enricher from core/types and defines strategy-specific options.
 */

export type { Enricher } from '../core/types'

/** Options for the heuristic enricher. */
export interface HeuristicEnricherOptions {
  /** Include "METHOD /path" after summary in descriptions (default: false) */
  includePath?: boolean
  /** Enable semantic pattern detection for parameter hints (default: true) */
  semanticDetection?: boolean
}

/** Options for the LLM enricher. */
export interface LLMEnricherOptions {
  /** User-provided LLM generation function. */
  generate: (prompt: string) => Promise<string>
  /** Which fields to enrich (defaults: descriptions + parameterDescriptions) */
  enrich?: {
    toolNames?: boolean
    descriptions?: boolean
    parameterDescriptions?: boolean
  }
  /** Operations per LLM call (default: 5) */
  batchSize?: number
  /** Max concurrent LLM calls (default: 1) */
  maxConcurrency?: number
}

/** Options for description generation. */
export interface DescriptionOptions {
  /** Include "METHOD /path" line after summary */
  includePath?: boolean
}
