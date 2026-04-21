import { readFileSync, existsSync } from 'fs'
import type { UsagePayload, UsagePerTurnPayload, MessagePayload } from '@argos/shared'

interface ContentBlock {
  type?: string
  text?: string
  name?: string
  input?: Record<string, unknown>
  id?: string               // tool_use.id
  tool_use_id?: string      // tool_result.tool_use_id
  content?: string | Array<{ type?: string; text?: string }>  // tool_result content
}

interface TranscriptLine {
  type?: string
  message?: {
    usage?: {
      input_tokens?: number
      output_tokens?: number
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
    model?: string
    content?: string | ContentBlock[]
  }
  content?: string
  timestamp?: string
}

/**
 * Read transcript.jsonl file and parse each line
 */
export async function readTranscriptLines(path: string): Promise<TranscriptLine[]> {
  if (!existsSync(path)) {
    return []
  }

  try {
    const content = readFileSync(path, 'utf8')
    const lines = content.split('\n').filter((line) => line.trim())

    return lines.map((line) => {
      try {
        return JSON.parse(line) as TranscriptLine
      } catch {
        return {}
      }
    })
  } catch {
    return []
  }
}

/**
 * Extract usage information from transcript (Stop/SubagentStop events)
 * Sums up all usage from type==="assistant" entries
 */
export async function extractUsageFromTranscript(
  transcriptPath: string
): Promise<UsagePayload | null> {
  const lines = await readTranscriptLines(transcriptPath)

  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalCacheCreationTokens = 0
  let totalCacheReadTokens = 0
  let model: string | undefined

  for (const line of lines) {
    if (line.type === 'assistant' && line.message?.usage) {
      const usage = line.message.usage
      totalInputTokens += usage.input_tokens || 0
      totalOutputTokens += usage.output_tokens || 0
      totalCacheCreationTokens += usage.cache_creation_input_tokens || 0
      totalCacheReadTokens += usage.cache_read_input_tokens || 0

      // Get model from first assistant message
      if (!model && line.message.model) {
        model = line.message.model
      }
    }
  }

  if (
    totalInputTokens === 0 &&
    totalOutputTokens === 0 &&
    totalCacheCreationTokens === 0 &&
    totalCacheReadTokens === 0
  ) {
    return null
  }

  return {
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    cacheCreationTokens: totalCacheCreationTokens,
    cacheReadTokens: totalCacheReadTokens,
    model,
  }
}

/**
 * Extract per-assistant-turn usage from transcript.
 * Returns one UsagePerTurnPayload per "assistant" entry in transcript.jsonl.
 * Each entry's timestamp comes from the transcript line's timestamp field.
 */
export async function extractUsagePerTurn(
  transcriptPath: string
): Promise<UsagePerTurnPayload[]> {
  const lines = await readTranscriptLines(transcriptPath)
  const results: UsagePerTurnPayload[] = []

  for (const line of lines) {
    if (line.type === 'assistant' && line.message?.usage) {
      const usage = line.message.usage
      results.push({
        inputTokens: usage.input_tokens || 0,
        outputTokens: usage.output_tokens || 0,
        cacheCreationTokens: usage.cache_creation_input_tokens || 0,
        cacheReadTokens: usage.cache_read_input_tokens || 0,
        model: line.message.model,
        timestamp: line.timestamp || new Date().toISOString(),
      })
    }
  }

  return results
}

/**
 * Detect slash command from SessionStart transcript
 * Looks for queue-operation entry with content starting with '/'
 * Returns the skill name without the '/' prefix
 */
export async function detectSlashCommand(transcriptPath: string): Promise<string | null> {
  const lines = await readTranscriptLines(transcriptPath)

  const queueOp = lines.find(
    (l) =>
      l.type === 'queue-operation' &&
      typeof l.content === 'string' &&
      l.content.startsWith('/')
  )

  if (!queueOp || typeof queueOp.content !== 'string') {
    return null
  }

  // Remove leading '/' and return skill name
  return queueOp.content.slice(1)
}

/**
 * Flatten tool_result.content — either string or array of {type:'text', text}.
 */
function toolResultText(raw: ContentBlock['content']): string {
  if (typeof raw === 'string') return raw
  if (!Array.isArray(raw)) return ''
  return raw
    .map((b) => (b.type === 'text' && b.text ? b.text : ''))
    .filter(Boolean)
    .join('\n')
}

/**
 * Extract HUMAN/ASSISTANT/TOOL messages from transcript.
 *
 * - type="user"/"human" with string content  → HUMAN
 * - type="assistant" text blocks             → ASSISTANT (tool_use blocks excluded from content)
 * - type="assistant" tool_use blocks         → TOOL (one per block; timestamp = assistant msg timestamp = tool start)
 * - type="user" array content tool_result    → fills in matching TOOL's content + durationMs
 *
 * sequence is assigned in transcript order and is best-effort — the API may re-sequence TOOL rows
 * that were inserted in realtime via PreToolUse/PostToolUse hooks.
 */
export async function extractMessages(transcriptPath: string): Promise<MessagePayload[]> {
  const lines = await readTranscriptLines(transcriptPath)
  const messages: MessagePayload[] = []
  // TOOL lookup by tool_use_id — so tool_result can fill in content/duration
  const toolById = new Map<string, MessagePayload>()
  let sequence = 0

  for (const line of lines) {
    const isUser = line.type === 'user' || line.type === 'human'
    const isAssistant = line.type === 'assistant'
    if (!isUser && !isAssistant) continue

    const content = line.message?.content
    const timestamp = line.timestamp || new Date().toISOString()

    if (isUser) {
      // Plain string → HUMAN message
      if (typeof content === 'string' && content.length > 0) {
        messages.push({
          role: 'HUMAN',
          content: content.slice(0, 50000),
          sequence: sequence++,
          timestamp,
        })
        continue
      }
      // Array → look for tool_result blocks and backfill matching TOOL messages
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type !== 'tool_result' || !block.tool_use_id) continue
          const tool = toolById.get(block.tool_use_id)
          if (!tool) continue
          tool.content = toolResultText(block.content).slice(0, 50000)
          const startMs = Date.parse(tool.timestamp)
          const endMs = Date.parse(timestamp)
          if (!Number.isNaN(startMs) && !Number.isNaN(endMs)) {
            tool.durationMs = Math.max(0, endMs - startMs)
          }
        }
      }
      continue
    }

    // Assistant
    if (!Array.isArray(content)) continue

    const textParts: string[] = []
    const toolRows: MessagePayload[] = []

    for (const block of content) {
      if (block.type === 'text' && block.text) {
        textParts.push(block.text)
      } else if (block.type === 'tool_use' && block.name) {
        toolRows.push({
          role: 'TOOL',
          content: '',
          sequence: 0, // assigned below
          timestamp,
          toolName: block.name,
          toolInput: block.input || {},
          toolUseId: block.id,
        })
      }
    }

    if (textParts.length > 0) {
      messages.push({
        role: 'ASSISTANT',
        content: textParts.join('\n').slice(0, 50000),
        sequence: sequence++,
        timestamp,
      })
    }

    for (const tool of toolRows) {
      tool.sequence = sequence++
      messages.push(tool)
      if (tool.toolUseId) toolById.set(tool.toolUseId, tool)
    }
  }

  return messages
}
