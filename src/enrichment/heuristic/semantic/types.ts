/**
 * Core types for semantic field detection.
 * Defines the type system and pattern structures for multi-signal semantic analysis.
 */

export const SemanticCategory = {
  Price: 'price',
  CurrencyCode: 'currency_code',
  Sku: 'sku',
  Quantity: 'quantity',
  Rating: 'rating',
  Reviews: 'reviews',
  Tags: 'tags',
  Status: 'status',
  Image: 'image',
  Video: 'video',
  Thumbnail: 'thumbnail',
  Avatar: 'avatar',
  Audio: 'audio',
  Email: 'email',
  Phone: 'phone',
  Uuid: 'uuid',
  Name: 'name',
  Address: 'address',
  Url: 'url',
  Date: 'date',
  Timestamp: 'timestamp',
  Description: 'description',
  Title: 'title',
  Geo: 'geo',
} as const
export type SemanticCategory = typeof SemanticCategory[keyof typeof SemanticCategory]

export const ConfidenceLevel = {
  High: 'high',
  Medium: 'medium',
  Low: 'low',
  None: 'none',
} as const
export type ConfidenceLevel = typeof ConfidenceLevel[keyof typeof ConfidenceLevel]

export interface SignalMatch {
  name: string
  matched: boolean
  weight: number
  contribution: number
}

export interface ConfidenceResult {
  category: SemanticCategory
  confidence: number
  level: ConfidenceLevel
  signals: SignalMatch[]
}

export interface NamePattern {
  regex: RegExp
  weight: number
  languages: string[]
}

export interface TypeConstraint {
  allowed: string[]
  weight: number
}

export interface ValueValidator {
  name: string
  validator: (value: unknown) => boolean
  weight: number
}

export interface FormatHint {
  format: string
  weight: number
}

export const DEFAULT_THRESHOLDS = {
  high: 0.75,
  medium: 0.50,
} as const

export interface SemanticPattern {
  category: SemanticCategory
  namePatterns: NamePattern[]
  typeConstraint: TypeConstraint
  valueValidators: ValueValidator[]
  formatHints: FormatHint[]
  thresholds: { high: number; medium: number }
}

export interface CompositePattern extends SemanticPattern {
  requiredFields: Array<{ nameRegex: RegExp; type: string }>
  minItems: number
}

export function isCompositePattern(pattern: SemanticPattern): pattern is CompositePattern {
  return 'requiredFields' in pattern && Array.isArray((pattern as CompositePattern).requiredFields)
}
