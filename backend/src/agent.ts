import OpenAI from 'openai'
import { toolSchemas, runTool, type Send } from './tools.js'
import { getToolNames } from './mcp.js'
import { CHAT_MODEL } from './providers/llm.js'

const MODEL = CHAT_MODEL

export function systemPrompt(): string {
  const today = new Date().toISOString().slice(0, 10)
  return `Ты — ИИ-ассистент путешествий на сайте tutu.ru. Ты управляешь интерфейсом сайта и ищешь РЕАЛЬНЫЕ билеты через инструменты MCP Туту.

Сегодня: ${today}. Все относительные даты («завтра», «в следующие выходные», «10-го») переводи в конкретную дату YYYY-MM-DD от сегодняшней.

КАК ТЫ РАБОТАЕШЬ:
1. Сначала визуально заполни форму: вызови set_transport (если нужно), затем fill_search с городами и датами — пользователь должен видеть, как поля заполняются.
2. Затем вызови search_offers, чтобы получить и показать реальные варианты.

ВЫБОР ТРАНСПОРТА (СТРОГО):
- Пользователь назвал конкретный транспорт → ищи ТОЛЬКО его и ничего больше:
  «на самолёте / авиа / перелёт / долететь» → transport="avia";
  «на поезде / жд / поездом» → transport="zhd";
  «на автобусе / автобусом» → transport="bus";
  «на электричке» → transport="suburban".
- transport="multi" (все виды сразу) ставь ТОЛЬКО если пользователь явно сказал «как добраться / любым транспортом / всё равно чем / максимально дёшево неважно чем». Если он назвал вид транспорта — multi НЕЛЬЗЯ.
- Тип в search_offers ВСЕГДА совпадает с тем, что назвал пользователь. Не подмешивай другие виды транспорта.
3. При просьбе «только прямые», «подешевле», «побыстрее» — вызывай set_filter (directOnly / sort / maxPrice).
4. Про места, достопримечательности, кафе, пересадки — используй web_places.
5. ПЛАНИРОВАНИЕ ПЕРЕСАДКИ: если у варианта есть пересадка от ~90 минут, сам предложи, чем занять время в городе пересадки. Учитывай реальную длительность стыковки и запас на выход/возврат — вызови web_places с запросом вроде «что успеть за N часов рядом с вокзалом/аэропортом города X».

ПРАВИЛА:
- Никогда не выдумывай цены, рейсы, время. Все числа — только из ответа search_offers.
- Отвечай кратко, по-русски, дружелюбно. Не пересказывай весь список — назови 1-2 лучших варианта и цену.
- Если пользователь не указал дату для поиска — используй ближайшую разумную (например, через неделю) и скажи об этом, либо переспроси одним коротким вопросом.
- Один уточняющий вопрос за раз, только если совсем не хватает данных (город отправления/назначения).

Доступные инструменты MCP: ${getToolNames().join(', ') || '(подключаюсь...)'}.`
}

export interface Turn {
  role: 'user' | 'assistant' | 'tool' | 'system'
  content: any
  tool_calls?: any
  tool_call_id?: string
}

export async function runAgent(
  openai: OpenAI,
  history: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  send: Send,
): Promise<string> {
  // ensure system prompt is first
  if (!history.length || history[0].role !== 'system') {
    history.unshift({ role: 'system', content: systemPrompt() })
  }

  const msgId = 'a_' + Date.now()
  send({ t: 'assistant_start', id: msgId })
  let finalText = ''

  const MAX_STEPS = 6
  for (let step = 0; step < MAX_STEPS; step++) {
    const stream = await openai.chat.completions.create({
      model: MODEL,
      messages: history,
      tools: toolSchemas,
      stream: true,
    })

    let content = ''
    const toolCalls: Record<number, { id: string; name: string; args: string }> = {}
    let finish: string | null = null

    for await (const chunk of stream) {
      const choice = chunk.choices[0]
      if (!choice) continue
      const delta = choice.delta

      if (delta?.content) {
        content += delta.content
        send({ t: 'token', id: msgId, delta: delta.content })
      }
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const i = tc.index ?? 0
          if (!toolCalls[i]) toolCalls[i] = { id: '', name: '', args: '' }
          if (tc.id) toolCalls[i].id = tc.id
          if (tc.function?.name) toolCalls[i].name += tc.function.name
          if (tc.function?.arguments) toolCalls[i].args += tc.function.arguments
        }
      }
      if (choice.finish_reason) finish = choice.finish_reason
    }

    const calls = Object.values(toolCalls)

    if (finish === 'tool_calls' && calls.length) {
      // record the assistant turn with its tool calls
      history.push({
        role: 'assistant',
        content: content || null,
        tool_calls: calls.map((c) => ({
          id: c.id,
          type: 'function',
          function: { name: c.name, arguments: c.args || '{}' },
        })),
      } as any)

      // execute every tool call, append results
      for (const c of calls) {
        let parsed: any = {}
        try {
          parsed = JSON.parse(c.args || '{}')
        } catch {}
        let result = ''
        try {
          result = await runTool(c.name, parsed, send, openai)
        } catch (e) {
          result = 'Ошибка инструмента: ' + (e as Error).message
        }
        history.push({ role: 'tool', tool_call_id: c.id, content: result } as any)
      }
      continue // let the model continue with tool results
    }

    // plain text answer -> record and finish
    if (content) {
      history.push({ role: 'assistant', content })
      finalText = content
    }
    break
  }

  send({ t: 'assistant_done', id: msgId })
  return finalText
}
