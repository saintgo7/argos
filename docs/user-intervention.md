# User Intervention Log

하네스가 자동으로 처리할 수 없어 **사람 손이 필요한 운영 절차** 를 기록한다. 한 건당 한 섹션, 최신이 위로.

각 항목 형식:

```
## YYYY-MM-DD — 한 줄 제목

- **컨텍스트**: 왜 자동화가 불가능했는가 (secret·외부 승인·물리적 배포 등)
- **수행 주체**: 누가
- **수행 내용**: 무엇을
- **다음에 자동화할 수 있는가**: 예/아니오 + 조건
```

---

## 2026-04-24 — Skill/Agent successRate 도입 보류 (Claude Code hook 제약)

- **컨텍스트**: iteration 3 요구사항 `3-20260424_152703/requirement.md` 는 Skills/Agents 대시보드에 `successRate = (POST_TOOL_USE 중 exit_code IS NULL OR 0 비율)` 컬럼 추가를 제안했다. 사전 조사에서 프로덕션 `events` 2,279건 중 POST_TOOL_USE 29건, 전부 `mcp__claude_ai_Gmail__*` MCP 툴, `exit_code`는 29건 전부 NULL임을 확인. Claude Code hook API가 내장 도구(Skill/Agent/Bash/Read/Edit/...)에 대해 PostToolUse를 발사하지 않거나 exit_code를 제공하지 않는다. 수집측(`packages/cli/src/commands/hook.ts`, `packages/cli/src/lib/hooks-inject.ts`)은 정상 — matcher `""` 로 전 도구에 hook이 걸려 있고, `exit_code` 필드는 payload에 있으면 그대로 전달되는 구조.
- **수행 주체**: plan-and-build 하네스 + tech-critic-lead CTO 판정.
- **수행 내용**: successRate 컬럼 대신 `medianDurationMs`(messages.duration_ms 중앙값)를 Skills/Agents 대시보드 대체 지표로 채택. 채택 이유와 한계를 `/docs/metrics-methodology` 페이지에 문서화하고, Skills/Agents 페이지 컬럼 헤더 InfoTooltip에도 동일 내용을 노출.
- **다음에 자동화할 수 있는가**: 조건부 예. **재도입 트리거**: Claude Code release note 또는 실측으로 `POST_TOOL_USE` 이벤트가 Skill/Agent 도구에 대해 쌓이기 시작하고 `exit_code` 필드가 채워지기 시작하면 재검토. 재측 쿼리 예시: `SELECT COUNT(*) FROM events WHERE event_type='POST_TOOL_USE' AND is_skill_call=true AND exit_code IS NOT NULL;` 결과가 0이 아닌 시점에 동일 티켓을 재오픈.
