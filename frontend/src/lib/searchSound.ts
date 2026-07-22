// Мягкий «поисковый» звук на Web Audio (без файлов): нежные пи-пи, пока идёт поиск.
// ВАЖНО: играем через ТОТ ЖЕ AudioContext, что и голос ассистента (его задаёт
// VoiceController), иначе два контекста конфликтуют и голос пропадает.

let ctx: AudioContext | null = null
let timer: ReturnType<typeof setInterval> | null = null

/** VoiceController отдаёт сюда свой playCtx на время сессии. */
export function setSearchSoundContext(c: AudioContext | null) {
  ctx = c
}

/** Один мягкий тон с плавной атакой/затуханием. */
function blip(c: AudioContext, freq: number, at: number, dur = 0.18, peak = 0.11) {
  const t0 = c.currentTime + at
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  osc.frequency.linearRampToValueAtTime(freq * 1.04, t0 + dur)
  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(gain).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

/** Начать тихий цикл «пи-пи» (idempotent). */
export function startSearchSound() {
  const c = ctx
  if (!c || c.state === 'closed') return
  if (c.state === 'suspended') c.resume().catch(() => {})
  if (timer != null) return
  const motif = () => {
    if (!ctx || ctx.state === 'closed') return
    blip(ctx, 784, 0) // G5
    blip(ctx, 988, 0.14) // B5
    blip(ctx, 1319, 0.28) // E6
  }
  motif()
  timer = setInterval(motif, 1300)
}

/** Остановить цикл. */
export function stopSearchSound() {
  if (timer != null) {
    clearInterval(timer)
    timer = null
  }
}
