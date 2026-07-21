import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { fetchSeatmap, fetchCheckout } from '../lib/api'
import { fmtPrice, fmtTime } from '../lib/format'
import type { Seatmap, SeatCar } from '../types'
import { IconClose, IconTrain } from './icons'

export default function SeatmapModal() {
  const offer = useStore((s) => s.seatmapOffer)
  const close = useStore((s) => s.setSeatmapOffer)
  const [map, setMap] = useState<Seatmap | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [carIdx, setCarIdx] = useState(0)

  useEffect(() => {
    if (!offer) return
    setMap(null)
    setError('')
    setCarIdx(0)
    setLoading(true)
    fetchSeatmap(offer.detailsRef)
      .then((m) => setMap(m))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [offer])

  if (!offer) return null

  const car: SeatCar | undefined = map?.cars[carIdx]

  const buy = async () => {
    try {
      const { url } = await fetchCheckout(offer.checkoutRef)
      window.open(url || offer.deepLink, '_blank', 'noopener')
    } catch {
      window.open(offer.deepLink, '_blank', 'noopener')
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => close(null)}>
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="tutu-hero flex items-center gap-3 px-5 py-4 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <IconTrain width={20} height={20} />
          </span>
          <div className="flex-1">
            <div className="text-[15px] font-bold">
              {offer.carrier} · поезд {map?.trainNumber || offer.segments[0]?.flightNo || ''}
            </div>
            <div className="text-[12.5px] text-white/70">
              {offer.segments[0]?.fromCity} {fmtTime(offer.departAt)} → {offer.segments.at(-1)?.toCity} {fmtTime(offer.arriveAt)}
            </div>
          </div>
          <button onClick={() => close(null)} className="text-white/70 hover:text-white">
            <IconClose width={22} height={22} />
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && <div className="py-16 text-center text-tutu-muted">Загружаю схему вагонов…</div>}
          {error && <div className="py-16 text-center text-tutu-orange">Не удалось загрузить: {error}</div>}

          {map && (
            <>
              {/* car selector */}
              <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
                {map.cars.map((c, i) => (
                  <button
                    key={c.number + i}
                    onClick={() => setCarIdx(i)}
                    className={`flex shrink-0 flex-col items-start rounded-xl px-3.5 py-2 ring-1 transition ${
                      i === carIdx ? 'bg-tutu-violet text-white ring-tutu-violet' : 'bg-white text-tutu-ink ring-tutu-line hover:ring-tutu-violet/40'
                    }`}
                  >
                    <span className="text-[14px] font-bold">Вагон {c.number}</span>
                    <span className={`text-[11.5px] ${i === carIdx ? 'text-white/85' : 'text-tutu-muted'}`}>
                      {c.type} · от {fmtPrice(c.minPrice)}
                    </span>
                  </button>
                ))}
              </div>

              {car && (
                <div className="rounded-2xl bg-tutu-soft p-4">
                  <div className="mb-1 flex items-baseline justify-between">
                    <div className="text-[17px] font-extrabold text-tutu-ink">
                      Вагон {car.number} · {car.type}
                    </div>
                    <div className="text-[13px] text-tutu-muted">класс {car.serviceClass}</div>
                  </div>

                  {/* amenities */}
                  {car.amenities.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-1.5">
                      {car.amenities.map((a) => (
                        <span key={a} className="rounded-lg bg-white px-2.5 py-1 text-[12.5px] text-tutu-ink ring-1 ring-tutu-line">
                          {a}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* seat groups */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {car.groups.map((g, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl bg-white p-3 ring-1 ring-tutu-line">
                        <div>
                          <div className="text-[14px] font-semibold text-tutu-ink">{g.type}</div>
                          <div className="text-[12.5px] text-tutu-muted">свободно {g.count}</div>
                        </div>
                        <div className="text-[16px] font-extrabold text-tutu-ink">{fmtPrice(g.price)}</div>
                      </div>
                    ))}
                  </div>

                  {/* seat grid (когда есть конкретные места) */}
                  {car.seats.length > 0 && (
                    <div className="mt-4">
                      <div className="mb-2 text-[13px] font-semibold text-tutu-muted">Свободные места</div>
                      <div className="flex flex-wrap gap-1.5">
                        {car.seats.slice(0, 60).map((s, i) => (
                          <span
                            key={s.number + i}
                            className={`flex h-9 w-9 items-center justify-center rounded-lg text-[12.5px] font-semibold ${
                              s.available ? 'bg-white text-tutu-ink ring-1 ring-tutu-violet/40' : 'bg-tutu-line text-tutu-muted line-through'
                            }`}
                          >
                            {s.number}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between border-t border-tutu-line px-5 py-4">
          <div className="text-[14px] text-tutu-muted">
            Схема мест — из MCP Туту (read-only)
          </div>
          <button
            onClick={buy}
            className="rounded-xl bg-tutu-violet px-6 py-2.5 text-[15px] font-bold text-white transition hover:bg-tutu-violet-d"
          >
            Оформить на tutu →
          </button>
        </div>
      </div>
    </div>
  )
}
