/**
 * Commerce-related semantic patterns.
 * Patterns for price, currency, SKU, and quantity fields.
 */

import type { SemanticPattern } from '../types'

export const pricePattern: SemanticPattern = {
  category: 'price',
  namePatterns: [
    {
      regex: /\b(price|cost|amount|fee|subtotal|precio|costo|importe|prix|cout|montant|preis|kosten|betrag)\b/i,
      weight: 0.4,
      languages: ['en', 'es', 'fr', 'de'],
    },
  ],
  typeConstraint: { allowed: ['number', 'string'], weight: 0.2 },
  valueValidators: [
    {
      name: 'isPositiveNumber',
      validator: (value: unknown): boolean => {
        if (typeof value === 'number') return value >= 0
        if (typeof value === 'string') return /^\$?[\d,]+(\.\d{1,2})?$/.test(value.trim())
        return false
      },
      weight: 0.25,
    },
  ],
  formatHints: [
    { format: 'currency', weight: 0.15 },
    { format: 'decimal', weight: 0.1 },
  ],
  thresholds: { high: 0.75, medium: 0.50 },
}

export const currencyCodePattern: SemanticPattern = {
  category: 'currency_code',
  namePatterns: [
    { regex: /\b(currency|curr|currency_code|currency_id)\b/i, weight: 0.4, languages: ['en'] },
  ],
  typeConstraint: { allowed: ['string'], weight: 0.2 },
  valueValidators: [
    {
      name: 'isISOCurrencyCode',
      validator: (value: unknown): boolean => {
        if (typeof value !== 'string') return false
        return /^[A-Z]{3}$/.test(value.trim())
      },
      weight: 0.3,
    },
  ],
  formatHints: [{ format: 'currency', weight: 0.1 }],
  thresholds: { high: 0.75, medium: 0.50 },
}

export const skuPattern: SemanticPattern = {
  category: 'sku',
  namePatterns: [
    { regex: /\b(sku|product_code|item_code|article|upc|ean|part_number|item_id)\b/i, weight: 0.4, languages: ['en'] },
  ],
  typeConstraint: { allowed: ['string'], weight: 0.2 },
  valueValidators: [
    {
      name: 'isProductCode',
      validator: (value: unknown): boolean => {
        if (typeof value !== 'string') return false
        const trimmed = value.trim()
        if (!/^[A-Za-z0-9\-_]{4,20}$/.test(trimmed)) return false
        const hasLetter = /[a-zA-Z]/.test(trimmed)
        const hasDigit = /\d/.test(trimmed)
        const hasSeparator = /[-_]/.test(trimmed)
        return (hasLetter && hasDigit) || (hasSeparator && (hasLetter || hasDigit))
      },
      weight: 0.3,
    },
  ],
  formatHints: [],
  thresholds: { high: 0.75, medium: 0.50 },
}

export const quantityPattern: SemanticPattern = {
  category: 'quantity',
  namePatterns: [
    { regex: /\b(quantity|qty|count|stock|inventory|amount|num|number_of)\b/i, weight: 0.4, languages: ['en'] },
  ],
  typeConstraint: { allowed: ['number', 'integer'], weight: 0.2 },
  valueValidators: [
    {
      name: 'isNonNegativeInteger',
      validator: (value: unknown): boolean => {
        if (typeof value !== 'number') return false
        return Number.isInteger(value) && value >= 0
      },
      weight: 0.3,
    },
  ],
  formatHints: [
    { format: 'int32', weight: 0.1 },
    { format: 'int64', weight: 0.1 },
  ],
  thresholds: { high: 0.75, medium: 0.50 },
}
