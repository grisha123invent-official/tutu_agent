import { mcpCall, findTool } from './mcp.js'
import { normalizeResponse, normalizeHotels, type Hotel, type Offer, type Transport } from './normalize.js'

const MCP_BY_TRANSPORT: Record<string, string> = {
  avia: 'search_avia',
  zhd: 'search_rail',
  bus: 'search_bus',
  suburban: 'search_etrain',
  multi: 'search_multitransport',
}

const SORT_ASC: Record<string, string> = {
  price: 'price_asc',
  duration: 'duration_asc',
  departure: 'departure_asc',
}

export interface SearchArgs {
  transport: Transport | 'multi'
  origin: string
  destination: string
  departureDate?: string
  checkOut?: string
  passengers?: number
  serviceClass?: 'economy' | 'business'
  directOnly?: boolean
  maxPrice?: number
  sort?: 'price' | 'duration' | 'departure'
  optimizeFor?: 'price' | 'time'
}

export interface SearchResult {
  offers: Offer[]
  hotels?: Hotel[]
  label: string
  transport: Transport
  toolUsed: string
}

const plusDays = (iso: string | undefined, n: number): string => {
  const d = iso ? new Date(iso) : new Date()
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Direct MCP Туту search — no LLM. Used by the search button (HTTP) and the assistant tool. */
export async function mcpSearch(args: SearchArgs): Promise<SearchResult> {
  // ---- Hotels: different data model ----
  if (args.transport === 'hotel') {
    const checkIn = args.departureDate || plusDays(undefined, 3)
    const checkOut = args.checkOut || plusDays(checkIn, 2)
    const data = await mcpCall('search_hotels', {
      city_name: args.destination,
      check_in: checkIn,
      check_out: checkOut,
      adults: args.passengers && args.passengers > 0 ? args.passengers : 2,
      page_size: 20,
    })
    return {
      offers: [],
      hotels: normalizeHotels(data),
      label: `${args.destination}`,
      transport: 'hotel',
      toolUsed: 'search_hotels',
    }
  }

  const transport: Transport = args.transport === 'multi' ? 'avia' : args.transport
  const label = `${args.origin} — ${args.destination}`

  const toolName =
    MCP_BY_TRANSPORT[args.transport] ||
    findTool([args.transport === 'multi' ? 'multitransport' : args.transport, 'search']) ||
    'search_avia'

  const mcpArgs: Record<string, unknown> = {
    origin: args.origin,
    destination: args.destination,
    page_size: 15,
  }
  if (args.departureDate) mcpArgs.departure_date = args.departureDate
  // passenger param name differs per MCP tool
  if (args.passengers && args.passengers > 0) {
    if (args.transport === 'zhd') mcpArgs.passengers = args.passengers
    else if (args.transport === 'avia' || args.transport === 'bus') mcpArgs.adults = args.passengers
    // suburban (электрички) has no passenger param
  }
  if (args.serviceClass && (args.transport === 'avia' || args.transport === 'multi'))
    mcpArgs.service_class = args.serviceClass === 'business' ? 'business' : 'economy'
  if (typeof args.directOnly === 'boolean') mcpArgs.direct_only = args.directOnly
  if (typeof args.maxPrice === 'number') mcpArgs.price_max = args.maxPrice
  if (args.transport === 'multi') {
    if (args.optimizeFor) mcpArgs.optimize_for = args.optimizeFor
  } else {
    mcpArgs.sort = SORT_ASC[args.sort || 'price']
  }

  const data = await mcpCall(toolName, mcpArgs)
  const offers = normalizeResponse(data, transport, 'https://www.tutu.ru')
  return { offers, label, transport, toolUsed: toolName }
}
