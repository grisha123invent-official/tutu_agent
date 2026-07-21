import { mcpCall } from './mcp.js'

const CAR_TYPE: Record<string, string> = {
  LUX: 'Люкс (СВ)',
  SOFT: 'Мягкий',
  COMPARTMENT: 'Купе',
  RESERVED_SEAT: 'Плацкарт',
  SEDENTARY: 'Сидячий',
  COMMON: 'Общий',
}
const GROUP_TYPE: Record<string, string> = {
  UPPER: 'Верхние',
  LOWER: 'Нижние',
  SIDE_UPPER: 'Боковые верхние',
  SIDE_LOWER: 'Боковые нижние',
  SEAT: 'Места',
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

export function normalizeSeatmap(raw: any): Seatmap {
  const cars: SeatCar[] = (raw?.cars || []).map((c: any): SeatCar => {
    const groups: SeatGroup[] = (c.seat_groups || []).map((g: any) => ({
      type: GROUP_TYPE[g.type] || g.type || 'Места',
      count: g.seats_count ?? 0,
      price: g.cheapest_fare?.price?.amount ?? 0,
    }))
    const prices = groups.map((g) => g.price).filter((p) => p > 0)
    return {
      number: String(c.car_number ?? ''),
      type: CAR_TYPE[c.car_type] || c.car_type || 'Вагон',
      serviceClass: c.service_class || '',
      amenities: (c.amenities || []).map((a: any) => a.label).filter(Boolean),
      groups,
      seats: (c.seats || []).map((s: any) => ({
        number: String(s.number ?? s.label ?? ''),
        available: s.available ?? true,
      })),
      minPrice: prices.length ? Math.min(...prices) : 0,
    }
  })
  return {
    trainNumber: raw?.train_meta?.number || '',
    trainName: raw?.train_meta?.name || '',
    isDoubleDecker: !!raw?.train_meta?.is_double_decker,
    cars,
  }
}

const PLAYBOOK_TOOL: Record<string, string> = {
  avia: 'get_avia_instructions',
  zhd: 'get_rail_instructions',
  bus: 'get_bus_instructions',
  suburban: 'get_etrain_instructions',
  hotel: 'get_hotels_instructions',
  multi: 'get_multitransport_instructions',
}

/** get_<mode>_instructions → playbook text for the assistant */
export async function getPlaybook(transport: string): Promise<string> {
  const tool = PLAYBOOK_TOOL[transport] || 'get_avia_instructions'
  const res = await mcpCall(tool, {})
  return typeof res === 'string' ? res : JSON.stringify(res)
}

/** get_rail_seatmap → normalized seat map */
export async function getSeatmap(detailsRef: unknown): Promise<Seatmap> {
  const data = await mcpCall('get_rail_seatmap', {
    details_ref: detailsRef,
    max_cars: 12,
    max_seats_per_car: 80,
  })
  return normalizeSeatmap(data)
}

/** get_offer_details → raw details object (view=compact) */
export async function getOfferDetails(args: {
  productType: string
  offerId?: string
  detailsRef?: unknown
}): Promise<unknown> {
  const a: Record<string, unknown> = { product_type: args.productType, view: 'compact' }
  if (args.detailsRef) a.details_ref = args.detailsRef
  if (args.offerId) a.offer_id = args.offerId
  return mcpCall('get_offer_details', a)
}

/** create_checkout_link → { url } */
export async function createCheckout(checkoutRef: any): Promise<string | null> {
  if (!checkoutRef || typeof checkoutRef !== 'object') return null
  try {
    const res: any = await mcpCall('create_checkout_link', checkoutRef)
    if (typeof res === 'string') {
      const m = res.match(/https?:\/\/\S+/)
      return m ? m[0] : null
    }
    return res?.url || res?.checkout_url || res?.link || res?.fallback_url || null
  } catch {
    return checkoutRef.fallback_url || null
  }
}
