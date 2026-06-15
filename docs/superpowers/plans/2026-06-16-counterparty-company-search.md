# 상대 계약자 회사 검색·다중선택·신규등록 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 계약 요청 폼의 "상대 계약자 정보"를 회사 검색 API 기반 AutoComplete 다중선택으로 바꾸고, 결과에 없으면 신규 회사를 등록(등록 즉시 선택)할 수 있게 한다 — 백엔드 검색/등록 엔드포인트 포함.

**Architecture:** NestJS 마이크로서비스 구조를 따른다. `user-service`(Prisma/Postgres)에 `Company` 모델과 메시지 패턴 핸들러(검색/생성)를 추가하고, `api-gateway`가 HTTP(`GET/POST /companies`)로 노출하며 TCP RPC로 프록시한다. 패턴/DTO는 공유 `@lawai/contracts`에 정의한다. 프론트(`apps/web`)는 RHF+zod 폼에서 `counterparty: string`을 `counterparties: CompanyRef[]`로 바꾸고, lawkit `AutoComplete multiple` + 신규등록 `Modal`로 구현한다.

**Tech Stack:** NestJS 11, Prisma 6 (PostgreSQL), `@nestjs/microservices` (TCP), class-validator, React 19 + react-hook-form + zod, `@lawkit/ui` 0.1.47, Jest(백엔드)/Vitest(프론트), Playwright(수동 검증).

**시안 기준:** `contract-request-mockup.html` 의 "상대 계약자 정보" 영역(검색 드롭다운 + 다중 chip + 신규등록 모달).

---

## File Structure

**Create**
- `packages/contracts/src/dto/company.dto.ts` — 회사 검색/생성 요청·응답 타입, `CompanyType` 유니온
- `services/user-service/src/companies/companies.service.ts` — Prisma 검색/생성 로직 + 임시 사업자번호 생성
- `services/user-service/src/companies/companies.service.spec.ts` — 서비스 단위 테스트
- `services/user-service/src/companies/companies.controller.ts` — `@MessagePattern` 핸들러
- `services/user-service/src/companies/companies.module.ts` — 모듈
- `services/api-gateway/src/companies/dto.ts` — class-validator HTTP DTO
- `services/api-gateway/src/companies/companies.controller.ts` — `GET/POST /companies`
- `services/api-gateway/src/companies/companies.module.ts` — 모듈
- `apps/web/src/api/companies.ts` — `searchCompanies`, `createCompany`
- `apps/web/src/pages/contract/sections/CompanyCreateModal.tsx` — 신규 회사 등록 모달

**Modify**
- `packages/contracts/src/patterns.ts` — `COMPANY_PATTERNS` 추가
- `packages/contracts/src/index.ts` — company.dto export
- `services/user-service/prisma/schema.prisma` — `Company` 모델 + `CompanyType` enum
- `services/user-service/src/app.module.ts` — `CompaniesModule` import
- `services/api-gateway/src/app.module.ts` — `CompaniesModule` import
- `apps/web/src/pages/contract/request-schema.ts` — `counterparty:string` → `counterparties: CompanyRef[]`
- `apps/web/src/pages/contract/request-schema.test.ts` — fixture 갱신
- `apps/web/src/pages/contract/sectionStatus.ts:25` — `v.counterparty` → `v.counterparties`
- `apps/web/src/pages/contract/sectionStatus.test.ts:17` — fixture 갱신
- `apps/web/src/pages/contract/sections/OverviewSection.tsx` — AutoComplete multiple + 모달 통합
- `contract-request-mockup.html` — (이미 시안 반영됨, 변경 없음)

**ERD:** `Company` 테이블/`CompanyType` enum 추가를 "Law.ai Reboot" ERD에 erdify MCP로 동기화 (Task 2).

---

## 공통 데이터 형태 (모든 레이어 일관)

`CompanyType = "company" | "individual"` (Prisma enum 멤버명도 동일하게 소문자 `company`/`individual` → 매핑 불필요).

`Company` 공개 응답 형태:
```ts
{
  id: string;
  type: "company" | "individual";
  name: string;
  bizNo: string;            // 미부여 시 "TEMP-XXXXXXXX" 형태로 자동 생성
  ceo: string | null;
  phone: string | null;
  address: string | null;
  addressDetail: string | null;
  managerName: string | null;
  managerPhone: string | null;
  managerEmail: string | null;
  createdAt: string;        // ISO 8601
}
```
프론트는 `bizNo.startsWith("TEMP-")`로 "임시번호 자동생성" 뱃지를 표시한다(별도 컬럼 없음).

---

### Task 1: contracts — 패턴 & DTO

**Files:**
- Create: `packages/contracts/src/dto/company.dto.ts`
- Modify: `packages/contracts/src/patterns.ts`, `packages/contracts/src/index.ts`
- Test: `packages/contracts/src/patterns.test.ts` (기존 파일에 케이스 추가)

- [ ] **Step 1: 실패 테스트 작성** — `packages/contracts/src/patterns.test.ts` 에 추가

```ts
import { COMPANY_PATTERNS } from "./patterns";

describe("COMPANY_PATTERNS", () => {
  it("검색·생성 패턴 문자열을 노출한다", () => {
    expect(COMPANY_PATTERNS.SEARCH).toBe("company.search");
    expect(COMPANY_PATTERNS.CREATE).toBe("company.create");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm --filter @lawai/contracts test`
Expected: FAIL — `COMPANY_PATTERNS is not defined` / import 에러

- [ ] **Step 3: 패턴 추가** — `packages/contracts/src/patterns.ts` 끝에 추가

```ts
export const COMPANY_PATTERNS = {
  SEARCH: "company.search",
  CREATE: "company.create",
} as const;
```

- [ ] **Step 4: DTO 파일 생성** — `packages/contracts/src/dto/company.dto.ts`

```ts
export type CompanyType = "company" | "individual";

export interface SearchCompaniesRequest {
  q: string;
  limit?: number;
}

export interface CreateCompanyRequest {
  type: CompanyType;
  name: string;
  bizNo?: string;
  ceo?: string;
  phone?: string;
  address?: string;
  addressDetail?: string;
  managerName?: string;
  managerPhone?: string;
  managerEmail?: string;
}

export interface Company {
  id: string;
  type: CompanyType;
  name: string;
  bizNo: string;
  ceo: string | null;
  phone: string | null;
  address: string | null;
  addressDetail: string | null;
  managerName: string | null;
  managerPhone: string | null;
  managerEmail: string | null;
  createdAt: string;
}
```

- [ ] **Step 5: export 추가** — `packages/contracts/src/index.ts` 에 한 줄 추가

```ts
export * from "./dto/company.dto";
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `pnpm --filter @lawai/contracts test`
Expected: PASS

- [ ] **Step 7: 커밋**

```bash
git add packages/contracts/src/patterns.ts packages/contracts/src/index.ts packages/contracts/src/dto/company.dto.ts packages/contracts/src/patterns.test.ts
git commit -m "feat(contracts): 회사 검색·생성 패턴/DTO 추가"
```

---

### Task 2: user-service Prisma — Company 모델 + 마이그레이션 + ERD 동기화

**Files:**
- Modify: `services/user-service/prisma/schema.prisma`

- [ ] **Step 1: 모델 추가** — `schema.prisma` 끝에 추가

```prisma
enum CompanyType {
  company
  individual
}

model Company {
  id            String      @id @default(uuid())
  type          CompanyType @default(company)
  name          String
  bizNo         String      @unique
  ceo           String?
  phone         String?
  address       String?
  addressDetail String?
  managerName   String?
  managerPhone  String?
  managerEmail  String?
  createdAt     DateTime    @default(now())

  @@index([name])
}
```

- [ ] **Step 2: 마이그레이션 + 클라이언트 생성**

Run: `pnpm --filter @lawai/user-service exec prisma migrate dev --name add_company`
Expected: 마이그레이션 생성 후 `prisma generate` 자동 실행, 에러 없음.
> DB가 떠 있지 않으면 `prisma migrate dev`가 실패한다. 그 경우 로컬 Postgres(`DATABASE_URL`)를 먼저 기동한다.

- [ ] **Step 3: ERD 동기화 (CLAUDE.md 필수 규칙)**

erdify MCP로 "Law.ai Reboot" ERD에 다음을 반영:
- `Company` 테이블: 위 컬럼 전체(id PK, bizNo unique, name index)
- `CompanyType` enum (company/individual) — erdify가 enum 미지원이면 `type` 컬럼을 문자열로 추가하고 설명에 enum 값 명시
- `User`/`PasswordResetToken`과 관계 없음(독립 테이블)

- [ ] **Step 4: 커밋**

```bash
git add services/user-service/prisma/schema.prisma services/user-service/prisma/migrations
git commit -m "feat(user-service): Company 모델·마이그레이션 추가"
```

---

### Task 3: user-service — CompaniesService (+ 단위 테스트)

**Files:**
- Create: `services/user-service/src/companies/companies.service.ts`
- Test: `services/user-service/src/companies/companies.service.spec.ts`

- [ ] **Step 1: 실패 테스트 작성** — `companies.service.spec.ts`

```ts
import { Test } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { Prisma } from "@prisma/client";
import { CompaniesService } from "./companies.service";
import { PrismaService } from "../prisma/prisma.service";

describe("CompaniesService", () => {
  let service: CompaniesService;
  const prismaMock = {
    company: { findMany: jest.fn(), create: jest.fn() },
  };

  const row = {
    id: "c1", type: "company", name: "삼성전자(주)", bizNo: "124-81-00998",
    ceo: "한종희", phone: null, address: null, addressDetail: null,
    managerName: null, managerPhone: null, managerEmail: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = moduleRef.get(CompaniesService);
  });

  it("search는 name/bizNo/ceo OR contains로 조회하고 ISO 문자열로 변환한다", async () => {
    prismaMock.company.findMany.mockResolvedValue([row]);
    const result = await service.search({ q: "삼성", limit: 5 });
    expect(prismaMock.company.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { name: { contains: "삼성", mode: "insensitive" } },
          { bizNo: { contains: "삼성", mode: "insensitive" } },
          { ceo: { contains: "삼성", mode: "insensitive" } },
        ],
      },
      take: 5,
      orderBy: { name: "asc" },
    });
    expect(result[0].createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("create는 bizNo 미지정 시 TEMP- 임시번호를 생성한다", async () => {
    prismaMock.company.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ ...row, ...data }),
    );
    const result = await service.create({ type: "individual", name: "삼성기획" });
    const arg = prismaMock.company.create.mock.calls[0][0].data;
    expect(arg.bizNo).toMatch(/^TEMP-[0-9A-F]{8}$/);
    expect(result.name).toBe("삼성기획");
  });

  it("create는 bizNo 중복 시 409 RpcException을 던진다", async () => {
    prismaMock.company.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "6" }),
    );
    await expect(
      service.create({ type: "company", name: "삼성전자(주)", bizNo: "124-81-00998" }),
    ).rejects.toBeInstanceOf(RpcException);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm --filter @lawai/user-service test -- companies.service`
Expected: FAIL — `Cannot find module './companies.service'`

- [ ] **Step 3: 서비스 구현** — `companies.service.ts`

```ts
import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type {
  SearchCompaniesRequest,
  CreateCompanyRequest,
  Company,
} from "@lawai/contracts";

type CompanyRow = {
  id: string;
  type: Company["type"];
  name: string;
  bizNo: string;
  ceo: string | null;
  phone: string | null;
  address: string | null;
  addressDetail: string | null;
  managerName: string | null;
  managerPhone: string | null;
  managerEmail: string | null;
  createdAt: Date;
};

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async search(req: SearchCompaniesRequest): Promise<Company[]> {
    const q = req.q.trim();
    if (!q) return [];
    const rows = (await this.prisma.company.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { bizNo: { contains: q, mode: "insensitive" } },
          { ceo: { contains: q, mode: "insensitive" } },
        ],
      },
      take: req.limit ?? 10,
      orderBy: { name: "asc" },
    })) as CompanyRow[];
    return rows.map((r) => this.toPublic(r));
  }

  async create(req: CreateCompanyRequest): Promise<Company> {
    const bizNo = req.bizNo?.trim()
      ? req.bizNo.trim()
      : `TEMP-${randomUUID().slice(0, 8).toUpperCase()}`;
    try {
      const row = (await this.prisma.company.create({
        data: {
          type: req.type,
          name: req.name,
          bizNo,
          ceo: req.ceo ?? null,
          phone: req.phone ?? null,
          address: req.address ?? null,
          addressDetail: req.addressDetail ?? null,
          managerName: req.managerName ?? null,
          managerPhone: req.managerPhone ?? null,
          managerEmail: req.managerEmail ?? null,
        },
      })) as CompanyRow;
      return this.toPublic(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new RpcException({
          status: 409,
          message: "이미 등록된 사업자등록번호입니다",
        });
      }
      throw error;
    }
  }

  private toPublic(r: CompanyRow): Company {
    return {
      id: r.id,
      type: r.type,
      name: r.name,
      bizNo: r.bizNo,
      ceo: r.ceo,
      phone: r.phone,
      address: r.address,
      addressDetail: r.addressDetail,
      managerName: r.managerName,
      managerPhone: r.managerPhone,
      managerEmail: r.managerEmail,
      createdAt: r.createdAt.toISOString(),
    };
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter @lawai/user-service test -- companies.service`
Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add services/user-service/src/companies/companies.service.ts services/user-service/src/companies/companies.service.spec.ts
git commit -m "feat(user-service): CompaniesService 검색·생성 로직"
```

---

### Task 4: user-service — CompaniesController + 모듈 등록

**Files:**
- Create: `services/user-service/src/companies/companies.controller.ts`, `services/user-service/src/companies/companies.module.ts`
- Modify: `services/user-service/src/app.module.ts`

- [ ] **Step 1: 컨트롤러 작성** — `companies.controller.ts`

```ts
import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { COMPANY_PATTERNS } from "@lawai/contracts";
import type { SearchCompaniesRequest, CreateCompanyRequest } from "@lawai/contracts";
import { CompaniesService } from "./companies.service";

@Controller()
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @MessagePattern(COMPANY_PATTERNS.SEARCH)
  search(@Payload() req: SearchCompaniesRequest) {
    return this.companies.search(req);
  }

  @MessagePattern(COMPANY_PATTERNS.CREATE)
  create(@Payload() req: CreateCompanyRequest) {
    return this.companies.create(req);
  }
}
```

- [ ] **Step 2: 모듈 작성** — `companies.module.ts`

```ts
import { Module } from "@nestjs/common";
import { CompaniesController } from "./companies.controller";
import { CompaniesService } from "./companies.service";

@Module({
  controllers: [CompaniesController],
  providers: [CompaniesService],
})
export class CompaniesModule {}
```

- [ ] **Step 3: app.module 등록** — `services/user-service/src/app.module.ts`

```ts
import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";
import { CompaniesModule } from "./companies/companies.module";

@Module({
  imports: [PrismaModule, UsersModule, CompaniesModule],
})
export class AppModule {}
```

- [ ] **Step 4: 빌드 확인**

Run: `pnpm --filter @lawai/user-service build`
Expected: 성공 (타입 에러 없음)

- [ ] **Step 5: 커밋**

```bash
git add services/user-service/src/companies/companies.controller.ts services/user-service/src/companies/companies.module.ts services/user-service/src/app.module.ts
git commit -m "feat(user-service): companies 메시지 핸들러 등록"
```

---

### Task 5: api-gateway — HTTP 엔드포인트 (GET/POST /companies)

**Files:**
- Create: `services/api-gateway/src/companies/dto.ts`, `services/api-gateway/src/companies/companies.controller.ts`, `services/api-gateway/src/companies/companies.module.ts`
- Modify: `services/api-gateway/src/app.module.ts`

`USER_CLIENT`(이미 등록됨, user-service 가리킴)를 재사용한다 — 신규 client 등록 불필요.

- [ ] **Step 1: HTTP DTO 작성** — `services/api-gateway/src/companies/dto.ts`

```ts
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCompanyDto {
  @ApiProperty({ enum: ["company", "individual"], example: "company" })
  @IsEnum(["company", "individual"] as const)
  type!: "company" | "individual";

  @ApiProperty({ example: "삼성전자(주)" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: "124-81-00998", description: "미지정 시 임시번호 자동 생성" })
  @IsOptional() @IsString() @MaxLength(40)
  bizNo?: string;

  @ApiPropertyOptional({ example: "한종희" })
  @IsOptional() @IsString() @MaxLength(50)
  ceo?: string;

  @ApiPropertyOptional({ example: "02-2255-0114" })
  @IsOptional() @IsString() @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(200)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(200)
  addressDetail?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(50)
  managerName?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(40)
  managerPhone?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(120)
  managerEmail?: string;
}
```

- [ ] **Step 2: 컨트롤러 작성** — `services/api-gateway/src/companies/companies.controller.ts`

```ts
import {
  Body, Controller, Get, Inject, Post, Query, UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import { COMPANY_PATTERNS, type Company } from "@lawai/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { rpcToHttp } from "../common/rpc-to-http";
import { CreateCompanyDto } from "./dto";

@ApiTags("companies")
@Controller("companies")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CompaniesController {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
  ) {}

  @ApiOperation({ summary: "회사 검색", description: "이름·사업자번호·대표자 부분일치 검색" })
  @Get()
  search(
    @Query("q") q = "",
    @Query("limit") limit?: string,
  ): Promise<Company[]> {
    return firstValueFrom(
      this.userClient
        .send<Company[]>(COMPANY_PATTERNS.SEARCH, {
          q,
          limit: limit ? Number(limit) : undefined,
        })
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({ summary: "회사 신규 등록" })
  @Post()
  create(@Body() dto: CreateCompanyDto): Promise<Company> {
    return firstValueFrom(
      this.userClient.send<Company>(COMPANY_PATTERNS.CREATE, dto).pipe(rpcToHttp()),
    );
  }
}
```

- [ ] **Step 3: 모듈 작성** — `services/api-gateway/src/companies/companies.module.ts`

```ts
import { Module } from "@nestjs/common";
import { CompaniesController } from "./companies.controller";

@Module({ controllers: [CompaniesController] })
export class CompaniesModule {}
```

- [ ] **Step 4: app.module 등록** — `services/api-gateway/src/app.module.ts` 의 imports에 `CompaniesModule` 추가 (AuthModule, UsersModule 다음 줄)

```ts
import { CompaniesModule } from "./companies/companies.module";
// ...imports: [ ..., AuthModule, UsersModule, CompaniesModule ],
```

- [ ] **Step 5: 빌드 확인**

Run: `pnpm --filter @lawai/api-gateway build`
Expected: 성공

- [ ] **Step 6: 커밋**

```bash
git add services/api-gateway/src/companies services/api-gateway/src/app.module.ts
git commit -m "feat(api-gateway): GET/POST /companies 엔드포인트"
```

---

### Task 6: 프론트 스키마 — counterparty → counterparties 배열

**Files:**
- Modify: `apps/web/src/pages/contract/request-schema.ts`, `apps/web/src/pages/contract/sectionStatus.ts`
- Test: `apps/web/src/pages/contract/request-schema.test.ts`, `apps/web/src/pages/contract/sectionStatus.test.ts`

- [ ] **Step 1: 스키마 수정** — `request-schema.ts`

상단 import 아래에 `Company` 타입 재사용을 위한 zod 스키마 추가하고, `counterparty` 줄 교체:

```ts
import type { Company } from "@lawai/contracts";

// 선택된 상대 계약자(회사) — 검색/등록 응답을 그대로 보관
export const companyRefSchema = z.object({
  id: z.string(),
  type: z.enum(["company", "individual"]),
  name: z.string(),
  bizNo: z.string(),
  ceo: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  addressDetail: z.string().nullable(),
  managerName: z.string().nullable(),
  managerPhone: z.string().nullable(),
  managerEmail: z.string().nullable(),
  createdAt: z.string(),
}) satisfies z.ZodType<Company>;
```

`contractRequestSchema` 안의
```ts
  counterparty: z.string().min(1, "상대 계약자를 입력하세요"),
```
를
```ts
  counterparties: z.array(companyRefSchema).min(1, "상대 계약자를 선택하세요"),
```
로 교체.

`contractRequestDefaults` 안의 `counterparty: "",` 를 `counterparties: [],` 로 교체.

- [ ] **Step 2: sectionStatus 수정** — `sectionStatus.ts:25`

```ts
  const ov = [v.name, v.requester, v.party, v.catMajor, v.catMinor, v.counterparties];
```
(`has()`가 이미 배열 길이를 판정하므로 로직 변경 불필요)

- [ ] **Step 3: 테스트 fixture 갱신**

`request-schema.test.ts:17` 의 `counterparty: "(주)테크파트너스",` 를:
```ts
      counterparties: [
        { id: "c1", type: "company", name: "(주)테크파트너스", bizNo: "111-11-11111",
          ceo: null, phone: null, address: null, addressDetail: null,
          managerName: null, managerPhone: null, managerEmail: null,
          createdAt: "2026-01-01T00:00:00.000Z" },
      ],
```

`sectionStatus.test.ts:17` 의 `counterparty: "c",` 를 `counterparties: [{ id: "c", type: "company", name: "c", bizNo: "x", ceo: null, phone: null, address: null, addressDetail: null, managerName: null, managerPhone: null, managerEmail: null, createdAt: "" }],` 로 교체.

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter @lawai/web test -- request-schema sectionStatus`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/pages/contract/request-schema.ts apps/web/src/pages/contract/request-schema.test.ts apps/web/src/pages/contract/sectionStatus.ts apps/web/src/pages/contract/sectionStatus.test.ts
git commit -m "refactor(web): 상대 계약자를 회사 배열(counterparties)로 변경"
```

---

### Task 7: 프론트 API 클라이언트

**Files:**
- Create: `apps/web/src/api/companies.ts`

- [ ] **Step 1: 작성** — `companies.ts`

```ts
import type { Company, CreateCompanyRequest } from "@lawai/contracts";
import { apiFetch } from "./client";

export function searchCompanies(q: string, limit = 10): Promise<Company[]> {
  const params = new URLSearchParams({ q, limit: String(limit) });
  return apiFetch<Company[]>(`/companies?${params.toString()}`);
}

export function createCompany(req: CreateCompanyRequest): Promise<Company> {
  return apiFetch<Company>("/companies", {
    method: "POST",
    body: JSON.stringify(req),
  });
}
```

- [ ] **Step 2: 타입체크**

Run: `pnpm --filter @lawai/web exec tsc --noEmit -p tsconfig.json`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add apps/web/src/api/companies.ts
git commit -m "feat(web): 회사 검색·등록 API 클라이언트"
```

---

### Task 8: 프론트 — 신규 회사 등록 모달 컴포넌트

**Files:**
- Create: `apps/web/src/pages/contract/sections/CompanyCreateModal.tsx`

시안의 모달 필드(구분/회사명/사업자번호/대표·전화/주소·상세/담당자명·연락처·이메일)를 lawkit `Modal`로 구현. 등록 성공 시 `onCreated(company)` 콜백.

- [ ] **Step 1: 작성** — `CompanyCreateModal.tsx`

```tsx
import { useState } from "react";
import { Modal, Input, RadioGroup, Radio, Button, Alert } from "@lawkit/ui";
import type { Company, CompanyType, CreateCompanyRequest } from "@lawai/contracts";
import { createCompany } from "../../../api/companies";
import { Field } from "./_shared";

interface CompanyCreateModalProps {
  open: boolean;
  initialName?: string;
  onClose: () => void;
  onCreated: (company: Company) => void;
}

export function CompanyCreateModal({ open, initialName = "", onClose, onCreated }: CompanyCreateModalProps) {
  const [type, setType] = useState<CompanyType>("company");
  const [name, setName] = useState(initialName);
  const [bizNo, setBizNo] = useState("");
  const [ceo, setCeo] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { setError("회사명을 입력하세요"); return; }
    setSubmitting(true);
    setError("");
    const req: CreateCompanyRequest = {
      type, name: name.trim(), bizNo: bizNo.trim() || undefined,
      ceo: ceo.trim() || undefined, phone: phone.trim() || undefined,
      address: address.trim() || undefined, addressDetail: addressDetail.trim() || undefined,
      managerName: managerName.trim() || undefined, managerPhone: managerPhone.trim() || undefined,
      managerEmail: managerEmail.trim() || undefined,
    };
    try {
      const created = await createCompany(req);
      onCreated(created);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="medium"
      title="상대 계약자 신규 등록"
      footer={
        <>
          <Button type="button" variant="outline" color="secondary" onClick={onClose}>취소</Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>등록하고 선택</Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="구분">
          <RadioGroup value={type} onChange={(v) => setType(v as CompanyType)}>
            <Radio value="company" label="회사(법인)" />
            <Radio value="individual" label="개인(개인사업자)" />
          </RadioGroup>
        </Field>
        <Field label="회사명 / 상호" required>
          <Input placeholder="예) 삼성전자(주)" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="사업자등록번호">
          <Input placeholder="000-00-00000 (미부여 시 비워두면 임시번호 자동 생성)" value={bizNo} onChange={(e) => setBizNo(e.target.value)} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="대표자명"><Input value={ceo} onChange={(e) => setCeo(e.target.value)} /></Field>
          <Field label="대표 전화"><Input placeholder="02-0000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        </div>
        <Field label="주소">
          <Input placeholder="도로명 주소" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field label="상세주소">
          <Input placeholder="동·호수 등" value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="담당자명"><Input value={managerName} onChange={(e) => setManagerName(e.target.value)} /></Field>
          <Field label="담당자 연락처"><Input placeholder="010-0000-0000" value={managerPhone} onChange={(e) => setManagerPhone(e.target.value)} /></Field>
        </div>
        <Field label="담당자 이메일">
          <Input placeholder="name@company.com" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} />
        </Field>
        {error ? <Alert variant="error">{error}</Alert> : null}
      </div>
    </Modal>
  );
}
```

> 주의(메모리 [[lawkit-ui-gotchas]]): `@lawkit/ui` Input은 `value`/`onChange(e)` 표준 시그니처를 따른다(위 코드처럼 `e.target.value` 사용). Alert에 `success`는 없고 `error`/`info`만 — 위는 `error` 사용. 실제 prop 시그니처가 다르면 d.ts(`node_modules/.pnpm/@lawkit+ui@0.1.47.../dist/ui-v3/src/components/{Input,Alert}/index.d.ts`)를 확인해 맞춘다.

- [ ] **Step 2: 타입체크**

Run: `pnpm --filter @lawai/web exec tsc --noEmit -p tsconfig.json`
Expected: 에러 없음 (Input/Alert prop 불일치 시 d.ts 확인 후 수정)

- [ ] **Step 3: 커밋**

```bash
git add apps/web/src/pages/contract/sections/CompanyCreateModal.tsx
git commit -m "feat(web): 신규 회사 등록 모달"
```

---

### Task 9: 프론트 — OverviewSection 통합 (AutoComplete multiple + 모달)

**Files:**
- Modify: `apps/web/src/pages/contract/sections/OverviewSection.tsx`

- [ ] **Step 1: import 정리** — 상단 import에 `useState` 추가, `Button` 유지, 다음 추가

```ts
import { useState } from "react";
import type { Company } from "@lawai/contracts";
import { searchCompanies } from "../../../api/companies";
import { CompanyCreateModal } from "./CompanyCreateModal";
```

- [ ] **Step 2: 컴포넌트 상단 상태/핸들러 추가** — `OverviewSection` 함수 본문 상단(`const periodEnd = ...` 다음)에 추가

```ts
  const counterparties = useWatch({ control, name: "counterparties" }) ?? [];
  const [results, setResults] = useState<Company[]>([]);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (!text.trim()) { setResults([]); return; }
    try {
      setResults(await searchCompanies(text));
    } catch {
      setResults([]);
    }
  };

  const addCompany = (c: Company) => {
    const current = (counterparties as Company[]);
    if (current.some((x) => x.id === c.id)) return;
    setValue("counterparties", [...current, c], { shouldValidate: true });
  };

  const removeCompany = (id: string) => {
    setValue(
      "counterparties",
      (counterparties as Company[]).filter((x) => x.id !== id),
      { shouldValidate: true },
    );
  };
```

- [ ] **Step 3: 상대 계약자 필드 교체** — 기존 counterparty `<Field>` 블록 전체를 교체

```tsx
        <Field label="상대 계약자 정보" info="검색해 선택하거나, 목록에 없으면 신규 등록하세요. 여러 곳 선택 가능합니다." required className={css.full}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ flex: 1, maxWidth: 460 }}>
              <AutoComplete
                multiple
                placeholder="회사명·사업자번호·대표자로 검색"
                options={results.map((c) => ({
                  value: c.id,
                  label: c.bizNo.startsWith("TEMP-")
                    ? `${c.name} · 임시번호 · ${c.ceo ?? "-"}`
                    : `${c.name} · ${c.bizNo} · ${c.ceo ?? "-"}`,
                }))}
                value={(counterparties as Company[]).map((c) => c.id)}
                onInputChange={handleSearch}
                onChange={(value) => {
                  const ids = Array.isArray(value) ? value : [value];
                  const next = ids
                    .map((id) =>
                      (counterparties as Company[]).find((c) => c.id === id) ??
                      results.find((c) => c.id === id),
                    )
                    .filter((c): c is Company => Boolean(c));
                  setValue("counterparties", next, { shouldValidate: true });
                }}
                noResultText="검색 결과가 없습니다. 신규 등록을 이용하세요."
              />
            </div>
            <Button type="button" variant="outline" color="secondary" onClick={() => setModalOpen(true)}>
              <Icon name="plus" size="sm" /> 신규 추가
            </Button>
          </div>
          <ErrText msg={errors.counterparties?.message} />
          <CompanyCreateModal
            open={modalOpen}
            initialName={query}
            onClose={() => setModalOpen(false)}
            onCreated={(c) => addCompany(c)}
          />
        </Field>
```

> `removeCompany`는 AutoComplete multiple의 badge 제거(onChange)로 처리되므로 별도 UI 불필요. lawkit `Icon`에 `plus`가 없으면 `add`/문자열 `+`로 대체(아이콘 d.ts 확인). AutoComplete의 정확한 onChange 시그니처는 메모리 [[lawkit-ui-gotchas]]와 d.ts(`AutoComplete/index.d.ts`)로 확인 — 본 계획은 `onChange(value: string|string[])` 기준.

- [ ] **Step 4: 타입체크**

Run: `pnpm --filter @lawai/web exec tsc --noEmit -p tsconfig.json`
Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/pages/contract/sections/OverviewSection.tsx
git commit -m "feat(web): 상대 계약자 AutoComplete 검색·다중선택·신규등록 통합"
```

---

### Task 10: 통합 수동 검증

- [ ] **Step 1: 백엔드 기동** — Postgres + user-service + api-gateway 실행

```bash
pnpm --filter @lawai/user-service dev   # 별도 터미널
pnpm --filter @lawai/api-gateway dev    # 별도 터미널
```
Expected: user-service TCP :4002, api-gateway http://localhost:3000 로그.

- [ ] **Step 2: 엔드포인트 스모크 테스트** (로그인 토큰 필요)

```bash
# 회사 생성
curl -s -X POST localhost:3000/companies -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"type":"company","name":"삼성전자(주)","bizNo":"124-81-00998","ceo":"한종희"}'
# 검색
curl -s "localhost:3000/companies?q=삼성" -H "Authorization: Bearer <token>"
```
Expected: 201 생성 객체 / 200 배열에 포함. bizNo 없이 생성 시 `"bizNo":"TEMP-..."` 확인.

- [ ] **Step 3: 프론트 E2E (Playwright)** — `/contract/request` 에서 더미 토큰 주입 후:
  - 상대 계약자 입력칸에 "삼성" 입력 → 드롭다운에 검색 결과 표시
  - 항목 선택 → chip 추가(다중)
  - "신규 추가" → 모달 입력 → "등록하고 선택" → chip 자동 추가
  - 스크린샷으로 확인, 콘솔 에러 없음

- [ ] **Step 4: 최종 커밋(필요 시 스냅샷/문서 갱신)**

---

## Self-Review 결과

- **Spec coverage:** 검색(API+UI), 다중선택(chip), 신규등록(모달+API+즉시선택), 리치 검색행(label에 사업자번호/대표/임시번호), 백엔드 엔드포인트 — 모두 Task 1–10에 매핑됨.
- **Type 일관성:** `Company`/`CompanyType`/`CreateCompanyRequest`/`SearchCompaniesRequest`를 contracts(Task1)에서 정의하고 user-service(3,4)·gateway(5)·web(6–9)에서 동일 사용. 패턴 키 `COMPANY_PATTERNS.SEARCH/CREATE` 일관. `counterparties` 필드명 Task6–9 일관.
- **불확실 지점(실행 시 d.ts로 확정):** lawkit `AutoComplete` onChange/`Input` onChange/`Alert` variant/`Icon` name — 메모리 [[lawkit-ui-gotchas]] 참고, 각 컴포넌트 d.ts 확인 후 맞춘다. erdify enum 미지원 시 문자열 컬럼으로 대체.
- **마이그레이션 전제:** 로컬 Postgres 필요(Task2/10). 미기동 시 해당 스텝에서 DB 먼저 띄운다.
