-- Add TOOL role to MessageRole enum
ALTER TYPE "MessageRole" ADD VALUE 'TOOL';

-- Add tool-specific columns to messages (all nullable — only populated for TOOL role)
ALTER TABLE "messages"
  ADD COLUMN "tool_name" TEXT,
  ADD COLUMN "tool_input" JSONB,
  ADD COLUMN "tool_use_id" TEXT,
  ADD COLUMN "duration_ms" INTEGER;

-- Drop unique constraint on (session_id, sequence) — TOOL rows inserted mid-session
-- may collide with HUMAN/ASSISTANT rows inserted at Stop. UI sorts by timestamp.
DROP INDEX IF EXISTS "messages_session_id_sequence_key";

-- Index for upsert matching on (sessionId, toolUseId)
CREATE INDEX "messages_session_id_tool_use_id_idx" ON "messages"("session_id", "tool_use_id");
