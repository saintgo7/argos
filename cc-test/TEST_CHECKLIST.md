# Hook System Test Checklist

Argos hook 수집 파이프라인의 기술적 가능성을 검증하는 테스트 목록이다.
각 테스트 결과는 실제 Claude Code 실행 후 `hook-events.jsonl`을 분석해 기록한다.

---

## 검증 항목

### T-01: SessionStart 이벤트 수신
- **목적**: Claude Code 세션 시작 시 `SessionStart` hook이 발화되는지 확인
- **기대값**: `hook_event_name: "SessionStart"`, `session_id`, `transcript_path` 포함
- **상태**: [x] PASS
- **결과**: 정상 수신. `session_id`, `transcript_path`, `cwd`, `source: "startup"` 포함
- **실제 JSON 구조**:
```json
{
  "session_id": "7db5479b-4520-43d4-9a70-6ed98b165029",
  "transcript_path": "/Users/choesumin/.claude/projects/-Users-choesumin-Desktop-dev-vmc-argos-cc-test/7db5479b-4520-43d4-9a70-6ed98b165029.jsonl",
  "cwd": "/Users/choesumin/Desktop/dev/vmc/argos/cc-test",
  "hook_event_name": "SessionStart",
  "source": "startup"
}
```
- **주목할 점**: `permission_mode`가 SessionStart에는 없음. `transcript_path`가 SessionStart에도 이미 포함됨.

---

### T-02: PreToolUse 이벤트 수신
- **목적**: 도구 호출 전 `PreToolUse` hook이 발화되는지 확인
- **기대값**: `tool_name`, `tool_input`, `session_id` 포함
- **상태**: [x] PASS
- **결과**: `tool_name`, `tool_input`, `tool_use_id`, `permission_mode` 모두 포함
- **실제 JSON 구조 (Bash 호출 예)**:
```json
{
  "session_id": "7db5479b-4520-43d4-9a70-6ed98b165029",
  "transcript_path": "...",
  "cwd": "/Users/choesumin/Desktop/dev/vmc/argos/cc-test",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "ls /Users/choesumin/Desktop/dev/vmc/argos/cc-test",
    "description": "List files in current directory"
  },
  "tool_use_id": "toolu_01Dmchwmvgbya34KXFDVyteo"
}
```
- **주목할 점**: `tool_use_id`로 Pre/Post 이벤트를 매핑 가능. `tool_input`은 도구별로 스키마가 다름.

---

### T-03: PostToolUse 이벤트 수신
- **목적**: 도구 호출 완료 후 `PostToolUse` hook이 발화되는지 확인
- **기대값**: `tool_name`, `tool_response`, `tool_use_id` 포함
- **상태**: [x] PASS
- **결과**: `tool_response`가 도구 유형별로 다른 구조를 가짐
- **실제 JSON 구조 (Bash 결과)**:
```json
{
  "hook_event_name": "PostToolUse",
  "tool_name": "Bash",
  "tool_input": { "command": "ls ...", "description": "..." },
  "tool_response": {
    "stdout": "CLAUDE.md\nTEST_CHECKLIST.md\nhook-events.jsonl\ntest-hook.sh",
    "stderr": "",
    "interrupted": false,
    "isImage": false,
    "noOutputExpected": false
  },
  "tool_use_id": "toolu_01Dmchwmvgbya34KXFDVyteo"
}
```
- **실제 JSON 구조 (Read 결과)**:
```json
{
  "hook_event_name": "PostToolUse",
  "tool_name": "Read",
  "tool_response": {
    "type": "text",
    "file": {
      "filePath": "/path/to/CLAUDE.md",
      "content": "...(full content)...",
      "numLines": 44,
      "startLine": 1,
      "totalLines": 44
    }
  },
  "tool_use_id": "toolu_01VPCJtDvtmQLWYmGpCw67CL"
}
```
- **주목할 점**: Pre/PostToolUse는 같은 `tool_use_id` 공유. Argos에서 tool_response 저장 시 크기 제한 필요 (문서에 2000자 제한 명시됨).

---

### T-04: Stop 이벤트 수신 + transcript_path 존재
- **목적**: 세션 종료 시 `Stop` hook이 발화되고 `transcript_path` 포함되는지 확인
- **기대값**: `hook_event_name: "Stop"`, `transcript_path` 포함
- **상태**: [x] PASS
- **결과**: `transcript_path`, `stop_hook_active`, `last_assistant_message` 포함
- **실제 JSON 구조**:
```json
{
  "session_id": "7db5479b-4520-43d4-9a70-6ed98b165029",
  "transcript_path": "/Users/choesumin/.claude/projects/-Users-choesumin-Desktop-dev-vmc-argos-cc-test/7db5479b-4520-43d4-9a70-6ed98b165029.jsonl",
  "cwd": "/Users/choesumin/Desktop/dev/vmc/argos/cc-test",
  "permission_mode": "default",
  "hook_event_name": "Stop",
  "stop_hook_active": false,
  "last_assistant_message": "모든 작업 완료했습니다.\n\n**1) 파일 목록 (ls)**\n..."
}
```
- **주목할 점**: `transcript_path`가 `~/.claude/projects/<project-path>/<session_id>.jsonl` 형식임. `stop_hook_active: false`는 Stop hook이 현재 활성화 중이 아님을 의미.

---

### T-05: Skill 호출 이벤트 구조 확인
- **목적**: Skill 도구 호출 시 `tool_name = "Skill"`, `tool_input.skill = "<name>"` 구조 확인
- **기대값**: `{"tool_name": "Skill", "tool_input": {"skill": "commit", ...}, ...}`
- **상태**: [ ] PENDING
- **결과**: -
- **실제 JSON 구조**: -

---

### T-06: Agent 호출 이벤트 구조 확인
- **목적**: Agent 도구 호출 시 `tool_name = "Agent"`, `subagent_type`, `description` 포함 여부 확인
- **기대값**: `{"tool_name": "Agent", "tool_input": {"subagent_type": "Explore", "description": "...", ...}, ...}`
- **상태**: [ ] PENDING
- **결과**: -
- **실제 JSON 구조**: -

---

### T-07: SubagentStop 이벤트 수신
- **목적**: 서브에이전트 종료 시 `SubagentStop` hook이 발화되는지 확인
- **기대값**: `{"hook_event_name": "SubagentStop", "session_id": "...", ...}`
- **상태**: [ ] PENDING
- **결과**: -
- **실제 JSON 구조**: -

---

### T-08: session_id 일관성
- **목적**: 동일 세션 내 모든 이벤트에 동일한 `session_id`가 존재하는지 확인
- **기대값**: 같은 Claude Code 실행 중 수집된 모든 이벤트의 `session_id`가 동일
- **상태**: [x] PASS
- **결과**: T-01~04 테스트에서 수집된 6개 이벤트 모두 동일한 `session_id: "7db5479b-4520-43d4-9a70-6ed98b165029"` 공유
- **실제 데이터**: SessionStart, 2x PreToolUse, 2x PostToolUse, Stop 모두 동일 session_id

---

### T-09: hook exit 0 보장 (에러 내성)
- **목적**: hook 스크립트에 오류가 발생해도 Claude Code 동작에 영향 없는지 확인
- **방법**: 일시적으로 잘못된 hook 명령으로 바꾼 뒤 Claude Code 정상 동작 여부 확인
- **상태**: [ ] PENDING
- **결과**: -

---

### T-10: transcript JSONL 구조 파악
- **목적**: Stop 이벤트의 `transcript_path`가 가리키는 파일에서 토큰 사용량 추출 가능한지 확인
- **기대값**: transcript.jsonl 내 `usage` 필드 (`input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`)
- **상태**: [ ] PENDING
- **결과**: -
- **실제 JSON 구조**: -

---

## 전체 결과 요약

| 테스트 | 상태 | 비고 |
|--------|------|------|
| T-01: SessionStart | ✅ PASS | `source: "startup"`, `permission_mode` 없음 |
| T-02: PreToolUse | ✅ PASS | `tool_use_id`로 Pre/Post 매핑 가능 |
| T-03: PostToolUse | ✅ PASS | `tool_response` 구조가 도구별로 다름 |
| T-04: Stop + transcript_path | ✅ PASS | `last_assistant_message` 포함, transcript_path 존재 |
| T-05: Skill 호출 구조 | 🔲 PENDING | |
| T-06: Agent 호출 구조 | 🔲 PENDING | |
| T-07: SubagentStop | 🔲 PENDING | |
| T-08: session_id 일관성 | ✅ PASS | 6개 이벤트 전체 동일 session_id |
| T-09: hook exit 0 보장 | 🔲 PENDING | |
| T-10: transcript 토큰 추출 | 🔲 PENDING | |

---

## 테스트 방법

```bash
# 1. hook-events.jsonl 초기화
rm -f /Users/choesumin/Desktop/dev/vmc/argos/cc-test/hook-events.jsonl

# 2. cc-test 디렉토리에서 Claude Code 실행 (--print 모드로 비대화형 실행)
cd /Users/choesumin/Desktop/dev/vmc/argos/cc-test && claude --print "..."

# 3. 수집된 이벤트 확인
cat /Users/choesumin/Desktop/dev/vmc/argos/cc-test/hook-events.jsonl | jq '.'
```

---

## 발견된 중요 사항 (구현에 반영 필요)

1. **`hook_event_name` 필드명**: Claude Code는 이벤트 타입을 `type`이 아닌 `hook_event_name` 필드로 전달함. `argos hook`의 파싱 로직에서 `hook_event_name`을 읽어야 함.
2. **`tool_use_id`**: Pre/PostToolUse 이벤트가 같은 `tool_use_id`를 공유. 이를 활용해 도구 호출 대기시간 측정 가능.
3. **`transcript_path`**: Stop 이벤트뿐 아니라 **모든 이벤트**에 포함됨 (SessionStart 포함). 세션 ID로 경로가 결정됨: `~/.claude/projects/<escaped-cwd>/<session_id>.jsonl`.
4. **`last_assistant_message`**: Stop 이벤트에 마지막 응답 텍스트가 포함됨. 필요시 저장 가능.
5. **`stop_hook_active`**: Stop 이벤트에 포함. hook이 재귀적으로 Stop을 발생시키는 것을 방지하는 플래그로 보임.
