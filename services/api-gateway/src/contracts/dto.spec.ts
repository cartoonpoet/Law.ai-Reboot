import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateContractDto, UpdateContractStatusDto } from "./dto";

// 기대값은 리팩터링 이전(HEAD) 의 리터럴을 하드코딩한다 — 공유 상수를 import 하면 회귀를 못 잡는다.
const validCreate = {
  title: "2026년 SaaS 이용계약",
  securityLevel: "secure",
  reviewType: "normal",
  schemaVersion: 1,
  details: {},
  counterparties: [],
  approvers: [],
  files: [],
  references: [],
};

const errorProps = async <T extends object>(cls: new () => T, plain: object) =>
  (await validate(plainToInstance(cls, plain))).map((e) => e.property);

describe("CreateContractDto 검증", () => {
  it("유효한 값은 통과", async () => {
    expect(await errorProps(CreateContractDto, validCreate)).toEqual([]);
  });

  it.each(["top", "secure", "normal"])("securityLevel %s 허용", async (securityLevel) => {
    expect(await errorProps(CreateContractDto, { ...validCreate, securityLevel })).toEqual([]);
  });
  it.each(["", "high", "TOP", "std"])("securityLevel %j 거절", async (securityLevel) => {
    expect(await errorProps(CreateContractDto, { ...validCreate, securityLevel })).toEqual(["securityLevel"]);
  });

  it.each(["normal", "std"])("reviewType %s 허용", async (reviewType) => {
    expect(await errorProps(CreateContractDto, { ...validCreate, reviewType })).toEqual([]);
  });
  it.each(["", "fast", "top"])("reviewType %j 거절", async (reviewType) => {
    expect(await errorProps(CreateContractDto, { ...validCreate, reviewType })).toEqual(["reviewType"]);
  });

  it.each(["review", "signed"])("registerAs %s 허용", async (registerAs) => {
    expect(await errorProps(CreateContractDto, { ...validCreate, registerAs })).toEqual([]);
  });
  it("registerAs 미지정 허용, 그 외 값 거절", async () => {
    expect(await errorProps(CreateContractDto, validCreate)).toEqual([]);
    expect(await errorProps(CreateContractDto, { ...validCreate, registerAs: "draft" })).toEqual(["registerAs"]);
  });

  it("title 200자 통과, 201자 거절", async () => {
    expect(await errorProps(CreateContractDto, { ...validCreate, title: "가".repeat(200) })).toEqual([]);
    expect(await errorProps(CreateContractDto, { ...validCreate, title: "가".repeat(201) })).toEqual(["title"]);
  });
});

describe("UpdateContractStatusDto 검증", () => {
  it.each([
    "draft", "unassigned", "assigning", "legalReview", "requesterReview",
    "reviewDone", "signing", "signed", "fulfilling", "closed",
  ])("status %s 허용", async (status) => {
    expect(await errorProps(UpdateContractStatusDto, { status })).toEqual([]);
  });
  it.each(["", "done", "Draft", "review"])("status %j 거절", async (status) => {
    expect(await errorProps(UpdateContractStatusDto, { status })).toEqual(["status"]);
  });
});
