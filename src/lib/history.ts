import { BANNER_HISTORY_STORAGE_KEY, defaultColors, fixedEventTitle } from '../constants'
import type { BannerHistoryItem, BannerState } from '../types'
import { uid } from './format'

export function buildDefaultState(): BannerState {
  return {
    format: 'luma_cover',
    colors: defaultColors,
    event: {
      title: fixedEventTitle,
      city: 'San Francisco',
      dateTime: 'Apr 15 • 7:00 PM',
      location: 'North Convention Center',
      organizerName: 'GitHub Community Brasil',
      organizerLogoDataUrl: '',
      includeSupportedBy: false,
      registrationEnabled: true,
      registrationStyle: 'cta_url',
      registrationText: 'Register now',
      registrationUrl: 'gh.io/devdays',
    },
    speakers: [
      {
        id: uid(),
        name: 'Speaker Name',
        role: 'Speaker Role',
      },
    ],
    partners: [],
    export: {
      type: 'png',
      scale: 2,
    },
  }
}

function isBannerHistoryItem(value: unknown): value is BannerHistoryItem {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.previewDataUrl === 'string' &&
    typeof candidate.state === 'object' &&
    candidate.state !== null
  )
}

export function readBannerHistory(): BannerHistoryItem[] {
  try {
    const raw = localStorage.getItem(BANNER_HISTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isBannerHistoryItem)
  } catch {
    return []
  }
}

export function writeBannerHistory(items: BannerHistoryItem[]) {
  localStorage.setItem(BANNER_HISTORY_STORAGE_KEY, JSON.stringify(items))
}
