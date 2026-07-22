import OpenAI from 'openai'

/**
 * Единая точка создания клиента языковой модели (чат/tool-calling).
 *
 * По умолчанию — облачный OpenAI (как в проде). Чтобы переключиться на
 * ЛОКАЛЬНУЮ модель, достаточно задать OpenAI-совместимый endpoint в env:
 *
 *   LLM_BASE_URL=http://ollama:11434/v1      # Ollama
 *   LLM_BASE_URL=http://vllm:8000/v1         # vLLM
 *   LLM_BASE_URL=http://localhost:1234/v1    # LM Studio
 *   LLM_MODEL=qwen2.5:14b-instruct           # имя модели на сервере
 *   LLM_API_KEY=local                        # локальные серверы ключ не проверяют
 *
 * Никаких других изменений в коде не нужно — весь агент работает через
 * стандартный OpenAI SDK, а он умеет ходить на любой совместимый сервер.
 *
 * ВАЖНО: модель ДОЛЖНА поддерживать function/tool calling (иначе ассистент
 * не сможет вызывать поиск MCP). Проверенные локальные варианты:
 *   Qwen2.5-Instruct (7B/14B/32B), Llama-3.1/3.3-Instruct, Mistral-Small,
 *   Hermes-3, Firefunction. См. docs/LOCAL_MODELS.md.
 */

/** Модель для чата/оркестрации. LLM_MODEL → OPENAI_MODEL → gpt-4o. */
export const CHAT_MODEL = process.env.LLM_MODEL || process.env.OPENAI_MODEL || 'gpt-4o'

/** Работает ли LLM вообще (есть локальный endpoint ИЛИ ключ OpenAI). */
export function isLLMConfigured(): boolean {
  return !!(process.env.LLM_BASE_URL?.trim() || process.env.OPENAI_API_KEY?.trim())
}

/** true, если сконфигурирован локальный (self-hosted) LLM. */
export function isLocalLLM(): boolean {
  return !!process.env.LLM_BASE_URL?.trim()
}

/** Создать клиент LLM (облачный OpenAI или локальный OpenAI-совместимый). */
export function createLLM(): OpenAI {
  const baseURL = process.env.LLM_BASE_URL?.trim()
  const apiKey =
    process.env.LLM_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim() || 'local'
  return new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) })
}
