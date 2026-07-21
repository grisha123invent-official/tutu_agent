import type { Hotel } from '../types'
import { fmtPrice } from '../lib/format'
import { IconHeart } from './icons'

function ratingColor(r: number) {
  if (r >= 8.5) return 'bg-tutu-green'
  if (r >= 7) return 'bg-[#f5b800]'
  return 'bg-[#f59331]'
}

export default function HotelCard({ hotel, nights }: { hotel: Hotel; nights: number }) {
  return (
    <a
      href={hotel.deepLink}
      target="_blank"
      rel="noreferrer"
      className="tutu-pop flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-tutu-line transition hover:shadow-md md:flex-row"
    >
      {/* photo */}
      <div className="relative h-52 w-full shrink-0 overflow-hidden bg-gradient-to-br from-[#8b78ff] to-[#5847e0] md:h-auto md:w-72">
        {hotel.photo && (
          <img
            src={hotel.photo}
            alt={hotel.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        )}
        <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-tutu-muted">
          <IconHeart width={17} height={17} />
        </span>
        {/* carousel dots */}
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full ${i === 0 ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`} />
          ))}
        </div>
      </div>

      {/* info */}
      <div className="flex flex-1 flex-col p-4 md:flex-row md:justify-between">
        <div className="min-w-0">
          <div className="text-[17px] font-bold leading-tight text-tutu-ink">{hotel.name}</div>
          <div className="mt-1 text-[13.5px] text-tutu-muted">{hotel.address}</div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {hotel.rating ? (
              <span className={`rounded-md px-1.5 py-0.5 text-[13px] font-bold text-white ${ratingColor(hotel.rating)}`}>
                {hotel.rating.toFixed(1).replace('.', ',')}
              </span>
            ) : null}
            {hotel.reviewCount ? (
              <span className="text-[13px] text-tutu-muted">{hotel.reviewCount} отзывов</span>
            ) : null}
            {hotel.stars > 0 && (
              <span className="text-[13px] text-tutu-muted">· Отель {hotel.stars}★</span>
            )}
          </div>
          {hotel.freeCancellation && (
            <div className="mt-2 text-[13px] font-semibold text-tutu-green">Бесплатная отмена</div>
          )}
        </div>

        {/* price */}
        <div className="mt-4 flex items-end justify-between gap-2 md:mt-0 md:flex-col md:items-end md:justify-end md:text-right">
          <div>
            <div className="text-[22px] font-extrabold text-tutu-ink">{fmtPrice(hotel.price, hotel.currency)}</div>
            <div className="text-[12.5px] text-tutu-muted">
              за {nights} {nights === 1 ? 'ночь' : nights < 5 ? 'ночи' : 'ночей'}
            </div>
          </div>
          <span className="rounded-xl bg-tutu-violet px-5 py-2 text-[14px] font-bold text-white transition hover:bg-tutu-violet-d">
            Выбрать
          </span>
        </div>
      </div>
    </a>
  )
}
