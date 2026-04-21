import type { TimelineEvent, ToolEvent } from './timeline-events'

export type FileEntry = {
  path: string
  count: number
  firstEventIdx: number
  lastEventIdx: number
  lastTimestamp: string
}

export type SessionFiles = {
  modified: FileEntry[]
  read: FileEntry[]
}

const MODIFY_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])
const READ_TOOLS = new Set(['Read'])

function getPath(event: ToolEvent): string | null {
  const input = event.toolInput
  if (!input) return null
  const key = event.toolName === 'NotebookEdit' ? 'notebook_path' : 'file_path'
  const v = input[key]
  return typeof v === 'string' && v.length > 0 ? v : null
}

function upsert(map: Map<string, FileEntry>, path: string, idx: number, timestamp: string) {
  const existing = map.get(path)
  if (existing) {
    existing.count += 1
    existing.lastEventIdx = idx
    existing.lastTimestamp = timestamp
    return
  }
  map.set(path, {
    path,
    count: 1,
    firstEventIdx: idx,
    lastEventIdx: idx,
    lastTimestamp: timestamp,
  })
}

function sortEntries(entries: FileEntry[]): FileEntry[] {
  return entries.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    if (a.lastTimestamp < b.lastTimestamp) return 1
    if (a.lastTimestamp > b.lastTimestamp) return -1
    return 0
  })
}

export function extractSessionFiles(events: TimelineEvent[]): SessionFiles {
  const modified = new Map<string, FileEntry>()
  const read = new Map<string, FileEntry>()

  events.forEach((event, idx) => {
    if (event.kind !== 'tool') return
    if (event.isSkillCall || event.isAgentCall) return
    const path = getPath(event)
    if (!path) return
    if (MODIFY_TOOLS.has(event.toolName)) {
      upsert(modified, path, idx, event.timestamp)
    } else if (READ_TOOLS.has(event.toolName)) {
      upsert(read, path, idx, event.timestamp)
    }
  })

  return {
    modified: sortEntries([...modified.values()]),
    read: sortEntries([...read.values()]),
  }
}
