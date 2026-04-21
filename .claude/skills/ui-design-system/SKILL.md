Argos 웹 대시보드의 UI/디자인 시스템 가이드. 대시보드 UI 화면/컴포넌트/스타일을 추가·수정할 때 항상 참조해 톤앤매너와 공용 컴포넌트 규칙을 일관되게 적용한다. 특히 `packages/web/` 하위 React/Tailwind 코드를 만들거나 바꿀 때, 또는 사용자가 "UI 추가/개선/디자인/스타일/톤"을 언급할 때 자동 트리거.

---

## 1. 디자인 무드

- **다크 퍼스트(Dark-first)**. `<html class="dark">`가 기본. 라이트 토큰은 유지하되 사용하지 않음.
- 배경은 **차가운 느낌의 near-black**, 카드는 한 단계 밝은 톤, **보더보다 배경 단차로 계층**을 만든다.
- 악센트는 **2색 체제**: 브랜드 주색(코랄/오렌지) + 보조색(소프트 블루). 색상을 늘리지 않는다.
- 정보 밀도 높게: **패딩 타이트, 큰 숫자 + 작은 라벨**의 위계, 여백보다 서브틀한 구분선.
- 그림자 대신 **얇은 보더(white/8~10%)** 와 배경 톤 차이로 카드 분리.

## 2. 색상 토큰 (semantic)

모든 색상은 `globals.css`의 CSS 변수에서 가져오며 Tailwind 유틸로 노출돼 있다. **절대로 `text-gray-*`, `bg-white`, `bg-blue-600`, `text-red-*` 같은 하드코딩 색상을 쓰지 말 것.**

| 유틸 | 용도 |
|---|---|
| `bg-background` / `text-foreground` | 페이지 기본 배경/텍스트 |
| `bg-card` / `text-card-foreground` | 카드 배경 |
| `bg-card-elevated` | 카드 위의 강조 블록 (메트릭 하이라이트, 선택된 리스트 행) |
| `bg-muted` / `text-muted-foreground` | 보조 영역, 2차 텍스트(라벨/캡션) |
| `bg-secondary` / `text-secondary-foreground` | 중립 버튼·칩 배경 |
| `border-border` | 모든 보더 (카드, 구분선) |
| `bg-primary` / `text-primary-foreground` | 1차 CTA, 활성 내비 |
| `text-brand` / `bg-brand` / `bg-brand-subtle` | 브랜드 코랄 악센트, 차트 주 시리즈 |
| `text-brand-2` / `bg-brand-2` / `bg-brand-2-subtle` | 보조 블루 악센트, 차트 보조 시리즈 |
| `text-success` | 상승 변화율, 긍정 상태 |
| `text-danger` / `text-destructive` | 하락 변화율, 파괴적 액션 |
| `ring-foreground/10` | 카드 외곽 (현재 `Card` 컴포넌트 규약) |

**차트 시리즈**: 첫 시리즈 `chart-1`(=brand), 둘째 `chart-2`(=brand-2), 셋째 `chart-3`(success/green), 넷째 `chart-4`(warm yellow), 다섯째 `chart-5`(purple). 그 이상 필요하면 디자인 토큰 추가를 상의.

## 3. 타이포그래피

- 기본 폰트: Inter (CSS var `--font-sans`), 이미 전역 적용.
- 숫자는 `tabular-nums` 필수 (테이블/메트릭 정렬).
- **메트릭 전용 유틸**이 준비돼 있음:
  - `.metric-value` — 큰 숫자 (28px / semibold / tight / tabular)
  - `.metric-label` — 작은 라벨 (12px / muted)
  - `.metric-change` + `.metric-change-up` / `.metric-change-down` — 변화율 `+10.7%↑` / `-6.0%↓`
- 타이틀 위계:
  - 페이지 H1: `text-xl font-semibold` (또는 `text-2xl` 한정)
  - 섹션/카드 타이틀: `text-base font-medium`
  - 본문: 기본 `text-sm`. 설명/캡션은 `text-xs text-muted-foreground`.
- 긴 문장에 `leading-tight` 남발 금지. 메트릭 숫자에만 사용.

## 4. 간격, radius, 보더

- **radius 기본값 `--radius: 0.625rem` (10px)**. Tailwind `rounded-md` / `rounded-lg` / `rounded-xl` 그대로 사용.
  - 카드: `rounded-xl`
  - 칩/버튼/pill: `rounded-md` 또는 `rounded-full`
  - 인라인 프로그레스 바: `rounded-sm`
- 카드 내부 패딩 기본 `p-4` (`size="sm"`일 때 `p-3`). 밀집 레이아웃이 원칙.
- 카드 사이 간격: `gap-3` ~ `gap-4`. 페이지 레벨 섹션 간격은 `gap-6`.
- 보더는 **한 톤만**: `border border-border` 또는 `ring-1 ring-foreground/10` (카드). **두 톤 이상 겹치지 말 것.**

## 5. 공용 컴포넌트 규칙

### 재사용 우선
- UI 프리미티브: `packages/web/src/components/ui/` (Card, Button, Input, Tabs, Select 등 shadcn/ui 기반)
- 도메인 위젯: `packages/web/src/components/dashboard/`
- 레이아웃: `packages/web/src/components/layout/`

**새 UI를 만들기 전에 반드시 위 세 디렉터리를 확인**하고, 3곳 이상 반복되는 패턴은 바로 공용화한다.

### 이미 준비된 공용 컴포넌트 (반드시 재사용)

| 컴포넌트 | 파일 경로 | 용도 |
|---|---|---|
| `MetricCard`, `MetricBar` | `components/dashboard/metric-card.tsx` | 라벨+큰 숫자+변화율. `MetricBar`로 감싸면 가로 밀집 그리드 |
| `ChangeIndicator` | `components/dashboard/change-indicator.tsx` | `+10.7%↑` / `-6.0%↓` 규격화. 값 0 → muted |
| `ChartCard` | `components/dashboard/chart-card.tsx` | 제목·설명·우측 action 슬롯·차트 영역 공통 프레임 |
| `StatList`, `StatListRow` | `components/dashboard/stat-list.tsx` | 아이콘+라벨+인라인 퍼센트 바+우측 숫자. `tone: 'brand' \| 'brand-2' \| 'muted'` |
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | `components/ui/tabs.tsx` | 미니멀 탭 (active만 브랜드 하이라이트) |
| `DateRangePicker` | `components/dashboard/date-range-picker.tsx` | pill 그룹 프리셋 + 현재 범위 라벨 |
| `Card` (+ 서브컴포넌트) | `components/ui/card.tsx` | `rounded-xl bg-card ring-1 ring-foreground/10` 자동 적용 |

**직접 카드/메트릭/리스트 DOM 만들지 말 것.** 필요한 패턴이 위 표에 없으면 새 컴포넌트를 만들고 이 표에 추가한다.

### 차트 구현 규약 (Recharts)
- 축/그리드 색: `stroke="var(--color-border)"` 또는 `stroke="var(--color-muted-foreground)"`
- 시리즈 색: `fill="var(--color-chart-1)"`, `stroke="var(--color-chart-2)"` 순서대로
- 축선은 `tickLine={false} axisLine={false}` 제거
- 툴팁 컨테이너: `rounded-lg border border-border bg-popover text-popover-foreground shadow-lg p-3`
- 커서: `cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}` (바 차트) / `cursor={{ stroke: 'var(--color-border)' }}` (라인)

## 6. 레이아웃 패턴

- **상단 컨트롤 바**: 좌측에 컨텍스트(프로젝트/타이틀), 우측에 필터·범위·액션. 모두 pill 버튼 그룹.
- **메트릭 바(행 전체 한 줄)**: 화면 가로를 꽉 채우는 밀집형. 각 셀 사이 `divide-x divide-border`.
- **메인 차트 카드**: 상단 메트릭 바 바로 아래, 너비 full. 차트 배경은 은은한 그라데이션 허용.
- **좌/우 2-컬럼 리스트**: 차트 하단에 탭 헤더 + `StatListRow` 리스트 2개. 인라인 퍼센트 바로 비중 시각화.
- **모바일**: 1-컬럼 스택. 메트릭 바는 가로 스크롤(`overflow-x-auto`) 허용.

## 7. Do / Don't

### Do
- 색은 **항상 semantic 토큰**으로 (`bg-card`, `text-muted-foreground`, `text-brand`).
- 변화율은 **항상 `.metric-change` + up/down 한 쌍**으로 (직접 `text-green-500` 금지).
- 숫자에 `tabular-nums`.
- 카드는 `Card` 컴포넌트 재사용. 직접 `<div className="bg-card rounded-xl ...">` 만들지 말 것.
- 차트는 `chart-1~5` 토큰 사용.

### Don't
- `text-gray-*`, `bg-gray-*`, `bg-white`, `text-white`, `text-red-*`, `bg-blue-*` 등 Tailwind 팔레트 직접 사용 금지.
- 그림자(`shadow-*`) 남용 금지. 기본은 **보더+배경 단차**.
- 새 브랜드 색/악센트 색 임의 추가 금지. 필요 시 토큰 추가 후 이 문서 갱신.
- 카드 중첩으로 계층 만들지 말 것. 필요하면 `bg-card-elevated`로 한 톤만.
- 라이트 모드 전용 하드코딩 (`bg-white` 등) 절대 금지 — 프로젝트는 다크 기본.

## 8. 파일 위치 참조

- 토큰 정의: `packages/web/src/app/globals.css`
- 다크 기본 적용: `packages/web/src/app/layout.tsx` (`<html className="... dark">`)
- 기존 프리미티브: `packages/web/src/components/ui/`
- 대시보드 위젯: `packages/web/src/components/dashboard/`
- 레이아웃: `packages/web/src/components/layout/`

새 토큰을 추가하거나 이 가이드와 충돌하는 결정을 내릴 때는 **먼저 이 파일을 업데이트**한 뒤 구현한다.
