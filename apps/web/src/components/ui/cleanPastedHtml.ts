/**
 * Word·HWP 붙여넣기 정제 — tiptap editorProps.transformPastedHTML에 연결되는 순수 함수.
 *
 * 목적: 붙여넣은 HTML에서 MSO(Microsoft Office)·HWP 잔재만 제거해 깨끗한 서식을 유지한다.
 * 과정제 금지 — 제목/굵게/기울임/밑줄/목록/링크/줄바꿈 등 구조·서식 태그는 보존한다.
 * 2차 방어: 정제 후에도 tiptap 스키마에 없는 노드/마크는 ProseMirror가 자동 폐기하므로
 * 저장 HTML은 항상 에디터 스키마로 한정된다(이 함수는 "보기 좋게"가 목적, 스키마가 최종 게이트).
 */
export const cleanPastedHtml = (html: string): string => {
  let result = html;

  // 1. Word 조건부 주석(<!--[if gte mso 9]>...<![endif]-->) 제거.
  result = result.replace(/<!--\[if[^\]]*\]>[\s\S]*?<!\[endif\]-->/gi, "");
  // 2. 일반 주석(Word가 남기는 StartFragment/EndFragment 등) 제거.
  result = result.replace(/<!--[\s\S]*?-->/g, "");
  // 3. <o:p>, <w:...>, <m:...>, <v:...> 등 office 네임스페이스 태그 제거(여/닫기 모두).
  result = result.replace(/<\/?[a-z]+:[^>]*>/gi, "");
  // 4. <xml>...</xml>, <style>...</style>, <meta>, <link> 블록 제거.
  result = result.replace(/<xml[\s\S]*?<\/xml>/gi, "");
  result = result.replace(/<style[\s\S]*?<\/style>/gi, "");
  result = result.replace(/<meta[^>]*>/gi, "");
  result = result.replace(/<link[^>]*>/gi, "");
  // 5. class 속성 중 Mso* 클래스 제거. class가 전부 Mso*면 속성 자체를 제거한다.
  result = result.replace(/\sclass="([^"]*)"/gi, (_full, value: string) => {
    const kept = value
      .split(/\s+/)
      .filter((cls) => cls.length > 0 && !/^Mso/i.test(cls))
      .join(" ");
    return kept ? ` class="${kept}"` : "";
  });
  // 6. style 속성에서 mso-* 선언 제거. 선언이 전부 mso-*면 속성 자체를 제거한다.
  result = result.replace(/\sstyle="([^"]*)"/gi, (_full, value: string) => {
    const kept = value
      .split(";")
      .map((decl) => decl.trim())
      .filter((decl) => decl.length > 0 && !/^mso-/i.test(decl))
      .join("; ");
    return kept ? ` style="${kept}"` : "";
  });
  // 7. 속성 없는 빈 <span>은 언랩(내용만 남김) — Word가 텍스트마다 span으로 감싸는 잔재 제거.
  result = result.replace(/<span>([\s\S]*?)<\/span>/gi, "$1");
  // 8. lang 속성(<p lang="ko-KR"> 등) 제거 — 잔재.
  result = result.replace(/\slang="[^"]*"/gi, "");

  return result;
};
