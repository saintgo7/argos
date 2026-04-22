const SLASH_COMMAND_BLOCK_RE =
  /<command-message>[^<]*<\/command-message>\s*<command-name>\/?([^<\s]+)<\/command-name>(?:\s*<command-args>([\s\S]*?)(?:<\/command-args>|(?=<command-)|$))?/g

const LEFTOVER_COMMAND_TAG_RE = /<\/?command-(?:message|name|args)>/g

export function formatSlashCommandText(raw: string): string {
  const replaced = raw.replace(SLASH_COMMAND_BLOCK_RE, (_, name, args) => {
    const argsText =
      typeof args === 'string' ? args.replace(/\s+/g, ' ').trim() : ''
    return argsText ? `/${name} ${argsText}` : `/${name}`
  })
  return replaced.replace(LEFTOVER_COMMAND_TAG_RE, ' ').replace(/\s+/g, ' ').trim()
}
