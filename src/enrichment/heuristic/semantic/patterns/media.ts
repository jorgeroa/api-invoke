/**
 * Media-related semantic patterns.
 * Patterns for image, video, audio, thumbnail, and avatar fields.
 */

import type { SemanticPattern } from '../types'

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i
const IMAGE_HOSTS = /\b(cloudinary|imgix|unsplash|imgur|flickr|staticflickr|googleusercontent|amazonaws|cloudfront|cdn)\b/i

function isImageURL(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false
  return IMAGE_EXTENSIONS.test(trimmed) || IMAGE_HOSTS.test(trimmed)
}

export const imagePattern: SemanticPattern = {
  category: 'image',
  namePatterns: [
    { regex: /\b(image|img|photo|picture|imagen|bild|pic|icon|logo)\b/i, weight: 0.4, languages: ['en', 'es', 'de'] },
  ],
  typeConstraint: { allowed: ['string'], weight: 0.2 },
  valueValidators: [{ name: 'isImageURL', validator: isImageURL, weight: 0.25 }],
  formatHints: [{ format: 'uri', weight: 0.15 }],
  thresholds: { high: 0.75, medium: 0.50 },
}

const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|avi|mkv|m4v|flv)(\?.*)?$/i
const VIDEO_HOSTS = /\b(youtube|vimeo|youtu\.be|wistia|dailymotion|vidyard)\b/i

export const videoPattern: SemanticPattern = {
  category: 'video',
  namePatterns: [
    { regex: /\b(video|movie|clip|film|media_url|video_url)\b/i, weight: 0.4, languages: ['en'] },
  ],
  typeConstraint: { allowed: ['string'], weight: 0.2 },
  valueValidators: [
    {
      name: 'isVideoURL',
      validator: (value: unknown): boolean => {
        if (typeof value !== 'string') return false
        const trimmed = value.trim()
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false
        return VIDEO_EXTENSIONS.test(trimmed) || VIDEO_HOSTS.test(trimmed)
      },
      weight: 0.25,
    },
  ],
  formatHints: [{ format: 'uri', weight: 0.15 }],
  thresholds: { high: 0.75, medium: 0.50 },
}

export const thumbnailPattern: SemanticPattern = {
  category: 'thumbnail',
  namePatterns: [
    { regex: /\b(thumb|thumbnail|preview|miniatura|thumb_url|thumbnail_url|preview_image)\b/i, weight: 0.4, languages: ['en', 'es'] },
  ],
  typeConstraint: { allowed: ['string'], weight: 0.2 },
  valueValidators: [{ name: 'isImageURL', validator: isImageURL, weight: 0.25 }],
  formatHints: [{ format: 'uri', weight: 0.15 }],
  thresholds: { high: 0.75, medium: 0.50 },
}

export const avatarPattern: SemanticPattern = {
  category: 'avatar',
  namePatterns: [
    { regex: /\b(avatar|profile_pic|profile_image|user_image|foto_perfil|profile_photo|user_avatar)\b/i, weight: 0.4, languages: ['en', 'es'] },
  ],
  typeConstraint: { allowed: ['string'], weight: 0.2 },
  valueValidators: [{ name: 'isImageURL', validator: isImageURL, weight: 0.25 }],
  formatHints: [{ format: 'uri', weight: 0.15 }],
  thresholds: { high: 0.75, medium: 0.50 },
}

const AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|flac|aac|m4a|wma|opus)(\?.*)?$/i
const AUDIO_HOSTS = /\b(soundcloud|spotify|anchor|castbox|podbean|buzzsprout|transistor)\b/i

export const audioPattern: SemanticPattern = {
  category: 'audio',
  namePatterns: [
    { regex: /\b(audio|sound|podcast|recording|voice|track|song|music|sonido|son|klang|som|audio_url|audio_file|audio_link)\b/i, weight: 0.4, languages: ['en', 'es', 'fr', 'de', 'pt'] },
  ],
  typeConstraint: { allowed: ['string'], weight: 0.2 },
  valueValidators: [
    {
      name: 'isAudioURL',
      validator: (value: unknown): boolean => {
        if (typeof value !== 'string') return false
        const trimmed = value.trim()
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false
        return AUDIO_EXTENSIONS.test(trimmed) || AUDIO_HOSTS.test(trimmed)
      },
      weight: 0.25,
    },
  ],
  formatHints: [{ format: 'uri', weight: 0.15 }],
  thresholds: { high: 0.75, medium: 0.50 },
}
