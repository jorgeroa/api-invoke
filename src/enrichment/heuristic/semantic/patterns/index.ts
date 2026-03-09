/**
 * Pattern registry for semantic field detection.
 * 23 patterns across 6 domains.
 */

import type { SemanticPattern, SemanticCategory, CompositePattern } from '../types'

import { pricePattern, currencyCodePattern, skuPattern, quantityPattern } from './commerce'
import { emailPattern, phonePattern, uuidPattern, namePattern, addressPattern, urlPattern } from './identity'
import { imagePattern, videoPattern, thumbnailPattern, avatarPattern, audioPattern } from './media'
import { geoPattern } from './spatial'
import { ratingPattern, reviewsPattern, tagsPattern, statusPattern, titlePattern, descriptionPattern } from './engagement'
import { datePattern, timestampPattern } from './temporal'

const allPatterns: SemanticPattern[] = [
  pricePattern, currencyCodePattern, skuPattern, quantityPattern,
  emailPattern, phonePattern, uuidPattern, namePattern, addressPattern, urlPattern,
  imagePattern, videoPattern, thumbnailPattern, avatarPattern, audioPattern,
  geoPattern,
  ratingPattern, tagsPattern, statusPattern, titlePattern, descriptionPattern,
  datePattern, timestampPattern,
]

const patternMap = new Map<SemanticCategory, SemanticPattern>(
  allPatterns.map(pattern => [pattern.category, pattern])
)

const compositePatterns: CompositePattern[] = [reviewsPattern]

export function getAllPatterns(): SemanticPattern[] { return allPatterns }
export function getPattern(category: SemanticCategory): SemanticPattern | undefined { return patternMap.get(category) }
export function getCompositePatterns(): CompositePattern[] { return compositePatterns }

export {
  pricePattern, currencyCodePattern, skuPattern, quantityPattern,
  emailPattern, phonePattern, uuidPattern, namePattern, addressPattern, urlPattern,
  imagePattern, videoPattern, thumbnailPattern, avatarPattern, audioPattern,
  geoPattern,
  ratingPattern, reviewsPattern, tagsPattern, statusPattern, titlePattern, descriptionPattern,
  datePattern, timestampPattern,
}
