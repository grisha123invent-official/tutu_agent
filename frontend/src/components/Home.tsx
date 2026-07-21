import SearchWidget from './SearchWidget'
import HomeSections from './HomeSections'
import { BellArt } from './art'
import { IconSpark } from './icons'
import { sendUser } from '../lib/ws'
import { useStore } from '../store'

const trust = [
  { t: '22 года', s: 'работаем для вас' },
  { t: '30 млн', s: 'путешествуют с нами' },
  { t: '4,84', s: 'рейтинг приложения' },
]

const examples = [
  'Хочу в Питер из Москвы на выходных, подешевле',
  'Долететь до Сочи 10 августа, только прямые',
  'Максимально дёшево в Казань, можно с пересадкой',
]

export default function Home() {
  const togglePanel = useStore((s) => s.togglePanel)
  return (
    <>
    <div className="pb-14">
      <div className="tutu-container pt-6">
        {/* orange sale strip (как на tutu) */}
        <div className="mb-8 flex items-center justify-center gap-2 rounded-2xl bg-tutu-orange px-5 py-2.5 text-white">
          <span className="rounded-md bg-black/20 px-2 py-0.5 text-[12px] font-extrabold tracking-wide">
            МОЩНАЯ
          </span>
          <span className="text-[15px] font-extrabold tracking-wide">
            РАСПРОДАЖА БИЛЕТОВ НА
          </span>
          <span className="rounded-md bg-[#c6ff00] px-2 py-0.5 text-[13px] font-extrabold text-black">
            МОРЕ
          </span>
        </div>

        <div className="relative">
          <BellArt className="pointer-events-none absolute -top-14 right-4 hidden w-[250px] opacity-95 xl:block" />
          <h1 className="mb-5 text-[42px] font-extrabold leading-[1.05] text-white md:text-[52px]">
            Путешествуйте выгодно
          </h1>
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          {trust.map((x) => (
            <div
              key={x.t}
              className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-white/90"
            >
              <span className="text-[15px] font-bold">{x.t}</span>
              <span className="text-[13.5px] text-white/70">{x.s}</span>
            </div>
          ))}
        </div>

        <SearchWidget />

        {/* assistant hint */}
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => togglePanel(true)}
            className="flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-[14px] font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
          >
            <IconSpark width={16} height={16} className="text-[#c9c0ff]" />
            Спросите ИИ-ассистента голосом или текстом
          </button>
          {examples.map((e) => (
            <button
              key={e}
              onClick={() => {
                togglePanel(true)
                sendUser(e)
              }}
              className="rounded-full border border-white/15 px-3.5 py-2 text-[13px] text-white/75 transition hover:border-white/40 hover:text-white"
            >
              «{e}»
            </button>
          ))}
        </div>
      </div>
    </div>
    <HomeSections />
    </>
  )
}
