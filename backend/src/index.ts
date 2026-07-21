import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import http from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { runAgent } from './agent.js'
import { RealtimeBridge } from './realtime.js'
import { mcpSearch } from './search.js'
import { getSeatmap, getOfferDetails, createCheckout } from './extras.js'
import { mcpConnect, getToolNames } from './mcp.js'

const PORT = Number(process.env.PORT || 8787)
const hasKey = !!process.env.OPENAI_API_KEY
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'missing' })

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, openai: hasKey, mcpTools: getToolNames() })
})

// Direct MCP search — powers the "Найти билеты" button (no LLM).
app.post('/api/search', async (req, res) => {
  const b = req.body || {}
  if (!b.transport || !b.origin || !b.destination) {
    return res.status(400).json({ error: 'transport, origin, destination обязательны' })
  }
  try {
    const result = await mcpSearch({
      transport: b.transport,
      origin: b.origin,
      destination: b.destination,
      departureDate: b.departureDate,
      checkOut: b.checkOut,
      passengers: b.passengers,
      serviceClass: b.serviceClass,
      directOnly: b.directOnly,
      maxPrice: b.maxPrice,
      sort: b.sort,
    })
    res.json(result)
  } catch (e) {
    console.error('[search] error:', (e as Error).message)
    res.status(502).json({ error: 'MCP Туту: ' + (e as Error).message })
  }
})

// Схема мест в вагоне (get_rail_seatmap)
app.post('/api/seatmap', async (req, res) => {
  if (!req.body?.detailsRef) return res.status(400).json({ error: 'detailsRef обязателен' })
  try {
    res.json(await getSeatmap(req.body.detailsRef))
  } catch (e) {
    res.status(502).json({ error: 'MCP: ' + (e as Error).message })
  }
})

// Детали предложения (get_offer_details)
app.post('/api/details', async (req, res) => {
  const b = req.body || {}
  if (!b.productType) return res.status(400).json({ error: 'productType обязателен' })
  try {
    res.json({ details: await getOfferDetails(b) })
  } catch (e) {
    res.status(502).json({ error: 'MCP: ' + (e as Error).message })
  }
})

// Точная ссылка на оформление (create_checkout_link)
app.post('/api/checkout', async (req, res) => {
  try {
    const url = await createCheckout(req.body?.checkoutRef)
    res.json({ url })
  } catch (e) {
    res.status(502).json({ error: 'MCP: ' + (e as Error).message })
  }
})

const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', (ws: WebSocket) => {
  const history: ChatCompletionMessageParam[] = []
  let busy = false
  let voice: RealtimeBridge | null = null

  const send = (msg: unknown) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
  }

  ws.on('close', () => voice?.stop())

  ws.on('message', async (raw) => {
    let data: { t?: string; text?: string; data?: string; history?: { role: string; content: string }[] }
    try {
      data = JSON.parse(raw.toString())
    } catch {
      return
    }

    // ---- voice (OpenAI Realtime) ----
    if (data.t === 'voice_start') {
      if (!hasKey) return send({ t: 'error', text: 'Нет OPENAI_API_KEY' })
      voice = new RealtimeBridge(openai, send)
      await voice.start(data.history || [])
      return
    }
    if (data.t === 'audio' && data.data) {
      voice?.appendAudio(data.data)
      return
    }
    if (data.t === 'voice_stop') {
      voice?.stop()
      voice = null
      return
    }

    // ---- text chat ----
    if (data.t !== 'user' || !data.text) return

    if (!hasKey) {
      const id = 'a_' + Date.now()
      send({ t: 'assistant_start', id })
      send({
        t: 'token',
        id,
        delta:
          'Не задан OPENAI_API_KEY на бэкенде. Добавьте ключ в backend/.env — и я оживу. ' +
          'Форму поиска и интерфейс уже можно смотреть.',
      })
      send({ t: 'assistant_done', id })
      return
    }
    if (busy) {
      send({ t: 'status', text: 'Секунду, дорабатываю прошлый запрос…' })
      return
    }

    busy = true
    history.push({ role: 'user', content: data.text })
    try {
      await runAgent(openai, history, send)
    } catch (e) {
      send({ t: 'error', text: (e as Error).message })
    } finally {
      busy = false
    }
  })
})

server.listen(PORT, () => {
  console.log(`[server] http+ws on :${PORT}  (openai key: ${hasKey ? 'yes' : 'NO'})`)
  // warm up MCP connection
  mcpConnect().then((c) => {
    if (c) console.log('[server] MCP Туту ready')
    else console.log('[server] MCP Туту not reachable (will retry on demand)')
  })
})
