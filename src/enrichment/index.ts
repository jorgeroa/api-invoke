/**
 * api-bridge-rt/enrichment — Semantic enrichment entry point.
 * Pluggable strategies for improving tool-friendliness of parsed APIs.
 */

import type { ParsedAPI, Enricher } from '../core/types'

// Enricher factories
export { heuristicEnricher } from './heuristic'
export { llmEnricher } from './llm'

// Types
export type { Enricher, HeuristicEnricherOptions, LLMEnricherOptions, DescriptionOptions } from './types'

// Heuristic utilities (for direct use)
export {
  generateToolName,
  sanitizeToolName,
  generateDescription,
  extractResponseFields,
  summarizeResponseSchema,
  parameterToJsonSchema,
  enhanceParameterDescription,
  sortParameters,
  detectCategoryByName,
} from './heuristic'
export type { JsonSchemaProperty } from './heuristic'

// Semantic detection (for advanced use)
export {
  detectSemantics,
  detectCompositeSemantics,
  getBestMatch,
  clearSemanticCache,
  getAllPatterns,
  getPattern,
  getCompositePatterns,
} from './heuristic/semantic'
export type {
  SemanticCategory,
  ConfidenceLevel,
  ConfidenceResult,
  SemanticPattern,
} from './heuristic/semantic'

/**
 * Compose multiple enrichers into a pipeline.
 * Each enricher receives the output of the previous one.
 */
export function composeEnrichers(...enrichers: Enricher[]): Enricher {
  return {
    name: enrichers.map(e => e.name).join('+'),

    async enrichAPI(api: ParsedAPI): Promise<ParsedAPI> {
      let result = api
      for (const enricher of enrichers) {
        result = await Promise.resolve(enricher.enrichAPI(result))
      }
      return result
    },
  }
}
