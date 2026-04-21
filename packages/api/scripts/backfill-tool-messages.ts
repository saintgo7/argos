/**
 * 기존 ASSISTANT Message의 content에서 `[Tool: name] {...json}` 라인을 파싱해
 * TOOL Message row로 분리하는 백필 스크립트.
 *
 * 실행: pnpm --filter @argos/api exec tsx scripts/backfill-tool-messages.ts [--dry-run] [--session <id>]
 *
 * 동작:
 *   - 각 ASSISTANT Message의 content를 줄 단위로 스캔
 *   - `[Tool: NAME] {...}` 패턴과 매칭되는 라인을 추출 → TOOL row 생성
 *   - 원본 ASSISTANT content에서는 해당 라인 제거
 *   - tool_use_id/durationMs는 과거 데이터에 없으므로 null
 *   - TOOL row의 sequence는 원본 ASSISTANT 바로 다음 timestamp와 동일하게 부여 (정렬 시 원본 ASSISTANT 뒤에 오도록 sequence += 0.5 흉내낼 수 없어 timestamp만 동일하게 두고 sequence는 원본 + 1)
 */
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

const TOOL_LINE_RE = /^\[Tool:\s*([^\]]+)\]\s*(\{.*\})\s*$/

interface ExtractedTool {
  toolName: string
  toolInput: Record<string, unknown> | null
}

function extractTools(content: string): { cleanedContent: string; tools: ExtractedTool[] } {
  const lines = content.split('\n')
  const keepLines: string[] = []
  const tools: ExtractedTool[] = []

  for (const line of lines) {
    const m = TOOL_LINE_RE.exec(line)
    if (!m) {
      keepLines.push(line)
      continue
    }
    const toolName = m[1].trim()
    let toolInput: Record<string, unknown> | null = null
    try {
      const parsed = JSON.parse(m[2])
      if (parsed && typeof parsed === 'object') {
        toolInput = parsed as Record<string, unknown>
      }
    } catch {
      // Unparseable JSON — still record the tool name, input stays null
    }
    tools.push({ toolName, toolInput })
  }

  return {
    cleanedContent: keepLines.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    tools,
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const sessionIdx = args.indexOf('--session')
  const sessionFilter = sessionIdx >= 0 ? args[sessionIdx + 1] : null

  console.log(`[backfill] dryRun=${dryRun} sessionFilter=${sessionFilter ?? 'ALL'}`)

  const messages = await prisma.message.findMany({
    where: {
      role: 'ASSISTANT',
      content: { contains: '[Tool:' },
      ...(sessionFilter ? { sessionId: sessionFilter } : {}),
    },
    orderBy: [{ sessionId: 'asc' }, { sequence: 'asc' }],
  })

  console.log(`[backfill] scanning ${messages.length} ASSISTANT messages containing "[Tool:"`)

  let rewritten = 0
  let toolRowsCreated = 0

  for (const msg of messages) {
    const { cleanedContent, tools } = extractTools(msg.content)
    if (tools.length === 0) continue

    rewritten++
    toolRowsCreated += tools.length

    if (dryRun) continue

    await prisma.$transaction(async (tx) => {
      // Update ASSISTANT content with tool lines removed
      await tx.message.update({
        where: { id: msg.id },
        data: { content: cleanedContent },
      })

      // Insert TOOL rows right after this ASSISTANT message
      // Use the same timestamp; sequence continues after this message
      // (collision with later rows is OK — we removed the unique constraint)
      for (let i = 0; i < tools.length; i++) {
        const tool = tools[i]
        await tx.message.create({
          data: {
            sessionId: msg.sessionId,
            role: 'TOOL',
            content: '',
            sequence: msg.sequence + i + 1,
            timestamp: msg.timestamp,
            toolName: tool.toolName,
            toolInput: (tool.toolInput as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
            toolUseId: null,
            durationMs: null,
          },
        })
      }
    })
  }

  console.log(`[backfill] done — rewrote ${rewritten} ASSISTANT messages, created ${toolRowsCreated} TOOL rows${dryRun ? ' (dry-run, no writes)' : ''}`)
}

main()
  .catch((err) => {
    console.error('[backfill] failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
