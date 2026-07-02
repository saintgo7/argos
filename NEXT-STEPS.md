<!-- Argos 모노레포의 P1 우선순위 수정·검증 계획을 기록하는 문서 -->
# NEXT-STEPS — Argos

> 작성: 2026-07-02 프로덕션-세이프 P1 패스. 브랜치 `claude/maxburn-audit2-2026-06-14`(origin과 동기).
> 자체호스팅 애널리틱스 플랫폼(`argos.abada.co.kr`, abada-65). 런타임/인증/스키마/배포 변경은 이 패스에서 금지.
> STATUS.md의 "잔여 작업"을 실행 순서로 재정리한다. 파일 경로·명령·검증 기준 중심.

## 현재 상태 (이 패스 확인)

- 워킹트리 클린, 추적되지 않은 잔여물 없음. `.gitignore`가 `node_modules/`, `dist/`, `.env*`, `.next` 계열, `.turbo`, `.vercel`, `persuasion-data/runs/`를 이미 커버.
- STATUS.md(2026-06-13 스윕) 실측: `pnpm install --frozen-lockfile` → shared·CLI 빌드 → CLI 104 + web 53 = **157 테스트 그린**.
- 이 P1 패스에서는 시간·환경(pnpm 클린 설치 ~67초, next build 장시간, DB/OAuth 시크릿 필요) 때문에 재실행하지 않음. 코드 수정 불필요(안전 수정 대상 없음).

## 남은 P1 작업 (우선순위 순)

### P1-1. web 프로덕션 빌드 통과 확인 (안전)
- `pnpm --filter @argos/web build`(`next build`)는 스윕 타임박스에서 미실행 → **미검증**.
- 조치: 로컬에서 1회 실행 → verify: exit 0, `packages/web/.next/` 생성.

### P1-2. 워크스페이스 정합성 확인 (안전)
- 루트 `pnpm lint` / `pnpm typecheck` 미실행 → **미검증**.
- 조치: 두 명령 실행 → verify: exit 0. 실패 시 파일·규칙 단위로 분류.

### P1-3. DB·인증 포함 로컬 런타임 기동 (사용자 환경)
- PostgreSQL + `.env`(`DATABASE_URL`/`DIRECT_URL`/`AUTH_SECRET`/`JWT_SECRET`) 필요.
- 조치: `.env` 채운 뒤 `prisma migrate deploy` + `next dev` → verify: 로그인·조직 생성·빈 대시보드 렌더.
- heldForReview: 시크릿·DB 스키마 마이그레이션 영향이라 이 패스에서 하지 않음.

### P1-4. CLI ↔ Web API end-to-end ingest 재현 (사용자 환경)
- `pnpm --filter argos-ai build` 후 `node packages/cli/dist/index.js --api-url http://localhost:3000`로
  onboarding → hook ingest 재현.
- verify: 웹 DB에 `Event`/`Message` row 적재. dev-log #001(`docs/dev-log/001_*.md`)이 과거 abada-65에서
  검증했다고 기록하나 이번엔 미재현.

### P1-5. self-host 스택 검증 (선택)
- `docker compose -f docker-compose.yml up`로 로컬 스택 기동 검증.
- heldForReview: 도커 빌드·배포 워크플로(`.github/workflows/deploy.yml`)는 외부 영향 → 미실행.

## heldForReview (이 패스에서 하지 않음)

- **배포/도커 워크플로 실행** — `deploy.yml`, `docker-compose.prod.yml`는 라이브 서비스 영향.
- **Prisma 마이그레이션·스키마 변경** — `packages/web/prisma/` 스키마(12개 모델)는 건드리지 않음.
- **인증/RBAC 로직 변경** — `packages/web/src/lib/server/rbac.ts`(35개 테스트로 검증)는 수정하지 않음.
- **.env/시크릿** — OAuth·JWT 시크릿 배선은 사용자 환경에서만.

## 논문/책 (참고)

STATUS.md §"논문/책 개요" 참조. 시스템·설계 문서·배포 사례는 있으나 정량 평가·메트릭 산정식 검증이 미수행이라
사례연구/시스템 논문 성격에 적합. 실증 논문화는 측정 보강 필요.
