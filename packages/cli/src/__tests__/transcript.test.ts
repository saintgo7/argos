import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  extractUsageFromTranscript,
  detectSlashCommand,
  extractMessages,
} from '../lib/transcript.js'

function writejsonl(dir: string, lines: object[]): string {
  const path = join(dir, 'transcript.jsonl')
  writeFileSync(path, lines.map((l) => JSON.stringify(l)).join('\n'), 'utf8')
  return path
}

describe('extractUsageFromTranscript', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'argos-test-'))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('returns null for a non-existent file', async () => {
    const result = await extractUsageFromTranscript(join(tempDir, 'no-file.jsonl'))
    expect(result).toBeNull()
  })

  it('sums tokens across multiple assistant messages', async () => {
    const path = writejsonl(tempDir, [
      {
        type: 'assistant',
        message: {
          model: 'claude-sonnet',
          usage: { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 10, cache_read_input_tokens: 20 },
        },
      },
      { type: 'human', message: { content: [{ type: 'text', text: 'hi' }] } },
      {
        type: 'assistant',
        message: {
          model: 'claude-sonnet',
          usage: { input_tokens: 200, output_tokens: 80, cache_creation_input_tokens: 0, cache_read_input_tokens: 5 },
        },
      },
    ])

    const result = await extractUsageFromTranscript(path)

    expect(result).not.toBeNull()
    expect(result!.inputTokens).toBe(300)
    expect(result!.outputTokens).toBe(130)
    expect(result!.cacheCreationTokens).toBe(10)
    expect(result!.cacheReadTokens).toBe(25)
  })

  it('picks model from the first assistant message', async () => {
    const path = writejsonl(tempDir, [
      { type: 'assistant', message: { model: 'claude-opus', usage: { input_tokens: 10, output_tokens: 5 } } },
      { type: 'assistant', message: { model: 'claude-sonnet', usage: { input_tokens: 10, output_tokens: 5 } } },
    ])

    const result = await extractUsageFromTranscript(path)
    expect(result!.model).toBe('claude-opus')
  })

  it('returns null when all token counts are zero', async () => {
    const path = writejsonl(tempDir, [
      { type: 'assistant', message: { usage: { input_tokens: 0, output_tokens: 0 } } },
    ])

    const result = await extractUsageFromTranscript(path)
    expect(result).toBeNull()
  })

  it('ignores non-assistant lines for token counting', async () => {
    const path = writejsonl(tempDir, [
      { type: 'human', message: { usage: { input_tokens: 9999 } } },
      { type: 'system', message: { usage: { input_tokens: 8888 } } },
      { type: 'assistant', message: { usage: { input_tokens: 100, output_tokens: 50 } } },
    ])

    const result = await extractUsageFromTranscript(path)
    expect(result!.inputTokens).toBe(100)
    expect(result!.outputTokens).toBe(50)
  })

  it('handles malformed lines without throwing', async () => {
    const path = join(tempDir, 'transcript.jsonl')
    writeFileSync(
      path,
      [
        '{ not valid json',
        JSON.stringify({ type: 'assistant', message: { usage: { input_tokens: 50, output_tokens: 20 } } }),
      ].join('\n'),
      'utf8'
    )

    const result = await extractUsageFromTranscript(path)
    expect(result!.inputTokens).toBe(50)
  })
})

describe('detectSlashCommand', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'argos-test-'))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('returns null when no slash command is present', async () => {
    const path = writejsonl(tempDir, [{ type: 'human', content: 'regular message' }])
    expect(await detectSlashCommand(path)).toBeNull()
  })

  it('returns null for non-existent file', async () => {
    expect(await detectSlashCommand(join(tempDir, 'nope.jsonl'))).toBeNull()
  })

  it('returns skill name without the leading slash', async () => {
    const path = writejsonl(tempDir, [{ type: 'queue-operation', content: '/commit' }])
    expect(await detectSlashCommand(path)).toBe('commit')
  })

  it('detects slash command within a mixed transcript', async () => {
    const path = writejsonl(tempDir, [
      { type: 'human', content: 'do something' },
      { type: 'queue-operation', content: '/review-pr' },
      { type: 'assistant', message: {} },
    ])
    expect(await detectSlashCommand(path)).toBe('review-pr')
  })

  it('ignores queue-operation entries that do not start with slash', async () => {
    const path = writejsonl(tempDir, [
      { type: 'queue-operation', content: 'not a slash command' },
    ])
    expect(await detectSlashCommand(path)).toBeNull()
  })

  it('returns only the first slash command when multiple exist', async () => {
    const path = writejsonl(tempDir, [
      { type: 'queue-operation', content: '/first' },
      { type: 'queue-operation', content: '/second' },
    ])
    expect(await detectSlashCommand(path)).toBe('first')
  })
})

describe('extractMessages', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'argos-test-'))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('returns empty array for non-existent file', async () => {
    const result = await extractMessages(join(tempDir, 'nope.jsonl'))
    expect(result).toEqual([])
  })

  it('extracts user and assistant messages with correct roles (type="user")', async () => {
    const path = writejsonl(tempDir, [
      {
        type: 'user',
        message: { content: 'Hello' },
        timestamp: '2024-01-01T00:00:00Z',
      },
      {
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'World' }] },
        timestamp: '2024-01-01T00:00:01Z',
      },
    ])

    const result = await extractMessages(path)

    expect(result).toHaveLength(2)
    expect(result[0].role).toBe('HUMAN')
    expect(result[0].content).toBe('Hello')
    expect(result[0].sequence).toBe(0)
    expect(result[1].role).toBe('ASSISTANT')
    expect(result[1].content).toBe('World')
    expect(result[1].sequence).toBe(1)
  })

  it('supports legacy type="human" with array content', async () => {
    const path = writejsonl(tempDir, [
      {
        type: 'human',
        message: { content: 'Legacy hello' },
        timestamp: '2024-01-01T00:00:00Z',
      },
    ])

    const result = await extractMessages(path)
    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('HUMAN')
    expect(result[0].content).toBe('Legacy hello')
  })

  it('user array-content without matching tool_use yields no messages', async () => {
    const path = writejsonl(tempDir, [
      {
        type: 'user',
        message: { content: [{ type: 'tool_result', tool_use_id: 'x', content: 'output' }] },
      },
    ])

    const result = await extractMessages(path)
    expect(result).toHaveLength(0)
  })

  it('emits separate TOOL row for each tool_use block', async () => {
    const path = writejsonl(tempDir, [
      {
        type: 'assistant',
        timestamp: '2024-01-01T00:00:00.000Z',
        message: {
          content: [
            { type: 'text', text: 'Let me read the file.' },
            { type: 'tool_use', id: 'tu_1', name: 'Read', input: { file_path: '/tmp/test.ts' } },
          ],
        },
      },
    ])

    const result = await extractMessages(path)
    expect(result).toHaveLength(2)
    expect(result[0].role).toBe('ASSISTANT')
    expect(result[0].content).toBe('Let me read the file.')
    expect(result[1].role).toBe('TOOL')
    expect(result[1].toolName).toBe('Read')
    expect(result[1].toolInput).toEqual({ file_path: '/tmp/test.ts' })
    expect(result[1].toolUseId).toBe('tu_1')
  })

  it('tool_use-only assistant entry produces just a TOOL row (no ASSISTANT row)', async () => {
    const path = writejsonl(tempDir, [
      {
        type: 'assistant',
        timestamp: '2024-01-01T00:00:00.000Z',
        message: {
          content: [
            { type: 'tool_use', id: 'tu_1', name: 'Bash', input: { command: 'ls -la' } },
          ],
        },
      },
    ])

    const result = await extractMessages(path)
    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('TOOL')
    expect(result[0].toolName).toBe('Bash')
    expect(result[0].toolInput).toEqual({ command: 'ls -la' })
  })

  it('fills TOOL content + durationMs from matching tool_result', async () => {
    const path = writejsonl(tempDir, [
      {
        type: 'assistant',
        timestamp: '2024-01-01T00:00:00.000Z',
        message: {
          content: [{ type: 'tool_use', id: 'tu_1', name: 'Bash', input: { command: 'ls' } }],
        },
      },
      {
        type: 'user',
        timestamp: '2024-01-01T00:00:02.500Z',
        message: {
          content: [{ type: 'tool_result', tool_use_id: 'tu_1', content: 'file-a\nfile-b' }],
        },
      },
    ])

    const result = await extractMessages(path)
    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('TOOL')
    expect(result[0].content).toBe('file-a\nfile-b')
    expect(result[0].durationMs).toBe(2500)
  })

  it('tool_result with array content is flattened to joined text', async () => {
    const path = writejsonl(tempDir, [
      {
        type: 'assistant',
        timestamp: '2024-01-01T00:00:00.000Z',
        message: {
          content: [{ type: 'tool_use', id: 'tu_1', name: 'Read', input: { file_path: '/a' } }],
        },
      },
      {
        type: 'user',
        timestamp: '2024-01-01T00:00:01.000Z',
        message: {
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'tu_1',
              content: [
                { type: 'text', text: 'line1' },
                { type: 'text', text: 'line2' },
              ],
            },
          ],
        },
      },
    ])

    const result = await extractMessages(path)
    expect(result[0].content).toBe('line1\nline2')
  })

  it('skips assistant entries with no text or tool_use blocks', async () => {
    const path = writejsonl(tempDir, [
      { type: 'assistant', message: { content: [{ type: 'thinking', thinking: 'hmm' }] } },
    ])

    const result = await extractMessages(path)
    expect(result).toHaveLength(0)
  })

  it('truncates user string content to 50,000 characters', async () => {
    const path = writejsonl(tempDir, [
      {
        type: 'user',
        message: { content: 'a'.repeat(60000) },
      },
    ])

    const result = await extractMessages(path)
    expect(result[0].content.length).toBe(50000)
  })

  it('assigns sequential sequence numbers including TOOL rows', async () => {
    const path = writejsonl(tempDir, [
      { type: 'user', message: { content: 'msg1' }, timestamp: '2024-01-01T00:00:00Z' },
      {
        type: 'assistant',
        timestamp: '2024-01-01T00:00:01Z',
        message: {
          content: [
            { type: 'text', text: 'msg2' },
            { type: 'tool_use', id: 'tu_1', name: 'Bash', input: {} },
          ],
        },
      },
      { type: 'user', message: { content: 'msg3' }, timestamp: '2024-01-01T00:00:02Z' },
    ])

    const result = await extractMessages(path)
    expect(result.map((m) => m.sequence)).toEqual([0, 1, 2, 3])
    expect(result.map((m) => m.role)).toEqual(['HUMAN', 'ASSISTANT', 'TOOL', 'HUMAN'])
  })

  it('joins multiple text blocks within one assistant message', async () => {
    const path = writejsonl(tempDir, [
      {
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'part one' },
            { type: 'text', text: 'part two' },
          ],
        },
      },
    ])

    const result = await extractMessages(path)
    expect(result[0].content).toBe('part one\npart two')
  })
})
