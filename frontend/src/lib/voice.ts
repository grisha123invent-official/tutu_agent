import { sendRaw, setAudioHandler, setFlushHandler } from './ws'
import { useStore } from '../store'

const SAMPLE_RATE = 24000

function floatToPCM16Base64(input: Float32Array): string {
  const buf = new ArrayBuffer(input.length * 2)
  const view = new DataView(buf)
  for (let i = 0; i < input.length; i++) {
    let s = Math.max(-1, Math.min(1, input[i]))
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  let binary = ''
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function base64PCM16ToFloat(b64: string): Float32Array {
  const binary = atob(b64)
  const len = binary.length / 2
  const out = new Float32Array(len)
  const view = new DataView(new ArrayBuffer(binary.length))
  for (let i = 0; i < binary.length; i++) view.setUint8(i, binary.charCodeAt(i))
  for (let i = 0; i < len; i++) out[i] = view.getInt16(i * 2, true) / 0x8000
  return out
}

/** Linear resample from srcRate to dstRate (нужно Safari — он не любит buffer не на родной частоте). */
function resample(data: Float32Array, srcRate: number, dstRate: number): Float32Array {
  if (srcRate === dstRate) return data
  const ratio = dstRate / srcRate
  const outLen = Math.round(data.length * ratio)
  const out = new Float32Array(outLen)
  for (let i = 0; i < outLen; i++) {
    const pos = i / ratio
    const i0 = Math.floor(pos)
    const i1 = Math.min(i0 + 1, data.length - 1)
    const frac = pos - i0
    out[i] = data[i0] * (1 - frac) + data[i1] * frac
  }
  return out
}

function makeContext(sampleRate?: number): AudioContext {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  try {
    return sampleRate ? new AC({ sampleRate }) : new AC()
  } catch {
    return new AC()
  }
}

/** Full-duplex voice via the backend Realtime bridge. */
export class VoiceController {
  private ctx: AudioContext | null = null
  private stream: MediaStream | null = null
  private processor: ScriptProcessorNode | null = null
  private source: MediaStreamAudioSourceNode | null = null

  // playback scheduling
  private playCtx: AudioContext | null = null
  private playHead = 0
  private scheduled: AudioBufferSourceNode[] = []
  private muted = false
  private playingTimer: ReturnType<typeof setTimeout> | null = null

  setMuted(m: boolean) {
    this.muted = m
  }

  /** «Говорит» = реально играет звук. Грейс 350мс сглаживает стыки чанков. */
  private markPlaying() {
    if (!this.playCtx) return
    this.assistantAudible = true
    useStore.getState().setVoicePlaying(true)
    if (this.playingTimer) clearTimeout(this.playingTimer)
    const msLeft = Math.max(0, (this.playHead - this.playCtx.currentTime) * 1000) + 350
    this.playingTimer = setTimeout(() => {
      this.playingTimer = null
      this.assistantAudible = false
      useStore.getState().setVoicePlaying(false)
    }, msLeft)
  }

  private markStopped() {
    if (this.playingTimer) {
      clearTimeout(this.playingTimer)
      this.playingTimer = null
    }
    this.assistantAudible = false
    useStore.getState().setVoicePlaying(false)
  }

  /** играет ли прямо сейчас звук ассистента (для подавления эха в микрофоне) */
  private assistantAudible = false

  async start() {
    setAudioHandler((b64) => this.playChunk(b64))
    setFlushHandler(() => this.flush())

    // память сессии: отдаём голосу всё, что уже было в разговоре
    const history = useStore
      .getState()
      .messages.filter((m) => m.content && m.id !== 'welcome')
      .slice(-24)
      .map((m) => ({ role: m.role, content: m.content }))

    // playback context — НЕ форсируем частоту (Safari), используем родную + ресемпл
    this.playCtx = makeContext()
    try {
      await this.playCtx.resume()
    } catch {}
    // silent tick to fully unlock audio output on strict browsers
    try {
      const b = this.playCtx.createBuffer(1, 1, this.playCtx.sampleRate)
      const s = this.playCtx.createBufferSource()
      s.buffer = b
      s.connect(this.playCtx.destination)
      s.start(0)
    } catch {}
    this.playHead = this.playCtx.currentTime

    sendRaw({ t: 'voice_start', history })

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
    this.ctx = makeContext(SAMPLE_RATE)
    try {
      await this.ctx.resume()
    } catch {}
    this.source = this.ctx.createMediaStreamSource(this.stream)
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1)
    this.source.connect(this.processor)
    this.processor.connect(this.ctx.destination)
    const inRate = this.ctx.sampleRate
    // сколько подряд «громких» кадров нужно, чтобы признать это речью (антидребезг)
    let loudRun = 0
    this.processor.onaudioprocess = (e) => {
      if (this.muted) return
      const input = e.inputBuffer.getChannelData(0)

      // --- шумовой гейт: считаем громкость кадра (RMS) ---
      let sum = 0
      for (let i = 0; i < input.length; i++) sum += input[i] * input[i]
      const rms = Math.sqrt(sum / input.length)

      // пока ассистент говорит — требуем заметно громче (это фильтрует эхо
      // его же голоса из колонок, но пропускает реальное «перебивание»)
      const gate = this.assistantAudible ? 0.055 : 0.012
      if (rms >= gate) loudRun++
      else loudRun = 0
      const speech = loudRun >= 2 // ~2 кадра ≈ 340мс на 24кГц

      // OpenAI ждёт 24кГц — если контекст на другой частоте (Safari), ресемплим вниз
      const src = inRate === SAMPLE_RATE ? input : resample(input, inRate, SAMPLE_RATE)
      // тишину/эхо отправляем как нули: поток непрерывный, но VAD и whisper
      // не срабатывают и не выдумывают слова
      const pcm = speech ? src : new Float32Array(src.length)
      sendRaw({ t: 'audio', data: floatToPCM16Base64(pcm) })
    }
  }

  private playChunk(b64: string) {
    if (!this.playCtx) this.playCtx = makeContext()
    if (this.playCtx.state === 'suspended') this.playCtx.resume().catch(() => {})
    const raw = base64PCM16ToFloat(b64)
    if (!raw.length) return
    // ресемпл 24кГц → родная частота контекста (иначе Safari молчит)
    const rate = this.playCtx.sampleRate
    const data = resample(raw, SAMPLE_RATE, rate)
    const buffer = this.playCtx.createBuffer(1, data.length, rate)
    buffer.copyToChannel(data, 0)
    const src = this.playCtx.createBufferSource()
    src.buffer = buffer
    src.connect(this.playCtx.destination)
    const now = this.playCtx.currentTime
    // keep a small lead so scheduled chunks don't underrun
    if (this.playHead < now + 0.06) this.playHead = now + 0.06
    src.start(this.playHead)
    this.playHead += buffer.duration
    this.scheduled.push(src)
    src.onended = () => {
      this.scheduled = this.scheduled.filter((s) => s !== src)
    }
    this.markPlaying()
  }

  /** Мгновенно оборвать проигрывание ответа (пользователь перебил). */
  private flush() {
    for (const s of this.scheduled) {
      try {
        s.onended = null
        s.stop()
      } catch {}
    }
    this.scheduled = []
    if (this.playCtx) this.playHead = this.playCtx.currentTime
    this.markStopped()
  }

  stop() {
    sendRaw({ t: 'voice_stop' })
    setAudioHandler(null)
    setFlushHandler(null)
    this.flush()
    try {
      this.processor?.disconnect()
      this.source?.disconnect()
      this.stream?.getTracks().forEach((t) => t.stop())
      this.ctx?.close()
      this.playCtx?.close()
    } catch {}
    this.processor = null
    this.source = null
    this.stream = null
    this.ctx = null
    this.playCtx = null
  }
}
