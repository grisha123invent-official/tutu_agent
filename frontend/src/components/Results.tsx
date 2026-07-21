import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store'
import OfferCard from './OfferCard'
import HotelResults from './HotelResults'
import SearchWidget from './SearchWidget'
import { searchOffers } from '../lib/api'
import { fmtPrice } from '../lib/format'
import type { Offer, Transport } from '../types'
import { IconBus, IconHotel, IconPlane, IconSuburban, IconTrain } from './icons'

const TRANSPORTS: { key: Transport; label: string; Icon: typeof IconPlane }[] = [
  { key: 'hotel', label: 'Отели', Icon: IconHotel },
  { key: 'avia', label: 'Авиа', Icon: IconPlane },
  { key: 'zhd', label: 'Ж/д', Icon: IconTrain },
  { key: 'bus', label: 'Автобусы', Icon: IconBus },
  { key: 'suburban', label: 'Электрички', Icon: IconSuburban },
]

const TRANSPORT_TITLE: Record<string, string> = {
  avia: 'Авиабилеты', zhd: 'Ж/д билеты', bus: 'Автобусы', suburban: 'Электрички', hotel: 'Отели',
}

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const isoOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function applyFilters(offers: Offer[], f: ReturnType<typeof useStore.getState>['filters']) {
  let out = offers.filter((o) => {
    if (f.directOnly && o.transfers > 0) return false
    if (f.maxPrice != null && o.price > f.maxPrice) return false
    if (f.carriers.length && !f.carriers.some((c) => o.carrier.includes(c))) return false
    return true
  })
  out = [...out].sort((a, b) => {
    if (f.sort === 'price') return a.price - b.price
    if (f.sort === 'duration') return a.durationMin - b.durationMin
    return new Date(a.departAt).getTime() - new Date(b.departAt).getTime()
  })
  return out
}

const min = (arr: number[]) => (arr.length ? Math.min(...arr) : 0)

export default function Results() {
  const offers = useStore((s) => s.offers)
  const hotels = useStore((s) => s.hotels)
  const filters = useStore((s) => s.filters)
  const patchFilters = useStore((s) => s.patchFilters)
  const searching = useStore((s) => s.searching)
  const error = useStore((s) => s.searchError)
  const label = useStore((s) => s.lastQueryLabel)
  const search = useStore((s) => s.search)
  const transport = search.transport
  const isHotel = transport === 'hotel'
  const nights =
    search.dateThere && search.dateBack
      ? Math.max(1, Math.round((+new Date(search.dateBack) - +new Date(search.dateThere)) / 86400000))
      : 2

  const visible = useMemo(() => applyFilters(offers, filters), [offers, filters])
  const cheapest = useMemo(
    () => (visible.length ? visible.reduce((a, b) => (a.price <= b.price ? a : b)) : null),
    [visible],
  )
  const overallMin = useMemo(() => min(offers.map((o) => o.price)), [offers])

  // airlines with their min price (for filter chips)
  const carriers = useMemo(() => {
    const m = new Map<string, number>()
    for (const o of offers) {
      const key = o.carrier
      m.set(key, Math.min(m.get(key) ?? Infinity, o.price))
    }
    return [...m.entries()].sort((a, b) => a[1] - b[1]).slice(0, 5)
  }, [offers])
  const directMin = useMemo(() => min(offers.filter((o) => o.transfers === 0).map((o) => o.price)), [offers])

  /* ---- date strip: fetch neighbour prices in background ---- */
  const [datePrices, setDatePrices] = useState<Record<string, number | null>>({})
  const strip = useMemo(() => {
    const base = search.dateThere ? new Date(search.dateThere) : new Date()
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(base)
      d.setDate(base.getDate() + (i - 1))
      return isoOf(d)
    })
  }, [search.dateThere])

  const reqRef = useRef(0)
  useEffect(() => {
    if (transport === 'hotel' || !search.fromCity || !search.toCity) return
    const my = ++reqRef.current
    // seed selected date with current results min
    setDatePrices((p) => ({ ...p, [search.dateThere]: overallMin || null }))
    strip.forEach((date) => {
      if (date === search.dateThere) return
      setDatePrices((p) => (date in p ? p : { ...p, [date]: null }))
      searchOffers({ transport, origin: search.fromCity, destination: search.toCity, departureDate: date, passengers: search.passengers })
        .then((r) => {
          if (reqRef.current !== my) return
          setDatePrices((p) => ({ ...p, [date]: min(r.offers.map((o) => o.price)) || 0 }))
        })
        .catch(() => setDatePrices((p) => ({ ...p, [date]: 0 })))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strip.join(','), transport, search.fromCity, search.toCity, overallMin])

  const runFor = (patch: Partial<typeof search>) => {
    const st = useStore.getState()
    st.patchSearch(patch)
    const s = st.search
    st.setPage('results')
    if (s.transport === 'hotel') {
      if (!s.toCity) return
      st.setSearching(true)
      searchOffers({ transport: 'hotel', origin: s.toCity, destination: s.toCity, departureDate: s.dateThere, passengers: s.passengers })
        .then((r) => st.setHotels(r.hotels || [], r.label))
        .catch((e) => st.setSearchError((e as Error).message))
      return
    }
    if (!s.fromCity || !s.toCity) return
    st.setOffers([], `${s.fromCity} — ${s.toCity}`)
    st.setSearching(true)
    searchOffers({ transport: s.transport, origin: s.fromCity, destination: s.toCity, departureDate: s.dateThere, passengers: s.passengers, serviceClass: s.travelClass })
      .then((r) => st.setOffers(r.offers, r.label))
      .catch((e) => st.setSearchError((e as Error).message))
  }

  const title = TRANSPORT_TITLE[transport] || 'Результаты'

  return (
    <div className="min-h-screen bg-tutu-soft pb-32">
      {/* ===== dark header: badges + search + transport pills (как на tutu) ===== */}
      <div className="tutu-hero pb-5 pt-4">
        <div className="tutu-container">
          {/* trust badges */}
          <div className="mb-4 hidden flex-wrap gap-2 md:flex">
            {[
              ['22 года', 'работаем для вас'],
              ['30 млн', 'путешествуют с нами'],
              ['4,84', 'рейтинг приложения'],
            ].map(([t, s]) => (
              <div key={t} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 text-white/90">
                <span className="text-[14px] font-bold">{t}</span>
                <span className="text-[13px] text-white/70">{s}</span>
              </div>
            ))}
          </div>

          <SearchWidget compact />

          {/* transport pills with price */}
          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
            {TRANSPORTS.map(({ key, label: l, Icon }) => {
              const active = key === transport
              return (
                <button
                  key={key}
                  onClick={() => runFor({ transport: key })}
                  className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 ring-1 transition ${
                    active
                      ? 'bg-white text-tutu-ink ring-white'
                      : 'bg-white/10 text-white ring-white/25 hover:bg-white/20'
                  }`}
                >
                  <Icon width={20} height={20} />
                  <span className="text-left leading-tight">
                    <span className="block text-[14px] font-semibold">{l}</span>
                    {active && overallMin > 0 && (
                      <span className="block text-[11.5px] text-tutu-violet-d">от {fmtPrice(overallMin)}</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="tutu-container pt-6">
        {/* filter chips row */}
        {transport !== 'hotel' && (
        <div className="no-scrollbar mb-3 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() =>
              patchFilters({
                sort: filters.sort === 'price' ? 'duration' : filters.sort === 'duration' ? 'departure' : 'price',
              })
            }
            className="flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[13.5px] font-semibold text-tutu-ink ring-1 ring-tutu-line hover:ring-tutu-violet/40"
            title="Сортировка"
          >
            ⇅ {filters.sort === 'price' ? 'Дешевле' : filters.sort === 'duration' ? 'Быстрее' : 'Раньше'}
          </button>

          <Chip
            active={filters.directOnly}
            label="Прямой"
            price={directMin}
            onClick={() => patchFilters({ directOnly: !filters.directOnly })}
          />
          {carriers.map(([name, p]) => {
            const on = filters.carriers.includes(name)
            return (
              <Chip
                key={name}
                active={on}
                label={name}
                price={p}
                onClick={() =>
                  patchFilters({
                    carriers: on ? filters.carriers.filter((c) => c !== name) : [...filters.carriers, name],
                  })
                }
              />
            )
          })}
          {(filters.directOnly || filters.carriers.length > 0) && (
            <button
              onClick={() => patchFilters({ directOnly: false, carriers: [] })}
              className="shrink-0 text-[13px] font-semibold text-tutu-violet-d hover:underline"
            >
              Сбросить
            </button>
          )}
        </div>
        )}

        {/* date strip */}
        {transport !== 'hotel' && (
          <div className="no-scrollbar mb-5 flex items-stretch gap-2 overflow-x-auto">
            <div className="flex h-14 w-12 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-tutu-line">
              📅
            </div>
            {strip.map((date) => {
              const d = new Date(date)
              const active = date === search.dateThere
              const price = datePrices[date]
              return (
                <button
                  key={date}
                  onClick={() => runFor({ dateThere: date })}
                  className={`flex h-14 shrink-0 flex-col items-center justify-center rounded-2xl px-4 ring-1 transition ${
                    active ? 'bg-tutu-violet text-white ring-tutu-violet' : 'bg-white text-tutu-ink ring-tutu-line hover:ring-tutu-violet/40'
                  }`}
                >
                  <span className="text-[13px] font-semibold">
                    {d.getDate()} {MONTHS[d.getMonth()]}, {WD[d.getDay()]}
                  </span>
                  <span className={`text-[12px] ${active ? 'text-white/85' : 'text-tutu-green'}`}>
                    {price == null ? '…' : price > 0 ? fmtPrice(price) : '—'}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* ===== HOTELS ===== */}
        {isHotel ? (
          error ? (
            <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-tutu-line">
              <div className="text-[16px] font-semibold text-tutu-ink">Не удалось выполнить поиск</div>
              <div className="mt-1 text-[14px] text-tutu-muted">{error}</div>
            </div>
          ) : (
            <HotelResults hotels={hotels} city={search.toCity} nights={nights} searching={searching} />
          )
        ) : (
          <>
            {/* header */}
            <div className="mb-4 flex items-baseline justify-between">
              <div>
                <div className="text-[13px] font-semibold uppercase tracking-wide text-tutu-violet-d">{title}</div>
                <h2 className="text-[22px] font-extrabold text-tutu-ink">{label || 'Результаты поиска'}</h2>
              </div>
              {!searching && !error && <span className="text-[14px] text-tutu-muted">найдено {visible.length}</span>}
            </div>

            {searching ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-32 animate-pulse rounded-2xl bg-white ring-1 ring-tutu-line" />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-tutu-line">
                <div className="text-[16px] font-semibold text-tutu-ink">Не удалось выполнить поиск</div>
                <div className="mt-1 text-[14px] text-tutu-muted">{error}</div>
              </div>
            ) : visible.length === 0 ? (
              <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-tutu-line">
                <div className="text-[16px] font-semibold text-tutu-ink">Ничего не нашлось</div>
                <div className="mt-1 text-[14px] text-tutu-muted">Снимите фильтры или выберите другую дату.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {visible.map((o) => (
                  <OfferCard key={o.id} offer={o} best={cheapest?.id === o.id && filters.sort === 'price'} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Chip({ active, label, price, onClick }: { active: boolean; label: string; price: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 flex-col items-start rounded-full px-4 py-1.5 ring-1 transition ${
        active ? 'bg-tutu-violet/10 ring-tutu-violet' : 'bg-white ring-tutu-line hover:ring-tutu-violet/40'
      }`}
    >
      <span className={`text-[13.5px] font-semibold ${active ? 'text-tutu-violet-d' : 'text-tutu-ink'}`}>{label}</span>
      {price > 0 && <span className="text-[11px] text-tutu-muted">от {fmtPrice(price)}</span>}
    </button>
  )
}
