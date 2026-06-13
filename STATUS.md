<!-- Argos 모노레포의 현재 상태·검증 결과·잔여 작업·논문/책 개요를 기록하는 스윕 상태 문서 -->
# STATUS — Argos

> 자동 포트폴리오 스윕(2026-06-13)이 생성·갱신한 상태 문서. 검증된 사실만 기록하며, 미검증 항목은 "미검증"으로 표시한다.

## English summary

Argos is an analytics platform for team Claude Code usage (token trends, skill/agent call rankings, session timeline + transcripts), shipped as an MIT-licensed, self-hostable pnpm monorepo. Three packages: `argos-ai` CLI (npm-published), `@argos/web` (Next.js 15 + Prisma + PostgreSQL dashboard/API), and `@argos/shared` (zod schemas). On this sweep all checks passed cleanly: `pnpm install --frozen-lockfile` (67s), `@argos/shared` build, CLI build, CLI tests (104 passing / 7 files), and web tests (53 passing / 3 files) — 157 tests green total. No code fix was required; this branch only adds STATUS.md and checkpoints two pre-existing untracked WIP items (a codex session id and dev-log #001). The web `next build` and a real end-to-end deploy were NOT exercised in this time-boxed sweep (see Remaining work). No secrets were committed.

## 목적

팀 단위 Claude Code 사용량 애널리틱스. 토큰 사용 추세, 스킬·에이전트 호출 TOP, 세션 타임라인·전사를 대시보드로 제공한다. MIT 오픈소스이며 자체호스팅이 가능하다. CLI(`argos`)가 Claude Code 훅 이벤트를 수집해 웹 API로 전송하고, 웹 대시보드가 조직 단위로 시각화한다.

## 프로젝트 구조

pnpm + turbo 모노레포이며 패키지는 셋이다.

- `packages/cli` (`argos-ai`, v0.1.13) — npm 배포 CLI. commander 기반. 명령: `default`, `hook`, `setup`, `status`, `logout`. vitest 테스트 보유.
- `packages/web` (`@argos/web`, v0.1.0) — Next.js 15 + React 19 + Prisma 6 + PostgreSQL 대시보드·API. next-auth 인증, RBAC, recharts 차트.
- `packages/shared` (`@argos/shared`, v0.1.0) — zod 기반 공유 스키마. 다른 패키지가 빌드 의존한다.

Prisma 스키마 모델(검증됨): `Organization`, `User`, `OrgMembership`, `CliAuthRequest`, `OnboardToken`, `CliToken`, `Project`, `DailyProjectStat`, `ClaudeSession`, `Event`, `UsageRecord`, `Message` (+ `OrgRole`, `EventType`, `MessageRole` enum).

배포 자산: `docker-compose.prod.yml`, `nginx/nginx.conf`, `packages/web/Dockerfile`, `.github/workflows/deploy.yml`, `DEPLOYMENT.md`. 자체호스트 라이브 이력은 `docs/dev-log/001_*.md`(abada-65, `argos.abada.co.kr`)에 기록돼 있다.

## 현재 상태 — 동작하는 것 (이번 스윕에서 직접 검증)

- `pnpm install --frozen-lockfile --prefer-offline` 성공 (약 67초). 루트 node_modules 없던 상태에서 클린 설치.
- `pnpm --filter @argos/shared build` (tsc) 성공.
- `pnpm --filter argos-ai build` (tsc + add-shebang) 성공. `packages/cli/dist/` 산출물 생성 확인.
- `pnpm --filter argos-ai test` (vitest) — **104 테스트 / 7 파일 전부 통과**.
- `pnpm --filter @argos/web test` (vitest) — **53 테스트 / 3 파일 전부 통과** (`rbac` 35, `slash-command` 15, `dashboard-row-mapping` 3).

합계 157개 테스트 그린. 빌드·테스트 모두 코드 수정 없이 통과했다.

## 현재 상태 — 미검증 / 동작 확인 못 한 것

- `pnpm --filter @argos/web build` (`next build`) 은 이번 스윕(120초 타임박스)에서 **실행하지 않았다**. Next.js 15 프로덕션 빌드는 시간이 길어 스킵했다. 미검증.
- 실제 런타임 동작(웹 서버 기동, DB 마이그레이션 `prisma migrate deploy`, CLI ↔ API end-to-end ingest)은 PostgreSQL·환경변수·OAuth 시크릿이 필요해 **실행하지 않았다**. 단, dev-log #001은 과거 abada-65에서 end-to-end ingest를 검증했다고 기록한다(이번 스윕에서 재검증하지 않음, 미검증).
- 도커 이미지 빌드·배포 워크플로(`deploy.yml`)는 외부 영향이 있어 실행하지 않았다(스윕 안전 규칙). 미검증.
- 루트 `pnpm lint` / `pnpm typecheck` 는 실행하지 않았다. 미검증.

## 잔여 작업 (완성까지 구체적 단계)

1. `pnpm --filter @argos/web build` 를 로컬에서 1회 돌려 프로덕션 빌드 통과를 확인한다 → verify: exit 0, `.next/` 생성.
2. 로컬 PostgreSQL을 띄우고 `.env`(`DATABASE_URL`/`DIRECT_URL`/`AUTH_SECRET`/`JWT_SECRET`)를 채운 뒤 `prisma migrate deploy` + `next dev` 로 대시보드 기동을 확인한다 → verify: 로그인·조직 생성·빈 대시보드 렌더.
3. CLI를 로컬 빌드(`pnpm --filter argos-ai build`)해 `node packages/cli/dist/index.js --api-url http://localhost:3000` 로 onboarding → hook ingest end-to-end 를 재현한다 → verify: 웹 DB에 `Event`/`Message` row 적재.
4. 루트 `pnpm lint`·`pnpm typecheck` 를 돌려 전체 워크스페이스 정합성을 확인한다 → verify: exit 0.
5. (선택) `docker compose -f docker-compose.yml up` 로 로컬 스택을 띄워 self-host 경로를 검증한다.

위 단계 중 1·4는 안전하며 다음 세션에서 즉시 진행 가능하다. 2·3·5는 DB·시크릿·도커가 필요하므로 사용자 환경에서 수행한다.

## 이번 스윕에서 한 일

- `fix/nginx-healthcheck-ipv4` 브랜치(미커밋 WIP: `.context/`, `docs/dev-log/` 2건)에서 `claude/sweep-2026-06-13` 브랜치로 이동.
- 의존성 클린 설치 후 shared·CLI 빌드, CLI·web 테스트 전부 통과 확인.
- 본 STATUS.md 작성.
- 기존 미커밋 WIP 2건(`.context/codex-session-id`, `docs/dev-log/001_*.md`)을 같은 체크포인트 커밋에 포함. 둘 다 시크릿 아님(코드엑스 세션 UUID + 마크다운 로그). 코드 수정은 없다.

## 논문/책 개요 (BOOK/PAPER outline)

이 레포는 "팀 단위 AI 코딩 어시스턴트(Claude Code) 사용량 관측·분석 플랫폼" 사례로 기술 보고서/논문화가 가능하다. 보유 자료(레포 내 실재 파일)를 절별로 매핑한다.

- **1. 서론 / 문제의식** — 팀에서 Claude Code 사용 편차·스킬 미공유·측정 부재 문제. 자료: `README.md`("Why we built it"), `docs/mission.md`, `docs/prd.md`.
- **2. 요구사항·설계** — 제품 요구·플로우. 자료: `docs/prd.md`, `docs/spec.md`, `docs/flow.md`, `docs/adr.md`(설계 결정).
- **3. 시스템 아키텍처** — CLI ↔ Web API ↔ PostgreSQL, 훅 기반 이벤트 수집 파이프라인, 자체호스팅 토폴로지. 자료: `docs/code-architecture.md`, `docs/data-schema.md`, `packages/web/prisma/schema.prisma`(12개 모델), nginx/docker compose.
- **4. 데이터 모델·수집 파이프라인** — 훅 이벤트 → `Event`/`UsageRecord`/`Message`/`ClaudeSession` 매핑, 50,000자 절단·프라이버시 처리. 자료: `docs/data-schema.md`, `packages/cli/src/commands/hook.ts`, `packages/cli/src/lib/transcript.ts`.
- **5. RBAC·조직 권한 모델** — 조직 단위 세션 공유와 권한. 자료: `packages/web/src/lib/server/rbac.ts`(+ 35개 테스트로 검증된 규칙).
- **6. 메트릭 방법론** — 토큰 추세·스킬/에이전트 호출 랭킹 산정. 자료: `iterations/` 하네스 산출물 중 metrics-methodology phase 0/1 커밋(`docs/`·`tasks/`), 다만 산정식의 학술적 검증은 **미검증**이므로 논문화 시 재확인 필요.
- **7. 자체호스팅·배포 사례연구** — Vercel 전제 → Cloudflare Tunnel + nginx + Docker self-host 전환 실측. 자료: `docs/dev-log/001_*.md`, `DEPLOYMENT.md`, `docker-compose.prod.yml`, `.github/workflows/deploy.yml`.
- **8. 평가·검증** — 테스트 커버리지(CLI 104 + web 53 = 157 통과, 본 스윕 실측), end-to-end ingest 검증(dev-log 기록, 본 스윕 미재현). 성능·정확도 정량 평가는 **미수행**(논문화 시 측정 필요).
- **9. 자율 주행 하네스 적용기** — `cc-system` 하네스 이식으로 ideation→build→commit→check 루프 운영. 자료: `README.md`("자율 주행 하네스"), `scripts/run-server.py`, `iterations/`.
- **10. 한계·향후 과제** — 프롬프트 전송 프라이버시, 메트릭 산정식 검증, 대규모 조직 스케일.

논문화 가능성: 중간(medium). 동작하는 시스템·풍부한 설계 문서·실제 배포 사례는 있으나, 정량 평가·메트릭 검증이 아직 수행되지 않아 "사례연구/시스템 논문" 성격으로는 가능하되 실증 논문에는 측정 보강이 필요하다.
