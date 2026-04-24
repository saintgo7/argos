# Spec

이 문서는 plan-and-build 가 "라우트 · 데이터 모델 · API 계약" 을 찾을 때의 진입점이다. 실제 내용은 다음 4개 파일에 분산돼 있고, 업데이트는 각 원본에서 한다.

## 구조

| 영역 | 원본 |
|---|---|
| 전체 아키텍처 (모노레포 구성, 패키지 경계, 의존성, 주요 모듈) | [code-architecture.md](./code-architecture.md) |
| DB 스키마 · 도메인 모델 · 핵심 타입 | [data-schema.md](./data-schema.md) |
| 사용자 플로우 · CLI 이벤트 파이프라인 · 웹 화면 전환 | [flow.md](./flow.md) |
| 과거 의사결정 로그 (왜 이렇게 갔는가) | [adr.md](./adr.md) |

## 패키지 요약

- `packages/cli` — `argos-ai`. Claude Code hooks 에 붙어 이벤트 수집·전송.
- `packages/web` — Next.js 대시보드. 팀 / 프로젝트 / 세션 뷰. RBAC(VIEWER/MANAGER).
- `packages/shared` — 공용 타입·유틸.

## 계약의 원천

- DB 스키마: `packages/web/prisma/schema.prisma` (항상 이게 진실).
- Hook 이벤트 페이로드: `packages/cli/src/hooks/` 및 수신측 `packages/web/src/app/api/events/`.
- 웹 API 라우트: `packages/web/src/app/api/**/route.ts`.

스펙과 코드가 어긋나면 **코드가 맞다**. 문서를 맞춰 고쳐라.
