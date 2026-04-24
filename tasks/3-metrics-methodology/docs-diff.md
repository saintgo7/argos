# docs-diff: metrics-methodology

Baseline: `f8648ae`

## `docs/data-schema.md`

```diff
diff --git a/docs/data-schema.md b/docs/data-schema.md
index a43b73a..b40cd88 100644
--- a/docs/data-schema.md
+++ b/docs/data-schema.md
@@ -363,6 +363,63 @@ await prisma.event.groupBy({
 })
 ```
 
+### Skills/Agents — userCount + medianDurationMs (methodology 페이지 참조)
+
+#### userCount
+
+`events` 테이블에서 `is_skill_call=true`(또는 `is_agent_call=true`) + `skill_name`(또는 `agent_type`) 그룹별로 `COUNT(DISTINCT user_id)`를 계산한다. **events 기준 집계를 일관되게 사용**한다 — messages 기준과 혼용하면 같은 호출을 다르게 카운팅할 수 있어 일관성 문제가 발생한다.
+
+#### medianDurationMs
+
+`messages` 테이블의 `role='TOOL' AND tool_name IN ('Skill','Agent') AND duration_ms IS NOT NULL` 행에 대해, `tool_input->>'skill'` 또는 `tool_input->>'subagent_type'`으로 그룹화해 `percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms)`로 중앙값을 계산한다.
+
+**샘플 수 임계값**: duration 기록 행 수가 3 미만이면 API에서 `null`로 반환한다. 통계 유의미성이 아닌 "매우 빈약한 데이터 숨김" 휴리스틱이다.
+
+**messages의 project_id 필터링**: messages 테이블은 project_id 컬럼을 갖지 않는다. `claude_sessions s ON s.id = m.session_id` 로 join해 `s.project_id = ANY($projectIds)`로 필터링한다.
+
+**timing 주의**: messages.duration_ms는 Stop 이벤트에서 transcript 기반으로 재빌드되므로, 진행 중인 세션의 tool call은 집계에 포함되지 않을 수 있다. 세션 종료 후 반영된다.
+
+**successRate를 채택하지 않은 이유**: Claude Code hook이 Skill/Agent 도구에 대해 PostToolUse를 발사하지 않고 exit_code를 제공하지 않음을 2026-04-24 프로덕션 실측으로 확인(`packages/web/src/app/api/events/route.ts`의 수신 루트는 정상). 향후 Claude Code가 해당 페이로드를 제공하기 시작하면 재도입 검토.
+
+```sql
+-- Skills 집계 (Agents도 동일 패턴, is_skill_call → is_agent_call, skill_name → agent_type)
+WITH skill_events AS (
+  SELECT
+    skill_name,
+    COUNT(*)                            AS call_count,
+    COUNT(DISTINCT session_id)          AS session_count,
+    COUNT(DISTINCT user_id)             AS user_count,
+    MAX(timestamp)                      AS last_used_at
+  FROM events
+  WHERE project_id = ANY($1::text[])
+    AND is_skill_call = true
+    AND skill_name IS NOT NULL
+    AND timestamp BETWEEN $2 AND $3
+  GROUP BY skill_name
+),
+skill_durations AS (
+  SELECT
+    m.tool_input->>'skill'                                          AS skill_name,
+    COUNT(m.duration_ms)                                            AS duration_sample_count,
+    percentile_cont(0.5) WITHIN GROUP (ORDER BY m.duration_ms)      AS median_duration_ms
+  FROM messages m
+  JOIN claude_sessions s ON s.id = m.session_id
+  WHERE s.project_id = ANY($1::text[])
+    AND m.role = 'TOOL'
+    AND m.tool_name = 'Skill'
+    AND m.duration_ms IS NOT NULL
+    AND m.timestamp BETWEEN $2 AND $3
+  GROUP BY m.tool_input->>'skill'
+)
+SELECT
+  e.skill_name, e.call_count, e.session_count, e.user_count, e.last_used_at,
+  CASE WHEN d.duration_sample_count >= 3 THEN d.median_duration_ms ELSE NULL END AS median_duration_ms
+FROM skill_events e
+LEFT JOIN skill_durations d USING (skill_name)
+ORDER BY e.call_count DESC
+LIMIT 50;
+```
+
 ### 프로젝트 요약 (병렬 실행)
 ```typescript
 const [sessionCount, usageTotals, activeUserCount, topSkills, topAgents] =
```

## `docs/spec.md`

```diff
diff --git a/docs/spec.md b/docs/spec.md
index 74fbc0d..3a2d393 100644
--- a/docs/spec.md
+++ b/docs/spec.md
@@ -23,4 +23,6 @@
 - Hook 이벤트 페이로드: `packages/cli/src/hooks/` 및 수신측 `packages/web/src/app/api/events/`.
 - 웹 API 라우트: `packages/web/src/app/api/**/route.ts`.
 
+- 대시보드 지표의 공학적 정의: `packages/web/src/app/docs/metrics-methodology/page.tsx` 가 단일 진실 원천. tooltip·티켓 설명과의 drift 방지용.
+
 스펙과 코드가 어긋나면 **코드가 맞다**. 문서를 맞춰 고쳐라.
```

## `docs/user-intervention.md`

```diff
diff --git a/docs/user-intervention.md b/docs/user-intervention.md
index adc6bb9..51ddc1b 100644
--- a/docs/user-intervention.md
+++ b/docs/user-intervention.md
@@ -15,4 +15,9 @@
 
 ---
 
-(아직 기록 없음)
+## 2026-04-24 — Skill/Agent successRate 도입 보류 (Claude Code hook 제약)
+
+- **컨텍스트**: iteration 3 요구사항 `3-20260424_152703/requirement.md` 는 Skills/Agents 대시보드에 `successRate = (POST_TOOL_USE 중 exit_code IS NULL OR 0 비율)` 컬럼 추가를 제안했다. 사전 조사에서 프로덕션 `events` 2,279건 중 POST_TOOL_USE 29건, 전부 `mcp__claude_ai_Gmail__*` MCP 툴, `exit_code`는 29건 전부 NULL임을 확인. Claude Code hook API가 내장 도구(Skill/Agent/Bash/Read/Edit/...)에 대해 PostToolUse를 발사하지 않거나 exit_code를 제공하지 않는다. 수집측(`packages/cli/src/commands/hook.ts`, `packages/cli/src/lib/hooks-inject.ts`)은 정상 — matcher `""` 로 전 도구에 hook이 걸려 있고, `exit_code` 필드는 payload에 있으면 그대로 전달되는 구조.
+- **수행 주체**: plan-and-build 하네스 + tech-critic-lead CTO 판정.
+- **수행 내용**: successRate 컬럼 대신 `medianDurationMs`(messages.duration_ms 중앙값)를 Skills/Agents 대시보드 대체 지표로 채택. 채택 이유와 한계를 `/docs/metrics-methodology` 페이지에 문서화하고, Skills/Agents 페이지 컬럼 헤더 InfoTooltip에도 동일 내용을 노출.
+- **다음에 자동화할 수 있는가**: 조건부 예. **재도입 트리거**: Claude Code release note 또는 실측으로 `POST_TOOL_USE` 이벤트가 Skill/Agent 도구에 대해 쌓이기 시작하고 `exit_code` 필드가 채워지기 시작하면 재검토. 재측 쿼리 예시: `SELECT COUNT(*) FROM events WHERE event_type='POST_TOOL_USE' AND is_skill_call=true AND exit_code IS NOT NULL;` 결과가 0이 아닌 시점에 동일 티켓을 재오픈.
```
