import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const URL_MCP = process.env.TUTU_MCP_URL || 'https://mcp.tutu.ru/mcp'

let client: Client | null = null
let connecting: Promise<Client | null> | null = null
let toolNames: string[] = []

export function getToolNames() {
  return toolNames
}

async function doConnect(): Promise<Client | null> {
  try {
    const c = new Client({ name: 'tutu-assistant', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL(URL_MCP))
    await c.connect(transport)
    const list = await c.listTools()
    toolNames = list.tools.map((t) => t.name)
    console.log('[mcp] connected. tools:', toolNames.join(', ') || '(none)')
    client = c
    return c
  } catch (e) {
    console.warn('[mcp] connect failed:', (e as Error).message)
    client = null
    return null
  }
}

export async function mcpConnect(): Promise<Client | null> {
  if (client) return client
  if (!connecting) connecting = doConnect().finally(() => (connecting = null))
  return connecting
}

/** Find the first available tool whose name matches any of the keywords. */
export function findTool(keywords: string[]): string | null {
  for (const kw of keywords) {
    const hit = toolNames.find((n) => n.toLowerCase().includes(kw.toLowerCase()))
    if (hit) return hit
  }
  return null
}

export async function mcpCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  const c = await mcpConnect()
  if (!c) throw new Error('MCP Туту недоступен')
  const res = await c.callTool({ name, arguments: args })
  // MCP returns content blocks; pull structured or text payloads out.
  const anyRes = res as {
    structuredContent?: unknown
    content?: Array<{ type: string; text?: string }>
    isError?: boolean
  }
  if (anyRes.structuredContent) return anyRes.structuredContent
  const texts = (anyRes.content || [])
    .filter((b) => b.type === 'text' && b.text)
    .map((b) => b.text as string)
  const joined = texts.join('\n')
  try {
    return JSON.parse(joined)
  } catch {
    return joined
  }
}
