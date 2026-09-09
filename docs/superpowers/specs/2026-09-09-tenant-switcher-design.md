# 회사 전환 UI (Spec 2) — 설계

> 멀티테넌시 백엔드(Spec 1, 2026-06-30 merge)의 후속. 한 사용자가 소속된 여러 고객사(테넌트)를
> 웹 화면에서 확인·전환할 수 있게 한다. 백엔드 API 는 Spec 1 에서 완성 — **이번 spec 은 웹(apps/web) 전용**.
> UI 배치는 시안 B(사이드바 하단 스위처, `tenant-switch-mockup.html`) 채택 확정.

## 0. 배경 · 목표

- **현재**: JWT 에 activeTenantId 가 실리고 모든 데이터가 활성 테넌트로 격리되지만, 웹에는
  현재 어느 테넌트인지 표시도, 전환 수단도 없다.
- **목표**: 사이드바 하단에 현재 회사 + 역할을 상시 표시하고, 클릭 시 소속 회사 목록을 펼쳐
  다른 회사로 전환(토큰 재발급 + 전체 새로고침)할 수 있게 한다.
- **성공 기준**: 다중 소속 사용자가 클릭 두 번으로 회사를 전환하고, 전환 후 화면의 모든 데이터
  (계약·알림·대시보드)가 새 테넌트 것으로 바뀐다. 단일 소속 사용자는 전환 UI 에 방해받지 않는다.

## 1. 사용할 백엔드 계약 (Spec 1 기완성 — 변경 없음)

- `GET /auth/me/tenants` → `TenantMembership[]` = `{ tenantId, name, role, isActive }` (contracts 패키지 기존 타입)
- `POST /auth/switch-tenant { tenantId }` → 새 access/refresh 토큰 (비멤버 403)
- JWT: `activeTenantId` / `activeRole` / `isSystemAdmin`

## 2. UI — 시안 B

### 2.1 접힌 상태 (상시 표시)

- 위치: `Sidebar.tsx` — nav 아래, 유저 foot(아바타·이름·로그아웃) **바로 위**.
- 구성: 회사 이니셜 배지(회사명 첫 글자) + 회사명. 스타일은 사이드바 네이비 토큰
  (`rgba(255,255,255,.06)` 배경, navyLine 보더) — 시안 B 의 `swbtn dark`.
- 소속 회사 **2개 이상**: 우측에 ▲ 캐럿, 클릭 가능.
- 소속 회사 **1개**: 캐럿·클릭 없이 표시만 (대다수 사용자).
- 소속 회사 **0개** (시스템 admin 이 테넌트 없이 로그인): 스위처 미렌더.

### 2.2 펼친 상태 (드롭다운)

- 클릭 시 **위로** 펼침. 헤더 "소속 회사 (N)" + 회사 행 목록.
- 행: 이니셜 배지 + 회사명 + 역할 한국어 라벨. 활성 회사는 강조 배경 + ✓ 체크.
- 구현: lawkit Popover/Dropdown 미사용(라이트 서피스·폼 셀렉트 용도라 네이비 사이드바에 부적합).
  NotificationBell 과 동일한 **선언적 open 상태**(`useState`) + 커스텀 드롭다운. 바깥 클릭 시 닫힘은
  NotificationBell 의 기존 방식을 따른다.
- 역할 라벨 매핑(utils): general=일반, contractManager=계약담당자, inHouseCounsel=사내변호사,
  outsideCounsel=사외변호사, sealManager=날인담당자.

### 2.3 전환 중 · 에러

- 다른 회사 행 클릭 → 해당 행에 스피너 표시 + 드롭다운 전체 잠금(재클릭 방지).
  (시안의 "전환 중…" 토스트는 전체 새로고침 직전이라 실효 없음 → 행 내 로딩으로 대체. 시안 대비 유일한 변경점.)
- 실패(403·네트워크): 드롭다운 안에 에러 문구 표시 + 잠금 해제(원상 복구). 재시도는 행 재클릭.

## 3. 데이터 · 로직

### 3.1 API 레이어 — `api/tenants.ts` (신규)

```ts
getMyTenants(): Promise<TenantMembership[]>        // GET  /auth/me/tenants
switchTenant(tenantId: string): Promise<AuthTokens> // POST /auth/switch-tenant
```
- 타입은 `@lawai/contracts` 의 `TenantMembership`/`AuthTokens` 재사용. 신규 타입 정의 없음.
- 기존 `apiFetch`(client.ts) 경유 — 401 인터셉터·refresh 흐름 그대로 적용.

### 3.2 훅 — `useTenantSwitcher` (신규)

- react-query `useQuery` 로 멤버십 조회(key: `["myTenants"]`).
- 전환 `useMutation`: 성공 시 `setTokens(access, refresh)` → `window.location.assign("/")`
  **전체 새로고침** (확정 결정). 캐시·SSE 스트림·화면 상태가 통째로 리셋되어 이전 테넌트 데이터 잔존 여지 0.
- 컴포넌트는 뷰에 집중, 상태·API 는 훅에 집약 (프론트 컨벤션 준수).

### 3.3 foot 하드코딩 제거 (부수 정리 — 승인됨)

- Sidebar foot 의 "손준호"/"법무팀" 하드코딩을 `getMe()` 실데이터로 교체:
  이름 = `PublicUser.name`, 아바타 = 이름 첫 글자, 직책 자리 = **활성 테넌트 역할 라벨**
  (myTenants 의 `isActive` 행 role — 스위처와 데이터 공유, 추가 API 없음).
- 조회는 react-query(key: `["me"]`). 로딩 중엔 빈 자리 유지(스켈레톤 불요, 사이드바 폭 고정).

## 4. 파일 구성

```
apps/web/src/
  api/tenants.ts                          (신규)
  api/tenants.test.ts                     (신규)
  components/layout/TenantSwitcher.tsx    (신규)
  components/layout/tenantSwitcher.css.ts (신규)
  components/layout/TenantSwitcher.test.tsx (신규)
  components/layout/hooks/useTenantSwitcher.ts (신규 — 기존 layout/hooks 위치 따름)
  components/layout/Sidebar.tsx           (수정 — 스위처 삽입 + foot 실데이터)
  utils/tenantRoleLabel.ts                (신규 — 역할 한국어 라벨)
```
- 스타일은 vanilla-extract + themeVars/기존 사이드바 네이비 값. 인라인 스타일 금지(훅 차단 준수).

## 5. 범위 경계

**한다**: 위 스위처 UI + 전환 + foot 실데이터. **안 한다**: admin 회사 관리(Spec 3),
온보딩·초대(Spec 4), 마지막 사용 테넌트 서버 저장(로그인 시 활성 테넌트 결정은 백엔드 기존 로직 유지),
admin 앱 변경.

## 6. 테스트 전략

- `api/tenants.test.ts`: 경로·메서드·페이로드·응답 매핑 (기존 api 테스트 패턴).
- `TenantSwitcher.test.tsx`:
  - 멤버십 2+ → 목록 렌더, 활성 행 ✓ 표시
  - 멤버십 1 → 캐럿 없음·클릭 무반응 / 멤버십 0 → 미렌더
  - 전환 클릭 → switchTenant 호출 + setTokens + `window.location.assign` (mock) 검증
  - 전환 실패 → 에러 문구 표시 + 잠금 해제
- Sidebar 기존 테스트: foot 실데이터 반영으로 수정 (getMe/myTenants mock).

## 7. 리스크

| 리스크 | 대응 |
|---|---|
| 전환 성공 후 reload 전 찰나에 구 토큰 요청 발생 | setTokens 직후 동기적으로 location.assign — 사이 비동기 작업 없음 |
| myTenants 실패 시 사이드바 깨짐 | 스위처만 미렌더(fallback), 사이드바 나머지 정상 |
| jsdom 에서 location.assign 불가 | 테스트에서 mock (기존 client.test 의 location 처리 선례 따름) |
