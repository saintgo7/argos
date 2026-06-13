# Dev Log #001: Argos Self-Host Initial Deploy (argos.abada.co.kr)

**Date**: 2026-04-28 05:39
**Author**: saintgo7
**Phase**: Initial deploy + first dogfood

## Summary

Vercel 배포 전제로 만들어진 vibemafiaclub/argos를 fork(saintgo7/argos)에서 abada-65 self-host로 라이브화. Cloudflare Tunnel 뒤 nginx + Next.js 15 + PostgreSQL 16 스택으로 `https://argos.abada.co.kr` 운영 시작. CLI에서 데이터 ingest까지 end-to-end 검증 완료.

## Changes Made

### Files Created (`deploy/abada-selfhost` 브랜치 → `main` 머지)

- `packages/web/Dockerfile`: Next.js standalone multi-stage 빌드 (deps → builder → runner). pnpm 워크스페이스 + `@argos/shared` 빌드 + `prisma generate` + standalone 출력. ~600MB 이미지.
- `.dockerignore`: monorepo 빌드 컨텍스트에서 `**/node_modules`, `**/.next`, `.env*`, docs, harness 산출물 제외.
- `docker-compose.prod.yml`: abada-65 컨벤션 (single-file, nginx + bind-mount + container_name). nginx → 127.0.0.1:10350, web/postgres internal-only, `./data/pgdata` bind-mount.
- `nginx/nginx.conf`: Next.js 단일 업스트림 (web:3000), `/_next/` 365d 캐시, `/health` plain text 200, catch-all 프록시 (Next.js가 `/api/*` 자체 처리).
- `.env.example`: `TAG`, `POSTGRES_*`, `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `JWT_SECRET`, `AUTH_TRUST_HOST`, `AUTH_URL`, `NEXT_PUBLIC_SITE_URL`.
- `.github/workflows/deploy.yml`: Tier A — lint → test → GHCR build → SSH deploy + 12×10s health 루프 + auto-rollback. `legacy docker-compose` 바이너리 사용.
- `DEPLOYMENT.md`: 서버 부트스트랩 + 운영 + 롤백 + Tunnel ingress + secrets 등록 런북.
- `docs/dev-log/001_*.md`: 본 로그.

### Files Modified

- `packages/web/next.config.ts`: `output: 'standalone'` 추가 (Docker 이미지 ~1GB → ~600MB).
- `packages/web/src/auth.ts`: `'@/lib/server/auth-actions'` 변수 dynamic-import 트릭 제거 → eager `import { loginUser } from '@/lib/server/auth-actions'`.
- `packages/web/src/middleware.ts`: `export const runtime = 'nodejs'` 추가 (NextAuth/bcrypt/Prisma가 edge 번들로 누락되지 않도록).
- `packages/web/src/app/api/auth/cli-request/route.ts`: `req.nextUrl.origin` → `process.env.NEXT_PUBLIC_SITE_URL` ?? `X-Forwarded-{Host,Proto}` ?? `req.nextUrl.origin` 폴백 체인.
- `.gitignore`: `.env.production`, `!.env.example` 추가.

### Server-side (committed in `/data/abada-co-kr/argos-abada-co-kr/argos.abada.co.kr/`)

```
.env                          # chmod 600, openssl rand -hex 32 ×3
docker-compose.prod.yml       # repo와 동일
nginx/nginx.conf              # repo와 동일
data/pgdata/                  # postgres bind-mount (~50MB)
src/                          # git clone of saintgo7/argos
logs/                         # 빈 디렉터리
```

## Technical Details

### Key Issues Fixed (시간 순)

1. **Docker buildx 미설치 (abada-65)** — Docker 28.x BuildKit는 buildx 프론트엔드 필수. `apt-get install docker-buildx` 0.21.3 설치.
2. **`@argos/shared` 미빌드** — webpack이 `main: dist/index.js` resolve 실패. Dockerfile builder 단계에 `pnpm --filter @argos/shared build` 추가.
3. **pnpm `.pnpm` 호이스팅 → Prisma CLI 경로 누락** — `/app/node_modules/prisma` 직접 COPY 불가. Runner 단계에서 `npm install -g prisma@6` 전역 설치.
4. **Prisma schema 위치 불일치** — 컨테이너 WORKDIR=/app, schema는 `packages/web/prisma/schema.prisma`. Migration 명령어에 `--schema packages/web/prisma/schema.prisma` 명시.
5. **`docker compose` v2 vs `docker-compose` v5 (abada-65)** — 서버에 v2 플러그인 없음. 워크플로 + 런북 전부 하이픈 형식으로 통일.
6. **CLI authUrl이 `http://0.0.0.0:3000/cli-auth`** — Next.js standalone이 `HOSTNAME=0.0.0.0 PORT=3000` env로 origin 구성. cli-request 라우트에서 `NEXT_PUBLIC_SITE_URL` 우선 사용.
7. **NextAuth v5 `UntrustedHost` 401** — reverse proxy 뒤에서 Host 검증 실패. `.env`에 `AUTH_TRUST_HOST=true` + `AUTH_URL=https://argos.abada.co.kr` 추가.
8. **Login 시 `Cannot find module '@/lib/server/auth-actions'`** — 변수 dynamic-import 트릭이 webpack static analysis 우회 → standalone 트레이싱 누락. eager import + middleware node runtime 전환.
9. **nginx healthcheck unhealthy (886회 실패)** — alpine wget이 `localhost`를 `::1`(IPv6)로 먼저 해석, nginx는 IPv4만 listen. healthcheck URL을 `http://127.0.0.1/health`로 변경 (PR #3, 서버에는 수동 적용 완료).

### Implementation Approach

**서버 컨벤션 일치**: blog.abada.co.kr 등 기존 서비스 참조 → `/data/abada-co-kr/<service>-abada-co-kr/<service>.abada.co.kr/` 디렉터리 패턴, single-file `docker-compose.prod.yml`, bind-mount data, container_name, 모든 non-nginx internal-only.

**포트 할당**: 사용 중인 abada.co.kr 대역 포트 (10200~10340) 스캔 → **10350** 다음 빈 슬롯 채택 (10280은 PORT_ALLOCATION.md엔 free였지만 실제로 사용 중이었음).

**브랜치 전략**: upstream `vibemafiaclub/argos`와 sync 가능하도록 `deploy/abada-selfhost` 브랜치에만 self-host 산출물 적재. `origin → saintgo7/argos`, `upstream → vibemafiaclub/argos` 재설정.

**이미지 부트스트랩**: PR 머지 전 GHCR에 이미지 없는 상태였음 → 서버에서 직접 `docker build -t ghcr.io/saintgo7/argos-web:latest .` 빌드 후 stack up. 향후 CI가 GHCR에 푸시하면 `compose pull web`으로 자연스럽게 덮어쓰기.

## Test Results

### Local build verification

```
docker build -f packages/web/Dockerfile → 597MB
docker compose up -d → all healthy (postgres + web)
curl localhost:10280/api/health → {"status":"ok"}
prisma migrate deploy → 10 migrations applied
```

### Server end-to-end

```
external GET https://argos.abada.co.kr/api/health → 200 {"status":"ok"}
external GET https://argos.abada.co.kr/ → HTTP/2 200 (Next.js SSR)
docker-compose ps → nginx healthy / web healthy / postgres healthy
```

### CLI ingest (smoke test)

```
~/.argos/config.json: token saved (login successful)
POST /api/orgs/abada-inc/projects → 201 (project cmod3z7ub000dq901bw458c37)
argos hook < {SessionStart, PreToolUse, PostToolUse, Stop} (4 events)
DB: events=3 rows / claude_sessions=1 row (smoke-1777047187, 345ms 세션)
Dashboard: /dashboard/abada-inc/sessions 에 표시
```

## Deployment

- **PR #1 (`deploy/abada-selfhost` → `main`)**: MERGED — `b8a3214 feat(deploy): self-host argos.abada.co.kr on abada-int-65 (Tier A)`
- **PR #3 (`fix/nginx-healthcheck-ipv4`)**: OPEN — `ef924ba fix(nginx): force IPv4 in healthcheck`. 서버에는 수동 적용으로 nginx healthy 상태.
- **PR #2 (`feat: add argos ECC bundle`)**: OPEN — 별도 작업, 본 로그 범위 밖.
- **자동 배포 CI**: GitHub Secrets(`ABADA_SSH_*`, `BASTION_SSH_*`) 미등록으로 3회 연속 `error: missing server host` 실패. 현재 서버는 수동으로 최신 코드 + 이미지 동기화 상태.

### Server snapshot (2026-04-28 05:39)

| service | uptime | status |
|---|---|---|
| nginx | 2d | healthy |
| web | 3d | healthy |
| postgres | 3d | healthy |

| table | rows |
|---|---|
| organizations | 1 (`abada Inc.`) |
| users | 1 (`e2both@gmail.com`, OWNER) |
| projects | 1 (`argos-smoke`) |
| claude_sessions | 1 |
| events | 3 |

## Next Steps

- [ ] **GitHub Secrets 등록** (사용자 직접): saas-abada-shop 레포에서 `ABADA_SSH_HOST/PORT/USER/KEY` + `BASTION_SSH_HOST/PORT/USER/KEY` 8개 복사. 등록 후 빈 commit push로 자동 배포 검증.
- [ ] **PR #3 머지** (`fix/nginx-healthcheck-ipv4`): 머지 후 자동 배포가 한 번 돌아 nginx healthcheck IPv4 변경이 GHCR 이미지에도 반영되는지 확인.
- [ ] **PR #2 검토** (`argos ECC bundle`): 별도 컨텍스트라 별도 dev-log entry로 다룰 것.
- [ ] **pg_dump cron 백업** 추가: `/data/abada-co-kr/argos-abada-co-kr/argos.abada.co.kr/backups/` 에 일일 dump + 7일 retention.
- [ ] **회원가입 비활성화** (admin invite-only): 첫 admin 확정 후 `/api/auth/register` 라우트 차단 또는 환경변수 게이트 추가.
- [ ] **Upstream 기여**: `output: 'standalone'`, `AUTH_TRUST_HOST` 문서화, `cli-request authUrl` 폴백, `auth-actions` eager import, `middleware` node runtime — 5개를 별 PR로 vibemafiaclub/argos에 제안.
- [ ] **CLI를 본인 프로젝트들에 연결**: 각 프로젝트 루트에서 `argos` 1회 실행 → `.argos/project.json` + `.claude/settings.json` 커밋. 팀원이 `git pull` 후 자동 합류.

## Related

- Commits (main):
  - `b8a3214` feat(deploy): self-host argos.abada.co.kr on abada-int-65 (Tier A) (#1)
  - `d137587` fix(ci): let pnpm/action-setup read version from packageManager
  - `5c6ce7f` fix(ci): build @argos/shared before argos-ai in deploy lint/test
- Open branches:
  - `fix/nginx-healthcheck-ipv4` (PR #3, `ef924ba`)
- PRs: https://github.com/saintgo7/argos/pulls
- Live: https://argos.abada.co.kr/dashboard/abada-inc
- Server path: `/data/abada-co-kr/argos-abada-co-kr/argos.abada.co.kr/` on abada-65
- Tunnel: `abada-srv65` (UUID `e8e3c4a4-4324-4cd2-9698-d0b1ed23514b`), config at `/home/blackpc/.cloudflared/config.yml`
