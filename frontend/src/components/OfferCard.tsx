import type { Offer, Transport } from '../types'
import { fmtDate, fmtDuration, fmtPrice, fmtTime } from '../lib/format'
import { IconBus, IconPlane, IconSuburban, IconTrain } from './icons'
import { useStore } from '../store'
import { fetchCheckout } from '../lib/api'

const META: Record<
  Transport,
  { Icon: typeof IconPlane; tint: string; cta: string; direct: string; durSuffix: string }
> = {
  avia: { Icon: IconPlane, tint: 'bg-[#eef0ff] text-tutu-violet-d', cta: 'Выбрать билет', direct: 'Прямой', durSuffix: 'в пути' },
  zhd: { Icon: IconTrain, tint: 'bg-[#eafaf2] text-tutu-green', cta: 'Выбрать место', direct: 'Без пересадок', durSuffix: 'в пути' },
  bus: { Icon: IconBus, tint: 'bg-[#fff2e8] text-tutu-orange', cta: 'Выбрать место', direct: 'Прямой', durSuffix: 'в пути' },
  suburban: { Icon: IconSuburban, tint: 'bg-[#eef0ff] text-tutu-violet-d', cta: 'Расписание', direct: 'Без пересадок', durSuffix: 'в пути' },
  hotel: { Icon: IconPlane, tint: '', cta: 'Выбрать', direct: '', durSuffix: '' },
}

function Point({ time, date, station, city, align }: { time: string; date: string; station: string; city: string; align: 'left' | 'right' }) {
  return (
    <div className={align === 'right' ? 'text-right' : 'text-left'}>
      <div className="text-[26px] font-extrabold leading-none text-tutu-ink">{time}</div>
      <div className="mt-1.5 text-[12.5px] text-tutu-muted">{date}</div>
      {station && <div className="text-[13px] font-semibold text-tutu-ink">{station}</div>}
      <div className="text-[12.5px] text-tutu-muted">{city}</div>
    </div>
  )
}

export default function OfferCard({ offer, best }: { offer: Offer; best?: boolean }) {
  const meta = META[offer.transport] || META.avia
  const { Icon } = meta
  const first = offer.segments[0]
  const last = offer.segments[offer.segments.length - 1]
  const openSeatmap = useStore((s) => s.setSeatmapOffer)

  const onCta = async () => {
    // ЖД — открываем схему мест
    if (offer.transport === 'zhd' && offer.detailsRef) {
      openSeatmap(offer)
      return
    }
    // остальное — точная ссылка на оформление (create_checkout_link), fallback deep-link
    if (offer.checkoutRef) {
      try {
        const { url } = await fetchCheckout(offer.checkoutRef)
        window.open(url || offer.deepLink, '_blank', 'noopener')
        return
      } catch {
        /* fallthrough */
      }
    }
    window.open(offer.deepLink, '_blank', 'noopener')
  }

  return (
    <div className="tutu-pop overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-tutu-line transition hover:shadow-md">
      {best && (
        <div className="bg-tutu-green px-4 py-1 text-[12px] font-bold text-white">
          ✓ Лучшая цена по вашему запросу
        </div>
      )}
      <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:gap-6">
        {/* left: route */}
        <div>
          {/* header: carrier + rating */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 rounded-lg bg-tutu-soft px-2.5 py-1">
              <span className={`flex h-6 w-6 items-center justify-center rounded-md ${meta.tint}`}>
                <Icon width={16} height={16} />
              </span>
              <span className="text-[13.5px] font-semibold text-tutu-ink">{offer.carrier || '—'}</span>
              {first?.flightNo && <span className="text-[12px] text-tutu-muted">· {first.flightNo}</span>}
            </div>
            {offer.rating != null && (
              <div className="flex items-center gap-2">
                {offer.reviewCount ? (
                  <span className="text-[12.5px] text-tutu-violet-d">
                    {offer.reviewCount >= 1000 ? (offer.reviewCount / 1000).toFixed(1) + 'K' : offer.reviewCount} отзывов
                  </span>
                ) : null}
                <span className="rounded-md bg-tutu-green px-1.5 py-0.5 text-[12.5px] font-bold text-white">
                  {offer.rating.toFixed(1).replace('.', ',')}
                </span>
              </div>
            )}
          </div>

          {/* route line */}
          <div className="flex items-start justify-between gap-3">
            <Point
              time={fmtTime(offer.departAt)}
              date={fmtDate(offer.departAt)}
              station={first?.fromStation || ''}
              city={first?.fromCity || first?.fromCode || ''}
              align="left"
            />
            <div className="flex flex-1 flex-col items-center pt-1">
              <div className="text-[12px] text-tutu-muted">
                {fmtDuration(offer.durationMin)} {meta.durSuffix}
              </div>
              <div className="relative my-1.5 h-px w-full bg-tutu-line">
                {offer.transfers > 0 && (
                  <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-tutu-orange" />
                )}
              </div>
              <div className="text-[12.5px] font-medium">
                {offer.transfers === 0 ? (
                  <span className="text-tutu-ink">{meta.direct}</span>
                ) : (
                  <span className="text-tutu-orange">
                    {offer.layovers?.length
                      ? `пересадка ${fmtDuration(offer.layovers[0].minutes)} · ${offer.layovers[0].city}`
                      : `${offer.transfers} перес.`}
                  </span>
                )}
              </div>
            </div>
            <Point
              time={fmtTime(offer.arriveAt)}
              date={fmtDate(offer.arriveAt)}
              station={last?.toStation || ''}
              city={last?.toCity || last?.toCode || ''}
              align="right"
            />
          </div>
        </div>

        {/* right: baggage + price + cta */}
        <div className="flex flex-row items-center justify-between gap-4 border-t border-tutu-line pt-4 md:w-56 md:flex-col md:items-end md:border-l md:border-t-0 md:pl-6 md:pt-0">
          {offer.baggage && (
            <span
              className={`hidden items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-semibold md:inline-flex ${
                offer.baggage === 'без багажа' ? 'bg-tutu-soft text-tutu-muted' : 'bg-[#eafaf2] text-tutu-green'
              }`}
            >
              🧳 {offer.baggage}
            </span>
          )}
          <div className="md:text-right">
            <div className="text-[24px] font-extrabold text-tutu-ink">{fmtPrice(offer.price, offer.currency)}</div>
            <div className="text-[12px] text-tutu-muted">
              {offer.baggage === 'без багажа' ? 'без багажа, ' : ''}за одного
            </div>
          </div>
          <button
            onClick={onCta}
            className="shrink-0 rounded-xl bg-tutu-violet px-6 py-2.5 text-[15px] font-bold text-white transition hover:bg-tutu-violet-d"
          >
            {meta.cta}
          </button>
        </div>
      </div>
    </div>
  )
}
