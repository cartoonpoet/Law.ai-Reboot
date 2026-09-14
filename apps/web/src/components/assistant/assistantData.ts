// AI 비서 데이터 — 대화 API 가 아직 없어 추천 명령에만 준비된 목업 답을 돌려준다.

/* --- 항상 떠 있는 AI 비서(모든 화면 공통) --- */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
}

// 채널톡처럼 — 런처 위에 먼저 말을 거는 말풍선, 홈 화면, 대화 화면
export const ASSISTANT_PROFILE = {
  name: "Law.ai AI 비서",
  status: "보통 즉시 답변해요",
};

export const ASSISTANT_POPUP = "손준호 님, 오늘 챙길 일이 3건 있어요. 급한 배정부터 같이 처리할까요?";

export const ASSISTANT_RECENT = {
  preview: "한라산 EV 계약 리스크 요약을 정리해 뒀어요.",
  time: "어제",
};

export const ASSISTANT_GREETING: ChatMessage = {
  id: "greeting",
  role: "assistant",
  text: "안녕하세요, 손준호 님. 지금 보고 있는 화면을 알고 있어요. 궁금한 걸 묻거나 시킬 일을 말씀해 주세요.",
  time: "오전 9:42",
};

// 추천 명령 — 질문뿐 아니라 "시키는" 명령(배정·초안 작성·리마인드)도 받는다는 걸 보여준다.
export const ASSISTANT_COMMANDS = [
  {
    prompt: "유지보수 계약 김법무로 배정해줘",
    reply: "'[hkpark2] 유지보수계약서 검토 의뢰'를 김법무에게 배정할게요. 실행 전에 확인해 주세요 — [배정하기] [취소]",
  },
  {
    prompt: "NDA 결재 의견 초안 써줘",
    reply: "초안이에요: \"표준 NDA 와 조항 차이가 없어 승인합니다.\" 이대로 결재 의견에 넣을까요?",
  },
  {
    prompt: "한라산 EV 계약 리스크 요약해줘",
    reply: "손해배상 한도가 계약금액의 300%로 표준(100%)보다 높고, 지체상금 상한이 없어요. 수정 문구 2건을 준비해 뒀어요.",
  },
  {
    prompt: "NDA 요청자에게 리마인드 보내줘",
    reply: "사후계약관리 표준 NDA 요청자에게 보낼 리마인드 초안을 만들었어요. 보낼까요?",
  },
];

export const ASSISTANT_FALLBACK =
  "알겠어요. 실제 서비스에서는 권한 안의 계약·자문·송무 데이터를 찾아 답하거나, 실행 전 확인을 받고 처리해요. (시안에서는 추천 명령만 답변이 준비돼 있어요)";
