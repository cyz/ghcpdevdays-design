import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDownIcon,
  CopilotIcon,
  DownloadIcon,
  HistoryIcon,
  MarkGithubIcon,
  ScreenFullIcon,
  SidebarCollapseIcon,
  SidebarExpandIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '@primer/octicons-react'
import './App.css'
import lumaBackgroundImage from './assets/luma-background.png'
import speakerBackgroundImage from './assets/speaker-background.png'

type BannerFormat =
  | 'speaker_square'
  | 'speaker_banner'
  | 'social_promo'
  | 'luma_cover'

type ExportType = 'png' | 'jpg'
type ExportScale = 1 | 2

interface Speaker {
  id: string
  name: string
  role?: string
  photoDataUrl?: string
}

interface PartnerLogo {
  id: string
  imageDataUrl: string
}

interface EventDetails {
  title: string
  city: string
  dateTime: string
  location: string
  organizerName: string
  organizerLogoDataUrl?: string
  includeSupportedBy: boolean
  registrationEnabled: boolean
  registrationStyle: 'cta_url' | 'url_only'
  registrationText: string
  registrationUrl: string
}

interface BannerState {
  format: BannerFormat
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
  }
  event: EventDetails
  speakers: Speaker[]
  partners: PartnerLogo[]
  export: {
    type: ExportType
    scale: ExportScale
  }
}

interface BannerHistoryItem {
  id: string
  createdAt: string
  state: BannerState
  previewDataUrl: string
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

interface FormatOption {
  id: BannerFormat
  name: string
  width: number
  height: number
  channels?: string[]
}

const formatOptions: FormatOption[] = [
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

const defaultColors: BannerState['colors'] = {
  primary: '#f0f6fc',
  secondary: '#8b949e',
  accent: '#0abf40',
  background: '#0d1117',
}

const brandTitleLine1 = 'GitHub Copilot'
const brandTitleLine2 = 'Dev Days'
const fixedEventTitle = 'GitHub Copilot Dev Days'
const lumaCityColor = '#00d12f'

const BANNER_HISTORY_STORAGE_KEY = 'banner-history-v1'
const MAX_HISTORY_ITEMS = 20
const MAX_SPEAKERS = 1
const REPOSITORY_URL = 'https://github.com/cyz/banner-generator'
const coverFormatIds: BannerFormat[] = ['luma_cover']
const socialFormatIds: BannerFormat[] = ['speaker_banner', 'social_promo']
const filenamePrefixByFormat: Record<BannerFormat, string> = {
  luma_cover: 'luma',
  social_promo: 'social',
  speaker_banner: 'speaker',
  speaker_square: 'speaker',
}

const imageCache = new Map<string, Promise<HTMLImageElement>>()

function uid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return 'SP'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function buildDefaultState(): BannerState {
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

function readBannerHistory(): BannerHistoryItem[] {
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

function writeBannerHistory(items: BannerHistoryItem[]) {
  localStorage.setItem(BANNER_HISTORY_STORAGE_KEY, JSON.stringify(items))
}

function loadImage(src: string) {
  const cached = imageCache.get(src)
  if (cached) return cached

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })

  imageCache.set(src, promise)
  return promise
}

function getBackgroundImage(format: BannerFormat) {
  if (format === 'speaker_square') return null
  if (format === 'speaker_banner') return speakerBackgroundImage
  if (format === 'social_promo') return speakerBackgroundImage
  if (format === 'luma_cover') return lumaBackgroundImage
  return null
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width <= maxWidth) {
      line = test
    } else {
      if (line) lines.push(line)
      line = word
    }
  }

  if (line) lines.push(line)
  if (lines.length <= maxLines) return lines

  const truncated = lines.slice(0, maxLines)
  while (ctx.measureText(`${truncated[maxLines - 1]}...`).width > maxWidth && truncated[maxLines - 1].length > 0) {
    truncated[maxLines - 1] = truncated[maxLines - 1].slice(0, -1)
  }
  truncated[maxLines - 1] = `${truncated[maxLines - 1]}...`
  return truncated
}

function wrapTextWithBreaks(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const chunks = text
    .split(/\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (chunks.length === 0) return ['']

  const lines: string[] = []
  for (const chunk of chunks) {
    const remaining = maxLines - lines.length
    if (remaining <= 0) break
    const wrapped = wrapText(ctx, chunk, maxWidth, remaining)
    lines.push(...wrapped)
  }

  return lines.slice(0, maxLines)
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

async function renderBanner(
  canvas: HTMLCanvasElement,
  state: BannerState,
  format: FormatOption,
  backgroundFailed: boolean,
  scale: ExportScale,
) {
  const width = format.width
  const height = format.height
  canvas.width = width * scale
  canvas.height = height * scale

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.clearRect(0, 0, width, height)

  const selectedBackgroundImage = getBackgroundImage(state.format)

  if (!backgroundFailed && selectedBackgroundImage) {
    try {
      const bg = await loadImage(selectedBackgroundImage)
      ctx.drawImage(bg, 0, 0, width, height)
    } catch {
      const gradient = ctx.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, state.colors.background)
      gradient.addColorStop(1, '#1f2937')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
    }
  } else if (!selectedBackgroundImage) {
    const isSpeakerFormat = state.format === 'speaker_square' || state.format === 'speaker_banner' || state.format === 'social_promo'
    ctx.fillStyle = isSpeakerFormat ? '#121613' : '#000000'
    ctx.fillRect(0, 0, width, height)
  } else {
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, state.colors.background)
    gradient.addColorStop(1, state.colors.accent)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }

  const padding = Math.round(width * 0.06)
  const isLumaCover = state.format === 'luma_cover'
  const isSpeakerBanner = state.format === 'speaker_banner'
  const isSocialPromo = state.format === 'social_promo'
  const socialPromoScale = isSocialPromo ? 1.28 : 1
  const isMinimalCover = isLumaCover
  const isSpeakerProfile = state.format === 'speaker_square'
  const isSpeakerFormat = isSpeakerProfile || state.format === 'speaker_banner' || isSocialPromo
  const hasSpeakers = !isMinimalCover && !isSocialPromo && state.speakers.length > 0
  let socialPromoLocationBottomY = 0
  let speakerBannerProfileBottomY = 0

  const titleSize = Math.max(36, Math.round(width * 0.04))
  const metaSize = Math.max(20, Math.round(width * 0.018))
  if (isMinimalCover) {
    const citySize = Math.max(18, Math.round(width * 0.026))
    const cityFontFamily = '"Mona Sans", sans-serif'
    const cityX = Math.round(padding * 0.75)
    const dateSize = Math.round(metaSize * 1.2)
    const dateColor = state.colors.secondary
    const textMaxWidth = Math.round(width * 0.36)
    let eventTitleSize = 84
    while (eventTitleSize > 56) {
      ctx.font = `600 ${eventTitleSize}px "Mona Sans", sans-serif`
      if (ctx.measureText(brandTitleLine1).width <= textMaxWidth) break
      eventTitleSize -= 2
    }

    ctx.font = `500 ${citySize}px ${cityFontFamily}`
    const cityLines = wrapText(ctx, state.event.city || 'City', textMaxWidth, 2)
    const cityLineStep = citySize * 1.1
    const eventLineStep = eventTitleSize * 1.08

    ctx.font = `500 ${dateSize}px "Mona Sans", sans-serif`
    const dateLines = wrapText(ctx, state.event.dateTime || 'Date/Time', textMaxWidth, 2)
    const dateLineStep = dateSize * 1.25

    let cityY = 620
    let eventTitleY = cityY + cityLines.length * cityLineStep + 90
    let dateY = 980

    {
      const cityEventGap = 60
      const eventDateGap = metaSize * 2.7
      const bottomInset = cityX
      const dateBlockHeight = (dateLines.length - 1) * dateLineStep
      dateY = height - bottomInset - dateBlockHeight
      eventTitleY = dateY - eventDateGap - eventLineStep
      const cityBlockHeight = (cityLines.length - 1) * cityLineStep
      cityY = eventTitleY - cityEventGap - cityBlockHeight
    }

    ctx.fillStyle = lumaCityColor
    ctx.font = `500 ${citySize}px ${cityFontFamily}`
    cityLines.forEach((line, index) => {
      ctx.fillText(line, cityX, cityY + index * cityLineStep)
    })

    ctx.font = `600 ${eventTitleSize}px "Mona Sans", sans-serif`
    ctx.fillStyle = dateColor
    ctx.fillText(brandTitleLine1, cityX, eventTitleY)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(brandTitleLine2, cityX, eventTitleY + eventLineStep)

    ctx.fillStyle = dateColor
    ctx.font = `500 ${dateSize}px "Mona Sans", sans-serif`
    dateLines.forEach((line, index) => {
      ctx.fillText(line, cityX, dateY + index * dateLineStep)
    })
  } else {
    if (isSpeakerFormat) {
      const citySize = Math.max(18, Math.round(width * 0.026 * socialPromoScale))
      const dateSize = Math.round(metaSize * 1.2 * socialPromoScale)
      const dateColor = '#7f8d86'
      const textX = padding
      const textMaxWidth = width - padding * 2
      let eventTitleSize = Math.round(84 * socialPromoScale)

      while (eventTitleSize > Math.round(56 * socialPromoScale)) {
        ctx.font = `600 ${eventTitleSize}px "Mona Sans", sans-serif`
        if (ctx.measureText(brandTitleLine1).width <= textMaxWidth) break
        eventTitleSize -= 2
      }

      ctx.font = `500 ${citySize}px "Mona Sans", sans-serif`
      const cityLines = wrapText(ctx, state.event.city || 'City', textMaxWidth, 2)
      const cityLineStep = citySize * 1.1
      const eventLineStep = eventTitleSize * 1.08

      ctx.font = `500 ${dateSize}px "Mona Sans", sans-serif`
      const dateLines = wrapText(ctx, state.event.dateTime || 'Date/Time', textMaxWidth, 2)
      const dateLineStep = dateSize * 1.25

      const topCityY = padding * 1.5
      const topEventTitleY = topCityY + cityLines.length * cityLineStep + (isSocialPromo ? Math.round(58 * socialPromoScale) : 58)
      const topDateY = topEventTitleY + eventLineStep * 2 + (isSocialPromo ? Math.round(2 * socialPromoScale) : 2)
      const useBannerPositioning = isSpeakerBanner || isSocialPromo
      const cityY = useBannerPositioning ? topDateY - (isSocialPromo ? Math.round(36 * socialPromoScale) : 36) : topCityY
      const cityToEventGap = isSocialPromo ? Math.round(52 * socialPromoScale) : useBannerPositioning ? 52 : 58
      const eventTitleY = cityY + cityLines.length * cityLineStep + cityToEventGap
      const dateY = eventTitleY + eventLineStep + (isSocialPromo ? Math.round(60 * socialPromoScale) : useBannerPositioning ? 60 : eventLineStep + 2)
      const locationSize = Math.max(Math.round(dateSize * 0.92), Math.round(metaSize * 1.15))
      const locationY = dateY + dateLines.length * dateLineStep + (isSocialPromo ? Math.round(height * 0.024 * socialPromoScale) : 0)

      ctx.fillStyle = lumaCityColor
      ctx.font = `500 ${citySize}px "Mona Sans", sans-serif`
      cityLines.forEach((line, index) => {
        ctx.fillText(line, textX, cityY + index * cityLineStep)
      })

      ctx.font = `600 ${eventTitleSize}px "Mona Sans", sans-serif`
      ctx.fillStyle = dateColor
      ctx.fillText(brandTitleLine1, textX, eventTitleY)
      ctx.fillStyle = '#ffffff'
      ctx.fillText(brandTitleLine2, textX, eventTitleY + eventLineStep)

      ctx.fillStyle = dateColor
      ctx.font = `500 ${dateSize}px "Mona Sans", sans-serif`
      dateLines.forEach((line, index) => {
        ctx.fillText(line, textX, dateY + index * dateLineStep)
      })

      if (isSocialPromo) {
        socialPromoLocationBottomY = dateY + (dateLines.length - 1) * dateLineStep + Math.round(dateSize * 0.35)
      }

      if (isSocialPromo && state.event.location.trim()) {
        ctx.fillStyle = '#9aa5af'
        ctx.font = `500 ${locationSize}px "Mona Sans", sans-serif`
        const locationLines = wrapTextWithBreaks(ctx, state.event.location.trim(), textMaxWidth, 2)
        locationLines.forEach((line, index) => {
          ctx.fillText(line, textX, locationY + index * locationSize * 1.16)
        })
        socialPromoLocationBottomY =
          locationY + (locationLines.length - 1) * locationSize * 1.16 + Math.round(locationSize * 0.35)
      }
    } else {
      ctx.fillStyle = state.colors.primary
      ctx.font = `700 ${titleSize}px "Mona Sans", sans-serif`

      let titleTop = padding * 1.4
      if (!hasSpeakers) {
        titleTop = height * 0.42
      }

      const titleLines = wrapText(ctx, state.event.title || 'Event Title', width - padding * 2, 3)
      titleLines.forEach((line, index) => {
        ctx.fillText(line, padding, titleTop + index * titleSize * 1.15)
      })

      ctx.fillStyle = state.colors.secondary
      ctx.font = `500 ${metaSize}px "Mona Sans", sans-serif`
      const metaY = titleTop + titleLines.length * titleSize * 1.15 + metaSize * 1.3
      const metaText = [state.event.city, state.event.dateTime, state.event.location].filter(Boolean).join(' • ') || 'City • Date/Time • Location'
      const metaLines = wrapText(ctx, metaText, width - padding * 2, 2)
      metaLines.forEach((line, index) => {
        ctx.fillText(line, padding, metaY + index * metaSize * 1.25)
      })
    }
  }

  const drawOrganizationPanel = async (infoY: number, infoH: number, textScale = 1) => {
    const infoX = padding
    const infoW = width - padding * 2
    const blockGap = Math.round(28 * textScale)
    const leftW = Math.round((infoW - blockGap) / 2)
    const rightX = infoX + leftW + blockGap
    const rightW = infoW - leftW - blockGap

    const innerPadX = Math.round(16 * textScale)
    const horizontalInset = isSocialPromo || isSpeakerBanner ? 0 : innerPadX
    const titleYOffset = Math.round(30 * textScale)
    const contentOffset = Math.round(40 * textScale)
    const bottomInset = Math.round(10 * textScale)
    const logoGap = Math.round(15 * textScale)

    const headingSize = Math.round(metaSize * 1.2 * textScale)
    const showOrganizerLogo = Boolean(state.event.organizerLogoDataUrl)
    const organizerName = state.event.organizerName.trim()
    const titleY = infoY + titleYOffset
    const contentTopY = titleY + contentOffset
    const organizationTitleX = infoX + horizontalInset
    const supportedByTitleX = rightX + horizontalInset

    ctx.fillStyle = '#8b949e'
    ctx.font = `600 ${headingSize}px "Mona Sans", sans-serif`
    ctx.fillText('Organization', organizationTitleX, titleY)

    if (showOrganizerLogo && state.event.organizerLogoDataUrl) {
      try {
        const organizerLogo = await loadImage(state.event.organizerLogoDataUrl)
        const logoMaxH = infoH - (contentTopY - infoY) - bottomInset
        const logoMaxW = leftW - horizontalInset * 2
        const ratio = organizerLogo.width / organizerLogo.height
        const targetW = Math.min(logoMaxW, logoMaxH * ratio)
        const targetH = targetW / ratio
        const logoX = organizationTitleX
        const logoY = contentTopY
        ctx.drawImage(organizerLogo, logoX, logoY, targetW, targetH)
      } catch {
        // Keep rendering supported-by section even if organizer logo fails to load.
      }
    } else if (organizerName) {
      const textMaxW = leftW - horizontalInset * 2
      const textSize = Math.max(headingSize + Math.round(8 * textScale), Math.round(metaSize * 1.75 * textScale))
      const textLeading = Math.round(textSize * 1.08)
      const lines = wrapTextWithBreaks(ctx, organizerName, textMaxW, 3)

      ctx.fillStyle = state.colors.primary
      ctx.font = `600 ${textSize}px "Mona Sans", sans-serif`
      lines.forEach((line, index) => {
        ctx.fillText(line, organizationTitleX, contentTopY + textLeading * index)
      })
    }

    const showSupportedBy = state.event.includeSupportedBy && state.partners.length > 0
    if (showSupportedBy) {
      ctx.fillStyle = '#8b949e'
      ctx.font = `600 ${headingSize}px "Mona Sans", sans-serif`
      ctx.fillText('Supported by', supportedByTitleX, titleY)

      const logos = state.partners.slice(0, 3)
      const logosY = contentTopY
      const logosAreaW = rightW - horizontalInset * 2
      const logosAreaH = infoH - (contentTopY - infoY) - bottomInset
      const columns = logos.length
      const rows = 1
      const totalLogoGap = logoGap * Math.max(columns - 1, 0)
      const logoSlotW = (logosAreaW - totalLogoGap) / Math.max(columns, 1)
      const logoSlotH = logosAreaH / rows

      for (let i = 0; i < logos.length; i += 1) {
        try {
          const logo = await loadImage(logos[i].imageDataUrl)
          const ratio = logo.width / logo.height
          const col = i
          const row = 0
          const slotX = supportedByTitleX + (logoSlotW + logoGap) * col
          const slotY = logosY + logoSlotH * row
          let targetW = Math.min(logoSlotW * 0.92, logoSlotH * ratio)
          let targetH = targetW / ratio
          if (targetH > logoSlotH) {
            targetH = logoSlotH
            targetW = targetH * ratio
          }
          const x = col === 0 ? slotX : slotX + (logoSlotW - targetW) / 2
          const y = slotY + (logoSlotH - targetH) / 2
          ctx.drawImage(logo, x, y, targetW, targetH)
        } catch {
          continue
        }
      }
    }
  }

  const speakerBaseY = isSpeakerProfile ? height * 0.58 : height * 0.68
  const speakerSize = isSpeakerProfile ? width * 0.19 : width * 0.1
  const speakerGap = width * 0.04

  if (hasSpeakers) {
    if (isSpeakerBanner) {
      const speaker = state.speakers[0]
      const avatarSize = Math.round(width * 0.34)
      const avatarRadius = Math.round(avatarSize * 0.08)
      const avatarBorderWidth = Math.max(4, Math.round(avatarSize * 0.02))
      const sideInset = padding
      const rowX = sideInset
      const rowY = Math.round(height * 0.5) - 60
      const textX = rowX + avatarSize + speakerGap
      const textMaxWidth = Math.max(140, width - sideInset - textX)

      ctx.save()
      roundedRectPath(ctx, rowX, rowY, avatarSize, avatarSize, avatarRadius)
      ctx.clip()

      if (speaker.photoDataUrl) {
        try {
          const photo = await loadImage(speaker.photoDataUrl)
          const sx = photo.width > photo.height ? (photo.width - photo.height) / 2 : 0
          const sy = photo.height > photo.width ? (photo.height - photo.width) / 2 : 0
          const side = Math.min(photo.width, photo.height)
          ctx.drawImage(photo, sx, sy, side, side, rowX, rowY, avatarSize, avatarSize)
        } catch {
          ctx.fillStyle = state.colors.accent
          ctx.fillRect(rowX, rowY, avatarSize, avatarSize)
        }
      } else {
        ctx.fillStyle = state.colors.accent
        ctx.fillRect(rowX, rowY, avatarSize, avatarSize)
      }

      ctx.restore()

      ctx.save()
      roundedRectPath(ctx, rowX, rowY, avatarSize, avatarSize, avatarRadius)
      ctx.lineWidth = avatarBorderWidth
      ctx.strokeStyle = '#0abf40'
      ctx.stroke()
      ctx.restore()

      if (!speaker.photoDataUrl) {
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.font = `700 ${Math.round(avatarSize * 0.27)}px "Mona Sans", sans-serif`
        ctx.fillText(getInitials(speaker.name), rowX + avatarSize / 2, rowY + avatarSize * 0.58)
        ctx.textAlign = 'left'
      }

      const nameSize = Math.max(Math.round(width * 0.058), Math.round(metaSize * 2.4))
      const roleSize = Math.max(Math.round(nameSize * 0.55), Math.round(metaSize * 1.45))
      const nameStartY = rowY + avatarSize * 0.36

      ctx.fillStyle = state.colors.primary
      ctx.font = `700 ${nameSize}px "Mona Sans", sans-serif`
      const nameLines = wrapText(ctx, speaker.name || 'Speaker', textMaxWidth, 3)
      nameLines.forEach((line, idx) => {
        ctx.fillText(line, textX, nameStartY + idx * nameSize * 1.03)
      })

      if (speaker.role) {
        ctx.fillStyle = state.colors.secondary
        ctx.font = `500 ${roleSize}px "Mona Sans", sans-serif`
        const roleLines = wrapText(ctx, speaker.role, textMaxWidth, 2)
        const roleStartY = nameStartY + nameLines.length * nameSize * 1.03 + roleSize
        roleLines.forEach((line, idx) => {
          ctx.fillText(line, textX, roleStartY + idx * roleSize * 1.02)
        })
      }

      speakerBannerProfileBottomY = rowY + avatarSize
    } else {
      const visibleSpeakers = state.speakers.slice(0, MAX_SPEAKERS)
      const totalWidth = visibleSpeakers.reduce((sum, _, index) => {
        const size = isSpeakerProfile && index === 0 ? speakerSize * 1.25 : speakerSize
        return sum + size
      }, 0) + speakerGap * Math.max(visibleSpeakers.length - 1, 0)

      let cursorX = (width - totalWidth) / 2
      for (let i = 0; i < visibleSpeakers.length; i += 1) {
        const speaker = visibleSpeakers[i]
        const isFeatured = isSpeakerProfile && i === 0
        const avatarSize = isFeatured ? speakerSize * 1.25 : speakerSize
        const avatarY = speakerBaseY

        ctx.save()
        ctx.beginPath()
        ctx.arc(cursorX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
        ctx.clip()

        if (speaker.photoDataUrl) {
          try {
            const photo = await loadImage(speaker.photoDataUrl)
            const sx = photo.width > photo.height ? (photo.width - photo.height) / 2 : 0
            const sy = photo.height > photo.width ? (photo.height - photo.width) / 2 : 0
            const side = Math.min(photo.width, photo.height)
            ctx.drawImage(photo, sx, sy, side, side, cursorX, avatarY, avatarSize, avatarSize)
          } catch {
            ctx.fillStyle = state.colors.accent
            ctx.fillRect(cursorX, avatarY, avatarSize, avatarSize)
          }
        } else {
          ctx.fillStyle = state.colors.accent
          ctx.fillRect(cursorX, avatarY, avatarSize, avatarSize)
        }

        ctx.restore()

        if (!speaker.photoDataUrl) {
          ctx.fillStyle = '#ffffff'
          ctx.textAlign = 'center'
          ctx.font = `700 ${Math.round(avatarSize * 0.27)}px "Mona Sans", sans-serif`
          ctx.fillText(getInitials(speaker.name), cursorX + avatarSize / 2, avatarY + avatarSize * 0.58)
          ctx.textAlign = 'left'
        }

        const textY = avatarY + avatarSize + metaSize * 1.3
        ctx.fillStyle = state.colors.primary
        ctx.font = `700 ${Math.round(metaSize * (isFeatured ? 1.2 : 1))}px "Mona Sans", sans-serif`
        const nameLines = wrapText(ctx, speaker.name || 'Speaker', avatarSize * 1.4, 2)
        nameLines.forEach((line, idx) => {
          ctx.fillText(line, cursorX, textY + idx * metaSize * 1.05)
        })

        if (speaker.role) {
          ctx.fillStyle = state.colors.secondary
          ctx.font = `500 ${Math.round(metaSize * 0.85)}px "Mona Sans", sans-serif`
          const roleLines = wrapText(ctx, speaker.role, avatarSize * 1.4, 2)
          const roleStart = textY + nameLines.length * metaSize * 1.05 + metaSize * 0.9
          roleLines.forEach((line, idx) => {
            ctx.fillText(line, cursorX, roleStart + idx * metaSize * 0.92)
          })
        }

        cursorX += avatarSize + speakerGap
      }
    }
  }

  if (isSpeakerBanner || isSocialPromo) {
    const infoH = Math.round(height * (isSocialPromo ? 0.17 : 0.16))
    const registerTopGap = 40
    const registerBottomGap = 40
    let nextSectionStartY = Math.round(
      isSocialPromo
        ? height * 0.67
        : Math.max(height * 0.78, speakerBannerProfileBottomY + registerTopGap),
    )

    if (state.event.registrationEnabled && state.event.registrationUrl.trim()) {
      const registrationScale = isSocialPromo ? socialPromoScale : 1
      const barHeight = Math.round(height * 0.082 * registrationScale)
      const barW = width - padding * 2
      const textInset = Math.round(barHeight * 0.3)
      const organizationLabelSize = Math.round(metaSize * 1.2 * registrationScale)
      const labelSize = Math.max(18, organizationLabelSize)
      const urlSize = labelSize

      const urlText = state.event.registrationUrl.trim()
      const ctaText = state.event.registrationStyle === 'url_only' ? '' : state.event.registrationText.trim() || 'Register'
      const lineSize = Math.max(urlSize, labelSize)
      const lineY = Math.max(
        Math.round(isSocialPromo ? height * 0.74 : height * 0.72),
        Math.round(
          (isSocialPromo ? socialPromoLocationBottomY : speakerBannerProfileBottomY) +
            registerTopGap +
            lineSize * 0.8,
        ),
      )
      const labelX = padding
      const urlRightX = width - padding
      const maxUrlW = Math.max(120, barW - textInset * 2)
      const registerLabelColor = state.colors.secondary
      const registerUrlColor = lumaCityColor
      const registerGap = Math.round(metaSize * 0.45)

      ctx.textBaseline = 'middle'

      if (ctaText) {
        ctx.fillStyle = registerLabelColor
        ctx.font = `500 ${labelSize}px "Mona Sans", sans-serif`
        const label = wrapText(ctx, `${ctaText}:`, maxUrlW * 0.45, 1)[0] || `${ctaText}:`
        ctx.fillText(label, labelX, lineY)

        const labelWidth = ctx.measureText(label).width
        const urlStartX = labelX + labelWidth + registerGap
        const availableUrlW = Math.max(100, urlRightX - urlStartX)
        ctx.fillStyle = registerUrlColor
        ctx.font = `500 ${Math.max(urlSize, labelSize)}px "Mona Sans", sans-serif`
        const shortUrl = wrapText(ctx, urlText, availableUrlW, 1)[0] || urlText
        ctx.fillText(shortUrl, urlStartX, lineY)
      } else {
        ctx.fillStyle = registerUrlColor
        ctx.font = `500 ${Math.max(urlSize, labelSize)}px "Mona Sans", sans-serif`
        const shortUrl = wrapText(ctx, urlText, Math.max(100, urlRightX - labelX), 1)[0] || urlText
        ctx.fillText(shortUrl, labelX, lineY)
      }
      ctx.textBaseline = 'alphabetic'

      const lineBottomY = lineY + Math.round(lineSize * 0.35)
      nextSectionStartY = Math.round(lineBottomY + registerBottomGap)
    }

    const maxInfoY = height - infoH - Math.round(padding * 0.35)
    const infoY = Math.min(nextSectionStartY, maxInfoY)
    await drawOrganizationPanel(infoY, infoH, isSocialPromo ? socialPromoScale : 1)
  }

  if (!isMinimalCover && !isSpeakerBanner && !isSocialPromo && state.partners.length > 0) {
    const logos = state.partners.slice(0, 8)
    const footerHeight = Math.round(height * 0.13)
    const footerY = height - footerHeight - padding * 0.25

    const logoAreaX = padding
    const logoAreaWidth = width - padding * 2
    const logoGap = 15
    const totalLogoGap = logoGap * Math.max(logos.length - 1, 0)
    const slotWidth = (logoAreaWidth - totalLogoGap) / logos.length
    const logoMaxH = footerHeight * 0.56

    for (let i = 0; i < logos.length; i += 1) {
      try {
        const logo = await loadImage(logos[i].imageDataUrl)
        const ratio = logo.width / logo.height
        const targetH = Math.min(logoMaxH, slotWidth * 0.5)
        const targetW = targetH * ratio
        const x = logoAreaX + (slotWidth + logoGap) * i + (slotWidth - targetW) / 2
        const y = footerY + (footerHeight - targetH) / 2
        ctx.drawImage(logo, x, y, targetW, targetH)
      } catch {
        continue
      }
    }
  }
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Unexpected file reader result type'))
        return
      }
      resolve(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

function App() {
  const [backgroundFailed, setBackgroundFailed] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<BannerHistoryItem[]>(() => readBannerHistory())
  const [speakerPreviews, setSpeakerPreviews] = useState<Array<{ id: string; name: string; previewDataUrl: string }>>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [state, setState] = useState<BannerState>(() => buildDefaultState())

  const format = useMemo(
    () => formatOptions.find((item) => item.id === state.format) ?? formatOptions[0],
    [state.format],
  )
  const isLumaCover = state.format === 'luma_cover'
  const isSpeakerBanner = state.format === 'speaker_banner'
  const isSpeakerSquare = state.format === 'speaker_square'
  const isSocialPromo = state.format === 'social_promo'
  const isMinimalCover = isLumaCover
  const isSpeakerPerBannerFormat = isSpeakerBanner || isSpeakerSquare
  const namedSpeakers = useMemo(
    () => state.speakers.filter((speaker) => speaker.name.trim().length > 0).slice(0, MAX_SPEAKERS),
    [state.speakers],
  )
  const showMultiSpeakerPreviewGrid = isSpeakerPerBannerFormat && namedSpeakers.length > 1
  const selectedBackgroundImage = useMemo(() => getBackgroundImage(state.format), [state.format])
  const previewBackgroundFailed = selectedBackgroundImage ? backgroundFailed : false

  useEffect(() => {
    let mounted = true

    const draw = async () => {
      if (!canvasRef.current) return
      if (showMultiSpeakerPreviewGrid) {
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        return
      }
      await renderBanner(canvasRef.current, state, format, previewBackgroundFailed, 1)
    }

    draw().catch(() => {
      if (mounted) setError('Failed to render preview.')
    })

    return () => {
      mounted = false
    }
  }, [state, format, previewBackgroundFailed, showMultiSpeakerPreviewGrid])

  useEffect(() => {
    let cancelled = false

    const drawSpeakerPreviews = async () => {
      if (!isSpeakerPerBannerFormat || namedSpeakers.length <= 1) {
        setSpeakerPreviews([])
        return
      }

      const previews: Array<{ id: string; name: string; previewDataUrl: string }> = []

      for (const speaker of namedSpeakers) {
        const previewCanvas = document.createElement('canvas')
        const previewState: BannerState = {
          ...state,
          speakers: [speaker],
        }
        await renderBanner(previewCanvas, previewState, format, previewBackgroundFailed, 1)
        previews.push({
          id: speaker.id,
          name: speaker.name,
          previewDataUrl: previewCanvas.toDataURL('image/jpeg', 0.8),
        })
      }

      if (!cancelled) {
        setSpeakerPreviews(previews)
      }
    }

    drawSpeakerPreviews().catch(() => {
      if (!cancelled) {
        setSpeakerPreviews([])
      }
    })

    return () => {
      cancelled = true
    }
  }, [state, format, previewBackgroundFailed, isSpeakerPerBannerFormat, namedSpeakers])

  useEffect(() => {
    if (!selectedBackgroundImage) return
    loadImage(selectedBackgroundImage)
      .then(() => setBackgroundFailed(false))
      .catch(() => setBackgroundFailed(true))
  }, [selectedBackgroundImage])

  const addSpeaker = () => {
    if (state.speakers.length >= MAX_SPEAKERS) return
    setState((previous) => ({
      ...previous,
      speakers: [...previous.speakers, { id: uid(), name: '', role: '' }],
    }))
  }

  const updateEvent = (patch: Partial<EventDetails>) =>
    setState((prev) => ({ ...prev, event: { ...prev.event, ...patch } }))

  const updateSpeaker = (id: string, patch: Partial<Speaker>) =>
    setState((prev) => ({
      ...prev,
      speakers: prev.speakers.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }))

  const resetAll = () => {
    setState(buildDefaultState())
    setZoom(1)
  }

  const zoomIn = () => setZoom((value) => Math.min(2, Math.round((value + 0.1) * 10) / 10))
  const zoomOut = () => setZoom((value) => Math.max(0.3, Math.round((value - 0.1) * 10) / 10))
  const fitZoom = () => setZoom(1)

  const exportBanner = async () => {
    setError('')
    try {
      const mime = 'image/png'
      const speakersToExport = isSpeakerPerBannerFormat
        ? state.speakers.filter((speaker) => speaker.name.trim().length > 0).slice(0, MAX_SPEAKERS)
        : []
      const exportStates =
        speakersToExport.length > 1
          ? speakersToExport.map((speaker) => ({
              ...state,
              speakers: [speaker],
            }))
          : [state]

      const historyItems: BannerHistoryItem[] = []

      for (let i = 0; i < exportStates.length; i += 1) {
        const exportState = exportStates[i]
        const offscreen = document.createElement('canvas')
        await renderBanner(offscreen, exportState, format, backgroundFailed, exportState.export.scale)
        const dataUrl = offscreen.toDataURL(mime, 0.95)

        const previewCanvas = document.createElement('canvas')
        await renderBanner(previewCanvas, exportState, format, backgroundFailed, 1)
        const previewDataUrl = previewCanvas.toDataURL('image/jpeg', 0.8)

        historyItems.push({
          id: uid(),
          createdAt: new Date().toISOString(),
          state: exportState,
          previewDataUrl,
        })

        const speakerSuffix =
          exportStates.length > 1
            ? `-${(exportState.speakers[0]?.name || `speaker-${i + 1}`)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '') || `speaker-${i + 1}`}`
            : ''

        const prefix = filenamePrefixByFormat[exportState.format]
        const citySlug =
          (exportState.event.city || 'city')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'city'

        const link = document.createElement('a')
        link.href = dataUrl
        link.download = `${prefix}-github-copilot-dev days-${citySlug}${speakerSuffix}.png`
        link.click()
      }

      setHistory((previous) => {
        const next = [...historyItems.reverse(), ...previous].slice(0, MAX_HISTORY_ITEMS)
        writeBannerHistory(next)
        return next
      })
    } catch {
      setError('Could not export file.')
    }
  }

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      throw new Error('Invalid file. Please upload images only.')
    }
    if (file.size > 8 * 1024 * 1024) {
      throw new Error('File too large. Max size is 8MB per image.')
    }
    return fileToDataUrl(file)
  }

  const restoreBanner = (item: BannerHistoryItem) => {
    setState({
      ...item.state,
      event: {
        ...item.state.event,
        organizerName: item.state.event?.organizerName ?? '',
        organizerLogoDataUrl: item.state.event?.organizerLogoDataUrl ?? '',
        includeSupportedBy: item.state.event?.includeSupportedBy ?? false,
        registrationEnabled: item.state.event?.registrationEnabled ?? true,
        registrationStyle: item.state.event?.registrationStyle ?? 'cta_url',
        registrationText: item.state.event?.registrationText ?? 'Register now',
        registrationUrl: item.state.event?.registrationUrl ?? 'gh.io/devdays',
      },
    })
    setShowHistory(false)
  }

  const removeHistoryItem = (id: string) => {
    setHistory((previous) => {
      const next = previous.filter((item) => item.id !== id)
      writeBannerHistory(next)
      return next
    })
  }

  const clearHistory = () => {
    setHistory([])
    writeBannerHistory([])
  }

  return (
    <div className="editor-shell">
      <header className="topbar">
        <div className="topbar-left">
          <span className="topbar-icon" aria-hidden="true">
            <CopilotIcon size={20} />
          </span>
          <h1>GitHub Copilot Dev Days</h1>
        </div>

        <div className="topbar-actions">
          <a
            className="icon-btn"
            href={REPOSITORY_URL}
            target="_blank"
            rel="noreferrer"
            title="View on GitHub"
            aria-label="View the project repository on GitHub"
          >
            <MarkGithubIcon size={18} />
          </a>
          <button
            type="button"
            className={`topbar-history-btn ${showHistory ? 'active' : ''}`}
            title="Previous banners"
            aria-label="Toggle previous banners"
            aria-pressed={showHistory}
            onClick={() => setShowHistory((value) => !value)}
          >
            <HistoryIcon size={16} />
            <span>Previous banners</span>
          </button>
        </div>
      </header>

      <div className="editor-body">
        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`} aria-label="Editor controls">
          <div className="sidebar-header">
            <button
              type="button"
              className="icon-btn"
              title={sidebarCollapsed ? 'Expand panel' : 'Collapse panel'}
              aria-label={sidebarCollapsed ? 'Expand panel' : 'Collapse panel'}
              aria-expanded={!sidebarCollapsed}
              onClick={() => setSidebarCollapsed((value) => !value)}
            >
              {sidebarCollapsed ? <SidebarExpandIcon size={18} /> : <SidebarCollapseIcon size={18} />}
            </button>
            <span className="sidebar-title">Design</span>
          </div>

          <div className="sidebar-content">
          {backgroundFailed && <p className="warning">Background image unavailable: using gradient fallback for preview.</p>}

          <div className="format-bar">
            <label className="format-select-label">
              <span className="label-row">
                Format
              </span>
              <select
                value={state.format}
                onChange={(e) => setState((previous) => ({ ...previous, format: e.target.value as BannerFormat }))}
              >
                <optgroup label="Event Cover">
                  {coverFormatIds
                    .map((id) => formatOptions.find((option) => option.id === id))
                    .filter((option): option is FormatOption => Boolean(option))
                    .map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name} — {option.width}x{option.height}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Socials">
                  {socialFormatIds
                    .map((id) => formatOptions.find((option) => option.id === id))
                    .filter((option): option is FormatOption => Boolean(option))
                    .map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name} — {option.width}x{option.height}
                      </option>
                    ))}
                </optgroup>
              </select>
            </label>
          </div>

          <details className="side-section" open>
            <summary>
              <span>Event</span>
              <ChevronDownIcon size={16} className="chevron" />
            </summary>
            <div className="section-block">
              <div className="form-grid single">
                <label>
                  City
                  <input
                    type="text"
                    value={state.event.city}
                    onChange={(e) => updateEvent({ city: e.target.value })}
                  />
                </label>
                <label>
                  <span className="label-row">
                    Date and time
                    <small>Example: Apr 15 • 7:00 PM</small>
                  </span>
                  <input
                    type="text"
                    value={state.event.dateTime}
                    onChange={(e) => updateEvent({ dateTime: e.target.value })}
                  />
                </label>
                {!isMinimalCover && (
                  <label>
                    <span className="label-row">
                      Location
                      <small>Can wrap to 2 lines in Social Promo</small>
                    </span>
                    <textarea
                      rows={2}
                      value={state.event.location}
                      onChange={(e) => updateEvent({ location: e.target.value })}
                    />
                  </label>
                )}
                {(isSpeakerBanner || isSocialPromo) && (
                  <>
                    <label>
                      <span className="label-row">
                        Organization
                        <small>Shown as text when no logo is uploaded</small>
                      </span>
                      <input
                        type="text"
                        value={state.event.organizerName}
                        onChange={(e) => updateEvent({ organizerName: e.target.value })}
                        placeholder="GitHub Community Brasil"
                      />
                    </label>
                    <label>
                      <span className="label-row">
                        Organizer logo
                        <small>Optional. If empty, the Organization text is used.</small>
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          void (async () => {
                            try {
                              const file = event.target.files?.[0]
                              if (!file) return
                              const dataUrl = await handleFile(file)
                              updateEvent({ organizerLogoDataUrl: dataUrl })
                            } catch (fileError) {
                              setError(fileError instanceof Error ? fileError.message : 'Invalid file.')
                            }
                          })()
                        }}
                      />
                    </label>
                  </>
                )}

                {(isSocialPromo || isSpeakerBanner) && (
                  <>
                    <button
                      type="button"
                      className="resolution-toggle"
                      onClick={() => updateEvent({ registrationEnabled: !state.event.registrationEnabled })}
                    >
                      <div>
                        <strong>Show registration footer bar</strong>
                        <span>Adds a CTA + short URL strip at the bottom of the banner.</span>
                      </div>
                      <span className={`switch ${state.event.registrationEnabled ? 'on' : ''}`} aria-hidden="true">
                        <span />
                      </span>
                    </button>

                    {state.event.registrationEnabled && (
                      <>
                        <label>
                          Registration bar style
                          <select
                            value={state.event.registrationStyle}
                            onChange={(e) =>
                              updateEvent({ registrationStyle: e.target.value as EventDetails['registrationStyle'] })
                            }
                          >
                            <option value="cta_url">CTA + URL</option>
                            <option value="url_only">URL only</option>
                          </select>
                        </label>

                        <label>
                          CTA text
                          <input
                            type="text"
                            value={state.event.registrationText}
                            onChange={(e) => updateEvent({ registrationText: e.target.value })}
                            placeholder="Register now"
                          />
                        </label>

                        <label>
                          Registration URL *
                          <input
                            type="text"
                            value={state.event.registrationUrl}
                            onChange={(e) => updateEvent({ registrationUrl: e.target.value })}
                            placeholder="gh.io/devdays"
                          />
                        </label>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </details>

          {!isMinimalCover && !isSocialPromo && (
          <details className="side-section" open>
            <summary>
              <span>Speakers</span>
              <ChevronDownIcon size={16} className="chevron" />
            </summary>
            <div className="section-block">
              <p className="section-description">Speaker banners use a single speaker to keep the layout clean and easy to produce.</p>
              {state.speakers.length < MAX_SPEAKERS && (
                <button type="button" onClick={addSpeaker}>
                  Add speaker
                </button>
              )}
              <div className="stack">
                {state.speakers.map((speaker) => (
                  <article key={speaker.id} className="speaker-card">
                    <label>
                      Name *
                      <input
                        type="text"
                        value={speaker.name}
                        onChange={(e) => updateSpeaker(speaker.id, { name: e.target.value })}
                      />
                    </label>
                    <label>
                      Role
                      <input
                        type="text"
                        value={speaker.role ?? ''}
                        onChange={(e) => updateSpeaker(speaker.id, { role: e.target.value })}
                      />
                    </label>

                    <label>
                      Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          void (async () => {
                            try {
                              const file = event.target.files?.[0]
                              if (!file) return
                              const dataUrl = await handleFile(file)
                              updateSpeaker(speaker.id, { photoDataUrl: dataUrl })
                            } catch (fileError) {
                              setError(fileError instanceof Error ? fileError.message : 'Invalid file.')
                            }
                          })()
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      className="danger"
                      onClick={() =>
                        setState((previous) => ({
                          ...previous,
                          speakers: previous.speakers.filter((item) => item.id !== speaker.id),
                        }))
                      }
                    >
                      Remove
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </details>
          )}

          {!isMinimalCover && (
          <details className="side-section" open>
            <summary>
              <span>Partners</span>
              <ChevronDownIcon size={16} className="chevron" />
            </summary>
            <div className="section-block">
              {(isSpeakerBanner || isSocialPromo) && (
                <button
                  type="button"
                  className="resolution-toggle"
                  onClick={() => updateEvent({ includeSupportedBy: !state.event.includeSupportedBy })}
                >
                  <div>
                    <strong>Do you want to include partner logos?</strong>
                    <span>Turn on to show the Supported by area when logos are uploaded.</span>
                  </div>
                  <span className={`switch ${state.event.includeSupportedBy ? 'on' : ''}`} aria-hidden="true">
                    <span />
                  </span>
                </button>
              )}
              {(isSpeakerBanner || isSocialPromo) && <p className="section-description">You can add up to 3 partner logos.</p>}
              <label>
                Add logo
                <input
                  type="file"
                  accept="image/*"
                  disabled={(isSpeakerBanner || isSocialPromo) && state.partners.length >= 3}
                  onChange={(event) => {
                    void (async () => {
                      try {
                        const file = event.target.files?.[0]
                        if (!file) return
                        if ((isSpeakerBanner || isSocialPromo) && state.partners.length >= 3) {
                          setError('You can upload up to 3 partner logos for Speaker Banner and Social Promo.')
                          return
                        }
                        const dataUrl = await handleFile(file)
                        setState((previous) => ({
                          ...previous,
                          partners: [...previous.partners, { id: uid(), imageDataUrl: dataUrl }],
                        }))
                      } catch (fileError) {
                        setError(fileError instanceof Error ? fileError.message : 'Invalid file.')
                      }
                    })()
                  }}
                />
              </label>
              {(isSpeakerBanner || isSocialPromo) && (
                <p className="section-description">
                  {state.partners.length >= 3
                    ? 'Partner logo limit reached (3/3). Remove one to upload another.'
                    : `${3 - state.partners.length} slot(s) remaining.`}
                </p>
              )}

              <div className="logos-grid">
                {state.partners.map((partner) => (
                  <div key={partner.id} className="logo-tile">
                    <img src={partner.imageDataUrl} alt="Partner logo" />
                    <button
                      type="button"
                      className="danger"
                      onClick={() =>
                        setState((previous) => ({
                          ...previous,
                          partners: previous.partners.filter((item) => item.id !== partner.id),
                        }))
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </details>
          )}

          {error && <p className="error">{error}</p>}
          </div>

          <div className="sidebar-footer">
            <button type="button" className="ghost" onClick={resetAll} title="Reset to defaults">
              Reset
            </button>
            <div className="split-download">
              <button
                type="button"
                className="download-main"
                onClick={() => {
                  void exportBanner()
                }}
              >
                <DownloadIcon size={16} />
                <span>Download</span>
              </button>
            </div>
          </div>
        </aside>

        <section className="stage" aria-label="Preview">
          <div className="stage-canvas">
            {!showMultiSpeakerPreviewGrid && (
              <div
                className="canvas-wrap"
                style={{ aspectRatio: `${format.width} / ${format.height}`, transform: `scale(${zoom})` }}
              >
                <canvas ref={canvasRef} aria-label="Banner preview" />
              </div>
            )}

            {showMultiSpeakerPreviewGrid && speakerPreviews.length > 0 && (
              <div className="speaker-preview-block">
                <div className="history-header">
                  <h3>Speaker banners</h3>
                  <span>{speakerPreviews.length} real-time preview(s)</span>
                </div>
                <div className="speaker-preview-grid">
                  {speakerPreviews.map((item) => (
                    <article key={item.id} className="speaker-preview-item">
                      <img src={item.previewDataUrl} alt={`Preview banner for ${item.name}`} />
                      <strong>{item.name}</strong>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="stage-toolbar" role="toolbar" aria-label="Canvas tools">
            <button type="button" className="icon-btn" title="Zoom in" aria-label="Zoom in" onClick={zoomIn}>
              <ZoomInIcon size={18} />
            </button>
            <button type="button" className="icon-btn" title="Zoom out" aria-label="Zoom out" onClick={zoomOut}>
              <ZoomOutIcon size={18} />
            </button>
            <button type="button" className="icon-btn" title="Fit to screen" aria-label="Fit to screen" onClick={fitZoom}>
              <ScreenFullIcon size={18} />
            </button>
            <span className="toolbar-divider" aria-hidden="true" />
            <button
              type="button"
              className="icon-btn download"
              title="Download"
              aria-label="Download"
              onClick={() => {
                void exportBanner()
              }}
            >
              <DownloadIcon size={18} />
            </button>
          </div>
        </section>

        {showHistory && (
          <aside className="history-drawer" aria-label="Previous banners">
            <div className="history-header">
              <h3>Previous banners</h3>
              <div className="history-header-actions">
                <button type="button" onClick={clearHistory} disabled={history.length === 0}>
                  Clear all
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  title="Close"
                  aria-label="Close previous banners"
                  onClick={() => setShowHistory(false)}
                >
                  <XIcon size={16} />
                </button>
              </div>
            </div>
            {history.length === 0 ? (
              <p className="history-empty">No previous banners yet. Export one to save it here.</p>
            ) : (
              <div className="history-list">
                {history.map((item) => (
                  <article key={item.id} className="history-item">
                    <img src={item.previewDataUrl} alt="Saved banner preview" />
                    <div className="history-meta">
                      <strong>{formatOptions.find((option) => option.id === item.state.format)?.name ?? item.state.format}</strong>
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                      <span>{item.state.event.city || 'City'} • {item.state.event.dateTime || 'Date/Time'}</span>
                    </div>
                    <div className="history-actions">
                      <button type="button" onClick={() => restoreBanner(item)}>
                        Open
                      </button>
                      <button type="button" className="danger" onClick={() => removeHistoryItem(item.id)}>
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}

export default App
