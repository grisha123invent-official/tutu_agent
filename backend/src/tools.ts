import OpenAI from 'openai'
import { mcpSearch } from './search.js'
import { getPlaybook } from './extras.js'
import { webSearch } from './providers/websearch.js'
import { type Offer, type Transport } from './normalize.js'

export type Send = (msg: any) => void

const TRANSPORT_WORD: Record<Transport, string> = {
  avia: 'рейсы',
  zhd: 'поезда',
  bus: 'автобусы',
  suburban: 'электрички',
  hotel: 'отели',
}

/** OpenAI-facing tool schemas. */
export const toolSchemas: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'set_transport',
      description:
        'Переключить активный тип транспорта в форме поиска на сайте (визуально).',
      parameters: {
        type: 'object',
        properties: {
          transport: { type: 'string', enum: ['avia', 'zhd', 'bus', 'suburban', 'hotel'] },
        },
        required: ['transport'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fill_search',
      description:
        'Заполнить поля формы поиска на сайте (город отправления/прибытия, даты, пассажиры). Всегда вызывай перед search_offers, чтобы пользователь видел, как форма заполняется.',
      parameters: {
        type: 'object',
        properties: {
          fromCity: { type: 'string', description: 'Город отправления, например «Москва»' },
          toCity: { type: 'string', description: 'Город назначения, например «Санкт-Петербург»' },
          departureDate: { type: 'string', description: 'Дата туда в формате YYYY-MM-DD' },
          returnDate: { type: 'string', description: 'Дата обратно YYYY-MM-DD (если нужна)' },
          passengers: { type: 'integer', minimum: 1 },
          serviceClass: { type: 'string', enum: ['economy', 'business'] },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_filter',
      description: 'Применить фильтры на странице результатов (визуально).',
      parameters: {
        type: 'object',
        properties: {
          directOnly: { type: 'boolean', description: 'Только прямые' },
          maxPrice: { type: 'number', description: 'Максимальная цена, ₽' },
          sort: { type: 'string', enum: ['price', 'duration', 'departure'] },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_offers',
      description:
        'Выполнить РЕАЛЬНЫЙ поиск билетов через MCP Туту и показать результаты на сайте. Цены и рейсы бери ТОЛЬКО отсюда, ничего не выдумывай. Для запроса «как добраться / максимально дёшево любым транспортом» используй transport="multi".',
      parameters: {
        type: 'object',
        properties: {
          transport: {
            type: 'string',
            enum: ['avia', 'zhd', 'bus', 'suburban', 'multi'],
            description: 'Тип поиска. multi = мультимодальный (авиа+жд+автобус+электричка).',
          },
          origin: { type: 'string', description: 'Город отправления' },
          destination: { type: 'string', description: 'Город назначения' },
          departureDate: { type: 'string', description: 'Дата YYYY-MM-DD' },
          passengers: { type: 'integer', minimum: 1 },
          directOnly: { type: 'boolean' },
          maxPrice: { type: 'number' },
          optimizeFor: {
            type: 'string',
            enum: ['price', 'time'],
            description: 'Для multi: оптимизировать по цене или по времени',
          },
        },
        required: ['transport', 'origin', 'destination'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_places',
      description:
        'Найти в интернете информацию о городе/месте: что посмотреть, кафе рядом, чем занять пересадку. Используй для рассказа о местах и планирования стыковки.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Поисковый запрос, например «что посмотреть рядом с аэропортом Казани за 3 часа»' },
          title: { type: 'string', description: 'Короткий заголовок карточки места' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_playbook',
      description:
        'Прочитать официальную инструкцию (playbook) MCP Туту по типу поиска, если не уверен в параметрах или логике (аэропорты, пересадки, места в поезде и т.п.). Вызывай ПЕРЕД сложным поиском при сомнениях.',
      parameters: {
        type: 'object',
        properties: {
          transport: { type: 'string', enum: ['avia', 'zhd', 'bus', 'suburban', 'hotel', 'multi'] },
        },
        required: ['transport'],
      },
    },
  },
]

/** Execute a tool call; push UI events via send; return a string for the model. */
export async function runTool(
  name: string,
  args: any,
  send: Send,
  openai: OpenAI,
): Promise<string> {
  switch (name) {
    case 'set_transport':
      send({ t: 'action', action: { type: 'navigate', page: 'home' } })
      send({ t: 'action', action: { type: 'set_transport', transport: args.transport } })
      return 'ok'

    case 'fill_search': {
      const payload: any = {}
      if (args.fromCity) payload.fromCity = args.fromCity
      if (args.toCity) payload.toCity = args.toCity
      if (args.departureDate) payload.dateThere = args.departureDate
      if (args.returnDate) payload.dateBack = args.returnDate
      if (args.passengers) payload.passengers = args.passengers
      if (args.serviceClass) payload.travelClass = args.serviceClass
      // stagger fields so the user sees them fill one by one
      const entries = Object.entries(payload)
      for (const [k, v] of entries) {
        send({ t: 'action', action: { type: 'set_search', payload: { [k]: v } } })
        await sleep(280)
      }
      return 'Форма заполнена: ' + JSON.stringify(payload)
    }

    case 'set_filter': {
      send({ t: 'action', action: { type: 'navigate', page: 'results' } })
      const payload: any = {}
      if (typeof args.directOnly === 'boolean') payload.directOnly = args.directOnly
      if (typeof args.maxPrice === 'number') payload.maxPrice = args.maxPrice
      if (args.sort) payload.sort = args.sort
      send({ t: 'action', action: { type: 'set_filter', payload } })
      return 'Фильтры применены: ' + JSON.stringify(payload)
    }

    case 'search_offers':
      return searchOffers(args, send)

    case 'web_places':
      return webPlaces(args, send, openai)

    case 'read_playbook':
      try {
        const text = await getPlaybook(args.transport)
        return text.slice(0, 4000)
      } catch (e) {
        return 'Плейбук недоступен: ' + (e as Error).message
      }

    default:
      return 'unknown tool'
  }
}

async function searchOffers(args: any, send: Send): Promise<string> {
  const isMulti = args.transport === 'multi'
  const transport: Transport = isMulti ? 'avia' : args.transport
  const word = isMulti ? 'варианты' : TRANSPORT_WORD[transport] || 'варианты'
  const label = `${args.origin} — ${args.destination}`

  send({ t: 'status', text: `Ищу ${word} через MCP Туту…` })
  // синхронизируем верхнюю вкладку транспорта с тем, что реально ищем
  if (!isMulti) {
    send({ t: 'action', action: { type: 'set_transport', transport } })
  }
  send({ t: 'action', action: { type: 'navigate', page: 'results' } })
  send({ t: 'searching', value: true })

  let offers: Offer[] = []
  try {
    const res = await mcpSearch(args)
    offers = res.offers
  } catch (e) {
    send({ t: 'searching', value: false })
    send({ t: 'error', text: `MCP Туту: ${(e as Error).message}` })
    return `Ошибка поиска через MCP: ${(e as Error).message}`
  }

  send({ t: 'offers', offers, label })
  send({ t: 'searching', value: false })
  send({ t: 'status', text: `Готово: ${offers.length} вариантов из MCP Туту` })

  if (offers.length === 0) return 'MCP Туту вернул 0 вариантов по этому запросу.'

  // compact summary for the model (top 5)
  const top = offers.slice(0, 5).map((o) => ({
    carrier: o.carrier,
    price: o.price,
    departAt: o.departAt,
    arriveAt: o.arriveAt,
    durationMin: o.durationMin,
    transfers: o.transfers,
    layovers: o.layovers,
  }))
  const withStop = offers.find((o) => o.layovers && o.layovers.length)
  const stopHint = withStop
    ? ` Есть варианты с пересадкой (напр. ${withStop.layovers![0].minutes} мин в ${withStop.layovers![0].city}) — при пересадке от ~90 мин ПРОАКТИВНО предложи через web_places, чем занять это время.`
    : ''
  return `Найдено ${offers.length} вариантов (данные MCP Туту). Топ по цене: ${JSON.stringify(
    top,
  )}. Дешевле всего: ${offers.reduce((a, b) => (a.price <= b.price ? a : b)).price} ₽.${stopHint}`
}

async function webPlaces(args: any, send: Send, openai: OpenAI): Promise<string> {
  send({ t: 'status', text: 'Ищу информацию в интернете…' })
  send({ t: 'web_search', value: true }) // включаем красивую загрузку (интернет — медленно)
  const id = 'place_' + Date.now()
  try {
    // провайдер веб-поиска: openai (Responses) или self-hosted searxng — см. providers/websearch.ts
    const place = await webSearch(args.query, args.title, openai)
    send({ t: 'place', id, place })
    return `Показал карточку места «${place.title}». Кратко: ${place.summary} ${place.bullets.join('; ')}`
  } catch (e) {
    // fallback: веб-поиск недоступен -> пусть модель ответит из своих знаний
    return `Веб-поиск недоступен (${(e as Error).message}). Ответь из своих знаний, кратко и честно предупредив, что данные могут быть неактуальны.`
  } finally {
    send({ t: 'web_search', value: false }) // гасим красивую загрузку
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
