import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { connect, sendUser, setVoiceStateHandler } from '../lib/ws'
import { VoiceController } from '../lib/voice'
import { IconClose, IconMic, IconSend, IconSpark } from './icons'
import VoiceMode from './VoiceMode'
import { fmtPrice } from '../lib/format'
import type { PlaceInfo } from '../types'

/** Лёгкий inline-markdown: **жирный**, *курсив*, `код`. Без библиотек. */
function RichText({ text }: { text: string }) {
  // разбиваем по **…**, *…*, `…` — сохраняя разделители
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g)
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**'))
          return <strong key={i} className="font-bold">{p.slice(2, -2)}</strong>
        if (p.startsWith('`') && p.endsWith('`'))
          return (
            <code key={i} className="rounded bg-tutu-violet/10 px-1 py-0.5 text-[13px]">
              {p.slice(1, -1)}
            </code>
          )
        if (p.startsWith('*') && p.endsWith('*'))
          return <em key={i} className="italic">{p.slice(1, -1)}</em>
        return <span key={i}>{p}</span>
      })}
    </>
  )
}

function PlaceCard({ place }: { place: PlaceInfo }) {
  return (
    <div className="mt-2 rounded-2xl bg-white/55 p-3 ring-1 ring-tutu-violet/20 backdrop-blur-md">
      <div className="text-[13.5px] font-bold text-tutu-ink">📍 {place.title}</div>
      <div className="mt-1 text-[13px] text-tutu-muted">{place.summary}</div>
      <ul className="mt-2 space-y-1">
        {place.bullets.map((b, i) => (
          <li key={i} className="text-[13px] text-tutu-ink">• {b}</li>
        ))}
      </ul>
      {place.sourceUrl && (
        <a
          href={place.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 inline-block text-[12px] text-tutu-violet-d underline"
        >
          источник
        </a>
      )}
    </div>
  )
}

export default function AssistantPanel() {
  const messages = useStore((s) => s.messages)
  const thinking = useStore((s) => s.assistantThinking)
  const open = useStore((s) => s.panelOpen)
  const togglePanel = useStore((s) => s.togglePanel)
  const offers = useStore((s) => s.offers)
  const voicePlaying = useStore((s) => s.voicePlaying)

  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [muted, setMuted] = useState(false)
  const voiceRef = useRef<VoiceController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    connect()
    setVoiceStateHandler((active) => {
      setConnecting(false)
      setListening(active)
    })
    return () => setVoiceStateHandler(null)
  }, [])

  // приветствие при первом открытии
  useEffect(() => {
    if (open && useStore.getState().messages.length === 0) {
      useStore.getState().addMessage({
        id: 'welcome',
        role: 'assistant',
        content:
          'Привет! Я ИИ-ассистент путешествий Туту 👋\n\nПомогу найти билеты на самолёт, поезд, автобус или электричку, подобрать отель, спланировать поездку с пересадками и рассказать о местах. Заполню поиск за вас — только скажите, куда хотите поехать.\n\nНапишите текстом или нажмите микрофон и поговорите со мной голосом 🙂',
      })
    }
  }, [open])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  const submit = (value?: string) => {
    const v = (value ?? text).trim()
    if (!v) return
    useStore.getState().addMessage({
      id: 'u_' + Date.now(),
      role: 'user',
      content: v,
    })
    sendUser(v)
    setText('')
  }

  const stopVoice = () => {
    voiceRef.current?.stop()
    voiceRef.current = null
    setListening(false)
    setConnecting(false)
    setMuted(false)
  }

  const toggleMic = async () => {
    if (listening || connecting) {
      stopVoice()
      return
    }
    try {
      setConnecting(true)
      setMuted(false)
      const vc = new VoiceController()
      voiceRef.current = vc
      await vc.start()
    } catch (e) {
      setConnecting(false)
      voiceRef.current = null
      alert('Не удалось включить микрофон: ' + (e as Error).message)
    }
  }

  const voiceUi = listening || connecting

  if (!open) {
    return (
      <button
        onClick={() => togglePanel(true)}
        className={`group fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full text-white shadow-2xl shadow-black/40 transition hover:scale-105 ${
          voiceUi ? 'bg-gradient-to-br from-tutu-pink to-tutu-violet voice-orb-speaking' : 'bg-tutu-violet hover:bg-tutu-violet-d'
        }`}
        title={voiceUi ? 'Голосовой разговор активен — открыть' : 'ИИ-ассистент путешествий'}
      >
        {voiceUi ? (
          <div className="flex h-6 items-end gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="voice-bar h-full w-1 rounded-full bg-white" style={{ animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
        ) : (
          <IconSpark width={28} height={28} />
        )}
        <span className={`absolute -top-1 -right-1 h-4 w-4 animate-pulse rounded-full ring-2 ring-white ${voiceUi ? 'bg-tutu-pink' : 'bg-tutu-green'}`} />
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] sm:w-[400px]">
      <div className="lq lg-stage lg-in flex max-h-[80vh] flex-col overflow-hidden rounded-[32px]">
        {voiceUi ? (
          <VoiceMode
            connecting={connecting}
            speaking={voicePlaying}
            muted={muted}
            onClose={() => {
              stopVoice()
              togglePanel(false)
            }}
            onKeyboard={() => stopVoice()}
            onToggleMute={() => {
              setMuted((m) => {
                const next = !m
                voiceRef.current?.setMuted(next)
                return next
              })
            }}
          />
        ) : (
          <>
          {/* стеклянная шапка */}
          <div className="flex items-center gap-2.5 border-b border-white/30 bg-white/15 px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-tutu-violet to-tutu-pink text-white shadow-[0_8px_20px_-6px_rgba(120,90,220,0.6)]">
              <IconSpark width={18} height={18} />
            </span>
            <div className="flex-1">
              <div className="text-[14.5px] font-bold text-tutu-ink">ИИ-ассистент путешествий</div>
              <div className="flex items-center gap-1.5 text-[11.5px] text-tutu-muted">
                <span className={`h-1.5 w-1.5 rounded-full ${thinking ? 'bg-tutu-orange animate-pulse' : 'bg-tutu-green'}`} />
                {thinking ? 'печатает…' : 'на связи · MCP Туту'}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* свернуть — голос продолжает работать в фоне */}
              <button
                onClick={() => togglePanel(false)}
                title="Свернуть"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/50 text-tutu-muted ring-1 ring-white/60 transition hover:text-tutu-ink"
              >
                <span className="h-0.5 w-4 rounded bg-current" />
              </button>
              {/* закрыть */}
              <button
                onClick={() => togglePanel(false)}
                title="Закрыть"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/50 text-tutu-muted ring-1 ring-white/60 transition hover:text-tutu-ink"
              >
                <IconClose width={18} height={18} />
              </button>
            </div>
          </div>

          {/* messages */}
          {(messages.length > 0 || thinking) && (
          <div ref={scrollRef} className="flex-1 min-h-0 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-md bg-gradient-to-br from-tutu-violet to-tutu-violet-d px-4 py-2.5 text-[14.5px] text-white shadow-[0_10px_26px_-10px_rgba(107,88,252,0.7)]">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex justify-start">
                  <div className="max-w-[85%]">
                    {m.statusLog && m.statusLog.length > 0 && (
                      <div className="mb-1.5 space-y-1">
                        {m.statusLog.map((s, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[12px] text-tutu-muted">
                            <span className="h-1.5 w-1.5 rounded-full bg-tutu-green" />
                            {s}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap rounded-2xl rounded-bl-md bg-white/75 px-4 py-2.5 text-[14.5px] text-tutu-ink ring-1 ring-tutu-violet/20 backdrop-blur-md">
                      {m.content ? <RichText text={m.content} /> : thinking ? '…' : ''}
                    </div>
                    {m.placeInfo && <PlaceCard place={m.placeInfo} />}
                  </div>
                </div>
              ),
            )}

            {/* быстрые подсказки, пока диалога нет */}
            {messages.length <= 1 && !thinking && (
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  'Билеты Москва — Сочи на выходные',
                  'Подбери отель в Казани',
                  'Дёшево до Питера, можно с пересадкой',
                  'Что посмотреть в Казани',
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => submit(q)}
                    className="rounded-full bg-white/55 px-3 py-1.5 text-[13px] text-tutu-ink ring-1 ring-tutu-violet/25 backdrop-blur-md transition hover:text-tutu-violet-d hover:ring-tutu-violet/50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {offers.length > 0 && (
              <div className="flex justify-start">
                <button
                  onClick={() => useStore.getState().setPage('results')}
                  className="rounded-xl bg-white/60 px-4 py-2 text-[13.5px] font-semibold text-tutu-violet-d ring-1 ring-tutu-violet/30 backdrop-blur-md hover:bg-white/80"
                >
                  Показать {offers.length} вариантов от {fmtPrice(Math.min(...offers.map((o) => o.price)))} →
                </button>
              </div>
            )}
          </div>
          )}

          {/* стеклянная строка ввода */}
          <div className="flex items-center gap-2 border-t border-white/30 bg-white/15 px-3 py-2.5">
            <button
              onClick={toggleMic}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-1 ring-tutu-violet/25 transition ${
                listening
                  ? 'animate-pulse bg-tutu-pink text-white'
                  : connecting
                    ? 'bg-tutu-orange text-white'
                    : 'bg-white/60 text-tutu-violet-d backdrop-blur-md hover:bg-white/80'
              }`}
              title={listening ? 'Завершить голосовой разговор' : 'Говорить (OpenAI Realtime)'}
            >
              <IconMic width={20} height={20} />
            </button>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder={
                listening
                  ? '🎙 Говорите — я слушаю и отвечу голосом…'
                  : connecting
                    ? 'Подключаю голос…'
                    : 'Спросите про билеты, места, маршруты…'
              }
              className="h-11 flex-1 rounded-full bg-white/60 px-4 text-[14.5px] text-tutu-ink outline-none ring-1 ring-tutu-violet/25 backdrop-blur-md placeholder:text-tutu-muted focus:ring-2 focus:ring-tutu-violet/50"
            />
            <button
              onClick={() => submit()}
              disabled={!text.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-tutu-violet to-tutu-violet-d text-white shadow-[0_10px_26px_-10px_rgba(107,88,252,0.8)] transition hover:brightness-110 disabled:opacity-40"
            >
              <IconSend width={20} height={20} />
            </button>
          </div>
          </>
        )}
        </div>
    </div>
  )
}
