/**
 * Engagement-related semantic patterns.
 * Patterns for rating, reviews (composite), tags, status, title, and description.
 */

import type { SemanticPattern, CompositePattern } from '../types'

export const ratingPattern: SemanticPattern = {
  category: 'rating',
  namePatterns: [
    { regex: /\b(rating|score|stars|puntuacion|note|bewertung|rate|average_rating)\b/i, weight: 0.4, languages: ['en', 'es', 'fr', 'de'] },
  ],
  typeConstraint: { allowed: ['number'], weight: 0.2 },
  valueValidators: [
    {
      name: 'isValidRating',
      validator: (value: unknown): boolean => {
        if (typeof value !== 'number') return false
        return value >= 0 && value <= 10
      },
      weight: 0.25,
    },
  ],
  formatHints: [
    { format: 'float', weight: 0.1 },
    { format: 'double', weight: 0.1 },
  ],
  thresholds: { high: 0.75, medium: 0.50 },
}

export const reviewsPattern: CompositePattern = {
  category: 'reviews',
  namePatterns: [
    { regex: /\b(reviews?|comments?|feedback|opiniones|avis|bewertungen|testimonials?)\b/i, weight: 0.4, languages: ['en', 'es', 'fr', 'de'] },
  ],
  typeConstraint: { allowed: ['array'], weight: 0.2 },
  valueValidators: [],
  formatHints: [],
  thresholds: { high: 0.75, medium: 0.50 },
  requiredFields: [
    { nameRegex: /\b(rating|score|stars)\b/i, type: 'number' },
    { nameRegex: /\b(comment|text|body|content|review|message)\b/i, type: 'string' },
  ],
  minItems: 1,
}

export const tagsPattern: SemanticPattern = {
  category: 'tags',
  namePatterns: [
    { regex: /\b(tags?|labels?|categories?|keywords?|etiquetas?|topics?)\b/i, weight: 0.4, languages: ['en', 'es'] },
  ],
  typeConstraint: { allowed: ['array'], weight: 0.2 },
  valueValidators: [
    {
      name: 'isStringArray',
      validator: (value: unknown): boolean => {
        if (!Array.isArray(value)) return false
        return value.length > 0 && value.every(item => typeof item === 'string')
      },
      weight: 0.3,
    },
  ],
  formatHints: [],
  thresholds: { high: 0.75, medium: 0.50 },
}

export const statusPattern: SemanticPattern = {
  category: 'status',
  namePatterns: [
    { regex: /\b(status|state|stage|estado|statut|zustand|condition)\b/i, weight: 0.4, languages: ['en', 'es', 'fr', 'de'] },
  ],
  typeConstraint: { allowed: ['string'], weight: 0.2 },
  valueValidators: [
    {
      name: 'isStatusLike',
      validator: (value: unknown): boolean => {
        if (typeof value !== 'string') return false
        const trimmed = value.trim()
        if (trimmed.length === 0 || trimmed.length > 30) return false
        if (/\s/.test(trimmed)) return false
        return /^[a-zA-Z][a-zA-Z_-]*$/.test(trimmed)
      },
      weight: 0.3,
    },
  ],
  formatHints: [],
  thresholds: { high: 0.75, medium: 0.50 },
}

export const titlePattern: SemanticPattern = {
  category: 'title',
  namePatterns: [
    { regex: /\b(title|headline|subject|heading|titulo|titre|titel|name)\b/i, weight: 0.4, languages: ['en', 'es', 'fr', 'de'] },
  ],
  typeConstraint: { allowed: ['string'], weight: 0.2 },
  valueValidators: [
    {
      name: 'isTitleLike',
      validator: (value: unknown): boolean => {
        if (typeof value !== 'string') return false
        const trimmed = value.trim()
        if (trimmed.length < 2 || trimmed.length > 200) return false
        if (/^https?:\/\//i.test(trimmed)) return false
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return false
        const words = trimmed.split(/\s+/)
        if (words.length >= 2) return true
        return /^[A-Z]/.test(trimmed)
      },
      weight: 0.3,
    },
  ],
  formatHints: [],
  thresholds: { high: 0.75, medium: 0.50 },
}

export const descriptionPattern: SemanticPattern = {
  category: 'description',
  namePatterns: [
    { regex: /\b(description|desc|summary|content|body|text|descripcion|beschreibung|abstract|details)\b/i, weight: 0.4, languages: ['en', 'es', 'de'] },
  ],
  typeConstraint: { allowed: ['string'], weight: 0.2 },
  valueValidators: [
    {
      name: 'isDescriptionLike',
      validator: (value: unknown): boolean => {
        if (typeof value !== 'string') return false
        const trimmed = value.trim()
        return trimmed.length > 50 && /\s/.test(trimmed)
      },
      weight: 0.3,
    },
  ],
  formatHints: [],
  thresholds: { high: 0.75, medium: 0.50 },
}
