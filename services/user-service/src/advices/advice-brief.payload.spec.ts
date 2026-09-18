import { buildAdviceBriefPayload, toPlainText } from "./advice-brief.payload";

describe("AI 자문 도우미 입력", () => {
  const advice = {
    title: "해외 대리점 계약 준거법 문의",
    categories: ["계약해석"],
    region: "overseas" as const,
    countries: ["VN"],
    background: "<p>베트남 유통사와 협의 중</p><p>상대가 현지법을 요구</p>",
    question: "<p>준거법을 <strong>한국법</strong>으로 둘 수 있나요?</p>",
    etcRequest: null,
    dueDate: new Date("2026-09-18T00:00:00Z"),
  };

  it("에디터 태그를 걷어내고 줄글로 보낸다", () => {
    expect(toPlainText("<p>가</p><p>나<br/>다</p>")).toBe("가\n나\n다");
    expect(toPlainText("<p>A &amp; B</p>")).toBe("A & B");
  });

  it("자문 내용과 비슷한 지난 자문을 함께 담는다", () => {
    const payload = buildAdviceBriefPayload(advice, [
      {
        code: "ADV-2026-0032",
        title: "인도네시아 총판 분쟁해결 조항",
        categories: ["계약해석"],
        answer: "<p>SIAC 중재를 권고</p>",
        answeredAt: new Date("2026-03-11T00:00:00Z"),
      },
    ]);

    expect(payload).toMatchObject({
      question: "준거법을 한국법으로 둘 수 있나요?",
      background: "베트남 유통사와 협의 중\n상대가 현지법을 요구",
      dueDate: "2026-09-18",
      similarAdvices: [{ code: "ADV-2026-0032", answer: "SIAC 중재를 권고", answeredAt: "2026-03-11" }],
    });
  });

  it("회신이 없는 지난 자문은 answer 가 null", () => {
    const payload = buildAdviceBriefPayload(advice, [
      { code: "ADV-2026-0099", title: "진행 중", categories: [], answer: null, answeredAt: null },
    ]);
    expect(payload.similarAdvices[0]).toMatchObject({ answer: null, answeredAt: null });
  });
});
