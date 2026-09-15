# 헤더 없는 화면 틀 (알림 → AI 비서, 설정 → 내 이름 메뉴, 통합검색 → Ctrl+K)

- 작성일: 2026-09-15
- 시안: https://claude.ai/code/artifact/ddee527c-46da-4992-8c85-7f715b2a6c95 (시안 1 + 시안 2 의 홈 알림 카드)
- 범위: `apps/web` 만. 서버 변경 없음.

## 1. 배경

상단 헤더(`TopBar`)에는 동작하지 않는 통합검색 칸, 동작하지 않는 설정 버튼, 실제로 동작하는 알림 종 하나만 있다.
이름·로그아웃·회사 전환은 이미 사이드바 아래에 있고, 우측 하단에 항상 떠 있는 AI 비서가 생겼다.
헤더를 없애 세로 54px 를 본문에 돌려주고, 기능은 이미 있는 자리로 모은다.

## 2. 결정

### 2.1 헤더 제거
- `TopBar` 삭제. `AppShell` 은 사이드바 + 본문 + AI 비서 + 통합검색창만 그린다.

### 2.2 AI 비서 = 비서 + 알림
- 런처 배지 = **안 읽은 알림 수**(0 이면 숨김, 99 초과는 `99+`). 비서가 먼저 말 거는 말풍선은 그대로 두되 숫자를 쓰지 않는다.
- 실시간 알림 구독(`useNotificationStream`)은 항상 떠 있는 비서 쪽에서 한 번 마운트한다.
- 비서 홈 순서: 인사 → **새 알림 카드**(안 읽은 알림 최대 3건 + "전체 보기", 안 읽은 알림이 없으면 카드 숨김) → 새 대화 시작 → 추천 질문 → 최근 대화.
- 하단 탭: 홈 · 대화 · **알림(안 읽은 수)**.
- 알림 화면: 제목 · 모두 읽음 · 닫기, 필터 "전체 / 안 읽음", 목록. 알림을 누르면 읽음 처리 후 해당 계약 화면으로 이동하고 비서 창을 닫는다.
- "결재 / 코멘트" 필터는 알림 종류 정리가 필요해 이번 범위에서 뺀다.

### 2.3 설정 → 사이드바 내 이름 메뉴
- 사이드바 맨 아래 내 이름 영역을 버튼으로 바꾸고, 누르면 위로 펼쳐지는 메뉴를 연다.
  - 머리: 이름 · 현재 회사 · 역할
  - 설정 → `/system`
  - 회사 전환(소속 2곳 이상일 때만, 기존 `useTenantSwitcher` 사용)
  - 로그아웃
- 기존 `TenantSwitcher` 칸은 이 메뉴로 흡수해 삭제한다. "알림 설정", "단축키 안내"는 화면이 없어 뺀다.

### 2.4 통합검색 → Ctrl+K 검색창 (+ AI 비서 보조)
- 여는 방법: 사이드바 로고 아래 "통합검색 Ctrl K" 버튼, 어디서든 Ctrl+K(⌘K).
- 결과
  - 계약: `GET /contracts?q=` 최대 5건(입력 멈춤 300ms 후, 기존 `useSearchQuery`).
  - 메뉴로 이동: 사이드바 메뉴 이름 일치(검색어가 없으면 바로 가기 메뉴 5개).
  - "계약 조회에서 전체 보기"는 뺐다 — 계약 조회 화면이 주소의 검색어(`?q=`)를 아직 읽지 않는다. 대신 메뉴 결과의 "계약 조회"로 이동한다.
- 맨 아래 "AI 비서에게 물어보기": 누르거나 Tab → 검색창을 닫고 비서 대화를 열어 입력 문장을 바로 질문으로 보낸다.
- 키보드: ↑↓ 이동, Enter 열기, Tab AI 비서에게, Esc 닫기. 바깥 클릭으로 닫힘.
- 자문·송무·문서는 화면이 없어 검색 대상에서 뺀다.

## 3. 구조

| 단위 | 책임 |
| --- | --- |
| `layout/navSections.ts` | 사이드바 메뉴 정의 단일 출처(사이드바·검색창 공용) |
| `assistant/AssistantProvider.tsx` + `hooks/useAssistant` | 비서 열림·화면(home/chat/notifications)·말풍선·대화 상태를 앱 틀에서 공유(검색창이 비서에 질문을 넘기기 위함) |
| `search/CommandPaletteProvider.tsx` + `hooks/useCommandPalette` | 검색창 열림 상태 공유(사이드바 버튼·단축키·검색창) |
| `search/useCommandPaletteShortcut.ts` | Ctrl/⌘+K 전역 단축키(문서 keydown 구독 — useEffect, 사유: 외부 이벤트 구독) |
| `search/CommandPalette.tsx` + `useCommandPaletteResults.ts` | 검색창 뷰 / 결과 계산·키보드 이동 |
| `assistant/AssistantNotifications.tsx`, `AssistantNoticeCard.tsx`, `AssistantBottomNav.tsx` | 알림 화면 / 홈 알림 카드 / 하단 탭 |
| `notifications/NotificationItem.tsx` | 알림 한 건(기존 헤더 알림에서 이동) |
| `layout/ProfileMenu.tsx` | 내 이름 메뉴(설정·회사 전환·로그아웃) |

삭제: `TopBar`, `NotificationBell`(+css·test), `TenantSwitcher`(+css·test).

## 4. 테스트
- 비서: 배지 수·99+, 홈 알림 카드(3건 제한·없으면 숨김), 전체 보기→알림 화면, 알림 클릭 시 읽음+이동, 모두 읽음, 안 읽음 필터.
- 검색창: 계약·메뉴 결과, ↑↓·Enter 이동, Tab·AI 줄로 비서에 질문, Esc·바깥 클릭 닫기, 단축키로 열기.
- 사이드바: 검색 버튼, 내 이름 메뉴(설정 이동, 로그아웃, 회사 1곳/여러 곳).
