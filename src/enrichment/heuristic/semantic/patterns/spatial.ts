/**
 * Spatial semantic patterns.
 * Patterns for geographic coordinate fields.
 */

import type { SemanticPattern } from '../types'

export const geoPattern: SemanticPattern = {
  category: 'geo',
  namePatterns: [
    {
      regex: /\b(lat|lng|lon|latitude|longitude|coords?|coordinates?|geo|geolocation|geopoint|latlng|position|ubicacion|koordinaten|coordenadas|coordonnees|breitengrad|laengengrad|localizacao)\b/i,
      weight: 0.4,
      languages: ['en', 'es', 'fr', 'de', 'pt'],
    },
  ],
  typeConstraint: { allowed: ['number', 'string', 'object'], weight: 0.2 },
  valueValidators: [
    {
      name: 'isCoordinateValue',
      validator: (value: unknown): boolean => {
        if (typeof value === 'number') return value >= -180 && value <= 180
        if (typeof value === 'string') {
          const parts = value.split(',').map(s => parseFloat(s.trim()))
          if (parts.length === 2 && parts.every(p => !isNaN(p))) {
            const [lat, lng] = parts
            return lat! >= -90 && lat! <= 90 && lng! >= -180 && lng! <= 180
          }
        }
        return false
      },
      weight: 0.25,
    },
  ],
  formatHints: [],
  thresholds: { high: 0.75, medium: 0.50 },
}
