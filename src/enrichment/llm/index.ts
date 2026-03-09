/**
 * LLM enricher — BYOLLM (Bring Your Own LLM).
 * User provides a generate function, no SDK bundled.
 */

import type { ParsedAPI, Operation, Enricher } from '../../core/types'
import type { LLMEnricherOptions } from '../types'

/**
 * Create an LLM-powered enricher.
 * Calls the user-provided generate function to improve descriptions.
 */
export function llmEnricher(options: LLMEnricherOptions): Enricher {
  const {
    generate,
    enrich = { descriptions: true, parameterDescriptions: true },
    batchSize = 5,
    maxConcurrency = 1,
  } = options

  return {
    name: 'llm',

    async enrichAPI(api: ParsedAPI): Promise<ParsedAPI> {
      const operations = [...api.operations]
      const batches: Operation[][] = []

      for (let i = 0; i < operations.length; i += batchSize) {
        batches.push(operations.slice(i, i + batchSize))
      }

      const enrichedOps: Operation[] = []

      // Process batches with concurrency limit
      for (let i = 0; i < batches.length; i += maxConcurrency) {
        const concurrentBatches = batches.slice(i, i + maxConcurrency)
        const results = await Promise.all(
          concurrentBatches.map(batch => enrichBatch(batch, generate, enrich))
        )
        enrichedOps.push(...results.flat())
      }

      return { ...api, operations: enrichedOps }
    },
  }
}

async function enrichBatch(
  operations: Operation[],
  generate: (prompt: string) => Promise<string>,
  enrich: { toolNames?: boolean; descriptions?: boolean; parameterDescriptions?: boolean },
): Promise<Operation[]> {
  const prompt = buildPrompt(operations, enrich)

  let response: string
  try {
    response = await generate(prompt)
  } catch {
    // If LLM fails, return operations unchanged
    return operations
  }

  try {
    const enrichments = parseResponse(response, operations.length)
    return operations.map((op, i) => applyEnrichment(op, enrichments[i], enrich))
  } catch {
    return operations
  }
}

function buildPrompt(
  operations: Operation[],
  enrich: { toolNames?: boolean; descriptions?: boolean; parameterDescriptions?: boolean },
): string {
  const fields: string[] = []
  if (enrich.descriptions) fields.push('description')
  if (enrich.parameterDescriptions) fields.push('parameterDescriptions (object mapping param name → improved description)')
  if (enrich.toolNames) fields.push('name')

  const opsJson = operations.map((op, i) => ({
    index: i,
    id: op.id,
    method: op.method,
    path: op.path,
    summary: op.summary,
    description: op.description,
    parameters: op.parameters.map(p => ({
      name: p.name,
      in: p.in,
      description: p.description,
      type: p.schema.type,
    })),
    tags: op.tags,
  }))

  return `You are improving API tool definitions for LLM consumption.

For each operation below, provide improved values for: ${fields.join(', ')}.

Focus on:
- Clear, concise descriptions of what each tool does and when to use it
- Practical parameter descriptions with expected formats and valid values
- Tool names should be short, descriptive snake_case

Operations:
${JSON.stringify(opsJson, null, 2)}

Respond with a JSON array of objects, one per operation, with these fields: ${fields.join(', ')}.
Return ONLY valid JSON, no markdown or explanation.`
}

interface OperationEnrichment {
  name?: string
  description?: string
  parameterDescriptions?: Record<string, string>
}

function parseResponse(response: string, expectedCount: number): OperationEnrichment[] {
  // Strip markdown code fences if present
  const cleaned = response.replace(/^```json?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim()
  const parsed = JSON.parse(cleaned)

  if (!Array.isArray(parsed)) {
    throw new Error('Expected JSON array response')
  }

  // Pad with empty objects if LLM returned fewer items
  while (parsed.length < expectedCount) {
    parsed.push({})
  }

  return parsed.slice(0, expectedCount)
}

function applyEnrichment(
  op: Operation,
  enrichment: OperationEnrichment | undefined,
  enrich: { toolNames?: boolean; descriptions?: boolean; parameterDescriptions?: boolean },
): Operation {
  if (!enrichment) return op

  let result = { ...op }

  if (enrich.toolNames && enrichment.name && typeof enrichment.name === 'string') {
    result.id = enrichment.name
  }

  if (enrich.descriptions && enrichment.description && typeof enrichment.description === 'string') {
    result.description = enrichment.description
  }

  if (enrich.parameterDescriptions && enrichment.parameterDescriptions && typeof enrichment.parameterDescriptions === 'object') {
    result.parameters = op.parameters.map(param => {
      const improved = enrichment.parameterDescriptions?.[param.name]
      if (improved && typeof improved === 'string') {
        return { ...param, description: improved }
      }
      return param
    })
  }

  return result
}
