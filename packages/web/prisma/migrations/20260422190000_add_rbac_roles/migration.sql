-- Level 1 RBAC: OrgRole enum 확장
-- 기존 OWNER, MEMBER는 그대로 유지하여 regression 없음.
-- MANAGER: 멤버 관리 + 드릴다운 가능 (OWNER 하위 관리자 역할)
-- VIEWER: 팀 단위 집계만, 개인 식별 데이터 접근 불가 (B2B 감시 우려 해소용)

ALTER TYPE "OrgRole" ADD VALUE 'MANAGER';
ALTER TYPE "OrgRole" ADD VALUE 'VIEWER';
