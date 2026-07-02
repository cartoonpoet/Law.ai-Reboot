import { describe, it, expect } from "vitest";
import { cleanPastedHtml } from "./cleanPastedHtml";

describe("cleanPastedHtml", () => {
  it("Word 조건부 주석을 제거한다", () => {
    const html = `<!--[if gte mso 9]><xml><w:WordDocument/></xml><![endif]--><p>본문</p>`;
    const result = cleanPastedHtml(html);
    expect(result).not.toMatch(/mso/i);
    expect(result).not.toContain("<![endif]");
    expect(result).toContain("<p>본문</p>");
  });

  it("<o:p>·office 네임스페이스 태그를 제거한다", () => {
    expect(cleanPastedHtml("<p>가<o:p></o:p>나</p>")).toBe("<p>가나</p>");
  });

  it("Mso 클래스를 제거하되 일반 클래스는 보존한다", () => {
    expect(cleanPastedHtml('<p class="MsoNormal">x</p>')).toBe("<p>x</p>");
    expect(cleanPastedHtml('<p class="MsoNormal keep">x</p>')).toBe('<p class="keep">x</p>');
  });

  it("mso-* 인라인 스타일 선언만 제거하고 나머지 style은 보존한다", () => {
    expect(cleanPastedHtml('<p style="mso-bidi-font-size:11.0pt">x</p>')).toBe("<p>x</p>");
    expect(cleanPastedHtml('<p style="mso-x:1; color:red">x</p>')).toBe('<p style="color:red">x</p>');
  });

  it("<style>·<xml>·<meta> 블록을 제거한다", () => {
    const html = `<style>.a{}</style><xml>z</xml><meta charset="utf-8"><p>본문</p>`;
    expect(cleanPastedHtml(html)).toBe("<p>본문</p>");
  });

  it("속성 없는 빈 span을 언랩한다", () => {
    expect(cleanPastedHtml("<span>텍스트</span>")).toBe("텍스트");
  });

  it("구조·서식 태그(strong/em/h1-3/ul/ol/li/a)를 보존한다", () => {
    const html = "<h2>제목</h2><p><strong>굵게</strong> <em>기울임</em></p><ul><li>항목</li></ul><a href=\"http://x\">링크</a>";
    expect(cleanPastedHtml(html)).toBe(html);
  });

  it("일반 HTML은 그대로 통과시킨다", () => {
    const html = "<p>그냥 <strong>문단</strong></p>";
    expect(cleanPastedHtml(html)).toBe(html);
  });
});
