/**
 * Temporal-related semantic patterns.
 * Patterns for date and timestamp fields.
 */

import type { SemanticPattern } from '../types'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const US_DATE = /^\d{1,2}\/\d{1,2}\/\d{4}$/
const EU_DATE = /^\d{1,2}\.\d{1,2}\.\d{4}$/

export const datePattern: SemanticPattern = {
  category: 'date',
  namePatterns: [
    { regex: /\b(date|fecha|datum|created_at|updated_at|created_date|birth_date|start_date|end_date|due_date)\b/i, weight: 0.4, languages: ['en', 'es', 'fr', 'de'] },
  ],
  typeConstraint: { allowed: ['string'], weight: 0.2 },
  valueValidators: [
    {
      name: 'isDateFormat',
      validator: (value: unknown): boolean => {
        if (typeof value !== 'string') return false
        const trimmed = value.trim()
        return ISO_DATE.test(trimmed) || US_DATE.test(trimmed) || EU_DATE.test(trimmed)
      },
      weight: 0.25,
    },
  ],
  formatHints: [{ format: 'date', weight: 0.15 }],
  thresholds: { high: 0.75, medium: 0.50 },
}

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(\.\d{1,6})?(Z|[+-]\d{2}:?\d{2})?$/

export const timestampPattern: SemanticPattern = {
  category: 'timestamp',
  namePatterns: [
    { regex: /\b(timestamp|datetime|time|created_at|updated_at|modified_at|last_modified|expires_at|published_at)\b/i, weight: 0.4, languages: ['en'] },
  ],
  typeConstraint: { allowed: ['string', 'number'], weight: 0.2 },
  valueValidators: [
    {
      name: 'isTimestampFormat',
      validator: (value: unknown): boolean => {
        if (typeof value === 'string') return ISO_TIMESTAMP.test(value.trim())
        if (typeof value === 'number') {
          const digits = value.toString().length
          return digits === 10 || digits === 13
        }
        return false
      },
      weight: 0.25,
    },
  ],
  formatHints: [{ format: 'date-time', weight: 0.15 }],
  thresholds: { high: 0.75, medium: 0.50 },
}
