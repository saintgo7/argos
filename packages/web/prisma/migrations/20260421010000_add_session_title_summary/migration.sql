-- Add title/summary to claude_sessions
-- title: transcript.jsonl의 type="summary" 라인에서 추출 (nullable — /compact 또는 resume 시에만 존재)
-- summary: 동일 소스. 응답 조립 시 title이 없으면 첫 HUMAN 메시지를 fallback으로 사용.
ALTER TABLE "claude_sessions"
  ADD COLUMN "title" TEXT,
  ADD COLUMN "summary" TEXT;
