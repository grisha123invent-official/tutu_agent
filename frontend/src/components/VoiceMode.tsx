import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { startSearchSound, stopSearchSound } from '../lib/searchSound'
import type { AssistantMessage } from '../types'

/* ---- liquid glass orb ---- */
function LiquidOrb({ active }: { active: boolean }) {
  return (
    <div className={`lg-float relative h-44 w-44 ${active ? 'lg-fast' : ''}`}>
      {/* мягкое цветное свечение позади стекла */}
      <div
        className="absolute -inset-5 rounded-full opacity-70 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(168,140,255,0.6), rgba(255,140,197,0.28) 52%, transparent 72%)' }}
      />

      {/* стеклянная сфера */}
      <div className="lg-glass relative h-full w-full overflow-hidden rounded-full">
        {/* «жидкость» внутри — видна сквозь матовое стекло */}
        <div
          className="lg-spin absolute -inset-1/4"
          style={{
            background:
              'conic-gradient(from 0deg, #a88cff, #ff8cc5, #ffd08a, #8ce0ff, #a0ffcf, #a88cff)',
            filter: 'blur(18px)',
            opacity: 0.9,
          }}
        />
        <span className="lg-blob lg-morph-a" style={{ width: '72%', height: '72%', left: '6%', top: '4%', background: 'radial-gradient(circle, #7c6df2, transparent 70%)' }} />
        <span className="lg-blob lg-morph-b" style={{ width: '66%', height: '66%', left: '30%', top: '28%', background: 'radial-gradient(circle, #ff6fb5, transparent 70%)' }} />
        <span className="lg-blob lg-morph-c" style={{ width: '60%', height: '60%', left: '18%', top: '34%', background: 'radial-gradient(circle, #5ac8fa, transparent 70%)' }} />
        <span className="lg-blob lg-morph-a" style={{ width: '55%', height: '55%', left: '38%', top: '10%', background: 'radial-gradient(circle, #ffb27a, transparent 70%)', animationDelay: '1.4s' }} />
        <span className="lg-blob lg-morph-b" style={{ width: '50%', height: '50%', left: '10%', top: '42%', background: 'radial-gradient(circle, #8affc9, transparent 70%)', animationDelay: '0.8s' }} />

        {/* матовое стекло поверх жидкости — «прозрачность» */}
        <div className="lg-frost absolute inset-0 rounded-full" />

        {/* верхний глянец-отражение */}
        <div className="lg-gloss absolute inset-x-0 top-0 h-3/5 rounded-t-full" />
        {/* яркий блик-«зайчик» слева сверху */}
        <div className="absolute left-[22%] top-[16%] h-8 w-14 -rotate-[18deg] rounded-full bg-white/80 blur-md" />
        {/* тонкое отражение снизу */}
        <div className="absolute inset-x-6 bottom-2 h-6 rounded-full bg-white/20 blur-md" />
      </div>

      {/* радужный ободок дисперсии по кромке стекла */}
      <div className="lg-irid pointer-events-none absolute inset-0" />
      {/* тонкая яркая кромка-обводка сверху */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.9), inset 0 0 0 1px rgba(255,255,255,0.35)' }}
      />
    </div>
  )
}

/* ---- glass control button ---- */
function GlassBtn({
  onClick,
  title,
  size = 'md',
  tone = 'glass',
  children,
}: {
  onClick: () => void
  title: string
  size?: 'md' | 'lg'
  tone?: 'glass' | 'pink' | 'dark'
  children: React.ReactNode
}) {
  const dim = size === 'lg' ? 'h-[70px] w-[70px]' : 'h-14 w-14'
  const toneCls =
    tone === 'pink'
      ? 'bg-tutu-pink text-white'
      : tone === 'dark'
        ? 'bg-tutu-ink text-white'
        : 'bg-white/60 text-tutu-ink ring-1 ring-white/70'
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex ${dim} items-center justify-center rounded-full ${toneCls} shadow-[0_10px_30px_-8px_rgba(80,60,160,0.35)] backdrop-blur-xl transition hover:scale-105 active:scale-95`}
    >
      {children}
    </button>
  )
}

/* icons */
const MicGlyph = ({ off }: { off?: boolean }) => (
  <span className="relative">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0" />
      <path d="M12 17v4M9 21h6" />
    </svg>
    {off && <span className="absolute left-1/2 top-1/2 h-[2px] w-8 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded bg-current" />}
  </span>
)
const KeyboardGlyph = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
    <path d="M6 9.5h.01M9 9.5h.01M12 9.5h.01M15 9.5h.01M18 9.5h.01M6 12.5h.01M9 12.5h.01M12 12.5h.01M15 12.5h.01M18 12.5h.01M8 15.5h8" />
  </svg>
)
const CloseGlyph = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export default function VoiceMode({
  connecting,
  speaking,
  muted,
  onClose,
  onKeyboard,
  onToggleMute,
}: {
  connecting: boolean
  speaking: boolean
  muted: boolean
  onClose: () => void
  onKeyboard: () => void
  onToggleMute: () => void
}) {
  const messages = useStore((s) => s.messages)
  const webSearching = useStore((s) => s.webSearching)
  const textRef = useRef<HTMLDivElement>(null)

  // Красивая загрузка + звук — ТОЛЬКО для медленного веб-поиска (интернет).
  // Быстрый поиск билетов через MCP ничего не грузит.
  // Держим минимум ~2с, чтобы точно было видно/слышно, и гасим, когда пошёл голос.
  const [searching, setSearching] = useState(false)
  const searchStart = useRef(0)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const MIN_SEARCH_MS = 2000

  useEffect(() => {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current)
      searchTimer.current = null
    }
    if (speaking) {
      setSearching(false)
      return
    }
    if (webSearching) {
      if (!searching) searchStart.current = Date.now()
      setSearching(true)
    } else if (searching) {
      const elapsed = Date.now() - searchStart.current
      const left = Math.max(0, MIN_SEARCH_MS - elapsed)
      searchTimer.current = setTimeout(() => setSearching(false), left)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webSearching, speaking])

  const thinking = searching
  const activeOrb = speaking || thinking

  const status = connecting
    ? 'Подключаюсь…'
    : muted
      ? 'Микрофон выключен'
      : thinking
        ? 'Ищу в интернете…'
        : speaking
          ? 'Отвечаю…'
          : 'Слушаю…'

  // главный крупный текст — последняя реплика диалога (не скачет между режимами)
  const lastMsg = [...messages]
    .reverse()
    .find((m: AssistantMessage) => m.content && m.id !== 'welcome')
  const bigText = lastMsg?.content

  useEffect(() => {
    textRef.current?.scrollTo({ top: textRef.current.scrollHeight, behavior: 'smooth' })
  }, [bigText])

  // мягкий «поисковый» звук, пока ассистент ищет (думает и не говорит)
  useEffect(() => {
    if (thinking) startSearchSound()
    else stopSearchSound()
    return () => stopSearchSound()
  }, [thinking])

  return (
    <div className="lg-stage relative flex min-h-[500px] flex-1 flex-col">
      {/* header */}
      <div className="lg-up flex items-center justify-center gap-2 pt-5">
        <span className={`h-2 w-2 rounded-full ${connecting ? 'bg-tutu-orange' : thinking ? 'bg-tutu-violet' : 'bg-tutu-green'} animate-pulse`} />
        <span className="max-w-[70%] truncate text-[12px] font-semibold uppercase tracking-[0.16em] text-tutu-muted">
          {status}
        </span>
        {/* бегущие точки, пока идёт поиск */}
        {thinking && (
          <span className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-tutu-violet"
                style={{ animation: `voice-wave 0.9s ease-in-out ${i * 0.15}s infinite` }}
              />
            ))}
          </span>
        )}
      </div>

      {/* orb + радарные волны во время поиска */}
      <div className="lg-in flex justify-center pt-6">
        <div className="relative h-44 w-44">
          {thinking && (
            <>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="voice-ring absolute inset-0 rounded-full ring-2 ring-tutu-violet/50"
                  style={{ animationDelay: `${i * 1.05}s` }}
                />
              ))}
              {/* мягкое пульсирующее свечение под шаром */}
              <span className="voice-glow-speaking absolute -inset-3 rounded-full bg-tutu-violet/20 blur-2xl" />
            </>
          )}
          <LiquidOrb active={activeOrb} />
        </div>
      </div>

      {/* live text with top fade */}
      <div className="relative mt-3 flex-1 overflow-hidden px-6">
        <div
          ref={textRef}
          className="lg-text-fade no-scrollbar mx-auto max-h-full overflow-y-auto pb-4 pt-10 text-center"
        >
          {bigText ? (
            <p className="text-[22px] font-semibold leading-[1.28] tracking-tight text-tutu-ink">{bigText}</p>
          ) : (
            <p className="text-[19px] font-medium leading-snug text-tutu-muted">
              {connecting ? 'Секунду…' : 'Скажите, куда хотите поехать'}
            </p>
          )}
          <div
            className={`mt-4 flex items-end justify-center gap-1.5 transition-opacity duration-500 ${speaking ? 'opacity-100' : 'opacity-0'}`}
          >
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <span key={i} className="voice-bar h-5 w-1.5 rounded-full bg-tutu-violet" style={{ animationDelay: `${(i % 4) * 0.12}s` }} />
            ))}
          </div>
        </div>
      </div>

      {/* controls */}
      <div className="lg-up flex items-center justify-center gap-4 pb-6 pt-3">
        <GlassBtn title="Вернуться к тексту" onClick={onKeyboard}>
          <KeyboardGlyph />
        </GlassBtn>
        <GlassBtn title={muted ? 'Включить микрофон' : 'Выключить микрофон'} onClick={onToggleMute} size="lg" tone={muted ? 'pink' : 'dark'}>
          <MicGlyph off={muted} />
        </GlassBtn>
        <GlassBtn title="Закрыть" onClick={onClose}>
          <CloseGlyph />
        </GlassBtn>
      </div>
    </div>
  )
}
