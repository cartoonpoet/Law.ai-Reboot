import { describe, it, expect } from "vitest";
import type { Company } from "@lawai/contracts";
import { getCompanyLabel, toCompanyOptions } from "./companyLabel";

const company = (id: string, name: string, over: Partial<Company> = {}): Company => ({
  id, type: "company", name, bizNo: "123-45-67890",
  ceo: "홍길동", phone: null, address: null, addressDetail: null,
  managerName: null, managerPhone: null, managerEmail: null, createdAt: "",
  ...over,
});

describe("getCompanyLabel", () => {
  it("일반 사업자번호는 그대로 라벨에 넣는다", () => {
    expect(getCompanyLabel(company("a", "삼성전자(주)"))).toBe("삼성전자(주) · 123-45-67890 · 홍길동");
  });

  it("TEMP- 사업자번호는 '임시번호'로 표기한다", () => {
    const c = company("b", "개인A", { bizNo: "TEMP-xyz", type: "individual" });
    expect(getCompanyLabel(c)).toBe("개인A · 임시번호 · 홍길동");
  });

  it("대표(ceo)가 없으면 '-'로 표기한다", () => {
    expect(getCompanyLabel(company("c", "노대표(주)", { ceo: null }))).toBe("노대표(주) · 123-45-67890 · -");
  });
});

describe("toCompanyOptions", () => {
  it("선택값과 검색결과를 합치고 중복 id는 제거한다", () => {
    const selected = [company("a", "A")];
    const results = [company("a", "A-중복"), company("b", "B")];
    const options = toCompanyOptions(selected, results);
    expect(options.map((o) => o.value)).toEqual(["a", "b"]);
  });

  it("선택값이 항상 앞에 오고 value/label을 만든다", () => {
    const options = toCompanyOptions([company("x", "X")], [company("y", "Y")]);
    expect(options[0]).toEqual({ value: "x", label: getCompanyLabel(company("x", "X")) });
    expect(options[1].value).toBe("y");
  });
});
