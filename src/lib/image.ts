import type { BannerFormat } from '../types'
import lumaBackgroundImage from '../assets/img/luma-background.png'
import speakerBackgroundImage from '../assets/img/speaker-background.png'

const imageCache = new Map<string, Promise<HTMLImageElement>>()

export function loadImage(src: string) {
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

export function getBackgroundImage(format: BannerFormat) {
  if (format === 'speaker_square') return null
  if (format === 'speaker_banner') return speakerBackgroundImage
  if (format === 'social_promo') return speakerBackgroundImage
  if (format === 'luma_cover') return lumaBackgroundImage
  return null
}

export async function fileToDataUrl(file: File) {
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
