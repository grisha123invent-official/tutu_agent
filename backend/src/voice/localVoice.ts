import OpenAI, { toFile } from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { runAgent } from '../agent.js'
import type { Send } from '../tools.js'
import { rms16, durationMs, pcm16ToWav, resamplePcm16 } from '../providers/audio.js'

/**
 * ЛОКАЛЬНЫЙ голосовой режим (альтернатива OpenAI Realtime).
 *
 * Готового локального speech-to-speech нет, поэтому это классический конвейер:
 *
 *     микрофон → [VAD на сервере] → STT (Whisper) → LLM+MCP (agent) → TTS → аудио в браузер
 *
 * И STT, и TTS берутся по OpenAI-совместимому API, поэтому подключаются одним env:
 *
 *   VOICE_PROVIDER=local
 *   STT_BASE_URL=http://speaches:8000/v1     # faster-whisper-server / speaches
 *   STT_MODEL=Systran/faster-whisper-small
 *   TTS_BASE_URL=http://tts:8000/v1          # openedai-speech / Kokoro-FastAPI
 *   TTS_MODEL=tts-1
 *   TTS_VOICE=alloy
 *
 * Протокол WebSocket тот же, что у Realtime, поэтому фронтенд не меняется.
 * Ограничение: barge-in (перебивание во время ответа) в конвейере проще —
 * пока ассистент говорит, новая реплика обрабатывается после завершения.
 */

const CLIENT_RATE = 24000 // фронтенд шлёт PCM16 @ 24 кГц

const STT_BASE_URL = process.env.STT_BASE_URL?.trim()
const STT_MODEL = process.env.STT_MODEL || 'Systran/faster-whisper-small'
const TTS_BASE_URL = process.env.TTS_BASE_URL?.trim()
const TTS_MODEL = process.env.TTS_MODEL || 'tts-1'
const TTS_VOICE = process.env.TTS_VOICE || 'alloy'
const TTS_RATE = Number(process.env.TTS_SAMPLE_RATE || 24000)

const VAD_THRESHOLD = Number(process.env.LOCAL_VAD_THRESHOLD || 0.012)
const END_SILENCE_MS = Number(process.env.LOCAL_END_SILENCE_MS || 700)
const MIN_SPEECH_MS = Number(process.env.LOCAL_MIN_SPEECH_MS || 300)

export class LocalVoiceBridge {
  private history: ChatCompletionMessageParam[] = []
  private frames: Buffer[] = []
  private speechMs = 0
  private silenceMs = 0
  private collecting = false
  private busy = false
  private open = false
  private stt: OpenAI
  private tts: OpenAI

  constructor(
    private llm: OpenAI,
    private send: Send,
  ) {
    this.stt = new OpenAI({ baseURL: STT_BASE_URL, apiKey: process.env.STT_API_KEY || 'local' })
    this.tts = new OpenAI({ baseURL: TTS_BASE_URL, apiKey: process.env.TTS_API_KEY || 'local' })
  }

  async start(history: { role: string; content: string }[] = []) {
    if (!STT_BASE_URL || !TTS_BASE_URL) {
      this.send({ t: 'error', text: 'Локальный голос: не заданы STT_BASE_URL / TTS_BASE_URL' })
      return
    }
    this.open = true
    // переносим контекст сессии
    this.history = history
      .filter((m) => m.content)
      .map((m) => ({ role: m.role as any, content: m.content }))
    this.send({ t: 'voice_ready' })
  }

  /** base64 PCM16 @ 24кГц кадр от браузера. */
  appendAudio(b64: string) {
    if (!this.open || this.busy) return
    const pcm = Buffer.from(b64, 'base64')
    const loud = rms16(pcm) >= VAD_THRESHOLD
    const ms = durationMs(pcm, CLIENT_RATE)

    if (loud) {
      if (!this.collecting) {
        this.collecting = true
        this.send({ t: 'user_speaking' }) // барже-ин: гасим текущее проигрывание
      }
      this.frames.push(pcm)
      this.speechMs += ms
      this.silenceMs = 0
    } else if (this.collecting) {
      this.frames.push(pcm)
      this.silenceMs += ms
      if (this.silenceMs >= END_SILENCE_MS) {
        if (this.speechMs >= MIN_SPEECH_MS) void this.process()
        else this.reset() // слишком короткий всплеск — шум
      }
    }
  }

  stop() {
    this.open = false
    this.reset()
    this.send({ t: 'voice_closed' })
  }

  private reset() {
    this.frames = []
    this.speechMs = 0
    this.silenceMs = 0
    this.collecting = false
  }

  private async process() {
    this.busy = true
    const pcm = Buffer.concat(this.frames)
    this.reset()

    try {
      // 1) STT
      this.send({ t: 'status', text: 'Распознаю речь…' })
      const wav = pcm16ToWav(pcm, CLIENT_RATE)
      const file = await toFile(wav, 'speech.wav', { type: 'audio/wav' })
      const tr = await this.stt.audio.transcriptions.create({
        file,
        model: STT_MODEL,
        language: 'ru',
      })
      const text = (tr.text || '').trim()
      if (!text || !/[а-яё]/i.test(text)) {
        // пусто или не по-русски (галлюцинация whisper на шуме) — игнор
        this.busy = false
        return
      }
      this.send({ t: 'user_transcript', text })

      // 2) LLM + MCP (то же, что в текстовом чате: заполняет форму, ищет билеты)
      this.history.push({ role: 'user', content: text })
      const answer = await runAgent(this.llm, this.history, this.send)

      // 3) TTS → аудио в браузер
      if (answer && this.open) await this.speak(answer)
    } catch (e) {
      this.send({ t: 'error', text: 'Локальный голос: ' + (e as Error).message })
    } finally {
      this.busy = false
    }
  }

  private async speak(textToSay: string) {
    const resp = await this.tts.audio.speech.create({
      model: TTS_MODEL,
      voice: TTS_VOICE as any,
      input: textToSay,
      response_format: 'pcm' as any,
    })
    let pcm: Buffer = Buffer.from(new Uint8Array(await resp.arrayBuffer()))
    if (TTS_RATE !== CLIENT_RATE) pcm = resamplePcm16(pcm, TTS_RATE, CLIENT_RATE)

    // отдаём чанками ~40мс, чтобы фронт проигрывал плавно
    const chunkBytes = Math.round(CLIENT_RATE * 0.04) * 2
    for (let off = 0; off < pcm.length && this.open; off += chunkBytes) {
      const chunk = pcm.subarray(off, Math.min(off + chunkBytes, pcm.length))
      this.send({ t: 'audio', data: chunk.toString('base64') })
    }
  }
}
