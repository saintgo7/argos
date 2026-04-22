import { describe, it, expect } from 'vitest'
import { formatSlashCommandText } from './slash-command'

describe('formatSlashCommandText', () => {
  it('태그가 없는 일반 문자열은 그대로 반환한다', () => {
    expect(formatSlashCommandText('plain title with no tags')).toBe(
      'plain title with no tags',
    )
  })

  it('빈 문자열은 빈 문자열을 반환한다', () => {
    expect(formatSlashCommandText('')).toBe('')
  })

  it('앞뒤 공백과 내부 공백을 정규화한다', () => {
    expect(formatSlashCommandText('  hello   world  ')).toBe('hello world')
  })

  it('command-message + command-name 만 있으면 /name 으로 변환한다', () => {
    expect(
      formatSlashCommandText(
        '<command-message>foo</command-message><command-name>/foo</command-name>',
      ),
    ).toBe('/foo')
  })

  it('command-name 값에 선행 슬래시가 없어도 /name 으로 변환한다', () => {
    expect(
      formatSlashCommandText(
        '<command-message>foo</command-message><command-name>foo</command-name>',
      ),
    ).toBe('/foo')
  })

  it('command-args 가 있으면 /name args 형태로 합친다', () => {
    expect(
      formatSlashCommandText(
        '<command-message>persuasion-review</command-message> <command-name>/persuasion-review</command-name> <command-args>hello world</command-args>',
      ),
    ).toBe('/persuasion-review hello world')
  })

  it('command-args 의 닫는 태그가 없어도 최선을 다해 파싱한다 (잘린 입력)', () => {
    const input =
      '<command-message>persuasion-review</command-message> <command-name>/persuasion-review</command-name> <command-args>@.claude/skills/persuasion-review/personas/ecommerce-si-ax-exec-01/ 페르소나에 대해 현재 argos'
    expect(formatSlashCommandText(input)).toBe(
      '/persuasion-review @.claude/skills/persuasion-review/personas/ecommerce-si-ax-exec-01/ 페르소나에 대해 현재 argos',
    )
  })

  it('command-args 내부의 공백과 줄바꿈을 한 칸 공백으로 정규화한다', () => {
    expect(
      formatSlashCommandText(
        '<command-message>x</command-message><command-name>/x</command-name><command-args>line1\n\n  line2\tline3</command-args>',
      ),
    ).toBe('/x line1 line2 line3')
  })

  it('일반 텍스트 안에 임베드된 슬래시 커맨드도 변환한다', () => {
    expect(
      formatSlashCommandText(
        'user typed: <command-message>x</command-message> <command-name>/x</command-name> foo bar',
      ),
    ).toBe('user typed: /x foo bar')
  })

  it('같은 문자열에 여러 슬래시 커맨드 블록이 있으면 각각 변환한다', () => {
    const input =
      '<command-message>a</command-message><command-name>/a</command-name><command-args>first</command-args> then <command-message>b</command-message><command-name>/b</command-name><command-args>second</command-args>'
    expect(formatSlashCommandText(input)).toBe('/a first then /b second')
  })

  it('command-message 없이 command-name 만 있는 깨진 입력도 best-effort 로 처리한다', () => {
    expect(
      formatSlashCommandText(
        '<command-name>/bar</command-name><command-args>x</command-args>',
      ),
    ).toBe('/bar x')
  })

  it('고아 태그(짝이 맞지 않는 태그)는 제거한다', () => {
    expect(formatSlashCommandText('before </command-args> after')).toBe(
      'before after',
    )
  })

  it('command-args 가 비어있으면 /name 만 남긴다', () => {
    expect(
      formatSlashCommandText(
        '<command-message>foo</command-message><command-name>/foo</command-name><command-args></command-args>',
      ),
    ).toBe('/foo')
  })

  it('command-args 가 공백만 있으면 /name 만 남긴다', () => {
    expect(
      formatSlashCommandText(
        '<command-message>foo</command-message><command-name>/foo</command-name><command-args>   </command-args>',
      ),
    ).toBe('/foo')
  })

  it('여러 번 호출해도 동일한 결과를 반환한다 (순수성 — 공유 /g 정규식 상태 누수 없음)', () => {
    const input =
      '<command-message>x</command-message><command-name>/x</command-name><command-args>a</command-args>'
    const first = formatSlashCommandText(input)
    const second = formatSlashCommandText(input)
    const third = formatSlashCommandText(input)
    expect(first).toBe(second)
    expect(second).toBe(third)
    expect(first).toBe('/x a')
  })
})
