import { homedir } from 'os'
import { join } from 'path'
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs'

export const DEFAULT_API_URL = 'https://www.argos-ai.xyz'

export interface Config {
  token: string
  apiUrl?: string
  userId: string
  email: string
}

export function getConfigPath(): string {
  return join(homedir(), '.argos', 'config.json')
}

/**
 * Returns a custom override URL, or undefined if the URL is empty, malformed,
 * or points at the default Argos service (any *argos-ai.xyz host). Callers that
 * need a guaranteed URL should fall back to DEFAULT_API_URL with `?? DEFAULT_API_URL`.
 */
export function normalizeApiUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined
  try {
    const host = new URL(url).hostname
    if (host === 'argos-ai.xyz' || host.endsWith('.argos-ai.xyz')) return undefined
    return url
  } catch {
    return undefined
  }
}

export function readConfig(): Config | null {
  try {
    const configPath = getConfigPath()
    if (!existsSync(configPath)) {
      return null
    }
    const content = readFileSync(configPath, 'utf8')
    const parsed = JSON.parse(content) as Config
    const normalized = normalizeApiUrl(parsed.apiUrl)
    if (normalized) {
      parsed.apiUrl = normalized
    } else {
      delete parsed.apiUrl
    }
    return parsed
  } catch {
    return null
  }
}

export function writeConfig(config: Config): void {
  const configPath = getConfigPath()
  const configDir = join(homedir(), '.argos')

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true, mode: 0o700 })
  }

  // 1년 수명 CLI JWT가 담기므로 소유자만 읽도록 0600 으로 기록 (공용 머신에서 토큰 유출 방지)
  writeFileSync(configPath, JSON.stringify(config, null, 2), { encoding: 'utf8', mode: 0o600 })
}

export function deleteConfig(): void {
  try {
    const configPath = getConfigPath()
    if (existsSync(configPath)) {
      unlinkSync(configPath)
    }
  } catch {
    // Ignore errors
  }
}

export function requireAuth(): Config {
  const config = readConfig()
  if (!config) {
    console.error('✗ 로그인이 필요합니다.')
    console.error('  argos를 실행하여 로그인하세요.')
    process.exit(1)
  }
  return config
}
