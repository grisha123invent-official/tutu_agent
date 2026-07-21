import { useMemo, useState } from 'react'
import type { Hotel } from '../types'
import HotelCard from './HotelCard'
import { fmtPrice } from '../lib/format'

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[14px] text-tutu-ink">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-tutu-violet" />
      {label}
    </label>
  )
}

/** Faux map panel with price pins — like tutu's hotel map. */
function MapPanel({ hotels }: { hotels: Hotel[] }) {
  const pins = hotels.slice(0, 7)
  return (
    <div className="relative hidden h-[560px] w-[320px] shrink-0 overflow-hidden rounded-2xl ring-1 ring-tutu-line xl:block">
      {/* street grid */}
      <div className="absolute inset-0 bg-[#e8eef5]" />
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'linear-gradient(#d3dceb 1px, transparent 1px), linear-gradient(90deg, #d3dceb 1px, transparent 1px)',
          backgroundSize: '46px 46px',
        }}
      />
      <div className="absolute left-[-10%] top-1/3 h-3 w-[130%] -rotate-6 bg-[#cdd8ea]" />
      <div className="absolute left-[-10%] top-2/3 h-2 w-[130%] rotate-3 bg-[#cdd8ea]" />
      <div className="absolute bottom-0 right-0 h-40 w-40 rounded-tl-[80px] bg-[#bfe0d0]" />

      {/* price pins */}
      {pins.map((h, i) => (
        <span
          key={h.id}
          className="absolute rounded-full bg-tutu-violet px-2 py-1 text-[12px] font-bold text-white shadow-lg ring-2 ring-white"
          style={{ left: `${12 + ((i * 37) % 70)}%`, top: `${10 + ((i * 53) % 75)}%` }}
        >
          {fmtPrice(h.price).replace(' ₽', '')}
        </span>
      ))}

      <button className="absolute right-3 top-3 flex items-center gap-2 rounded-xl bg-tutu-ink/90 px-3 py-2 text-[13px] font-semibold text-white">
        ⤢ Развернуть карту
      </button>
    </div>
  )
}

export default function HotelResults({
  hotels,
  city,
  nights,
  searching,
}: {
  hotels: Hotel[]
  city: string
  nights: number
  searching: boolean
}) {
  const [freeCancel, setFreeCancel] = useState(false)
  const [from3, setFrom3] = useState(false)
  const [sort, setSort] = useState<'reco' | 'price'>('reco')

  const prices = hotels.map((h) => h.price)
  const maxPrice = prices.length ? Math.max(...prices) : 100000
  const [priceCap, setPriceCap] = useState<number | null>(null)

  const visible = useMemo(() => {
    let out = hotels.filter((h) => {
      if (freeCancel && !h.freeCancellation) return false
      if (from3 && h.stars < 3) return false
      if (priceCap != null && h.price > priceCap) return false
      return true
    })
    if (sort === 'price') out = [...out].sort((a, b) => a.price - b.price)
    return out
  }, [hotels, freeCancel, from3, priceCap, sort])

  return (
    <div className="flex gap-5">
      {/* sidebar */}
      <aside className="hidden w-64 shrink-0 space-y-3 lg:block">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-tutu-line">
          <div className="mb-2 text-[15px] font-bold text-tutu-ink">Популярные фильтры</div>
          <Check label="Бесплатная отмена" checked={freeCancel} onChange={() => setFreeCancel((v) => !v)} />
          <Check label="От 3-х звёзд" checked={from3} onChange={() => setFrom3((v) => !v)} />
        </div>

        <div className="rounded-2xl bg-white p-4 ring-1 ring-tutu-line">
          <div className="mb-3 text-[15px] font-bold text-tutu-ink">Цена за проживание</div>
          <div className="mb-2 flex gap-2">
            <div className="flex-1 rounded-xl bg-tutu-soft px-3 py-2 text-[13px]">
              <div className="text-tutu-muted">От</div>
              <div className="font-semibold text-tutu-ink">0 ₽</div>
            </div>
            <div className="flex-1 rounded-xl bg-tutu-soft px-3 py-2 text-[13px]">
              <div className="text-tutu-muted">До</div>
              <div className="font-semibold text-tutu-ink">{fmtPrice(priceCap ?? maxPrice)}</div>
            </div>
          </div>
          <input
            type="range"
            min={Math.min(...(prices.length ? prices : [0]))}
            max={maxPrice}
            value={priceCap ?? maxPrice}
            onChange={(e) => setPriceCap(Number(e.target.value))}
            className="w-full accent-tutu-violet"
          />
        </div>
      </aside>

      {/* center list */}
      <div className="min-w-0 flex-1 space-y-3">
        {/* header card */}
        <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-tutu-line">
          <div>
            <div className="text-[18px] font-extrabold text-tutu-ink">Отели в {city || '—'}</div>
            <div className="text-[13px] text-tutu-muted">{hotels.length} предложений</div>
          </div>
          <button
            onClick={() => setSort(sort === 'reco' ? 'price' : 'reco')}
            className="text-[14px] font-semibold text-tutu-violet-d hover:underline"
          >
            {sort === 'reco' ? 'Сначала рекомендованные' : 'Сначала дешёвые'} ⇅
          </button>
        </div>

        {/* sale banner */}
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-tutu-orange px-5 py-2.5 text-white">
          <span className="rounded-md bg-black/20 px-2 py-0.5 text-[12px] font-extrabold">МОЩНАЯ</span>
          <span className="text-[15px] font-extrabold">РАСПРОДАЖА БИЛЕТОВ НА</span>
          <span className="rounded-md bg-[#c6ff00] px-2 py-0.5 text-[13px] font-extrabold text-black">МОРЕ</span>
        </div>

        {searching ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl bg-white ring-1 ring-tutu-line" />
          ))
        ) : visible.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-tutu-line">
            <div className="text-[16px] font-semibold text-tutu-ink">Отели не найдены</div>
            <div className="mt-1 text-[14px] text-tutu-muted">Снимите фильтры или выберите другой город.</div>
          </div>
        ) : (
          visible.map((h) => <HotelCard key={h.id} hotel={h} nights={nights} />)
        )}
      </div>

      {/* map */}
      <MapPanel hotels={visible} />
    </div>
  )
}
