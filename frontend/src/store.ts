import { create } from 'zustand'
import type {
  AssistantMessage,
  Filters,
  Hotel,
  Offer,
  Page,
  SearchParams,
  Transport,
  UiAction,
} from './types'

const defaultSearch: SearchParams = {
  transport: 'avia',
  fromCity: '',
  fromCode: '',
  toCity: '',
  toCode: '',
  dateThere: '',
  dateBack: '',
  passengers: 1,
  travelClass: 'economy',
}

const defaultFilters: Filters = {
  directOnly: false,
  maxPrice: null,
  sort: 'price',
  carriers: [],
}

interface StoreState {
  page: Page
  search: SearchParams
  filters: Filters
  offers: Offer[]
  hotels: Hotel[]
  searching: boolean
  searchError: string
  lastQueryLabel: string
  // fields recently written by the assistant (for the fill-flash animation)
  highlighted: Record<string, number>
  messages: AssistantMessage[]
  assistantThinking: boolean
  panelOpen: boolean
  voiceStatus: string
  /** реально ли сейчас играет голос ассистента (по аудио, не по «thinking») */
  voicePlaying: boolean
  /** идёт МЕДЛЕННЫЙ веб-поиск (интернет) — для красивой загрузки/звука */
  webSearching: boolean
  seatmapOffer: Offer | null

  setPage: (p: Page) => void
  setTransport: (t: Transport) => void
  patchSearch: (p: Partial<SearchParams>) => void
  patchFilters: (p: Partial<Filters>) => void
  setOffers: (o: Offer[], label?: string) => void
  setHotels: (h: Hotel[], label?: string) => void
  setSearching: (v: boolean) => void
  setSearchError: (msg: string) => void
  flash: (field: string) => void
  applyAction: (a: UiAction) => void

  addMessage: (m: AssistantMessage) => void
  updateMessage: (id: string, patch: Partial<AssistantMessage>) => void
  appendToMessage: (id: string, delta: string) => void
  setThinking: (v: boolean) => void
  togglePanel: (v?: boolean) => void
  setVoiceStatus: (s: string) => void
  setVoicePlaying: (v: boolean) => void
  setWebSearching: (v: boolean) => void
  setSeatmapOffer: (o: Offer | null) => void
}

export const useStore = create<StoreState>((set, get) => ({
  page: 'home',
  search: defaultSearch,
  filters: defaultFilters,
  offers: [],
  hotels: [],
  searching: false,
  searchError: '',
  lastQueryLabel: '',
  highlighted: {},
  messages: [],
  assistantThinking: false,
  panelOpen: false,
  voiceStatus: '',
  voicePlaying: false,
  webSearching: false,
  seatmapOffer: null,

  setPage: (page) => set({ page }),
  setTransport: (transport) =>
    set((s) => ({ search: { ...s.search, transport } })),
  patchSearch: (p) => set((s) => ({ search: { ...s.search, ...p } })),
  patchFilters: (p) => set((s) => ({ filters: { ...s.filters, ...p } })),
  setOffers: (offers, label) =>
    set({ offers, hotels: [], lastQueryLabel: label ?? get().lastQueryLabel, searching: false, searchError: '' }),
  setHotels: (hotels, label) =>
    set({ hotels, offers: [], lastQueryLabel: label ?? get().lastQueryLabel, searching: false, searchError: '' }),
  setSearching: (searching) => set({ searching }),
  setSearchError: (searchError: string) => set({ searchError, searching: false }),
  flash: (field) =>
    set((s) => ({ highlighted: { ...s.highlighted, [field]: Date.now() } })),

  applyAction: (a) => {
    const s = get()
    switch (a.type) {
      case 'navigate':
        set({ page: a.page })
        break
      case 'set_transport':
        s.patchSearch({ transport: a.transport })
        s.flash('transport')
        break
      case 'set_search':
        s.patchSearch(a.payload)
        Object.keys(a.payload).forEach((k) => s.flash(k))
        break
      case 'set_filter':
        s.patchFilters(a.payload)
        Object.keys(a.payload).forEach((k) => s.flash('filter:' + k))
        break
      case 'highlight':
        s.flash(a.field)
        break
    }
  },

  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  updateMessage: (id, patch) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  appendToMessage: (id, delta) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + delta } : m,
      ),
    })),
  setThinking: (assistantThinking) => set({ assistantThinking }),
  togglePanel: (v) => set((s) => ({ panelOpen: v ?? !s.panelOpen })),
  setVoiceStatus: (voiceStatus) => set({ voiceStatus }),
  setVoicePlaying: (voicePlaying) => set({ voicePlaying }),
  setWebSearching: (webSearching) => set({ webSearching }),
  setSeatmapOffer: (seatmapOffer) => set({ seatmapOffer }),
}))
