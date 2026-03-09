/**
 * Heuristic enricher — cheap, sync, zero dependencies.
 * Enriches operations with better names, descriptions, and parameter hints.
 */

import type { ParsedAPI, Operation, Enricher } from '../../core/types'
import type { HeuristicEnricherOptions } from '../types'
import { generateToolName, sanitizeToolName } from './naming'
import { generateDescription } from './descriptions'
import { enhanceParameterDescription, sortParameters } from './parameters'

/**
 * Create a heuristic enricher that improves tool-friendliness using
 * naming conventions, regex patterns, and schema analysis.
 */
export function heuristicEnricher(options?: HeuristicEnricherOptions): Enricher {
  const includePath = options?.includePath ?? false
  const semanticDetection = options?.semanticDetection ?? true

  return {
    name: 'heuristic',

    enrichAPI(api: ParsedAPI): ParsedAPI {
      const enrichedOps = api.operations.map(op => enrichOperation(op, includePath, semanticDetection))

      return {
        ...api,
        operations: enrichedOps,
      }
    },
  }
}

function enrichOperation(
  op: Operation,
  includePath: boolean,
  semanticDetection: boolean,
): Operation {
  // 1. Generate enriched tool name
  const enrichedId = sanitizeToolName(generateToolName(op))

  // 2. Generate enriched description
  const enrichedDescription = generateDescription(op, { includePath })

  // 3. Enhance parameter descriptions with semantic hints + sort
  const enrichedParams = semanticDetection
    ? sortParameters(op.parameters).map(param => ({
        ...param,
        description: enhanceParameterDescription(param),
      }))
    : sortParameters(op.parameters)

  return {
    ...op,
    id: enrichedId,
    description: enrichedDescription,
    parameters: enrichedParams,
  }
}

export { generateToolName, sanitizeToolName } from './naming'
export { generateDescription, extractResponseFields, summarizeResponseSchema } from './descriptions'
export { parameterToJsonSchema, enhanceParameterDescription, sortParameters, detectCategoryByName } from './parameters'
export type { JsonSchemaProperty } from './parameters'
