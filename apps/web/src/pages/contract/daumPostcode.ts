// Daum(카카오) 우편번호 서비스 연동 — 무료, API 키 불필요.
// 외부 명령형 SDK를 이 모듈에 캡슐화하고, 호출부에는 선언적인 함수만 노출한다.

interface DaumPostcodeData {
  roadAddress: string;
  jibunAddress: string;
  zonecode: string;
}
interface DaumPostcodeInstance {
  open: () => void;
}
declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeData) => void;
      }) => DaumPostcodeInstance;
    };
  }
}

const SCRIPT_SRC =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
let loadPromise: Promise<void> | null = null;

const loadScript = (): Promise<void> => {
  if (window.daum?.Postcode) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("주소 검색 서비스를 불러오지 못했습니다"));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
};

/** 우편번호 검색 팝업을 열고, 선택한 도로명주소를 콜백으로 돌려준다. */
export const openAddressSearch = async (
  onSelect: (roadAddress: string) => void,
): Promise<void> => {
  await loadScript();
  new window.daum!.Postcode({
    oncomplete: (data) => onSelect(data.roadAddress || data.jibunAddress),
  }).open();
};
