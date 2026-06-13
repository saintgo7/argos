import { existsSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawn } from 'child_process'
import type { IngestEventPayload } from '@argos/shared'

/**
 * Spawn a fully detached background process to POST the event to the API.
 * The caller exits immediately — no network round-trip blocks Claude Code.
 * A temp JSON file is used to pass the payload safely (avoids shell-escaping issues).
 */
export function sendEventBackground(url: string, token: string, payload: IngestEventPayload): void {
  const tmpFile = join(tmpdir(), `argos-${Date.now()}-${Math.random().toString(36).slice(2)}.json`)
  try {
    // 토큰이 담기므로 소유자만 읽도록 0600 으로 기록 (공용 머신에서 토큰 유출 방지)
    writeFileSync(tmpFile, JSON.stringify({ url, token, payload }), { encoding: 'utf8', mode: 0o600 })
    const script = [
      `const fs=require('fs');`,
      `const d=JSON.parse(fs.readFileSync(${JSON.stringify(tmpFile)},'utf8'));`,
      `fetch(d.url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+d.token},body:JSON.stringify(d.payload),signal:AbortSignal.timeout(10000)})`,
      `.catch(()=>{})`,
      `.finally(()=>{try{fs.unlinkSync(${JSON.stringify(tmpFile)})}catch{}})`,
    ].join('')
    const child = spawn(process.execPath, ['-e', script], {
      detached: true,
      stdio: 'ignore',
    })
    child.unref()
  } catch {
    try { if (existsSync(tmpFile)) unlinkSync(tmpFile) } catch {}
  }
}
