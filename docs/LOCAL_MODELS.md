# Локальные модели (self-hosted) для ассистента Туту

Как запустить ассистента **полностью на своих моделях**, без облака: языковая
модель (для чата и вызова инструментов MCP), распознавание речи (STT) и синтез
речи (TTS). Живой сайт при этом не трогается — прод остаётся на OpenAI, а
локальный режим включается флагами в `backend/.env`.

> Ключевая идея: и LLM, и STT, и TTS подключаются по **OpenAI-совместимому API**.
> Поэтому в коде ничего переписывать не нужно — достаточно указать адреса
> локальных серверов в переменных окружения.

---

## 1. Что на что заменяется

| Функция | Облако (прод) | Локальная замена | Как подключается |
|---|---|---|---|
| Чат + вызов инструментов MCP | OpenAI `gpt-4o` | Ollama / vLLM / LM Studio | `LLM_BASE_URL`, `LLM_MODEL` |
| Голос (речь→речь) | OpenAI Realtime | Конвейер **STT → LLM → TTS** | `VOICE_PROVIDER=local` |
| Распознавание речи (STT) | (внутри Realtime) | Whisper (faster-whisper / speaches) | `STT_BASE_URL`, `STT_MODEL` |
| Синтез речи (TTS) | (внутри Realtime) | openedai-speech / Kokoro-FastAPI | `TTS_BASE_URL`, `TTS_VOICE` |
| Веб-поиск (места, пересадки) | OpenAI web_search | SearXNG (self-hosted) | `WEB_SEARCH_PROVIDER=searxng` |
| Поиск билетов | **MCP Туту** (внешний) | — без изменений — | `TUTU_MCP_URL` |

MCP Туту — это внешний сервис самого Туту, он **не меняется**: и в облаке, и
локально билеты/отели ищутся через него.

---

## 2. Архитектура локального голоса

Готовой локальной модели «речь→речь» нет, поэтому голос собирается конвейером
(реализован в `backend/src/voice/localVoice.ts`):

```
браузер (микрофон, PCM16 24кГц)
        │  WebSocket /ws
        ▼
[VAD на сервере]  → определяет конец реплики по тишине
        ▼
STT  (Whisper)    → текст
        ▼
LLM + MCP (agent) → заполняет форму, ищет билеты, формирует ответ
        ▼
TTS               → аудио
        ▼
браузер (проигрывание)  ← тот же WebSocket
```

Протокол WebSocket идентичен облачному Realtime, поэтому **фронтенд не меняется**.

Ограничение конвейера: «перебивание» (barge-in) во время ответа проще, чем в
Realtime — пока ассистент говорит, новая реплика будет обработана после
завершения текущей.

---

## 3. Рекомендуемые модели

### LLM (обязательно с поддержкой function/tool calling)

| Модель | Размер | Мин. GPU (VRAM) | Комментарий |
|---|---|---|---|
| **Qwen2.5-Instruct 7B** | 7B | 8–12 ГБ | быстрый, хорошо вызывает инструменты — старт для демо |
| **Qwen2.5-Instruct 14B** | 14B | 16–24 ГБ | лучший баланс качества/скорости (рекомендую) |
| **Qwen2.5-Instruct 32B** | 32B | 40+ ГБ | максимум качества |
| Llama-3.1/3.3-Instruct 8B/70B | 8–70B | 12–80 ГБ | альтернатива |
| Mistral-Small / Hermes-3 | ~22B | 24–48 ГБ | альтернатива |

> ⚠️ Модели без tool calling (базовые gemma, phi без function-calling тюна) не
> подойдут — ассистент не сможет вызвать поиск MCP.

CPU-инференс возможен (Ollama на CPU), но медленно — для демо нужен GPU.

### STT (распознавание речи)

| Модель | Комментарий |
|---|---|
| **faster-whisper small** | быстрый, приемлемое качество для демо |
| **faster-whisper medium/large-v3** | лучше качество, медленнее / больше VRAM |

Сервер: **speaches** (`ghcr.io/speaches-ai/speaches`) — отдаёт Whisper по
OpenAI-совместимому `/v1/audio/transcriptions`.

### TTS (синтез речи)

| Сервер | Комментарий |
|---|---|
| **openedai-speech** | OpenAI-совместимый `/v1/audio/speech`, принимает голоса `alloy/echo/…`, есть быстрый Piper и качественный XTTS |
| **Kokoro-FastAPI** | лёгкий, приятный голос, тоже OpenAI-совместимый |

Для русского языка проверьте голос: у Piper есть русские голоса, XTTS/Kokoro
поддерживают мультиязычность.

---

## 4. Требования к железу (ориентир)

| Сценарий | GPU | RAM | Диск |
|---|---|---|---|
| Демо (Qwen2.5-7B + whisper-small + Piper) | 1× 12 ГБ (напр. RTX 3060/4070) | 16 ГБ | 30 ГБ |
| Комфорт (Qwen2.5-14B + whisper-medium + XTTS) | 1× 24 ГБ (RTX 3090/4090) | 32 ГБ | 60 ГБ |
| Только текст (без голоса) | 1× 8–12 ГБ | 16 ГБ | 20 ГБ |

---

## 5. Быстрый старт

### Шаг 1. Поднять модель-серверы

```bash
docker compose -f infra/local-models/docker-compose.yml up -d
```

Это запустит: `ollama` (LLM, :11434), `stt` (:8001), `tts` (:8002),
`searxng` (:8080).

Скачать LLM в Ollama:
```bash
docker exec -it tutu-local-models-ollama-1 ollama pull qwen2.5:14b-instruct
```

STT-модель speaches подтянет сам при первом запросе (или заранее — см. его доки).
Для TTS (openedai-speech) голоса ставятся по его инструкции; дефолтный Piper
работает сразу.

### Шаг 2. Настроить бэкенд

```bash
cp backend/.env.local-models.example backend/.env
# при необходимости поправьте адреса/имена моделей
```

Если модель-серверы и бэкенд в **одной** docker-сети — используйте имена сервисов
(`http://ollama:11434/v1` и т.д.). Если бэкенд снаружи — адрес хоста/сервера
(`http://<IP>:11434/v1`).

### Шаг 3. Запустить приложение и проверить

```bash
docker compose up -d --build           # тот же стек, что и в проде (Caddy + backend)
curl -s http://localhost:8787/api/health
# ожидаем: {"ok":true,"llm":true,"llmMode":"local","voiceProvider":"local", ...}
```

---

## 6. Переменные окружения (полный список)

| Переменная | Значение по умолчанию | Назначение |
|---|---|---|
| `LLM_BASE_URL` | — (пусто = OpenAI) | endpoint локального LLM (OpenAI-совместимый) |
| `LLM_MODEL` | `OPENAI_MODEL` / `gpt-4o` | имя модели на сервере |
| `LLM_API_KEY` | `OPENAI_API_KEY` / `local` | ключ (локальные серверы не проверяют) |
| `VOICE_PROVIDER` | `openai_realtime` | `local` = конвейер STT→LLM→TTS |
| `STT_BASE_URL` | — | endpoint STT |
| `STT_MODEL` | `Systran/faster-whisper-small` | модель Whisper |
| `TTS_BASE_URL` | — | endpoint TTS |
| `TTS_MODEL` | `tts-1` | модель TTS |
| `TTS_VOICE` | `alloy` | голос |
| `TTS_SAMPLE_RATE` | `24000` | частота PCM от TTS (ресемпл при отличии) |
| `LOCAL_VAD_THRESHOLD` | `0.012` | порог громкости «речь/тишина» |
| `LOCAL_END_SILENCE_MS` | `700` | пауза, завершающая реплику |
| `LOCAL_MIN_SPEECH_MS` | `300` | минимальная длина реплики |
| `WEB_SEARCH_PROVIDER` | `openai` | `searxng` / `none` |
| `SEARXNG_URL` | — | адрес SearXNG |
| `TUTU_MCP_URL` | `https://mcp.tutu.ru/mcp` | MCP Туту (не меняется) |

---

## 7. Матрица режимов

| Режим | LLM | Голос | Веб-поиск |
|---|---|---|---|
| **Прод (сейчас)** | OpenAI | OpenAI Realtime | OpenAI |
| Гибрид | локальный LLM | OpenAI Realtime | SearXNG |
| **Полностью локальный** | локальный LLM | STT→LLM→TTS | SearXNG |

Всё переключается только через `backend/.env` — код и фронтенд не меняются.

---

## 8. Что проверить при запуске

1. `GET /api/health` → `llmMode:"local"`, `voiceProvider:"local"`.
2. Текстовый чат: «Билеты Москва — Сочи завтра» → форма заполняется, MCP ищет.
3. Голос: реплика распознаётся (`user_transcript`), ассистент отвечает голосом.
4. Логи бэкенда: `[server] http+ws … (LLM: local, voice: local)`.

Если голос молчит — проверьте `STT_BASE_URL`/`TTS_BASE_URL` и что модели
скачаны; если ассистент не вызывает поиск — модель без tool calling, смените LLM.
