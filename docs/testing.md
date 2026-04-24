# Testing Policy

상세 가이드: [.claude/skills/test-strategy/SKILL.md](../.claude/skills/test-strategy/SKILL.md). 하네스(plan-and-build / check 단계) 는 이 문서의 요약을 읽고 세부는 skill 을 따른다.

## 대원칙

1. **테스트는 안전망이다.** "돌아간다" 가 아니라 "변경해도 안전하다" 가 목표.
2. **결정적 로직 → 순수 함수로 추출 → 단위 테스트.** 파싱·변환·계산·포맷팅·분기 규칙은 이 레일로.
3. **DB·네트워크·파일시스템은 목(mock) 대신 실물 또는 skip.** 목은 거짓 신호를 주는 일이 잦다.
4. **테스트가 어려우면 설계가 잘못된 것이다.** 먼저 순수 로직과 부수효과를 분리하라.
5. **커버리지 숫자는 지표가 아니다.** 핵심 분기·엣지케이스가 빠졌는가가 지표다.

## 대상

- ✅ 문자열 파싱·포맷팅, 순수 계산, 데이터 변환, 권한/상태머신, 정규식·AST.
- ❌ UI 렌더링(수동 확인), Prisma 호출(실 DB 통합 테스트), 외부 API 호출, 1회성 스크립트.

## 배치

- 순수 함수: `packages/<pkg>/src/lib/<concept>.ts` + 같은 디렉터리에 `<concept>.test.ts`.
- 참고: `packages/web/src/lib/slash-command.ts` + `slash-command.test.ts`.

## 하네스(check) 에서의 적용

plan-and-build 가 작성한 Acceptance Criteria 는 가능한 한 위 "대상 ✅" 에 해당하는 순수 로직으로 쪼개서 단위 테스트로 고정한다. UI/통합 수준의 AC 는 수동 probe 로 검증 (persuasion-review 의 UX probe 경로).
