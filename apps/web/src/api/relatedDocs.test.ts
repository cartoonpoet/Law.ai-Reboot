import { describe, it, expect } from "vitest";
import { RELATED_DOC_CATEGORIES, categoryLabel, isRelatedDocCategoryReady } from "./relatedDocs";

describe("relatedDocs 분류", () => {
  it("분류 이름을 돌려준다", () => {
    expect(RELATED_DOC_CATEGORIES.map((c) => categoryLabel(c.value))).toEqual(["계약", "자문", "송무", "법무프로젝트"]);
  });

  it("실제로 검색할 수 있는 분류는 계약뿐이다", () => {
    expect(RELATED_DOC_CATEGORIES.filter((c) => isRelatedDocCategoryReady(c.value)).map((c) => c.value)).toEqual(["contract"]);
  });
});
