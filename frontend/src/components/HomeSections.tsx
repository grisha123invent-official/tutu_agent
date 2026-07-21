import { sendUser } from '../lib/ws'
import { useStore } from '../store'
import { TurbineArt } from './art'
import {
  IconBus,
  IconHotel,
  IconPlane,
  IconSuburban,
  IconTrain,
} from './icons'

/* ------------------------------------------------------------------ data */

const services = [
  { label: 'Авиабилеты', Icon: IconPlane },
  { label: 'Ж/д билеты', Icon: IconTrain },
  { label: 'Автобусы', Icon: IconBus },
  { label: 'Электрички', Icon: IconSuburban },
  { label: 'Отели', Icon: IconHotel },
]

type Deal = {
  route: string
  when: string
  info: string
  price: number
  old: number
  kind: 'avia' | 'zhd'
}
const deals: Deal[] = [
  { route: 'Калининград — Москва', when: '24 июл в 16:00', info: '2ч 35м · прямой', price: 5595, old: 8216, kind: 'avia' },
  { route: 'Сочи — Москва', when: '23 июл в 12:30', info: '3ч 30м · прямой', price: 8786, old: 9694, kind: 'avia' },
  { route: 'Москва — Анталья', when: '23 июл в 07:55', info: '5ч · прямой', price: 5647, old: 11297, kind: 'avia' },
  { route: 'Мурманск — Москва', when: '23 июл в 21:40', info: '2ч 30м · прямой', price: 4410, old: 6210, kind: 'avia' },
  { route: 'Москва — Тольятти', when: '28 авг в 17:03', info: '16ч 52м · купе', price: 2872, old: 3388, kind: 'zhd' },
  { route: 'Омск — Москва', when: '23 июл в 05:10', info: '3ч 35м · прямой', price: 9057, old: 10957, kind: 'avia' },
]

type Hotel = { name: string; city: string; stars: number; rating: string; price: number; old: number; grad: string }
const hotels: Hotel[] = [
  { name: 'Отель Фуд Сити', city: 'Москва', stars: 4, rating: '7,6', price: 4646, old: 5162, grad: 'from-[#6b58fc] to-[#9f7dff]' },
  { name: 'Cronwell Inn Стремянная', city: 'Санкт-Петербург', stars: 4, rating: '9,2', price: 10097, old: 11219, grad: 'from-[#0bb3a0] to-[#17b978]' },
  { name: 'Отель АйТи', city: 'Москва', stars: 3, rating: '9,0', price: 6066, old: 6740, grad: 'from-[#4b7bec] to-[#3867d6]' },
  { name: 'ApartStel / АпартСтель', city: 'Санкт-Петербург', stars: 3, rating: '9,3', price: 5197, old: 5774, grad: 'from-[#fa8231] to-[#eb3b5a]' },
  { name: 'Хостел Автор Таганка', city: 'Москва', stars: 0, rating: '8,4', price: 3023, old: 3359, grad: 'from-[#a55eea] to-[#8854d0]' },
  { name: 'Апартаменты Грифон', city: 'Санкт-Петербург', stars: 0, rating: '9,1', price: 6135, old: 6817, grad: 'from-[#eb3b5a] to-[#a55eea]' },
]

type Tour = { name: string; place: string; stars: number; rating: string; from: number; dates: string; grad: string }
const tours: Tour[] = [
  { name: 'Santa Sophia', place: 'Стамбул, Турция', stars: 3, rating: '5.0', from: 44747, dates: '11 авг — 18 авг', grad: 'from-[#eb3b5a] to-[#fa8231]' },
  { name: 'Бархатные Сезоны, Спортивный', place: 'Сочи: Сириус, Россия', stars: 3, rating: '4.6', from: 63543, dates: '28 июл — 4 авг', grad: 'from-[#17b978] to-[#0bb3a0]' },
  { name: 'Sunshine Vista', place: 'Паттайя, Таиланд', stars: 3, rating: '4.9', from: 70697, dates: '4 авг — 11 авг', grad: 'from-[#4b7bec] to-[#3867d6]' },
  { name: 'Parrotel Beach Resort', place: 'Шарм-Эль-Шейх, Египет', stars: 5, rating: '4.5', from: 90500, dates: '28 июл — 4 авг', grad: 'from-[#fa8231] to-[#eb3b5a]' },
  { name: 'СПА Отель Грейс Глобал', place: 'Сочи: Адлер, Россия', stars: 4, rating: '4.9', from: 79839, dates: '28 июл — 4 авг', grad: 'from-[#6b58fc] to-[#9f7dff]' },
  { name: 'Nai Yang Beach Resort & Spa', place: 'Пхукет, Таиланд', stars: 4, rating: '4.6', from: 74723, dates: '4 авг — 11 авг', grad: 'from-[#0bb3a0] to-[#17b978]' },
]

type Car = { name: string; city: string; price: number; note: string }
const cars: Car[] = [
  { name: 'Hyundai Tucson', city: 'Минеральные Воды', price: 5300, note: 'Без депозита' },
  { name: 'Solaris HC', city: 'Новосибирск', price: 4579, note: 'Бесплатная отмена' },
  { name: 'Hyundai Creta', city: 'Сочи', price: 3115, note: 'Бесплатная отмена' },
  { name: 'Solaris KRS', city: 'Калининград', price: 4421, note: 'Бесплатная отмена' },
  { name: 'Chery Tiggo 7 PRO MAX', city: 'Казань', price: 9942, note: 'Без депозита' },
  { name: 'Hyundai Creta NEW', city: 'Москва', price: 4944, note: 'Без депозита' },
]

const features = [
  { t: 'Оплата позже', s: 'Можно зафиксировать цену на билет и выкупить позже' },
  { t: 'Кешбэк 3% баллами', s: 'При оплате самолётов, автобусов, отелей и аренды авто Туту Кошельком' },
  { t: 'Поддержка 24/7', s: 'Операторы помогают в чатах, по электронной почте и телефону' },
  { t: 'Всё и сразу', s: 'Удобное сравнение цен сразу на 3 вида транспорта' },
]

const faq = [
  'Как вернуть билет на самолёт',
  'Всё о возврате билета на поезд',
  'Что можно изменить в билете на самолёт',
  'Как исправить билет на поезд',
]

const about = [
  'Туту — сервис путешествий. У нас есть расписание рейсов, билеты на поезда, самолёты, автобусы, электрички и аэроэкспрессы. А ещё много отелей, туров и экскурсий',
  'Мы помогаем путешествовать с 2003 года. Знаем, как поймать билет на поезд, что нужно для въезда в другие страны и где лучше смотреть северное сияние',
  'Мы верим, что путешествия делают людей умнее и интереснее, расширяют кругозор. Нужно сделать только первый шаг. Начните путешествие к лучшему с Туту!',
]

const seo: { h: string; links: string[] }[] = [
  { h: 'Авиабилеты', links: ['Из Москвы', 'Из Санкт-Петербурга', 'Все направления', 'Шереметьево', 'Домодедово', 'Пулково'] },
  { h: 'Поезда', links: ['Вокзалы Москвы', 'Билеты на «Сапсан»', '«Ласточка» до Нижнего', 'Как купить билет', 'Способы оплаты'] },
  { h: 'Электрички', links: ['Белорусское', 'Горьковское', 'Казанское', 'Ленинградское', 'Ярославское'] },
  { h: 'Автобусы', links: ['Москва — Санкт-Петербург', 'Москва — Ростов-на-Дону', 'Москва — Краснодар', 'Москва — Минск'] },
  { h: 'Отели', links: ['Москва', 'Санкт-Петербург', 'Сочи', 'Казань', 'Калининград', 'Все отели в России'] },
  { h: 'Туры', links: ['Горящие туры', 'Турция', 'Египет', 'Таиланд', 'ОАЭ', 'Сочи'] },
]

const footerCols = [
  { h: 'Компания', items: ['О нас', 'Вакансии', 'Контакты', 'Правовая информация'] },
  { h: 'Путешественникам', items: ['Подарочные сертификаты', 'Программа лояльности', 'Путеводитель по странам'] },
  { h: 'Партнёрам', items: ['Стать партнёром', 'Подключить объект', 'Реклама на Туту', 'Партнёрская программа'] },
  { h: 'Помощь', items: ['Справочная', 'Обратная связь'] },
]

function fmt(n: number) {
  return new Intl.NumberFormat('ru-RU').format(n)
}

/* ------------------------------------------------------------- components */

function SectionHead({ title, sub, action }: { title: string; sub?: string; action?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <div>
        <h2 className="text-[24px] font-extrabold text-tutu-ink">{title}</h2>
        {sub && <p className="mt-1 text-[14px] text-tutu-muted">{sub}</p>}
      </div>
      {action && (
        <button className="shrink-0 text-[14px] font-semibold text-tutu-violet-d hover:underline">
          {action} →
        </button>
      )}
    </div>
  )
}

function Stars({ n }: { n: number }) {
  if (!n) return null
  return <span className="text-tutu-orange">{'★'.repeat(n)}</span>
}

/* --------------------------------------------------------------- section */

export default function HomeSections() {
  const togglePanel = useStore((s) => s.togglePanel)

  const askDeal = (route: string) => {
    const [from, to] = route.split('—').map((s) => s.trim())
    togglePanel(true)
    sendUser(`Найди самые дешёвые билеты ${from} — ${to}`)
  }
  const askHotel = (city: string) => {
    togglePanel(true)
    sendUser(`Подбери отель в городе ${city}`)
  }

  return (
    <div className="relative -mt-8 rounded-t-[36px] bg-tutu-soft">
      <div className="tutu-container space-y-14 pb-12 pt-10">
        {/* services */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {services.map(({ label, Icon }) => (
            <div
              key={label}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl bg-white p-5 ring-1 ring-tutu-line transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-tutu-soft text-tutu-violet-d">
                <Icon width={24} height={24} />
              </span>
              <span className="text-[14px] font-semibold text-tutu-ink">{label}</span>
            </div>
          ))}
        </div>

        {/* Турбоскидки banner */}
        <div className="grid items-stretch gap-4 overflow-hidden rounded-3xl bg-white p-4 ring-1 ring-tutu-line md:grid-cols-2 md:p-6">
          <div className="flex flex-col justify-center gap-4 px-2">
            <div className="text-[26px] font-extrabold leading-tight text-tutu-ink">
              Турбоскидки до 35% каждый день
            </div>
            <button className="w-fit rounded-2xl bg-tutu-violet px-6 py-3.5 text-[15px] font-bold text-white transition hover:bg-tutu-violet-d">
              Получить скидку
            </button>
          </div>
          <div className="relative flex h-32 items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-[#a795ff] via-[#8b78ff] to-[#6b58fc] pl-8 md:h-44">
            {/* rays */}
            <div className="pointer-events-none absolute inset-0 opacity-25 [background:repeating-conic-gradient(from_0deg_at_70%_50%,#ffffff_0deg_6deg,transparent_6deg_20deg)]" />
            <div className="relative -rotate-6">
              <div className="rounded-lg bg-tutu-orange px-3 py-1 text-[26px] font-black italic tracking-tight text-white shadow-lg md:text-[34px]">
                ТУРБО
              </div>
              <div className="-mt-1 ml-4 w-fit rounded-lg bg-white px-3 py-1 text-[26px] font-black italic tracking-tight text-tutu-orange shadow-lg md:text-[34px]">
                СКИДКИ
              </div>
            </div>
            <TurbineArt className="relative ml-auto mr-4 h-24 w-24 shrink-0 md:h-36 md:w-36" />
            <span className="absolute right-8 top-3 -rotate-6 text-[26px] font-black italic text-white drop-shadow md:text-[34px]">
              35%
            </span>
          </div>
        </div>

        {/* Это выгодно! */}
        <div>
          <SectionHead
            title="Это выгодно!"
            sub="Цены ниже средних за последние 10 дней. Обновляем постоянно, заглядывайте чаще"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {deals.map((d) => {
              const off = Math.round((1 - d.price / d.old) * 100)
              return (
                <button
                  key={d.route + d.when}
                  onClick={() => askDeal(d.route)}
                  className="flex flex-col rounded-2xl bg-white p-4 text-left ring-1 ring-tutu-line transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span
                    className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${
                      d.kind === 'avia' ? 'bg-[#eef0ff] text-tutu-violet-d' : 'bg-[#eafaf2] text-tutu-green'
                    }`}
                  >
                    {d.kind === 'avia' ? <IconPlane width={20} height={20} /> : <IconTrain width={20} height={20} />}
                  </span>
                  <div className="text-[15px] font-semibold leading-tight text-tutu-ink">{d.route}</div>
                  <div className="text-[13px] text-tutu-muted">{d.when}</div>
                  <div className="mt-0.5 text-[13px] text-tutu-muted">{d.info}</div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-[20px] font-extrabold text-tutu-ink">{fmt(d.price)} ₽</span>
                    <span className="rounded-md bg-[#eef0ff] px-1.5 py-0.5 text-[12px] font-bold text-tutu-violet-d">
                      −{off}%
                    </span>
                  </div>
                  <div className="text-[13px] text-tutu-muted line-through">{fmt(d.old)} ₽</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Аренда авто banner */}
        <div className="flex flex-col items-center justify-between gap-4 overflow-hidden rounded-3xl bg-gradient-to-r from-[#1c1a4d] to-[#3a2fa0] p-8 text-white md:flex-row">
          <div>
            <div className="text-[24px] font-extrabold">−1 000 ₽ на первую аренду</div>
            <div className="mt-1 text-[14px] text-white/80">Промокод: CAR1000</div>
          </div>
          <button className="shrink-0 rounded-2xl bg-white px-6 py-3.5 text-[15px] font-bold text-tutu-violet-d transition hover:bg-white/90">
            Арендовать со скидкой
          </button>
        </div>

        {/* Отели по суперцене */}
        <div>
          <SectionHead title="Отели по суперцене" sub="Классные варианты с выгодой — специально для вас" action="Все отели" />
          <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {hotels.map((h) => (
              <button
                key={h.name}
                onClick={() => askHotel(h.city)}
                className="flex w-56 shrink-0 flex-col overflow-hidden rounded-2xl bg-white text-left ring-1 ring-tutu-line transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className={`relative h-32 bg-gradient-to-br ${h.grad}`}>
                  <span className="absolute right-2 top-2 rounded-lg bg-black/45 px-1.5 py-0.5 text-[12px] font-bold text-white">
                    {h.rating}
                  </span>
                </div>
                <div className="p-3">
                  <div className="text-[13px] text-tutu-muted">
                    <Stars n={h.stars} /> {h.city}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-[14px] font-semibold text-tutu-ink">{h.name}</div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-[16px] font-extrabold text-tutu-ink">{fmt(h.price)} ₽</span>
                    <span className="text-[12px] text-tutu-muted line-through">{fmt(h.old)} ₽</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Заряжены на отдых (туры) */}
        <div>
          <SectionHead title="Заряжены на отдых" sub="Туры с высоким рейтингом и низкой ценой" action="Все туры" />
          <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {tours.map((t) => (
              <div
                key={t.name}
                className="flex w-64 shrink-0 flex-col overflow-hidden rounded-2xl bg-white text-left ring-1 ring-tutu-line"
              >
                <div className={`relative h-40 bg-gradient-to-br ${t.grad}`}>
                  <span className="absolute right-2 top-2 rounded-lg bg-white/90 px-1.5 py-0.5 text-[12px] font-bold text-tutu-green">
                    {t.rating}
                  </span>
                </div>
                <div className="p-3">
                  <div className="line-clamp-2 text-[15px] font-semibold text-tutu-ink">
                    <Stars n={t.stars} /> {t.name}
                  </div>
                  <div className="text-[13px] text-tutu-muted">{t.place}</div>
                  <div className="mt-2 text-[18px] font-extrabold text-tutu-ink">от {fmt(t.from)} ₽</div>
                  <div className="text-[13px] text-tutu-muted">{t.dates} · 7 ночей</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Авто для вашей поездки */}
        <div>
          <SectionHead title="Авто для вашей поездки" sub="Выбирайте машину на свой вкус" action="Все авто" />
          <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {cars.map((c) => (
              <div
                key={c.name}
                className="flex w-56 shrink-0 flex-col overflow-hidden rounded-2xl bg-white text-left ring-1 ring-tutu-line"
              >
                <div className="relative flex h-28 items-center justify-center bg-gradient-to-br from-[#eef0ff] to-[#f7f6ff]">
                  <span className="absolute left-2 top-2 rounded-md bg-tutu-green px-2 py-0.5 text-[11px] font-bold text-white">
                    {c.note}
                  </span>
                  <IconBus width={56} height={56} className="text-tutu-violet-d/70" />
                </div>
                <div className="p-3">
                  <div className="text-[15px] font-semibold text-tutu-ink">{c.name}</div>
                  <div className="text-[13px] text-tutu-muted">Забрать в {c.city}</div>
                  <div className="mt-2 text-[18px] font-extrabold text-tutu-ink">
                    {fmt(c.price)} ₽ <span className="text-[13px] font-normal text-tutu-muted">за 1 день</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Фишки Туту */}
        <div>
          <SectionHead title="Фишки Туту" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.t} className="rounded-2xl bg-[#eef0ff] p-5">
                <div className="mb-1.5 text-[16px] font-bold text-tutu-ink">{f.t}</div>
                <div className="text-[14px] leading-relaxed text-tutu-muted">{f.s}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Подписка */}
        <div className="rounded-3xl bg-white p-6 ring-1 ring-tutu-line md:p-8">
          <div className="text-[20px] font-extrabold text-tutu-ink">
            Мы вам — письма про акции и классные места, а вы нам — почту
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              placeholder="Электронная почта"
              className="h-12 flex-1 rounded-xl bg-tutu-soft px-4 text-[15px] outline-none focus:ring-2 focus:ring-tutu-violet/40"
            />
            <button className="h-12 rounded-xl bg-tutu-violet px-7 text-[15px] font-bold text-white transition hover:bg-tutu-violet-d">
              Подписаться
            </button>
          </div>
          <label className="mt-3 flex items-center gap-2 text-[13px] text-tutu-muted">
            <input type="checkbox" className="h-4 w-4 accent-tutu-violet" />
            Даю согласие на обработку персональных данных и рекламные рассылки
          </label>
        </div>

        {/* Вопросы и ответы */}
        <div>
          <SectionHead title="Вопросы и ответы" action="Посмотреть все" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {faq.map((q) => (
              <div
                key={q}
                className="flex h-28 items-end rounded-2xl bg-gradient-to-br from-[#eef0ff] to-[#f7f6ff] p-4 text-[15px] font-semibold text-tutu-ink ring-1 ring-tutu-line"
              >
                {q}
              </div>
            ))}
          </div>
        </div>

        {/* Билеты и отели онлайн */}
        <div>
          <SectionHead title="Билеты и отели онлайн для ваших путешествий" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {about.map((a, i) => (
              <div key={i} className="rounded-2xl bg-white p-5 text-[14px] leading-relaxed text-tutu-ink ring-1 ring-tutu-line">
                {a}
              </div>
            ))}
          </div>
        </div>

        {/* SEO block */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-3 lg:grid-cols-6">
          {seo.map((col) => (
            <div key={col.h}>
              <div className="mb-2.5 text-[15px] font-bold text-tutu-ink">{col.h}</div>
              <ul className="space-y-1.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" onClick={(e) => e.preventDefault()} className="text-[13px] text-tutu-muted hover:text-tutu-violet-d">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* footer */}
      <footer className="tutu-hero text-white">
        <div className="tutu-container py-12">
          <div className="tutu-logo mb-8 text-[34px] leading-none">tutu</div>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
            {/* app */}
            <div className="col-span-2 md:col-span-1">
              <div className="mb-3 text-[15px] font-bold">Приложение Туту</div>
              <div className="mb-3 h-28 w-28 rounded-xl bg-white/90" />
              <div className="flex flex-wrap gap-2">
                {['iOS', 'Android', 'AppGallery', 'RuStore'].map((s) => (
                  <span key={s} className="rounded-lg bg-white/10 px-3 py-1.5 text-[12px] font-semibold">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            {footerCols.map((col) => (
              <div key={col.h}>
                <div className="mb-3 text-[15px] font-bold">{col.h}</div>
                <ul className="space-y-2">
                  {col.items.map((i) => (
                    <li key={i}>
                      <a href="#" onClick={(e) => e.preventDefault()} className="text-[13.5px] text-white/70 hover:text-white">
                        {i}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-white/15 pt-5">
            <div className="mb-2 text-[14px] font-semibold">Мы в социальных сетях</div>
            <div className="flex gap-2">
              {['TG', 'VK', 'YT'].map((s) => (
                <span key={s} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[12px] font-bold">
                  {s}
                </span>
              ))}
            </div>
            <p className="mt-5 text-[12.5px] leading-relaxed text-white/50">
              © 2026 tutu — прототип с ИИ-ассистентом. Данные о рейсах — из MCP Туту.
              Демонстрационная копия интерфейса для буткемпа, не является сайтом tutu.ru.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
