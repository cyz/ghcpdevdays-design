import type { BannerFormat, BannerState, FormatOption } from './types'

export const formatOptions: FormatOption[] = [
  {
    id: 'speaker_square',
    name: 'Speaker Profile',
    width: 1080,
    height: 1080,
    channels: ['Instagram', 'LinkedIn', 'X', 'BlueSky'],
  },
  {
    id: 'speaker_banner',
    name: 'Speaker Banner',
    width: 1080,
    height: 1350,
    channels: ['Instagram', 'LinkedIn', 'X', 'Facebook', 'BlueSky', 'Threads'],
  },
  {
    id: 'social_promo',
    name: 'Social Promo',
    width: 1080,
    height: 1350,
    channels: ['Instagram', 'LinkedIn', 'X', 'Facebook', 'BlueSky', 'Threads'],
  },
  {
    id: 'luma_cover',
    name: 'Luma Cover',
    width: 1000,
    height: 1000,
    channels: ['Luma'],
  },
]

export const defaultColors: BannerState['colors'] = {
  primary: '#f0f6fc',
  secondary: '#8b949e',
  accent: '#0abf40',
  background: '#0d1117',
}

export const brandTitleLine1 = 'GitHub Copilot'
export const brandTitleLine2 = 'Dev Days'
export const fixedEventTitle = 'Dev Days'
// Fixed green label shared by the Luma cover and the Speaker Banner.
export const fixedGreenLabel = 'DEV DAYS 2026'
export const lumaCityColor = '#00d12f'
// Text colors used on the light (lower) half of the speaker/social backgrounds.
export const lightAreaTitleColor = '#1f2328'
export const lightAreaMutedColor = '#57606a'

export const BANNER_HISTORY_STORAGE_KEY = 'banner-history-v1'
export const MAX_HISTORY_ITEMS = 20
export const MAX_SPEAKERS = 1
export const REPOSITORY_URL = 'https://github.com/cyz/devdays-design'
export const coverFormatIds: BannerFormat[] = ['luma_cover']
export const socialFormatIds: BannerFormat[] = ['speaker_banner', 'social_promo']
export const filenamePrefixByFormat: Record<BannerFormat, string> = {
  luma_cover: 'luma',
  social_promo: 'social',
  speaker_banner: 'speaker',
  speaker_square: 'speaker',
}
