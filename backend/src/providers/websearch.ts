import OpenAI from 'openai'
import { CHAT_MODEL } from './llm.js'

/**
 * Провайдер веб-поиска (для рассказов о местах, пересадках).
 *
 *   WEB_SEARCH_PROVIDER=openai   # облачный OpenAI Responses + web_search (по умолчанию)
 *   WEB_SEARCH_PROVIDER=searxng  # self-hosted SearXNG + локальный LLM для сводки
 *   WEB_SEARCH_PROVIDER=none     # отключить (ассистент ответит из знаний модели)
 *
 *   SEARXNG_URL=http://searxng:8080   # адрес своего SearXNG (для provider=searxng)
 */

export interface PlaceResult {
  title: string
  summary: string
  bullets: string[]
  sourceUrl?: string
}

const PROVIDER = (process.env.WEB_SEARCH_PROVIDER || 'openai').toLowerCase()

/**
 * @param query поисковый запрос
 * @param title заголовок карточки (fallback)
 * @param llm   клиент LLM (используется провайдером searxng для сводки)
 */
export async function webSearch(
  query: string,
  title: string | undefined,
  llm: OpenAI,
): Promise<PlaceResult> {
  if (PROVIDER === 'none') throw new Error('web search disabled (WEB_SEARCH_PROVIDER=none)')
  if (PROVIDER === 'searxng') return viaSearxng(query, title, llm)
  return viaOpenAI(query, title)
}

/** Облачный OpenAI Responses API с web_search_preview (нужен OPENAI_API_KEY). */
async function viaOpenAI(query: string, title?: string): Promise<PlaceResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'missing' })
  const resp = await client.responses.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    tools: [{ type: 'web_search_preview' } as any],
    input:
      `Кратко и по делу ответь на русском на запрос путешественника: «${query}».\n` +
      `Верни СТРОГО JSON: {"title":"...","summary":"1-2 предложения","bullets":["пункт","пункт","пункт"],"sourceUrl":"https://..."}. Без markdown.`,
  })
  const text = (resp as any).output_text || ''
  return normalize(text, title)
}

/** Self-hosted SearXNG (JSON API) + локальный LLM для краткой сводки. */
async function viaSearxng(query: string, title: string | undefined, llm: OpenAI): Promise<PlaceResult> {
  const base = process.env.SEARXNG_URL?.replace(/\/$/, '')
  if (!base) throw new Error('SEARXNG_URL не задан для WEB_SEARCH_PROVIDER=searxng')

  const url = `${base}/search?format=json&language=ru&q=${encodeURIComponent(query)}`
  const r = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!r.ok) throw new Error(`SearXNG ${r.status}`)
  const data: any = await r.json()
  const results: any[] = Array.isArray(data.results) ? data.results.slice(0, 6) : []
  const sources = results
    .map((x) => `- ${x.title}: ${x.content || ''} (${x.url})`)
    .join('\n')
  const sourceUrl = results[0]?.url

  // локальный LLM превращает выдачу в аккуратный JSON
  const completion = await llm.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'Ты помощник путешественника. По результатам веб-поиска дай короткий полезный ответ на русском. ' +
          'Верни СТРОГО JSON: {"title":"...","summary":"1-2 предложения","bullets":["...","...","..."]}. Без markdown, без выдумок.',
      },
      { role: 'user', content: `Запрос: «${query}».\nРезультаты поиска:\n${sources}` },
    ],
  })
  const text = completion.choices[0]?.message?.content || ''
  const place = normalize(text, title)
  if (!place.sourceUrl) place.sourceUrl = sourceUrl
  return place
}

function normalize(text: string, title?: string): PlaceResult {
  const json = extractJson(text)
  return {
    title: json.title || title || 'Информация',
    summary: json.summary || text.slice(0, 200),
    bullets: Array.isArray(json.bullets) ? json.bullets.slice(0, 5) : [],
    sourceUrl: json.sourceUrl,
  }
}

function extractJson(s: string): any {
  try {
    return JSON.parse(s)
  } catch {}
  const m = s.match(/\{[\s\S]*\}/)
  if (m) {
    try {
      return JSON.parse(m[0])
    } catch {}
  }
  return {}
}
