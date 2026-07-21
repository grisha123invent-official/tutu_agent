import type { Hotel, Offer, Seatmap, Transport } from '../types'

export interface SearchParams {
  transport: Transport
  origin: string
  destination: string
  departureDate?: string
  checkOut?: string
  passengers?: number
  serviceClass?: 'economy' | 'business'
  directOnly?: boolean
  maxPrice?: number
  sort?: 'price' | 'duration' | 'departure'
}

export interface SearchResponse {
  offers: Offer[]
  hotels?: Hotel[]
  label: string
  transport: Transport
  toolUsed: string
}

/** Direct MCP Туту search (powers the "Найти билеты" button). */
export async function searchOffers(params: SearchParams): Promise<SearchResponse> {
  const res = await fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Ошибка поиска (${res.status})`)
  }
  return res.json()
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const b = await res.json().catch(() => ({}))
    throw new Error(b.error || `Ошибка (${res.status})`)
  }
  return res.json()
}

/** Схема мест в вагоне (get_rail_seatmap). */
export function fetchSeatmap(detailsRef: unknown): Promise<Seatmap> {
  return post<Seatmap>('/api/seatmap', { detailsRef })
}

/** Точная ссылка на оформление (create_checkout_link). */
export function fetchCheckout(checkoutRef: unknown): Promise<{ url: string | null }> {
  return post('/api/checkout', { checkoutRef })
}
