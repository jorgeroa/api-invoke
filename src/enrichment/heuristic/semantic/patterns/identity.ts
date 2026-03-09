/**
 * Identity-related semantic patterns.
 * Patterns for email, phone, UUID, name, address, and URL fields.
 */

import type { SemanticPattern } from '../types'

export const emailPattern: SemanticPattern = {
  category: 'email',
  namePatterns: [
    { regex: /\b(email|e_mail|email_address|correo|courriel|mail)\b/i, weight: 0.4, languages: ['en', 'es', 'fr'] },
  ],
  typeConstraint: { allowed: ['string'], weight: 0.2 },
  valueValidators: [
    {
      name: 'isEmailFormat',
      validator: (value: unknown): boolean => {
        if (typeof value !== 'string') return false
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
      },
      weight: 0.25,
    },
  ],
  formatHints: [{ format: 'email', weight: 0.15 }],
  thresholds: { high: 0.75, medium: 0.50 },
}

export const phonePattern: SemanticPattern = {
  category: 'phone',
  namePatterns: [
    { regex: /\b(phone|tel|telephone|mobile|cell|telefono|telefon|phone_number|cellphone)\b/i, weight: 0.4, languages: ['en', 'es', 'de'] },
  ],
  typeConstraint: { allowed: ['string'], weight: 0.2 },
  valueValidators: [
    {
      name: 'isPhoneFormat',
      validator: (value: unknown): boolean => {
        if (typeof value !== 'string') return false
        return /^\+?[\d\s\-()]{7,20}$/.test(value.trim())
      },
      weight: 0.25,
    },
  ],
  formatHints: [{ format: 'phone', weight: 0.15 }],
  thresholds: { high: 0.75, medium: 0.50 },
}

export const uuidPattern: SemanticPattern = {
  category: 'uuid',
  namePatterns: [
    { regex: /\b(uuid|guid|unique_id)\b/i, weight: 0.4, languages: ['en'] },
    { regex: /\bid\b/i, weight: 0.2, languages: ['en'] },
  ],
  typeConstraint: { allowed: ['string'], weight: 0.2 },
  valueValidators: [
    {
      name: 'isUUIDv4Format',
      validator: (value: unknown): boolean => {
        if (typeof value !== 'string') return false
        return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim())
      },
      weight: 0.3,
    },
  ],
  formatHints: [{ format: 'uuid', weight: 0.1 }],
  thresholds: { high: 0.75, medium: 0.50 },
}

export const namePattern: SemanticPattern = {
  category: 'name',
  namePatterns: [
    { regex: /\b(name|nombre|nom|fullname|full_name|username|first_name|last_name|firstname|lastname|display_name)\b/i, weight: 0.4, languages: ['en', 'es', 'fr'] },
  ],
  typeConstraint: { allowed: ['string'], weight: 0.2 },
  valueValidators: [
    {
      name: 'isNameLike',
      validator: (value: unknown): boolean => {
        if (typeof value !== 'string') return false
        const trimmed = value.trim()
        if (trimmed.length < 2 || trimmed.length > 100) return false
        if (/^\d+$/.test(trimmed)) return false
        const words = trimmed.split(/\s+/)
        if (words.length > 5) return false
        return words.every(w => /^[a-zA-Z\u00C0-\u024F][a-zA-Z\u00C0-\u024F'.\-]*$/.test(w))
      },
      weight: 0.3,
    },
  ],
  formatHints: [],
  thresholds: { high: 0.75, medium: 0.50 },
}

export const addressPattern: SemanticPattern = {
  category: 'address',
  namePatterns: [
    { regex: /\b(address|street|city|zip|postal|direccion|adresse|location|addr|street_address|postal_code|zip_code)\b/i, weight: 0.4, languages: ['en', 'es', 'fr', 'de'] },
  ],
  typeConstraint: { allowed: ['string'], weight: 0.2 },
  valueValidators: [
    {
      name: 'isAddressLike',
      validator: (value: unknown): boolean => {
        if (typeof value !== 'string') return false
        const trimmed = value.trim()
        if (trimmed.length < 5) return false
        const addressTokens = /\b(st|ave|rd|blvd|street|avenue|road|drive|lane|way|court|plaza|calle|rue|strasse|straße|platz|via|avenida|rua|apt|suite|floor|unit|po box)\b/i
        if (addressTokens.test(trimmed.toLowerCase())) return true
        if (!/\s/.test(trimmed)) return false
        return /\d/.test(trimmed) && /[a-zA-Z]/.test(trimmed)
      },
      weight: 0.3,
    },
  ],
  formatHints: [],
  thresholds: { high: 0.75, medium: 0.50 },
}

export const urlPattern: SemanticPattern = {
  category: 'url',
  namePatterns: [
    { regex: /\b(url|link|href|website|webpage|uri|homepage|web_url)\b/i, weight: 0.4, languages: ['en'] },
  ],
  typeConstraint: { allowed: ['string'], weight: 0.2 },
  valueValidators: [
    {
      name: 'isURLFormat',
      validator: (value: unknown): boolean => {
        if (typeof value !== 'string') return false
        const trimmed = value.trim()
        return trimmed.startsWith('http://') || trimmed.startsWith('https://')
      },
      weight: 0.25,
    },
  ],
  formatHints: [
    { format: 'uri', weight: 0.1 },
    { format: 'url', weight: 0.1 },
  ],
  thresholds: { high: 0.75, medium: 0.50 },
}
