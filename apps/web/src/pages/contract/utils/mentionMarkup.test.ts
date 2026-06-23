import { describe, it, expect } from "vitest";
import {
  getDisplayName,
  serializeMention,
  parseMentionMarkup,
  extractMentionUserIds,
  stripMentionMarkup,
} from "./mentionMarkup";

/**
 * mentionMarkup 단위 테스트 — `@[표시이름](userId)` 마크업 단일 출처.
 *
 * 저장 직렬화 · 수정 복원 파싱 · 읽기 표시 파서 · preview strip 네 곳이 공유하는
 * 순수 함수들의 라운드트립 무손실·dedupe·괄호 제거·strip·엣지를 검증한다.
 */
describe("mentionMarkup", () => {
  describe("getDisplayName", () => {
    it("부서 괄호를 제거하고 순수 이름만 trim한다", () => {
      expect(getDisplayName("홍길동 (영업팀)")).toBe("홍길동");
    });

    it("괄호가 없으면 입력을 그대로(trim) 반환한다", () => {
      expect(getDisplayName("  홍길동  ")).toBe("홍길동");
    });
  });

  describe("serializeMention", () => {
    it("표시이름(괄호 제거)과 userId로 마크업을 만든다", () => {
      expect(serializeMention("홍길동 (영업팀)", "u1")).toBe("@[홍길동](u1)");
    });
  });

  describe("parseMentionMarkup", () => {
    it("멘션이 없는 본문은 단일 text 세그먼트로 파싱한다", () => {
      expect(parseMentionMarkup("그냥 텍스트")).toEqual([
        { type: "text", value: "그냥 텍스트" },
      ]);
    });

    it("빈 본문은 빈 세그먼트 배열을 반환한다", () => {
      expect(parseMentionMarkup("")).toEqual([]);
    });

    it("텍스트와 멘션이 섞인 본문을 세그먼트로 쪼갠다", () => {
      expect(parseMentionMarkup("안녕 @[홍길동](u1) 확인")).toEqual([
        { type: "text", value: "안녕 " },
        { type: "mention", name: "홍길동", userId: "u1" },
        { type: "text", value: " 확인" },
      ]);
    });

    it("연속 멘션도 각각 분리해 파싱한다", () => {
      expect(parseMentionMarkup("@[홍길동](u1)@[김철수](u2)")).toEqual([
        { type: "mention", name: "홍길동", userId: "u1" },
        { type: "mention", name: "김철수", userId: "u2" },
      ]);
    });
  });

  describe("serialize ∘ parse 라운드트립", () => {
    it("텍스트+멘션 혼합 본문이 파싱→재직렬화 후 동일하다", () => {
      const body = "안녕 @[홍길동](u1) 그리고 @[김철수](u2) 확인 부탁";
      const rebuilt = parseMentionMarkup(body)
        .map((segment) =>
          segment.type === "mention"
            ? serializeMention(segment.name, segment.userId)
            : segment.value,
        )
        .join("");
      expect(rebuilt).toBe(body);
    });
  });

  describe("extractMentionUserIds", () => {
    it("멘션 userId를 등장 순서대로 추출하고 중복을 제거한다", () => {
      expect(
        extractMentionUserIds("@[홍길동](u1) @[김철수](u2) @[홍길동](u1)"),
      ).toEqual(["u1", "u2"]);
    });

    it("멘션이 없으면 빈 배열을 반환한다", () => {
      expect(extractMentionUserIds("멘션 없는 본문")).toEqual([]);
    });
  });

  describe("stripMentionMarkup", () => {
    it("마크업을 @표시이름으로 치환한다(preview 용)", () => {
      expect(stripMentionMarkup("@[홍길동](u1) 확인 부탁")).toBe(
        "@홍길동 확인 부탁",
      );
    });

    it("멘션이 없으면 본문을 그대로 반환한다", () => {
      expect(stripMentionMarkup("그냥 텍스트")).toBe("그냥 텍스트");
    });

    it("여러 멘션을 모두 치환한다", () => {
      expect(stripMentionMarkup("@[홍길동](u1)와 @[김철수](u2)")).toBe(
        "@홍길동와 @김철수",
      );
    });
  });
});
