import WebSocket from 'ws'
import OpenAI from 'openai'
import { toolSchemas, runTool, type Send } from './tools.js'
import { systemPrompt } from './agent.js'

// Endpoint Realtime. По умолчанию — облачный OpenAI. Чтобы использовать
// ЛОКАЛЬНЫЙ OpenAI-Realtime-совместимый сервер (LocalAI / Speaches /
// huggingface speech-to-speech), задайте REALTIME_URL, напр.:
//   REALTIME_URL=ws://localhost:8765/v1/realtime
// Тот же мост, тот же протокол событий — меняется только адрес.
const RT_URL = process.env.REALTIME_URL?.trim()
const RT_MODEL = process.env.REALTIME_MODEL || process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime'
const RT_VOICE = process.env.REALTIME_VOICE || process.env.OPENAI_REALTIME_VOICE || 'alloy'

/** Convert our chat tool schemas to the Realtime tool format. */
function realtimeTools() {
  return toolSchemas.map((t) => {
    const fn = (t as any).function
    return {
      type: 'function' as const,
      name: fn.name,
      description: fn.description,
      parameters: fn.parameters,
    }
  })
}

/**
 * Server-side bridge to the OpenAI Realtime API.
 * Browser streams mic PCM16 to us; we relay to OpenAI, run tool calls
 * (which touch MCP Туту), and stream audio + transcript back.
 */
export class RealtimeBridge {
  private rt: WebSocket | null = null
  private openReady = false
  private respId = ''
  private history: { role: string; content: string }[] = []
  private silenceTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private openai: OpenAI,
    private send: Send,
  ) {}

  private historyBlock(): string {
    if (!this.history.length) return ''
    const lines = this.history
      .map((m) => `${m.role === 'assistant' ? 'Ты' : 'Пользователь'}: ${m.content}`)
      .join('\n')
    return (
      '\n\nКОНТЕКСТ ЭТОЙ СЕССИИ (помни его, не переспрашивай уже сказанное):\n' +
      lines +
      '\n(конец контекста)'
    )
  }

  async start(history: { role: string; content: string }[] = []) {
    this.history = history
    const key = process.env.REALTIME_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim()
    const isLocal = !!RT_URL
    if (!isLocal && !key) {
      this.send({ t: 'error', text: 'Нет OPENAI_API_KEY (или REALTIME_URL для локального) для голосового режима' })
      return
    }
    // Облачный OpenAI Realtime ИЛИ локальный совместимый сервер (по REALTIME_URL)
    const base = RT_URL || 'wss://api.openai.com/v1/realtime'
    const url = base + (base.includes('?') ? '&' : '?') + 'model=' + encodeURIComponent(RT_MODEL)
    // локальные серверы обычно без авторизации; ключ шлём только если он есть
    const headers: Record<string, string> = {}
    if (key) headers.Authorization = `Bearer ${key}`
    const ws = new WebSocket(url, { headers })
    this.rt = ws

    ws.on('open', () => {
      this.openReady = true
      this.rtSend({
        type: 'session.update',
        session: {
          type: 'realtime',
          instructions:
            '‼️ ЯЗЫК: говори и пиши ТОЛЬКО по-русски. Никогда не вставляй английские слова и фразы. Если расслышал непонятный/английский обрывок — это шум, промолчи, не отвечай на него.' +
            '\n\n' +
            '‼️ ГЛАВНОЕ ПРАВИЛО — ТРАНСПОРТ:' +
            '\nПользователь называет вид транспорта — ищи и обсуждай ТОЛЬКО ЕГО. Никогда не упоминай, не предлагай и не подмешивай другие виды транспорта, о которых не просили.' +
            '\n  «на самолёте / авиа / долететь» → search_offers transport="avia";' +
            '\n  «на поезде / жд» → transport="zhd";' +
            '\n  «на автобусе» → transport="bus";' +
            '\n  «на электричке» → transport="suburban".' +
            '\ntransport="multi" — ТОЛЬКО если явно сказали «как добраться / любым транспортом / всё равно чем». Назвали вид — multi ЗАПРЕЩЁН.' +
            '\nЕсли спросили про автобус — НЕ говори про поезда/самолёты. Если про самолёт — НЕ говори про поезда. Вообще.' +
            '\n\n' +
            systemPrompt() +
            this.historyBlock() +
            '\n\nТы говоришь ГОЛОСОМ — отвечай коротко и естественно, как в разговоре. Не зачитывай длинные списки: 1-2 лучших варианта и цена.' +
            '\n\nЖЁСТКИЕ ПРАВИЛА РАЗГОВОРА:' +
            '\n- На приветствие или пустой запрос («привет», «алло», «ты тут?») отвечай РОВНО ОДНОЙ короткой фразой: «Привет! Чем могу помочь?» — и всё. НЕ рассказывай о себе, НЕ перечисляй возможности, НЕ предлагай города и направления.' +
            '\n- Если пользователь сразу дал задачу (куда/на чём ехать) — просто выполняй её, без вступлений и рассказов о себе.' +
            '\n- НИКОГДА не придумывай город отправления, назначения, даты или цены. Если чего-то не сказали — коротко переспроси, а не угадывай.' +
            '\n- Если не знаешь, откуда человек едет — спроси «Откуда поедем?». Не подставляй случайный город.' +
            '\n- Если пользователь начал говорить — сразу замолчи и слушай, не перебивай.' +
            '\n- Если человек молчит — можешь мягко спросить, чем помочь, но без выдуманных фактов.' +
            '\n- Все цены и рейсы — только из результатов search_offers, ничего не выдумывай.' +
            '\n- ПЕРЕД вызовом поиска (search_offers) скажи ОДНУ короткую фразу-филлер вслух, например «Секунду, посмотрю» или «Сейчас гляну» — чтобы человек не сидел в тишине, пока идёт поиск.',
          audio: {
            input: {
              format: { type: 'audio/pcm', rate: 24000 },
              transcription: { model: 'whisper-1' },
              turn_detection: {
                type: 'server_vad',
                // высокий порог + запас тишины: не срываемся на эхо и шуме,
                // не выдумываем чужую речь
                threshold: 0.82,
                silence_duration_ms: 800,
                prefix_padding_ms: 300,
                create_response: true,
                interrupt_response: true,
              },
            },
            output: {
              format: { type: 'audio/pcm', rate: 24000 },
              voice: RT_VOICE,
            },
          },
          tools: realtimeTools(),
          tool_choice: 'auto',
        },
      })
      this.send({ t: 'voice_ready' })

      // НЕ говорим первыми — ждём пользователя. Если он молчит ~10 секунд,
      // мягко спрашиваем, чем помочь.
      const hadTalk = this.history.length > 0
      this.silenceTimer = setTimeout(() => {
        this.silenceTimer = null
        this.rtSend({
          type: 'response.create',
          response: {
            instructions: hadTalk
              ? 'Пользователь молчит. Скажи ровно одну короткую фразу: «Чем ещё могу помочь?» — и всё.'
              : 'Пользователь молчит. Скажи ровно одну короткую фразу: «Привет! Чем могу помочь?» — и всё. Без рассказов о себе и без списков.',
          },
        })
      }, 10000)
    })

    ws.on('message', (raw) => this.onRealtimeEvent(raw))
    ws.on('close', () => {
      this.openReady = false
      this.send({ t: 'voice_closed' })
    })
    ws.on('error', (e) => {
      this.send({ t: 'error', text: 'Realtime: ' + (e as Error).message })
    })
  }

  /** Base64 PCM16 mic chunk from the browser. */
  appendAudio(b64: string) {
    if (!this.openReady) return
    this.rtSend({ type: 'input_audio_buffer.append', audio: b64 })
  }

  stop() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer)
      this.silenceTimer = null
    }
    try {
      this.rt?.close()
    } catch {}
    this.rt = null
    this.openReady = false
  }

  private rtSend(obj: unknown) {
    if (this.rt && this.rt.readyState === WebSocket.OPEN) this.rt.send(JSON.stringify(obj))
  }

  private async onRealtimeEvent(raw: WebSocket.RawData) {
    let ev: any
    try {
      ev = JSON.parse(raw.toString())
    } catch {
      return
    }

    switch (ev.type) {
      // пользователь заговорил — просим клиент немедленно оборвать проигрывание (barge-in)
      case 'input_audio_buffer.speech_started':
        // пользователь заговорил сам — «дежурный» вопрос больше не нужен
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer)
          this.silenceTimer = null
        }
        this.send({ t: 'user_speaking' })
        break

      case 'response.created':
        this.respId = 'v_' + (ev.response?.id || Date.now())
        this.send({ t: 'assistant_start', id: this.respId })
        break

      // assistant spoken transcript (GA event name)
      case 'response.output_audio_transcript.delta':
        if (ev.delta) this.send({ t: 'token', id: this.respId, delta: ev.delta })
        break

      // assistant audio to play in the browser (GA event name)
      case 'response.output_audio.delta':
        if (ev.delta) this.send({ t: 'audio', data: ev.delta })
        break

      // user's speech transcribed
      case 'conversation.item.input_audio_transcription.completed':
        if (ev.transcript) this.send({ t: 'user_transcript', text: ev.transcript.trim() })
        break

      // model wants to call one of our tools
      case 'response.function_call_arguments.done':
        await this.handleFunctionCall(ev)
        break

      case 'response.done':
        this.send({ t: 'assistant_done', id: this.respId })
        break

      case 'error':
        this.send({ t: 'error', text: 'Realtime: ' + (ev.error?.message || 'ошибка') })
        break
    }
  }

  private async handleFunctionCall(ev: any) {
    const name: string = ev.name
    const callId: string = ev.call_id
    let args: any = {}
    try {
      args = JSON.parse(ev.arguments || '{}')
    } catch {}

    let result = ''
    try {
      result = await runTool(name, args, this.send, this.openai)
    } catch (e) {
      result = 'Ошибка инструмента: ' + (e as Error).message
    }

    // return the tool result to the realtime session and let it continue speaking
    this.rtSend({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: result,
      },
    })
    this.rtSend({ type: 'response.create' })
  }
}
