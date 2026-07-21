import { IconHeart, IconLogin } from './icons'
import { useStore } from '../store'

const navItems = ['Это выгодно!', 'Автопутешествия', 'Маршруты', 'Справочная', 'Путеводитель']

export default function Header() {
  const setPage = useStore((s) => s.setPage)
  return (
    <header>
      <div className="tutu-container flex items-center py-4">
        <button
          onClick={() => setPage('home')}
          className="tutu-logo text-[34px] leading-none select-none"
        >
          tutu
        </button>
        <nav className="ml-auto hidden items-center gap-7 lg:flex">
          {navItems.map((n) => (
            <a
              key={n}
              className="text-[14.5px] font-medium text-white/85 transition hover:text-white"
              href="#"
              onClick={(e) => e.preventDefault()}
            >
              {n}
            </a>
          ))}
        </nav>
        <div className="ml-7 flex items-center gap-5">
          <button className="hidden items-center gap-2 text-[14.5px] font-medium text-white/85 hover:text-white sm:flex">
            <IconHeart width={18} height={18} />
            Избранное
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-tutu-violet px-4 py-2 text-[14.5px] font-semibold text-white transition hover:bg-tutu-violet-d">
            <IconLogin width={17} height={17} />
            Войти
          </button>
          <button className="hidden flex-col gap-[5px] p-1 lg:flex" aria-label="Меню">
            <span className="h-[2px] w-5 rounded bg-white/85" />
            <span className="h-[2px] w-5 rounded bg-white/85" />
            <span className="h-[2px] w-5 rounded bg-white/85" />
          </button>
        </div>
      </div>
    </header>
  )
}
