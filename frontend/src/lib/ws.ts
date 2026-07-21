import { useStore } from '../store'
import type { Offer, PlaceInfo, UiAction } from '../types'

type ServerMsg =
  | { t: 'assistant_start'; id: string }
  | { t: 'token'; id: string; delta: string }
  | { t: 'assistant_done'; id: string }
  | { t: 'status'; text: string }
  | { t: 'searching'; value: boolean }
  | { t: 'action'; action: UiAction }
  | { t: 'offers'; offers: Offer[]; label: string }
  | { t: 'place'; id: string; place: PlaceInfo }
  | { t: 'audio'; data: string }
  | { t: 'user_transcript'; text: string }
  | { t: 'user_speaking' }
  | { t: 'voice_ready' }
  | { t: 'voice_closed' }
  | { t: 'error'; text: string }

let audioHandler: ((b64: string) => void) | null = null
let voiceStateHandler: ((active: boolean) => void) | null = null
let flushHandler: (() => void) | null = null
export function setAudioHandler(fn: ((b64: string) => void) | null) {
  audioHandler = fn
}
export function setVoiceStateHandler(fn: ((active: boolean) => void) | null) {
  voiceStateHandler = fn
}
export function setFlushHandler(fn: (() => void) | null) {
  flushHandler = fn
}

let socket: WebSocket | null = null
let ready = false
const queue: string[] = []

function wsUrl() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${location.host}/ws`
}

export function connect() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING))
    return
  socket = new WebSocket(wsUrl())

  socket.onopen = () => {
    ready = true
    while (queue.length) socket!.send(queue.shift()!)
  }
  socket.onclose = () => {
    ready = false
    setTimeout(connect, 1500)
  }
  socket.onmessage = (ev) => {
    let msg: ServerMsg
    try {
      msg = JSON.parse(ev.data)
    } catch {
      return
    }
    handle(msg)
  }
}

function handle(msg: ServerMsg) {
  const s = useStore.getState()
  switch (msg.t) {
    case 'assistant_start':
      s.addMessage({ id: msg.id, role: 'assistant', content: '', statusLog: [] })
      s.setThinking(true)
      break
    case 'token':
      s.appendToMessage(msg.id, msg.delta)
      break
    case 'assistant_done':
      s.setThinking(false)
      s.setVoiceStatus('')
      break
    case 'status': {
      s.setVoiceStatus(msg.text)
      const last = s.messages[s.messages.length - 1]
      if (last && last.role === 'assistant') {
        s.updateMessage(last.id, { statusLog: [...(last.statusLog ?? []), msg.text] })
      }
      break
    }
    case 'searching':
      s.setSearching(msg.value)
      break
    case 'action':
      // small stagger so the user sees fields being filled one by one
      s.applyAction(msg.action)
      break
    case 'offers':
      s.setOffers(msg.offers, msg.label)
      break
    case 'place': {
      s.updateMessage(msg.id, { placeInfo: msg.place })
      break
    }
    case 'audio':
      audioHandler?.(msg.data)
      break
    case 'user_speaking':
      // пользователь перебил — мгновенно обрываем проигрывание ответа
      flushHandler?.()
      break
    case 'user_transcript':
      if (msg.text)
        s.addMessage({ id: 'u_' + Date.now(), role: 'user', content: msg.text })
      break
    case 'voice_ready':
      voiceStateHandler?.(true)
      break
    case 'voice_closed':
      voiceStateHandler?.(false)
      break
    case 'error': {
      const last = s.messages[s.messages.length - 1]
      if (last && last.role === 'assistant')
        s.appendToMessage(last.id, `\n\n⚠️ ${msg.text}`)
      s.setThinking(false)
      break
    }
  }
}

export function sendUser(text: string) {
  const payload = JSON.stringify({ t: 'user', text })
  if (ready && socket) socket.send(payload)
  else {
    queue.push(payload)
    connect()
  }
}

export function sendRaw(obj: unknown) {
  const payload = JSON.stringify(obj)
  if (ready && socket && socket.readyState === WebSocket.OPEN) socket.send(payload)
  else {
    queue.push(payload)
    connect()
  }
}
