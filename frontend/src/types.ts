export type Transport = 'avia' | 'zhd' | 'bus' | 'suburban' | 'hotel'

export type Page = 'home' | 'results'

export interface SearchParams {
  transport: Transport
  fromCity: string
  fromCode: string
  toCity: string
  toCode: string
  dateThere: string // ISO yyyy-mm-dd or ''
  dateBack: string
  passengers: number
  travelClass: 'economy' | 'business'
}

export interface Filters {
  directOnly: boolean
  maxPrice: number | null
  sort: 'price' | 'duration' | 'departure'
  carriers: string[] // selected carrier names; empty = all
}

export interface Segment {
  fromCode: string
  fromCity: string
  fromStation: string
  toCode: string
  toCity: string
  toStation: string
  departAt: string // ISO datetime
  arriveAt: string
  carrier: string
  flightNo?: string
}

export interface Offer {
  id: string
  transport: Transport
  carrier: string
  price: number
  currency: string
  departAt: string
  arriveAt: string
  durationMin: number
  transfers: number
  transferCities?: string[]
  layovers?: { city: string; minutes: number }[]
  segments: Segment[]
  deepLink: string
  rating?: number
  reviewCount?: number
  baggage?: string
  productType?: string
  detailsRef?: unknown
  checkoutRef?: unknown
}

export interface SeatGroup {
  type: string
  count: number
  price: number
}
export interface SeatCar {
  number: string
  type: string
  serviceClass: string
  amenities: string[]
  groups: SeatGroup[]
  seats: { number: string; available: boolean }[]
  minPrice: number
}
export interface Seatmap {
  trainNumber: string
  trainName: string
  isDoubleDecker: boolean
  cars: SeatCar[]
}

export interface Hotel {
  id: string
  name: string
  stars: number
  rating?: number
  reviewCount?: number
  address: string
  photo?: string
  price: number
  currency: string
  roomName?: string
  freeCancellation?: boolean
  deepLink: string
}

export interface PlaceInfo {
  title: string
  summary: string
  bullets: string[]
  sourceUrl?: string
}

export type UiAction =
  | { type: 'navigate'; page: Page }
  | { type: 'set_transport'; transport: Transport }
  | { type: 'set_search'; payload: Partial<SearchParams> }
  | { type: 'set_filter'; payload: Partial<Filters> }
  | { type: 'highlight'; field: string }

export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  placeInfo?: PlaceInfo | null
  statusLog?: string[]
}
