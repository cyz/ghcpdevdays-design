import {
  brandTitleLine1,
  brandTitleLine2,
  fixedGreenLabel,
  lightAreaMutedColor,
  lightAreaTitleColor,
  lumaCityColor,
  MAX_SPEAKERS,
} from '../constants'
import type { BannerState, ExportScale, FormatOption } from '../types'
import { wrapText, wrapTextWithBreaks, roundedRectPath } from './canvasText'
import { getInitials } from './format'
import { getBackgroundImage, loadImage } from './image'

export async function renderBanner(
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
    const leftX = Math.round(padding * 0.75)
    // Text container: all side texts are constrained to this width so they
    // never overflow onto the image.
    const containerWidth = Math.round(width * 0.46) - 30
    const textMaxWidth = containerWidth
    const bottomInset = leftX

    // Fixed green label — "Dev Days 2026"
    const labelText = 'DEV DAYS 2026'
    const labelSize = 36
    const labelColor = '#0CA334'

    // City name (black) — Mona Sans VF, display optical size at 135px
    const citySize = 72
    const cityColor = '#000000'
    const cityLineStep = citySize * 1.02

    // Footer text
    const footerSize = 32
    const footerColor = '#77827A'
    const footerLineStep = footerSize * 1.2

    ctx.textBaseline = 'alphabetic'

    ctx.font = `500 ${citySize}px "Mona Sans", sans-serif`
    const cityLines = wrapText(ctx, state.event.city || 'City', textMaxWidth, 6)

    const footerSource = (state.event.dateTime.trim() || 'Date/Time').toUpperCase()
    ctx.font = `500 ${footerSize}px "Mona Sans Mono", monospace`
    ctx.letterSpacing = '3px'
    const footerLines = wrapTextWithBreaks(ctx, footerSource, textMaxWidth, 2)
    ctx.letterSpacing = '0px'

    // Extra vertical spacing between the text blocks
    const textGap = 40
    const labelY = Math.round(height * 0.26) + 30
    const cityTopY = labelY + Math.round(citySize * 0.9) + textGap
    const footerLastY = height - bottomInset - textGap
    const footerTopY = footerLastY - (footerLines.length - 1) * footerLineStep

    // Green fixed label: #0CA334, 36px, weight 500
    ctx.fillStyle = labelColor
    ctx.font = `500 ${labelSize}px "Mona Sans Mono", monospace`
    ctx.letterSpacing = '3px'
    ctx.fillText(labelText, leftX, labelY)
    ctx.letterSpacing = '0px'

    // Black city name: weight 500, 72px
    ctx.fillStyle = cityColor
    ctx.font = `500 ${citySize}px "Mona Sans", sans-serif`
    cityLines.forEach((line, index) => {
      ctx.fillText(line, leftX, cityTopY + index * cityLineStep)
    })

    // Footer text: weight 500, 48px, #77827A
    ctx.fillStyle = footerColor
    ctx.font = `500 ${footerSize}px "Mona Sans Mono", monospace`
    ctx.letterSpacing = '3px'
    footerLines.forEach((line, index) => {
      ctx.fillText(line, leftX, footerTopY + index * footerLineStep)
    })
    ctx.letterSpacing = '0px'
  } else {
    if (isSpeakerFormat) {
      // Speaker Banner green label (fixed "DEV DAYS 2026"): font size in px.
      const citySize = isSpeakerBanner || isSocialPromo ? 45 : Math.max(18, Math.round(width * 0.026 * socialPromoScale))
      // Speaker Banner green label: top position in px from the top of the banner.
      const speakerBannerGreenLabelTop = 150
      // Speaker Banner main title (city name): extra px to move it DOWN (increase = lower).
      const speakerBannerTitleDownOffset = 300
      const dateSize = Math.round(metaSize * 1.2 * socialPromoScale)
      // Speaker Banner: Date/time font size in px (change to resize the date).
      const speakerBannerDateSize = 34
      const effectiveDateSize = isSpeakerBanner || isSocialPromo ? speakerBannerDateSize : dateSize
      const dateColor = '#ffffff'
      const textX = padding
      const textMaxWidth = width - padding * 2
      let eventTitleSize = Math.round(84 * socialPromoScale)

      while (eventTitleSize > Math.round(56 * socialPromoScale)) {
        ctx.font = `600 ${eventTitleSize}px "Mona Sans", sans-serif`
        if (ctx.measureText(brandTitleLine1).width <= textMaxWidth) break
        eventTitleSize -= 2
      }

      ctx.font = `500 ${citySize}px "Mona Sans Mono", monospace`
      ctx.letterSpacing = '3px'
      // Green label source: Speaker Banner and Social Promo use the fixed Luma label, other formats use the city.
      const greenLabelText = (isSpeakerBanner || isSocialPromo ? fixedGreenLabel : state.event.city || 'City').toUpperCase()
      const cityLines = wrapText(ctx, greenLabelText, textMaxWidth, 2)
      const cityLineStep = citySize * 1.1
      const eventLineStep = eventTitleSize * 1.08

      ctx.font = `500 ${effectiveDateSize}px "Mona Sans Mono", monospace`
      const dateLines = wrapText(ctx, (state.event.dateTime || 'Date/Time').toUpperCase(), textMaxWidth, 2)
      const dateLineStep = effectiveDateSize * 1.25
      ctx.letterSpacing = '0px'

      const topCityY = padding * 1
      const useBannerPositioning = isSpeakerBanner || isSocialPromo
      const cityY = useBannerPositioning
        ? speakerBannerGreenLabelTop + Math.round(citySize * 0.72)
        : topCityY
      const cityToEventGap = useBannerPositioning ? 52 : 58
      const eventTitleY =
        cityY +
        cityLines.length * cityLineStep +
        cityToEventGap +
        (useBannerPositioning ? speakerBannerTitleDownOffset : 0) +
        (isSocialPromo ? 25 : 0)
      // Speaker Banner / Social Promo: fixed distance (px) from the green label down to the Date/time.
      const speakerBannerDateFromLabel = 50
      const dateY = useBannerPositioning
        ? Math.round(cityY + speakerBannerDateFromLabel)
        : eventTitleY + eventLineStep + (eventLineStep + 2)

      ctx.fillStyle = lumaCityColor
      ctx.font = `500 ${citySize}px "Mona Sans Mono", monospace`
      ctx.letterSpacing = '3px'
      cityLines.forEach((line, index) => {
        ctx.fillText(line, textX, cityY + index * cityLineStep)
      })
      ctx.letterSpacing = '0px'

      if (isSpeakerBanner || isSocialPromo) {
        // Main title is the user-entered city name — same size/formatting as the Luma cover (Mona Sans, 72px).
        const titleCitySize = 72
        const titleCityLineStep = titleCitySize * 1.02
        ctx.font = `500 ${titleCitySize}px "Mona Sans", sans-serif`
        ctx.fillStyle = lightAreaTitleColor
        const titleCityLines = wrapText(ctx, state.event.city || 'City', textMaxWidth, 2)
        titleCityLines.forEach((line, index) => {
          ctx.fillText(line, textX, eventTitleY + index * titleCityLineStep)
        })

        // Social Promo: location name right after the city, styled like the speaker role.
        const cityBottomY = eventTitleY + (titleCityLines.length - 1) * titleCityLineStep
        if (isSocialPromo && state.event.location.trim()) {
          const locationRoleSize = Math.max(Math.round(metaSize * 1.6), 41)
          const locationTopY = cityBottomY + Math.round(locationRoleSize * 1.4) + 25
          ctx.fillStyle = lightAreaMutedColor
          ctx.font = `500 ${locationRoleSize}px "Mona Sans", sans-serif`
          const locationLines = wrapTextWithBreaks(ctx, state.event.location.trim(), textMaxWidth, 2)
          locationLines.forEach((line, index) => {
            ctx.fillText(line, textX, locationTopY + index * locationRoleSize * 1.16)
          })
          socialPromoLocationBottomY =
            locationTopY + (locationLines.length - 1) * locationRoleSize * 1.16 + Math.round(locationRoleSize * 0.35)
        } else if (isSocialPromo) {
          socialPromoLocationBottomY = cityBottomY + Math.round(titleCitySize * 0.35)
        }
      } else {
        ctx.font = `600 ${eventTitleSize}px "Mona Sans", sans-serif`
        ctx.fillStyle = dateColor
        ctx.fillText(brandTitleLine1, textX, eventTitleY)
        ctx.fillStyle = '#ffffff'
        ctx.fillText(brandTitleLine2, textX, eventTitleY + eventLineStep)
      }

      ctx.font = `500 ${effectiveDateSize}px "Mona Sans Mono", monospace`
      ctx.letterSpacing = '3px'
      if (isSpeakerBanner || isSocialPromo) {
        // Date/time as plain white text (no background).
        const dateText = dateLines[0] || ''
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#ffffff'
        ctx.fillText(dateText, textX, dateY)
        ctx.textBaseline = 'alphabetic'
      } else {
        ctx.fillStyle = dateColor
        dateLines.forEach((line, index) => {
          ctx.fillText(line, textX, dateY + index * dateLineStep)
        })
      }
      ctx.letterSpacing = '0px'
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
    const titleY = infoY + titleYOffset
    const contentTopY = titleY + contentOffset
    const organizationHidden = isSpeakerBanner || isSocialPromo
    const organizationTitleX = infoX + horizontalInset
    const supportedByTitleX = organizationHidden ? organizationTitleX : rightX + horizontalInset

    ctx.fillStyle = '#8b949e'
    ctx.font = `600 ${headingSize}px "Mona Sans", sans-serif`

    // Speaker Banner / Social Promo draw the organizer logo at the top-right instead of here.
    if (!isSpeakerBanner && !isSocialPromo) {
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
      }
    }

    const showSupportedBy = state.event.includeSupportedBy && state.partners.length > 0
    if (showSupportedBy) {
      ctx.fillStyle = '#8b949e'
      ctx.font = `500 ${headingSize}px "Mona Sans Mono", monospace`
      ctx.letterSpacing = '3px'
      ctx.fillText('SUPPORTED BY', supportedByTitleX, titleY)
      ctx.letterSpacing = '0px'

      const logos = state.partners.slice(0, 3)
      const logosY = contentTopY
      const logosAreaW = (organizationHidden ? infoW : rightW) - horizontalInset * 2
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

  const speakerBaseY = isSpeakerProfile ? height * 2 : height * 1.5
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
      // Speaker block vertical position: increase the offset to move it DOWN.
      const rowY = Math.round(height * 0.53)
      // Horizontal gap between the speaker photo and the name/role text (increase for more spacing).
      const photoToNameGap = Math.round(speakerGap) + 20
      const textX = rowX + avatarSize + photoToNameGap
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

      const nameSize = 68
      const roleSize = Math.max(Math.round(nameSize * 0.6), Math.round(metaSize * 1.6))

      const nameLineStep = nameSize * 1.03
      const roleLineStep = roleSize * 1.15
      const nameToRoleGap = Math.round(roleSize * 0.6)

      ctx.font = `500 ${nameSize}px "Mona Sans Mono", monospace`
      ctx.letterSpacing = '3px'
      const nameLines = wrapText(ctx, speaker.name || 'Speaker', textMaxWidth, 3)
      ctx.letterSpacing = '0px'
      ctx.font = `500 ${roleSize}px "Mona Sans", sans-serif`
      const roleLines = speaker.role ? wrapText(ctx, speaker.role, textMaxWidth, 2) : []

      const nameBlockHeight = nameLines.length * nameLineStep
      const roleBlockHeight = roleLines.length > 0 ? nameToRoleGap + roleLines.length * roleLineStep : 0
      const textBlockHeight = nameBlockHeight + roleBlockHeight
      const textBlockTop = rowY + Math.max(0, (avatarSize - textBlockHeight) / 2)

      ctx.textBaseline = 'top'

      ctx.fillStyle = '#0CA334'
      ctx.font = `500 ${nameSize}px "Mona Sans Mono", monospace`
      ctx.letterSpacing = '3px'
      nameLines.forEach((line, idx) => {
        ctx.fillText(line, textX, textBlockTop + idx * nameLineStep)
      })
      ctx.letterSpacing = '0px'

      if (roleLines.length > 0) {
        ctx.fillStyle = lightAreaMutedColor
        ctx.font = `500 ${roleSize}px "Mona Sans", sans-serif`
        const roleStartY = textBlockTop + nameBlockHeight + nameToRoleGap
        roleLines.forEach((line, idx) => {
          ctx.fillText(line, textX, roleStartY + idx * roleLineStep)
        })
      }

      ctx.textBaseline = 'alphabetic'

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

    // Speaker Banner / Social Promo: organizer logo at the top-right corner.
  if ((isSpeakerBanner || isSocialPromo) && state.event.organizerLogoDataUrl) {
    try {
      const orgLogo = await loadImage(state.event.organizerLogoDataUrl)
      // Top edge of the logo, measured from the top of the banner.
      const orgLogoTopY = 385
      // Max size box for the logo.
      const orgLogoMaxH = 105
      const orgLogoMaxW = Math.round(width * 0.34)
      const ratio = orgLogo.width / orgLogo.height
      let logoH = orgLogoMaxH
      let logoW = logoH * ratio
      if (logoW > orgLogoMaxW) {
        logoW = orgLogoMaxW
        logoH = logoW / ratio
      }
      // Right-aligned.
      const logoX = width - padding - logoW
      ctx.drawImage(orgLogo, logoX, orgLogoTopY, logoW, logoH)
    } catch {
      // Ignore organizer logo load failures.
    }
  }

  if (isSpeakerBanner || isSocialPromo) {
    const infoH = Math.round(height * 0.16)
    const registerTopGap = 40
    const registerBottomGap = 40
    let nextSectionStartY = Math.round(
      Math.max(height * 0.78, speakerBannerProfileBottomY + registerTopGap),
    )

    if (state.event.registrationEnabled && state.event.registrationUrl.trim()) {
      const registrationScale = 1
      const barHeight = Math.round(height * 0.082 * registrationScale)
      const barW = width - padding * 2
      const textInset = Math.round(barHeight * 0.3)
      const organizationLabelSize = Math.round(metaSize * 1.2 * registrationScale)
      // Registration font size (+3 px bump).
      const labelSize = Math.max(18, organizationLabelSize) * 1.5
      const urlSize = labelSize

      const urlText = state.event.registrationUrl.trim()
      const ctaText = state.event.registrationStyle === 'url_only' ? '' : state.event.registrationText.trim() || 'Register'
      const lineSize = Math.max(urlSize, labelSize)
      // Speaker Banner: CTA sits at the banner footer. Social Promo: CTA right after the location block.
      const speakerBannerCtaFooterY = Math.round(height * 0.9)
      const lineY = isSpeakerBanner
        ? speakerBannerCtaFooterY
        : Math.round(socialPromoLocationBottomY + registerTopGap + lineSize * 0.8)
      const labelX = padding
      const urlRightX = width - padding
      const maxUrlW = Math.max(120, barW - textInset * 2)
      const registerUrlColor = lumaCityColor
      const registerGap = Math.round(metaSize * 0.45)

      ctx.textBaseline = 'middle'

      if (ctaText) {
        // CTA style: label + short link inside a green pill with white text.
        const registrationPillColor = '#000000'
        ctx.font = `500 ${labelSize}px "Mona Sans", sans-serif`
        const label = wrapText(ctx, `${ctaText}:`, maxUrlW * 0.5, 1)[0] || `${ctaText}:`
        const labelWidth = ctx.measureText(label).width

        // Horizontal / vertical padding inside the green pill.
        const padH = Math.round(labelSize * 0.7)
        const padV = Math.round(labelSize * 0.55)
        const availableUrlW = Math.max(80, maxUrlW - labelWidth - registerGap - padH * 2)
        ctx.font = `600 ${urlSize}px "Mona Sans", sans-serif`
        const shortUrl = wrapText(ctx, urlText, availableUrlW, 1)[0] || urlText
        const urlWidth = ctx.measureText(shortUrl).width

        const contentW = labelWidth + registerGap + urlWidth
        const pillH = lineSize + padV * 2
        const pillX = labelX
        const pillY = Math.round(lineY - pillH / 2)
        const pillW = contentW + padH * 2
        const pillRadius = Math.round(pillH * 0.35)

        roundedRectPath(ctx, pillX, pillY, pillW, pillH, pillRadius)
        ctx.fillStyle = registrationPillColor
        ctx.fill()

        const textStartX = pillX + padH
        ctx.fillStyle = '#ffffff'
        ctx.font = `500 ${labelSize}px "Mona Sans", sans-serif`
        ctx.fillText(label, textStartX, lineY)
        ctx.font = `600 ${urlSize}px "Mona Sans", sans-serif`
        ctx.fillText(shortUrl, textStartX + labelWidth + registerGap, lineY)
      } else {
        ctx.fillStyle = registerUrlColor
        ctx.font = `500 ${Math.max(urlSize, labelSize)}px "Mona Sans", sans-serif`
        const shortUrl = wrapText(ctx, urlText, Math.max(100, urlRightX - labelX), 1)[0] || urlText
        ctx.fillText(shortUrl, labelX, lineY)
      }
      ctx.textBaseline = 'alphabetic'

      const lineBottomY = lineY + Math.round(lineSize * 0.35)
      // Speaker Banner / Social Promo keep the partners panel at the bottom (registration is at the top now).
      if (!isSpeakerBanner && !isSocialPromo) {
        nextSectionStartY = Math.round(lineBottomY + registerBottomGap)
      }
    }

    const maxInfoY = height - infoH - Math.round(padding * 0.35)
    // Speaker Banner has no partners panel; Social Promo dedicates the footer to Supported-by (raised 40px).
    const infoY = isSocialPromo ? maxInfoY - 40 : Math.min(nextSectionStartY, maxInfoY)
    if (isSocialPromo) {
      await drawOrganizationPanel(infoY, infoH, 1)
    }
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
