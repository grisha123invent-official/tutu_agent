import { useStore } from '../store'
import { useFlash } from '../lib/useFlash'
import { fmtPrice } from '../lib/format'

export default function Filters() {
  const filters = useStore((s) => s.filters)
  const offers = useStore((s) => s.offers)
  const patch = useStore((s) => s.patchFilters)

  const flashDirect = useFlash('filter:directOnly')
  const flashSort = useFlash('filter:sort')
  const flashPrice = useFlash('filter:maxPrice')
  const flashCarriers = useFlash('filter:carriers')

  const carriers = Array.from(new Set(offers.map((o) => o.carrier)))
  const prices = offers.map((o) => o.price)
  const min = prices.length ? Math.min(...prices) : 0
  const max = prices.length ? Math.max(...prices) : 100000

  return (
    <aside className="w-full shrink-0 space-y-3 md:w-64">
      <div className={`rounded-2xl bg-white p-4 ring-1 ring-tutu-line ${flashSort}`}>
        <div className="mb-2.5 text-[14px] font-bold text-tutu-ink">Сортировка</div>
        <div className="space-y-1.5">
          {([
            ['price', 'Сначала дешёвые'],
            ['duration', 'Быстрые в пути'],
            ['departure', 'Ранний вылет'],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => patch({ sort: k })}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[14px] transition ${
                filters.sort === k
                  ? 'bg-tutu-soft font-semibold text-tutu-violet-d'
                  : 'text-tutu-ink hover:bg-tutu-soft'
              }`}
            >
              <span
                className={`h-3.5 w-3.5 rounded-full border-2 ${
                  filters.sort === k ? 'border-tutu-violet bg-tutu-violet' : 'border-tutu-line'
                }`}
              />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={`rounded-2xl bg-white p-4 ring-1 ring-tutu-line ${flashDirect}`}>
        <label className="flex cursor-pointer items-center justify-between">
          <span className="text-[14px] font-semibold text-tutu-ink">Только прямые</span>
          <button
            onClick={() => patch({ directOnly: !filters.directOnly })}
            className={`relative h-6 w-11 rounded-full transition ${
              filters.directOnly ? 'bg-tutu-violet' : 'bg-tutu-line'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                filters.directOnly ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </label>
      </div>

      {prices.length > 0 && (
        <div className={`rounded-2xl bg-white p-4 ring-1 ring-tutu-line ${flashPrice}`}>
          <div className="mb-2 text-[14px] font-bold text-tutu-ink">Цена</div>
          <div className="mb-1 text-[13px] text-tutu-muted">
            до {fmtPrice(filters.maxPrice ?? max)}
          </div>
          <input
            type="range"
            min={min}
            max={max}
            value={filters.maxPrice ?? max}
            onChange={(e) => patch({ maxPrice: Number(e.target.value) })}
            className="w-full accent-tutu-violet"
          />
        </div>
      )}

      {carriers.length > 1 && (
        <div className={`rounded-2xl bg-white p-4 ring-1 ring-tutu-line ${flashCarriers}`}>
          <div className="mb-2.5 text-[14px] font-bold text-tutu-ink">Перевозчик</div>
          <div className="space-y-1.5">
            {carriers.map((c) => {
              const on = filters.carriers.length === 0 || filters.carriers.includes(c)
              return (
                <label key={c} className="flex cursor-pointer items-center gap-2.5 text-[14px]">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => {
                      const set = new Set(
                        filters.carriers.length ? filters.carriers : carriers,
                      )
                      if (set.has(c)) set.delete(c)
                      else set.add(c)
                      const next = Array.from(set)
                      patch({ carriers: next.length === carriers.length ? [] : next })
                    }}
                    className="h-4 w-4 accent-tutu-violet"
                  />
                  <span className="text-tutu-ink">{c}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </aside>
  )
}
