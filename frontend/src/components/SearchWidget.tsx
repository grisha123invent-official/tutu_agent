import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import type { Transport } from '../types'
import { useFlash } from '../lib/useFlash'
import { fmtDate } from '../lib/format'
import {
  IconBus,
  IconHotel,
  IconPlane,
  IconSpark,
  IconSuburban,
  IconTrain,
} from './icons'
import { sendUser } from '../lib/ws'
import { searchOffers } from '../lib/api'

/* ------------------------------------------------------------------ tabs */

type TabDef = {
  key: Transport | 'tours' | 'car' | 'jarvel'
  label: string
  Icon: typeof IconPlane
  badge?: string
  badgeColor?: string
  ai?: boolean
  url?: string
}

const TABS: TabDef[] = [
  { key: 'hotel', label: 'Отели', Icon: IconHotel },
  { key: 'avia', label: 'Авиабилеты', Icon: IconPlane },
  { key: 'zhd', label: 'Ж/д билеты', Icon: IconTrain },
  { key: 'bus', label: 'Автобусы', Icon: IconBus },
  { key: 'suburban', label: 'Электрички', Icon: IconSuburban },
  { key: 'tours', label: 'Туры', Icon: IconHotel, badge: 'Кешбэк до 7%', badgeColor: 'bg-tutu-orange', url: 'https://tours.tutu.ru/' },
  { key: 'car', label: 'Аренда авто', Icon: IconBus, url: 'https://avto.tutu.ru/' },
  { key: 'jarvel', label: 'Джарвел', Icon: IconSpark, badge: 'ИИ-помощник', badgeColor: 'bg-tutu-pink', ai: true },
]

const FUNCTIONAL: Transport[] = ['hotel', 'avia', 'zhd', 'bus', 'suburban']

/* ------------------------------------------------------------------ data */

const CITIES = [
  'Москва',
  'Санкт-Петербург',
  'Сочи',
  'Казань',
  'Екатеринбург',
  'Калининград',
  'Новосибирск',
  'Краснодар',
  'Минеральные Воды',
  'Мурманск',
  'Самара',
  'Уфа',
  'Нижний Новгород',
  'Владивосток',
  'Стамбул',
  'Анталья',
]

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]
const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function guestsLabel(n: number) {
  const m10 = n % 10
  const m100 = n % 100
  const word =
    m10 === 1 && m100 !== 11 ? 'гость' : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? 'гостя' : 'гостей'
  return `${n} ${word}`
}
function paxLabel(n: number) {
  const m10 = n % 10
  const m100 = n % 100
  const word =
    m10 === 1 && m100 !== 11
      ? 'пассажир'
      : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)
        ? 'пассажира'
        : 'пассажиров'
  return `${n} ${word}`
}

/* -------------------------------------------------------------- calendar */

function Calendar({
  selected,
  min,
  onPick,
}: {
  selected?: string
  min?: string
  onPick: (isoDate: string) => void
}) {
  const start = selected ? new Date(selected) : new Date()
  const [view, setView] = useState(new Date(start.getFullYear(), start.getMonth(), 1))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const minDate = min ? new Date(min) : today

  const firstOffset = (new Date(view.getFullYear(), view.getMonth(), 1).getDay() + 6) % 7
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array.from({ length: firstOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="w-[300px] select-none p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-tutu-ink hover:bg-tutu-soft"
        >
          ‹
        </button>
        <div className="text-[14.5px] font-bold text-tutu-ink">
          {MONTHS[view.getMonth()]} {view.getFullYear()}
        </div>
        <button
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-tutu-ink hover:bg-tutu-soft"
        >
          ›
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 text-center text-[11.5px] font-semibold text-tutu-muted">
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-1">
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return <span key={i} />
          const d = new Date(view.getFullYear(), view.getMonth(), day)
          const dIso = iso(d)
          const disabled = d < minDate
          const isSel = selected === dIso
          return (
            <button
              key={i}
              disabled={disabled}
              onClick={() => onPick(dIso)}
              className={`m-0.5 flex h-9 items-center justify-center rounded-lg text-[13.5px] font-semibold transition ${
                isSel
                  ? 'bg-tutu-violet text-white'
                  : disabled
                    ? 'cursor-not-allowed text-tutu-line'
                    : 'text-tutu-ink hover:bg-tutu-soft'
              }`}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ main widget */

type OpenKey = 'from' | 'to' | 'date' | 'back' | 'pax' | null

export default function SearchWidget({ compact = false }: { compact?: boolean }) {
  const search = useStore((s) => s.search)
  const setTransport = useStore((s) => s.setTransport)
  const patch = useStore((s) => s.patchSearch)
  const flash = useStore((s) => s.flash)

  const [open, setOpen] = useState<OpenKey>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // close popovers on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const fFrom = useFlash('fromCity')
  const fTo = useFlash('toCity')
  const fDate = useFlash('dateThere')
  const fBack = useFlash('dateBack')
  const fPax = useFlash('passengers')

  const isRoute = search.transport !== 'hotel'

  const set = (payload: Partial<typeof search>, key: string) => {
    patch(payload)
    flash(key)
  }

  const searchLabelByTransport: Record<Transport, string> = {
    avia: 'Найти билеты',
    zhd: 'Найти билеты',
    bus: 'Найти билеты',
    suburban: 'Найти электрички',
    hotel: 'Найти отели',
  }

  const runSearch = async () => {
    const st = useStore.getState()
    const { fromCity, toCity, dateThere, dateBack, transport, passengers, travelClass } = st.search
    setOpen(null)

    const addDays = (base: string | undefined, n: number) => {
      const d = base ? new Date(base) : new Date()
      d.setDate(d.getDate() + n)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }

    // отели — прямой поиск через MCP (своя модель данных)
    if (transport === 'hotel') {
      if (!toCity) {
        st.togglePanel(true)
        return
      }
      let checkIn = dateThere
      if (!checkIn) {
        checkIn = addDays(undefined, 3)
        set({ dateThere: checkIn }, 'dateThere')
      }
      const checkOut = dateBack || addDays(checkIn, 2)
      st.setPage('results')
      st.setSearching(true)
      try {
        const r = await searchOffers({
          transport: 'hotel',
          origin: toCity,
          destination: toCity,
          departureDate: checkIn,
          checkOut,
          passengers,
        })
        st.setHotels(r.hotels || [], r.label)
      } catch (e) {
        st.setSearchError((e as Error).message)
      }
      return
    }

    if (!fromCity || !toCity) {
      st.togglePanel(true)
      return
    }

    // дата обязательна для MCP — если не выбрана, ставим +3 дня и показываем в форме
    let date = dateThere
    if (!date) {
      const d = new Date(Date.now() + 3 * 86400000)
      date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      set({ dateThere: date }, 'dateThere')
    }

    // прямой поиск через MCP (без ассистента)
    st.setPage('results')
    st.setOffers([], `${fromCity} — ${toCity}`)
    st.setSearching(true)
    try {
      const r = await searchOffers({
        transport,
        origin: fromCity,
        destination: toCity,
        departureDate: date,
        passengers,
        serviceClass: travelClass,
      })
      st.setOffers(r.offers, r.label)
    } catch (e) {
      st.setSearchError((e as Error).message)
    }
  }

  /* chips */
  const today = new Date()
  const tomorrow = new Date(Date.now() + 86400000)
  const dayAfter = new Date(Date.now() + 2 * 86400000)
  const dd = (d: Date) => d.getDate()
  const month = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'][today.getMonth()]

  const cityChips = isRoute
    ? [
        { label: 'Москва', act: () => set({ fromCity: 'Москва' }, 'fromCity') },
        { label: 'Санкт-Петербург', act: () => set({ toCity: 'Санкт-Петербург' }, 'toCity') },
        { label: 'Сочи', act: () => set({ toCity: 'Сочи' }, 'toCity') },
      ]
    : [
        { label: 'Москва', act: () => set({ toCity: 'Москва' }, 'toCity') },
        { label: 'Санкт-Петербург', act: () => set({ toCity: 'Санкт-Петербург' }, 'toCity') },
        { label: 'Сочи', act: () => set({ toCity: 'Сочи' }, 'toCity') },
      ]
  const dateChips = isRoute
    ? [
        { label: `${dd(today)} ${month}`, act: () => set({ dateThere: iso(today) }, 'dateThere') },
        { label: `${dd(tomorrow)} ${month}`, act: () => set({ dateThere: iso(tomorrow) }, 'dateThere') },
      ]
    : [
        {
          label: `${dd(today)} – ${dd(tomorrow)} ${month}`,
          act: () => set({ dateThere: iso(today), dateBack: iso(tomorrow) }, 'dateThere'),
        },
        {
          label: `${dd(tomorrow)} – ${dd(dayAfter)} ${month}`,
          act: () => set({ dateThere: iso(tomorrow), dateBack: iso(dayAfter) }, 'dateThere'),
        },
      ]

  /* city suggestions */
  const suggestions = (query: string, exclude?: string) =>
    CITIES.filter(
      (c) => c !== exclude && (!query || c.toLowerCase().includes(query.toLowerCase())),
    ).slice(0, 6)

  const popover =
    'absolute left-0 top-[calc(100%+8px)] z-[60] overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/25 ring-1 ring-tutu-line'

  const cityInput = (
    key: 'from' | 'to',
    value: string,
    placeholder: string,
    flashCls: string,
    widthCls: string,
  ) => {
    const field = key === 'from' ? 'fromCity' : 'toCity'
    return (
      <div className={`relative flex min-w-0 flex-col justify-center rounded-2xl px-4 py-2.5 transition hover:bg-tutu-soft ${flashCls} ${widthCls} ${open === key ? 'bg-tutu-soft' : ''}`}>
        <input
          value={value}
          placeholder={placeholder}
          onFocus={() => setOpen(key)}
          onChange={(e) => set({ [field]: e.target.value } as Partial<typeof search>, field)}
          className="w-full bg-transparent text-[16px] font-semibold text-tutu-ink outline-none placeholder:font-normal placeholder:text-tutu-muted"
        />
        {open === key && (
          <div className={`${popover} w-64 py-1`}>
            {suggestions(value, key === 'from' ? search.toCity : search.fromCity).map((c) => (
              <button
                key={c}
                onMouseDown={(e) => {
                  e.preventDefault()
                  set({ [field]: c } as Partial<typeof search>, field)
                  setOpen(null)
                }}
                className="block w-full px-4 py-2 text-left text-[14.5px] font-medium text-tutu-ink hover:bg-tutu-soft"
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const dateField = (
    key: 'date' | 'back',
    label: string,
    value: string,
    flashCls: string,
    widthCls: string,
  ) => (
    <div
      className={`relative flex min-w-0 cursor-pointer flex-col justify-center rounded-2xl px-4 py-2.5 transition hover:bg-tutu-soft ${flashCls} ${widthCls} ${open === key ? 'bg-tutu-soft' : ''}`}
      onClick={() => setOpen(open === key ? null : key)}
    >
      <div className={`truncate text-[16px] ${value ? 'font-semibold text-tutu-ink' : 'text-tutu-muted'}`}>
        {value || label}
      </div>
      {open === key && (
        <div className={popover} onClick={(e) => e.stopPropagation()}>
          <Calendar
            selected={key === 'date' ? search.dateThere : search.dateBack}
            min={key === 'back' ? search.dateThere || undefined : undefined}
            onPick={(d) => {
              if (key === 'date') {
                if (!isRoute) {
                  // hotel: pick range — first заезд, then выезд
                  if (!search.dateThere || search.dateBack || d <= search.dateThere) {
                    set({ dateThere: d, dateBack: '' }, 'dateThere')
                  } else {
                    set({ dateBack: d }, 'dateBack')
                    setOpen(null)
                  }
                  return
                }
                set({ dateThere: d }, 'dateThere')
              } else {
                set({ dateBack: d }, 'dateBack')
              }
              setOpen(null)
            }}
          />
        </div>
      )}
    </div>
  )

  const paxField = (widthCls: string) => (
    <div
      className={`relative flex min-w-0 cursor-pointer flex-col justify-center rounded-2xl px-4 py-2.5 transition hover:bg-tutu-soft ${fPax} ${widthCls} ${open === 'pax' ? 'bg-tutu-soft' : ''}`}
      onClick={() => setOpen(open === 'pax' ? null : 'pax')}
    >
      <div className="text-[11px] font-medium text-tutu-muted">Кто едет</div>
      <div className="truncate text-[16px] font-semibold text-tutu-ink">
        {isRoute ? paxLabel(search.passengers) : guestsLabel(search.passengers)}
      </div>
      {open === 'pax' && (
        <div className={`${popover} w-64 p-4`} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <span className="text-[14.5px] font-semibold text-tutu-ink">
              {isRoute ? 'Пассажиры' : 'Гости'}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => search.passengers > 1 && set({ passengers: search.passengers - 1 }, 'passengers')}
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-[18px] font-bold ${
                  search.passengers > 1 ? 'bg-tutu-soft text-tutu-violet-d hover:bg-tutu-line' : 'bg-tutu-soft/60 text-tutu-line'
                }`}
              >
                −
              </button>
              <span className="w-5 text-center text-[16px] font-bold text-tutu-ink">{search.passengers}</span>
              <button
                onClick={() => search.passengers < 9 && set({ passengers: search.passengers + 1 }, 'passengers')}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-tutu-soft text-[18px] font-bold text-tutu-violet-d hover:bg-tutu-line"
              >
                +
              </button>
            </div>
          </div>
          {search.transport === 'avia' && (
            <div className="mt-4 flex gap-1 rounded-xl bg-tutu-soft p-1">
              {(['economy', 'business'] as const).map((cl) => (
                <button
                  key={cl}
                  onClick={() => set({ travelClass: cl }, 'passengers')}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-[13.5px] font-semibold transition ${
                    search.travelClass === cl ? 'bg-white text-tutu-ink shadow' : 'text-tutu-muted'
                  }`}
                >
                  {cl === 'economy' ? 'Эконом' : 'Бизнес'}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setOpen(null)}
            className="mt-4 w-full rounded-xl bg-tutu-violet py-2.5 text-[14.5px] font-bold text-white hover:bg-tutu-violet-d"
          >
            Готово
          </button>
        </div>
      )}
    </div>
  )

  const divider = <div className="hidden w-px self-stretch bg-tutu-line md:block" />

  return (
    <div ref={rootRef} className={compact ? '' : 'tutu-pop'}>
      {/* transport tabs (только на главной; на результатах — компактные пилюли ниже) */}
      {!compact && (
      <div className="no-scrollbar mb-4 flex gap-1 overflow-x-auto">
        {TABS.map(({ key, label, Icon, badge, badgeColor, ai, url }) => {
          const functional = (FUNCTIONAL as string[]).includes(key)
          const active = functional && search.transport === key
          return (
            <button
              key={key}
              onClick={() => {
                if (functional) {
                  setTransport(key as Transport)
                  flash('transport')
                } else if (url) {
                  window.open(url, '_blank', 'noopener')
                } else {
                  useStore.getState().togglePanel(true)
                  if (ai) sendUser('Привет! Помоги спланировать поездку — подбери билеты и места.')
                }
              }}
              className={`relative flex shrink-0 flex-col items-center gap-1.5 rounded-2xl px-4 py-2.5 transition ${
                active ? 'text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              {badge && (
                <span
                  className={`absolute -top-1.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full ${badgeColor || 'bg-tutu-orange'} px-2 py-0.5 text-[10px] font-bold text-white`}
                >
                  {badge}
                </span>
              )}
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
                  active ? 'bg-tutu-violet shadow-lg shadow-black/25' : 'bg-transparent'
                }`}
              >
                <Icon width={26} height={26} />
              </span>
              <span className="text-[13px] font-semibold whitespace-nowrap">{label}</span>
            </button>
          )
        })}
      </div>
      )}

      {/* search bar */}
      <div className="flex flex-col gap-1.5 rounded-3xl bg-white p-1.5 shadow-2xl shadow-black/20 md:flex-row md:items-stretch">
        {isRoute ? (
          <>
            {cityInput('from', search.fromCity, 'Откуда', fFrom, 'flex-1')}
            {divider}
            {cityInput('to', search.toCity, 'Куда', fTo, 'flex-1')}
            {divider}
            {dateField('date', 'Когда', fmtDate(search.dateThere), fDate, 'w-full md:w-40')}
            {divider}
            {dateField('back', 'Обратно', fmtDate(search.dateBack), fBack, 'w-full md:w-40')}
            {divider}
            {paxField('w-full md:w-44')}
          </>
        ) : (
          <>
            {cityInput('to', search.toCity, 'Город, отель или направление', fTo, 'flex-1')}
            {divider}
            {dateField(
              'date',
              'Заезд — Выезд',
              search.dateThere
                ? `${fmtDate(search.dateThere)}${search.dateBack ? ' — ' + fmtDate(search.dateBack) : ' — ?'}`
                : '',
              fDate,
              'w-full md:w-72',
            )}
            {divider}
            {paxField('w-full md:w-40')}
          </>
        )}
        <button
          onClick={runSearch}
          className="rounded-2xl bg-tutu-violet px-7 py-3.5 text-[16px] font-bold text-white transition hover:bg-tutu-violet-d"
        >
          {searchLabelByTransport[search.transport]}
        </button>
      </div>

      {/* hint chips под полями — как на tutu */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {cityChips.map((c) => (
          <button
            key={c.label}
            onClick={c.act}
            className="rounded-lg bg-white/12 px-2.5 py-1 text-[12.5px] font-semibold text-white/90 transition hover:bg-white/20"
          >
            {c.label}
          </button>
        ))}
        <span className="mx-2 hidden h-4 w-px bg-white/20 sm:block" />
        {dateChips.map((d) => (
          <button
            key={d.label}
            onClick={d.act}
            className="rounded-lg bg-white/12 px-2.5 py-1 text-[12.5px] font-semibold text-white/90 transition hover:bg-white/20"
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  )
}
