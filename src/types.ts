export type BannerFormat =
  | 'speaker_square'
  | 'speaker_banner'
  | 'social_promo'
  | 'luma_cover'

export type ExportType = 'png' | 'jpg'
export type ExportScale = 1 | 2

export interface Speaker {
  id: string
  name: string
  role?: string
  photoDataUrl?: string
}

export interface PartnerLogo {
  id: string
  imageDataUrl: string
}

export interface EventDetails {
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

export interface BannerState {
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

export interface BannerHistoryItem {
  id: string
  createdAt: string
  state: BannerState
  previewDataUrl: string
}

export interface FormatOption {
  id: BannerFormat
  name: string
  width: number
  height: number
  channels?: string[]
}
