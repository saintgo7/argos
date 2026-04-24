# Requirement

## 가치제안

# Argos 가치제안

**Claude Code를 쓰는 팀을 위한 Google Analytics.**

---

## 제품 개요

Argos는 팀이 Claude Code를 얼마나, 어떻게 쓰고 있는지 — 세션·토큰·skill·subagent 활용 — 한 대시보드에서 볼 수 있게 해주는 관찰 플랫폼입니다.

## 핵심 가치

### 1. 가시성
팀 전체의 Claude Code 활동을 한 곳에서 확인합니다.
- 누가 언제 어떤 skill / subagent를 썼는가
- 프로젝트별, 팀원별 사용 패턴 비교
- 세션 단위 상세 로그

### 2. 토큰 한도 관리
대부분 구독 플랜이라 "비용" 서사는 약합니다. 대신 **토큰 사용/한도**를 중심에 둡니다.
- 입력/출력/캐시 토큰 별도 추적
- 모델별(Opus, Sonnet, Haiku) 사용량 분석
- 토큰 한도 대비 소진율 알림

### 3. Skill / Agent ROI
팀이 만든 skill·subagent 중 실제로 쓰이는 것과 죽은 것을 구분합니다.
- skill별 호출 빈도 및 성공률
- subagent 활용 패턴
- 투자 대비 효과 측정

### 4. 0 설정 합류
```bash
argos init
```
한 번이면 프로젝트 셋업 + 팀 합류 끝. 이후 팀원은 추가 행동 불필요.
- Claude Code hooks 자동 설정
- 팀 초대 링크로 원클릭 합류

---

## 기술 아키텍처

### 데이터 수집 방식
- Claude Code의 hooks 기능 활용 (SessionStart, PreToolUse, PostToolUse, Stop 이벤트)
- 로컬 CLI가 이벤트를 API로 전송
- 코드 내용은 전송하지 않음 — 메타데이터만

### 배포 옵션
1. **관리형 SaaS**: 즉시 사용 가능, 무료 티어 제공
2. **셀프호스트 OSS**: 자체 인프라에 배포 가능

### 기술 스택
- CLI: Node.js (npm 패키지)
- API: Node.js + Hono (Railway)
- Web: Next.js (Vercel)
- DB: PostgreSQL (Supabase)

---

## 대형 SI 프로젝트에서의 활용 시나리오

### 50+명 규모 프로젝트 관리
- **팀별 사용 현황 대시보드**: 개발팀, QA팀, 기획팀의 Claude Code 활용도 비교
- **개인별 생산성 지표**: 세션당 평균 토큰, 자주 쓰는 skill 패턴
- **프로젝트 마일스톤별 추적**: 설계 단계 vs 구현 단계 vs 버그픽스 단계의 AI 활용 변화

### AX 도입 효과 측정
- **Before/After 비교**: AI 도입 전후 개발 생산성 지표 (토큰 활용 패턴 기반)
- **ROI 리포트**: 팀이 만든 커스텀 skill의 실제 활용률
- **모범 사례 발굴**: 생산성 높은 팀원의 사용 패턴 분석 및 공유

### 거버넌스 / 감사 대응
- **사용 이력 아카이브**: 누가 언제 어떤 AI 기능을 썼는지 추적 가능
- **RBAC**: VIEWER / MANAGER 역할 분리로 민감 데이터 접근 제어
- **외부 감사 대응**: AI 도입 현황을 정량적으로 보고 가능

---

## 가격

- **무료 티어**: 소규모 팀, 기본 대시보드
- **팀 플랜**: 팀 멤버 수 + 이벤트 보관 기간 + 고급 리포트 기반 과금
- **엔터프라이즈**: 셀프호스트 옵션, SLA, 전용 지원

상세 가격은 협의.

---

## 경쟁 대안 대비

| 옵션 | 장점 | 단점 |
|------|------|------|
| **모니터링 부재 (현 상태)** | 추가 비용 없음 | 팀별 사용 현황 파악 불가, 블랙박스 |
| **자체 대시보드 구축** | 완전한 커스터마이징 | 초기 구축 비용·공수, 유지보수 부담 |
| **Argos** | 0 설정, 즉시 시작, OSS 옵션 | 외부 서비스 의존 (단, 셀프호스트 가능) |

---

## 다음 단계

1. `argos init`으로 파일럿 프로젝트에 설치 (5분)
2. 1-2주간 실제 사용 데이터 수집
3. 대시보드에서 팀 활용 패턴 확인
4. 본격 도입 여부 결정

## 채택된 요구사항

- **run_id**: `ecommerce-si-ax-exec-01_20260424_145814`
- **title**: Skills/Agents 대시보드에 "Success rate"와 "Active users" 컬럼 추가 + 각 대시보드 지표의 계산 방법 공개 (in-dashboard tooltips + `/docs/metrics-methodology`)

### 유래한 고객 pain + 근거 인용

소스: `persuasion-data/runs/ecommerce-si-ax-exec-01_20260424_145814/report.md`. 페르소나 `ecommerce-si-ax-exec-01` (e커머스 SI 중견기업 AX 담당 임원). 시뮬 최종 판정 **실패 (keyman_gives_up)**. 5c 라운드2에서 sh-dev-lead(개발팀장, influence 75, trust 65)가 조건부 drop(55)로 남았고 keyman이 sh-dev-lead의 70+ 진입 조건 4종을 공급하지 못해 스스로 give up. 진입 조건 4종 중 2종 ("Argos 커스텀 KPI 인터페이스 사양", "측정 모델 정당성") 이 본 요구사항으로 커버된다.

report.md 직접 인용 (가치제안 개선 포인트 #5 — 3/4 stakeholder 언급, sh-dev-lead round 2 drop의 **결정적 원인**):

> skill/subagent ROI 측정 방법론 신뢰도 — 3/4 stakeholder 언급 (결정적으로 sh-dev-lead의 round 2 drop 원인) — 대표 발화: "*호출 빈도=효과가 아닌데 '쓰이는 skill vs 죽은 skill'을 이 지표로 판별한다는 게 정당한가. 측정 모델이 조악하면 잘못 버려지는 skill이 생긴다*" (sh-dev-lead). 관련 세트: 토큰 사용량의 생산성 대리지표 부적합성, 커스텀 KPI 쿼리·리포트 인터페이스 사양 미공개. 개선 방향: ROI 측정 방법론 화이트페이퍼, SQL/커스텀 쿼리 인터페이스 사양, 사용자 정의 리포트 템플릿 범위 공개.

제품 mission(`docs/mission.md` L13)에 "Skill / Agent ROI: 팀이 만든 skill·subagent 중 실제로 쓰이는 것과 죽은 것 구분"이 핵심 가치로 선언되어 있으나, 현재 Skills/Agents 페이지는 **호출 수(callCount)만 노출**하고 있어 "호출 수 = ROI"라는 의심을 정면으로 부른다.

### 구현 스케치

1. **API 확장** — Skills / Agents 양쪽 route (`packages/web/src/app/api/orgs/[orgSlug]/dashboard/{skills,agents}/route.ts`):
   - 기존 집계 SQL에 두 컬럼 추가:
     - `COUNT(DISTINCT user_id) AS user_count`
     - `SUM(CASE WHEN event_type='POST_TOOL_USE' AND (exit_code IS NULL OR exit_code = 0) THEN 1 ELSE 0 END)::float / NULLIF(SUM(CASE WHEN event_type='POST_TOOL_USE' THEN 1 ELSE 0 END), 0) AS success_rate`
   - 응답 DTO에 `userCount: number`, `successRate: number | null` 추가 (`@argos/shared`의 SkillStat / AgentStat 타입 확장).

2. **UI 확장** — Skills / Agents 페이지 (`packages/web/src/app/dashboard/[orgSlug]/{skills,agents}/page.tsx`):
   - 테이블에 "Users"와 "Success rate" 두 컬럼 추가.
   - 각 컬럼 헤더에 info icon → 툴팁. 툴팁 문구는 **공학적 정의 그대로** 표시 (예: "POST_TOOL_USE 이벤트 중 exit_code가 null이거나 0인 비율"). "성공률"이라는 모호한 일반어 단독 사용 금지.

3. **방법론 페이지** — `/docs/metrics-methodology` 정적 Next.js 라우트 신규 (MDX 또는 일반 page.tsx, CMS 금지):
   - 모든 대시보드 지표(callCount, sessionCount, userCount, successRate, 토큰 지표, 추정 비용)의 SQL 집계 공식 + 해석 가이드.
   - "죽은 skill" 판별 **예시 임계값** 제시 (예: "최근 30일 callCount == 0 AND userCount <= 1"). 단, 자동 라벨링/경고/색상 표시 **없음** — 날 것 숫자만.
   - toolInput/toolResponse는 지표 집계에 사용되지 않음을 명시 (privacy 페이지와 상호 참조).

4. **CLI/파이프라인 변경 없음, Prisma 마이그레이션 없음, 새 의존성 없음.** 기존 `events` 테이블의 `exit_code`, `user_id`, `event_type`, `is_skill_call`, `is_agent_call` 컬럼만 활용.

예상 규모: API 2개 + UI 2개 + 공유 타입 1개 + 신규 정적 라우트 1개 + docs 1개 + 테스트. 약 300~500 LoC.

### CTO 승인 조건부 조건

1. **티켓 첫 단계에서 prod sanity check 필수**: POST_TOOL_USE 이벤트 중 `exit_code IS NOT NULL` 비율, `is_skill_call=true AND event_type='POST_TOOL_USE'` 이벤트가 실제로 존재하는지 SQL로 확인한 뒤 본 구현에 착수. exit_code null 비율이 높으면 successRate 정의를 "exit_code가 기록된 호출 중 성공 비율"로 좁히고 툴팁/docs에 명시. 이 체크가 실패하면(POST_TOOL_USE가 거의 안 쌓임 또는 exit_code가 대부분 null) 티켓은 일시 보류하고 수집 파이프라인 쪽 원인 조사로 전환.

2. **successRate 정의의 투명성 고정**: "호출 성공률"이라는 일반어 단독 사용 금지. 툴팁과 `/docs/metrics-methodology`에 정확히 `POST_TOOL_USE 이벤트 중 exit_code 0 또는 null 비율`로 공식 그대로 노출. 공학적 정의 없이 쓰면 동일한 "측정 모델 조악" 공격을 자초한다.

3. **"죽은 skill" 자동 라벨 금지 재확인**: docs에는 판별 **예시 임계값**만 제시하고, UI는 라벨/경고/색 표시 없이 날 것 숫자만. 판별 기준은 사용자 외부화.

4. **`/docs/metrics-methodology`는 단일 정적 Next.js 라우트**로 구현. CMS/문서 시스템 도입 금지.
