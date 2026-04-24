---
report_type: simulation_report
run_id: ecommerce-si-ax-exec-01_20260424_145814
persona_id: ecommerce-si-ax-exec-01
persona_version: 1
final_verdict: 실패
failure_reason: keyman_gives_up
execution_risk: 높음
created_at: 2026-04-24T16:15:00+09:00
---

# 최종 판정

**실패 (keyman_gives_up)**

5a에서 keyman은 `convince_stakeholders` / confidence 78로 설득 진입선은 충족했다. 5b에서 4명 중 3명(sh-ceo·sh-client-exec·sh-dev-lead) drop / 1명(sh-div-head) accept. 5c 라운드1에서 sh-ceo·sh-client-exec는 재설득 성공(accept)했으나, sh-dev-lead는 조건부 drop(55)으로 남았다. sh-dev-lead가 제시한 70+ 진입 조건 4종(자료 3종 실물 + Argos 커스텀 KPI 인터페이스 사양 + 메타데이터 송출 전수 명세 + RBAC 개발자 데이터 주권 정책)을 keyman이 현재 보유하지 못해, 5c 라운드2에서 keyman이 스스로 `drop`을 선택하며 설득 사이클을 종결했다. 5d 실무자(BFS) 단계는 진입하지 못함.

# 단계별 요약

- **5a keyman 초기** — `decision: convince_stakeholders` / `confidence: 78`
  - 핵심 사유: AX 성과 정량화 무기, 고객사 임원 veto 역공 재료, 진입장벽 낮음(무료 티어·OSS). 단 본질 관문(PG·batch 통합 실증) 미해결 + 벤더 레퍼런스·대외 제출용 PDF 미확인 등으로 confidence 85+ 도달 실패.
- **5b 직접 stakeholder 1차 리뷰** — accept 1 / drop 3
  - sh-div-head: **accept** (72) — 임원진 컨센서스 축의 우군 역할
  - sh-ceo: **drop** (66) — 가격/레퍼런스/벤더 3축 부재, 단 "파일럿 한정이면 묵인"
  - sh-client-exec: **drop** (52) — 벤더 내부 도구를 발주자 의사결정 라인에 올린 "패키징" 거부
  - sh-dev-lead: **drop** (35) — 본질 관문 비껴감, 감시 도구 프레임, 자체 구축 대안 우위
- **5c keyman 재응답 + 재검토**
  - Round 1 재응답: sh-ceo·sh-client-exec·sh-dev-lead 3건 모두 `reconvince`
    - sh-ceo: 범위 재조정("결재"→"0원 파일럿 + 실사 착수 묵인"), confidence 68
    - sh-client-exec: 범주 재조정(발주자 인보이스·SOW에서 분리, 셀프호스트 OSS 기본값, PG·batch 분리 트랙), confidence 58
    - sh-dev-lead: 직렬화 구도(파일럿→요구사양 생성기) + 2주 뒤 개발팀장 판단권 + KPI 공동설계자 초빙, confidence 55
  - Round 1 재검토: accept 2 / drop 1
    - sh-ceo: **accept** (76) — 자가 복귀 경로 그대로 밟음
    - sh-client-exec: **accept** (73) — 프레이밍 재조정으로 drop 근거 상당 부분 소거
    - sh-dev-lead: **drop** (55) — 조건부 보류("자료 4종 도착 후 재논의")
  - Round 2 재응답: sh-dev-lead에 대해 keyman **drop** (confidence 76) — 자료 공급 능력 부재, 정치 자본·AX 본업 우선순위 고려
- **5d 실무자 (BFS)** — **미진입** (keyman 5c 라운드2에서 give up)
  - reject: N/A
  - critical_accept: N/A
  - accept: N/A
  - positive_accept: N/A

# 실행 리스크

**높음** (시뮬 상 성사되지 않았으므로 "통과했다면" 가정 리스크 서술)

- `decision_authority: partial` + keyman이 자체적으로 시인한 "자료 공백" 상태에서 파일럿이 강행되었다고 가정하면, 실무자 축(특히 sh-dev-lead influence 75 → sh-dev-senior weight 80, sh-dev-junior weight 70, sh-planner weight 50)이 drop/critical_accept 비중으로 기울 확률이 매우 높다. profile에서 이미 "개발팀장 drop → 시니어 동조 → 주니어 시니어 눈치" 경로가 명시되어 있다.
- sh-ceo·sh-client-exec가 round 1 recheck에서 accept했지만 모두 **잠정·조건부 accept**다. 서면 산출물(메타데이터 송신 범위 정의서 PDF, SOW 부속서 문안, PG·batch 품질계획서, 파일럿 철거 절차서, TCO 견적표, 벤더 회사 정보, 유사 규모 레퍼런스) 중 어느 하나라도 누락되면 양쪽 모두 파일럿 착수 직전 단계에서 즉시 재drop 선언 권한을 유지 중. 이는 "통과"로 보이지만 실제 도입 전환점에서 재차 tumble할 확률이 높은 구조.
- partial authority + 높은 실무자 반발 비중 + keyman 본인이 자료 부족을 인정 → `높음`.

# 가치제안 개선 포인트

1. **50+명 규모 TCO 사전 견적표 부재 — 4/4 stakeholder 언급** — "상세 가격은 협의" 한 줄이 모든 직접 stakeholder의 공통 차단 사유. 대표 발화: "*50+명 규모 연간 TCO를 추산할 수 없다. 나는 임원진·이사회 앞에 숫자 없이 안건을 못 올린다*" (sh-ceo). 개선 방향: 팀 플랜 전환 임계점·단위 단가·연간 TCO 시나리오를 공개 또는 반공개 견적표로 고정.

2. **규제·감사 통과 레퍼런스 부재 (금융·공공·패션 유통) — 4/4 stakeholder 언급** — 대표 발화: "*감사 통과 레퍼런스가 한 건이라도 있는가 (없다면 우리가 1번 사례가 되는 부담을 떠안는 것)*" (sh-client-exec). keyman도 "함께 만들어가는 건으로 열어두는 편이 정직"하다고 인정할 수밖에 없었음. 개선 방향: ISO/SOC 인증 상태, 외부 감사 통과 이력, 유사 규모 SI·금융·공공·유통 도메인 레퍼런스 케이스 1건 이상.

3. **벤더 회사 정보·지속성 증빙 부재 — 3/4 stakeholder 언급** — 대표 발화: "*회사 정보, 운영 기간, 유사 규모 고객 사례가 단 하나도 없다. 셀프호스트 OSS 옵션은 완충재이지 면죄부는 아니다*" (sh-ceo). 25+년 업력 SI가 전사 표준에 신생 SaaS를 걸기에 회사 설립 연도·인력·재무·SLA 다운타임 지표가 비어 있음. 개선 방향: 회사 소개 페이지, SLA 명세, 지난 12개월 가용성 지표, 파산·서비스 종료 시 데이터 export·OSS 자립 보장 조항.

4. **대외 제출 가능한 리포트·대시보드 시각 완성도(PDF 샘플) 미확인 — 4/4 stakeholder 언급** — keyman 본인이 initial에서 -10 감점을 적용한 항목. 대표 발화: "*고객사 임원에게 보일 수 있는 리포트/대시보드 시각 완성도(샘플 PDF 1장이라도). 없으면 'AI 도입 + 모니터링도 깔았다' 서사를 내가 직접 받쳐주기 어렵다*" (sh-ceo). 개선 방향: 임원·고객사 제출용 1-Pager 리포트 샘플 PDF를 가치제안에 첨부.

5. **skill/subagent ROI 측정 방법론 신뢰도 — 3/4 stakeholder 언급 (결정적으로 sh-dev-lead의 round 2 drop 원인)** — 대표 발화: "*호출 빈도=효과가 아닌데 '쓰이는 skill vs 죽은 skill'을 이 지표로 판별한다는 게 정당한가. 측정 모델이 조악하면 잘못 버려지는 skill이 생긴다*" (sh-dev-lead). 관련 세트: 토큰 사용량의 생산성 대리지표 부적합성, 커스텀 KPI 쿼리·리포트 인터페이스 사양 미공개. 개선 방향: ROI 측정 방법론 화이트페이퍼, SQL/커스텀 쿼리 인터페이스 사양, 사용자 정의 리포트 템플릿 범위 공개.

6. **메타데이터 송출 전수 명세·NDA 충돌 가능성 — 2/4 stakeholder 언급** — 대표 발화: "*파일 경로·모듈명·커밋 해시 등 IP 추적이 가능한 항목이 포함된다면, 우리 측 정보보호 검토에서 통과되지 못한다*" (sh-client-exec). "코드 내용 미전송, 메타데이터만"의 **구체적 화이트리스트** 부재. 개선 방향: 전송 항목 전수 명세서 PDF, 고객사 NDA 충돌 가능 항목 명시.

7. **셀프호스트 OSS 운영 성숙도·책임 주체 모호 — 3/4 stakeholder 언급** — 대표 발화: "*셀프호스트를 선택하는 순간 '자체 구축' 대비 이점이 거의 사라진다(유지보수 공수는 똑같이 우리 팀 부담)*" (sh-dev-lead). OSS 경로가 모든 보안·감사 우려의 완충재로 반복 소환되지만 운영 인력·인프라 사양·업그레이드 사이클·책임 귀속이 블랙박스. 개선 방향: OSS 운영 Runbook, 필요 인프라 사양, 업그레이드 주기, 벤더 지원 범위 명시.

# 페르소나 보정 힌트

- **파일: 02_stakeholder_sh-dev-lead.md** — `tech_literacy: high` + "개발자 중심 문화 상징" personality_notes와 매우 일관된 반응. 자체 구축 대안을 "switching_cost high(페르소나 정의)"가 아니라 "2-4주 1-2 스프린트 수준 low cost"로 정면 반박했고, 메타데이터 전수조사·RBAC 개발자 주권·ROI 측정 모델 정당성 등 **제품 깊이의 기술 반박**을 일관되게 제기. 페르소나 profile의 `competing_solutions[자체 대시보드 구축].switching_cost: high` 값이 sh-dev-lead의 실제 반박 톤과 부정합 — 개발팀장 관점에서는 switching_cost가 medium 또는 low로 체감될 소지. **보정 제안**: `competing_solutions[자체 대시보드 구축]`에 "dev-lead 관점 switching_cost: low" 메모 추가.

- **파일: 02_stakeholder_sh-client-exec.md → 04_stakeholder_recheck_sh-client-exec_round1.md** — `trust_with_keyman: 70`과 "패션업: 신기술 도입 친화적 vs 백엔드 안정성 엄격"이라는 양면성이 round 1 drop(52) → round 1 recheck accept(73) 전환에서 자연스럽게 표현됨. 특히 "Argos/AX 프로젝트 전체 거부가 아니라 이번 패키징을 거부"라는 분리 수용, "셀프호스트 OSS 기본값 고정" 양보를 수용한 것이 influence 90 × trust 70 조합에 부합. 부자연스러운 지점 없음.

- **파일: 02_stakeholder_sh-ceo.md → 04_stakeholder_recheck_sh-ceo_round1.md** — `decision_weight_hint: 최종 품의권자 + 실패 리스크 민감` / `trust_with_keyman: 75` 기준, round 1 drop을 "파일럿 한정 묵인 / 조건 서면 제시"로 명시한 것 및 recheck에서 "자가 복귀 경로를 keyman이 정확히 밟았다"는 이유로 accept 전환한 흐름이 매우 일관적. 보정 불필요.

- **파일: 02_stakeholder_sh-div-head.md** — `trust_with_keyman: 80` + "keyman의 가장 가까운 내부 우군" 기술에 완전 부합하는 accept(72, 조건부). `connected_to sh-dev-lead weight 70` 채널을 "keyman의 설득 동선을 작동시키는 결정적 레버"로 자기 해석하는 부분이 profile의 역학 메모와 정확히 맞물림. 자연스러움.

- **파일: 01_keyman_initial.md** — `decision_authority: partial` + `trust_with_salesman: 70`의 조합에서 confidence 78은 약간 상단이지만 "파일럿 수준이면 내 partial 권한 안에서 PoC 결정 자체는 쉽게 방어 가능, blast radius 작음"이라는 논리가 근거로 명시되어 있어 과도한 낙관으로 보이지 않음. personality_notes의 "AX 신설 포지션 정당성 확보" 동기가 지속적으로 등장 — `03_keyman_response_sh-dev-lead_round2.md`의 "내 정치 자본의 우선 용처는 AX 본업"에서 최종 give up 근거로 정당하게 작동. 자연스러움.

- **파일: 03_keyman_response_sh-dev-lead_round2.md** — keyman의 `risk_preference: moderate` 값이 "자료 공백 상태 재설득 강행 거부 → 자료 확보 사이클로 전환"으로 나타난 것은 일관적. 다만 AX 임원의 "missions"가 강하게 드러난 페르소나였음에도 partial authority × dev-lead influence 75 앞에서 비교적 이른 시점에(round 2) 포기 결정을 내린 것은, `personality_notes`에 기술된 "개발팀장과의 정치적 긴장 잠재" 속성이 행동에 제대로 반영된 결과로 판단. 자연스러움.

- **unknown 필드 기인 비관 수렴 흔적** — sh-ceo/sh-client-exec의 `tech_literacy: unknown`이 round 1 drop에서 "벤더 회사 정보/감사 레퍼런스 부재"로 결정 근거를 몰아갔으나, 이는 profile 본문이 금융·공공 레퍼런스 이력을 명시한 것과 정합적인 리스크 회피 반응으로 판단. 과도한 비관 수렴으로 보이지는 않음.

# 세션 로그

- 01_keyman_initial.md
- 02_stakeholder_sh-ceo.md
- 02_stakeholder_sh-client-exec.md
- 02_stakeholder_sh-dev-lead.md
- 02_stakeholder_sh-div-head.md
- 03_keyman_response_sh-ceo_round1.md
- 03_keyman_response_sh-client-exec_round1.md
- 03_keyman_response_sh-dev-lead_round1.md
- 03_keyman_response_sh-dev-lead_round2.md
- 04_stakeholder_recheck_sh-ceo_round1.md
- 04_stakeholder_recheck_sh-client-exec_round1.md
- 04_stakeholder_recheck_sh-dev-lead_round1.md
