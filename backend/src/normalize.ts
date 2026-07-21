export type Transport = 'avia' | 'zhd' | 'bus' | 'suburban' | 'hotel'

export interface Segment {
  fromCode: string
  fromCity: string
  fromStation: string
  toCode: string
  toCity: string
  toStation: string
  departAt: string
  arriveAt: string
  carrier: string
  flightNo?: string
}

export interface Layover {
  city: string
  minutes: number
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

export function normalizeHotels(data: any): Hotel[] {
  if (!data || typeof data === 'string') return []
  const list: any[] = data.hotels || []
  return list
    .map((h): Hotel | null => {
      const price = h.best_offer?.price?.amount ?? 0
      if (!price) return null
      return {
        id: String(h.hotel_id || h.hotel_geo_id || Math.random().toString(36).slice(2)),
        name: (h.name || '').trim(),
        stars: h.stars || 0,
        rating: typeof h.rating === 'number' ? h.rating : undefined,
        reviewCount: h.review_count || undefined,
        address: h.address || '',
        photo: Array.isArray(h.photos) ? h.photos[0] : undefined,
        price,
        currency: h.best_offer?.price?.currency || 'RUB',
        roomName: h.best_offer?.room_name || undefined,
        freeCancellation: h.best_offer?.free_cancellation ?? undefined,
        deepLink: h.checkout_url || h.best_offer?.checkout_url || 'https://hotel.tutu.ru',
      }
    })
    .filter((h): h is Hotel => h != null)
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
  layovers?: Layover[]
  segments: Segment[]
  deepLink: string
  rating?: number
  reviewCount?: number
  baggage?: string
  // raw refs to call detail / seatmap / checkout tools
  productType?: string
  detailsRef?: unknown
  checkoutRef?: unknown
}

/** "Санкт-Петербург — Пулково (LED), терм. 1" -> {city, code, station} */
function parsePoint(s: string): { city: string; code: string; station: string } {
  if (!s) return { city: '', code: '', station: '' }
  const codeMatch = s.match(/\(([A-ZА-Я0-9]{3,6})\)/)
  const code = codeMatch ? codeMatch[1] : ''
  const city = s.split('—')[0]?.trim() || s.trim()
  // station/airport name = text after "—" up to "(" or ","
  let station = ''
  const dash = s.indexOf('—')
  if (dash >= 0) {
    station = s
      .slice(dash + 1)
      .replace(/\(.*$/, '')
      .replace(/,.*$/, '')
      .trim()
  }
  return { city, code: code || city.slice(0, 3).toUpperCase(), station }
}

function segsFromLegs(legs: any[]): Segment[] {
  const out: Segment[] = []
  for (const leg of legs || []) {
    for (const seg of leg.segments || []) {
      const f = parsePoint(seg.from)
      const t = parsePoint(seg.to)
      out.push({
        fromCode: f.code,
        fromCity: f.city,
        fromStation: f.station,
        toCode: t.code,
        toCity: t.city,
        toStation: t.station,
        departAt: seg.departure_at,
        arriveAt: seg.arrival_at,
        carrier: seg.carrier || '',
        flightNo: seg.voyage_no || seg.train_number || undefined,
      })
    }
  }
  return out
}

/** Pull carrier rating + baggage from raw offer. */
function extractMeta(raw: any): { rating?: number; reviewCount?: number; baggage?: string } {
  const rs = raw?.legs?.[0]?.segments?.[0]?.review_summary
  const rating = typeof rs?.rating === 'number' ? rs.rating : undefined
  const reviewCount = typeof rs?.review_count === 'number' ? rs.review_count : undefined

  let baggage: string | undefined
  const bag = raw?.variants?.[0]?.conditions?.baggage
  if (bag) {
    if (bag.kg > 0) baggage = `${bag.kg} кг`
    else if (bag.pieces > 0) baggage = `${bag.pieces} место`
    else baggage = 'без багажа'
  }
  return { rating, reviewCount, baggage }
}

function transferCitiesFromSegs(segs: Segment[]): string[] {
  const cities: string[] = []
  for (let i = 0; i < segs.length - 1; i++) cities.push(segs[i].toCity)
  return cities
}

function layoversFromSegs(segs: Segment[]): Layover[] {
  const out: Layover[] = []
  for (let i = 0; i < segs.length - 1; i++) {
    const arrive = new Date(segs[i].arriveAt).getTime()
    const depart = new Date(segs[i + 1].departAt).getTime()
    const minutes = Math.round((depart - arrive) / 60000)
    if (isFinite(minutes) && minutes > 0)
      out.push({ city: segs[i].toCity, minutes })
  }
  return out
}

/** Normalize one raw MCP offer object into our Offer. */
export function normalizeOffer(raw: any, transport: Transport, fallbackUrl: string): Offer | null {
  if (!raw) return null
  const segs = segsFromLegs(raw.legs || [])
  const transfers =
    typeof raw.segments_count === 'number'
      ? Math.max(0, raw.segments_count - 1)
      : Math.max(0, segs.length - 1)

  const first = segs[0]
  const last = segs[segs.length - 1]
  const price = raw.price?.amount ?? raw.price ?? 0
  if (!price) return null

  const meta = extractMeta(raw)
  const productTypeMap: Record<string, string> = {
    avia: 'avia', air: 'avia', rail: 'railway', railway: 'railway',
    bus: 'bus', etrain: 'etrain', suburban: 'etrain',
  }

  return {
    ...meta,
    productType: raw.transport && productTypeMap[raw.transport] ? productTypeMap[raw.transport] : productTypeMap[transport] || transport,
    detailsRef: raw.details_ref,
    checkoutRef: raw.checkout_ref,
    id: String(raw.offer_id || raw.id || Math.random().toString(36).slice(2)),
    transport,
    carrier: Array.isArray(raw.carriers) ? raw.carriers.join(', ') : raw.carrier || '—',
    price,
    currency: raw.price?.currency || 'RUB',
    departAt: raw.departure_at || first?.departAt || '',
    arriveAt: raw.arrival_at || last?.arriveAt || '',
    durationMin: raw.duration_min || 0,
    transfers,
    transferCities: transfers > 0 ? transferCitiesFromSegs(segs) : undefined,
    layovers: transfers > 0 ? layoversFromSegs(segs) : undefined,
    segments: segs.length
      ? segs
      : [
          {
            fromCode: '',
            fromCity: '',
            fromStation: '',
            toCode: '',
            toCity: '',
            toStation: '',
            departAt: raw.departure_at || '',
            arriveAt: raw.arrival_at || '',
            carrier: Array.isArray(raw.carriers) ? raw.carriers[0] : '',
          },
        ],
    deepLink: raw.search_results_url || raw.deeplink || fallbackUrl,
  }
}

/** Handle both { offers:[...] } and multitransport { variants:[...] }. */
export function normalizeResponse(
  data: any,
  transport: Transport,
  fallbackUrl: string,
): Offer[] {
  if (!data || typeof data === 'string') return []
  const list: any[] = data.offers || data.variants || []
  const modeMap: Record<string, Transport> = {
    avia: 'avia',
    air: 'avia',
    rail: 'zhd',
    railway: 'zhd',
    train: 'zhd',
    bus: 'bus',
    etrain: 'suburban',
    suburban: 'suburban',
  }
  return list
    .map((raw) => {
      const t = raw.transport && modeMap[raw.transport] ? modeMap[raw.transport] : transport
      return normalizeOffer(raw, t, raw.search_results_url || fallbackUrl)
    })
    .filter((o): o is Offer => o != null)
}
