import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { of } from "rxjs";
import request from "supertest";
import { AUTH_PATTERNS, USER_PATTERNS } from "@lawai/contracts";
import { AppModule } from "../src/app.module";

describe("api-gateway (e2e)", () => {
  let app: INestApplication;

  const authClient = {
    send: jest.fn((pattern: string) => {
      if (pattern === AUTH_PATTERNS.SIGNUP) {
        return of({
          user: { id: "u1", email: "a@b.com", name: "A", createdAt: "x" },
          tokens: { accessToken: "at", refreshToken: "rt" },
        });
      }
      if (pattern === AUTH_PATTERNS.VALIDATE) {
        return of({ sub: "u1", email: "a@b.com" });
      }
      if (
        pattern === AUTH_PATTERNS.PASSWORD_RESET_REQUEST ||
        pattern === AUTH_PATTERNS.PASSWORD_RESET_CONFIRM
      ) {
        return of({ ok: true });
      }
      return of(null);
    }),
  };
  const userClient = {
    send: jest.fn((pattern: string) => {
      // 내 정보 조회는 user.profile.get 으로 묻는다. 내부 전용 값(해시·R2 키)이 섞여 와도 응답에서 빠져야 한다.
      if (pattern === USER_PATTERNS.GET_PROFILE) {
        return of({
          id: "u1",
          email: "a@b.com",
          name: "A",
          passwordHash: "secret-hash",
          isSystemAdmin: false,
          departmentId: null,
          departmentName: null,
          createdAt: "x",
          emailNotify: true,
          notifyApproval: true,
          notifyComment: true,
          avatarKey: "avatars/u1/secret-key.png",
        });
      }
      return of(null);
    }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider("AUTH_CLIENT")
      .useValue(authClient)
      .overrideProvider("USER_CLIENT")
      .useValue(userClient)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /auth/signup → 201과 토큰", () => {
    return request(app.getHttpServer())
      .post("/auth/signup")
      .send({ email: "a@b.com", name: "Alice", password: "password123" })
      .expect(201)
      .expect((res) => {
        expect(res.body.tokens.accessToken).toBe("at");
      });
  });

  it("POST /auth/signup → 잘못된 입력은 400", () => {
    return request(app.getHttpServer())
      .post("/auth/signup")
      .send({ email: "not-email", name: "A", password: "short" })
      .expect(400);
  });

  it("POST /auth/password/reset-request → 200, { ok: true }", () => {
    return request(app.getHttpServer())
      .post("/auth/password/reset-request")
      .send({ email: "a@b.com" })
      .expect(200)
      .expect((res) => {
        expect(res.body.ok).toBe(true);
      });
  });

  it("POST /auth/password/reset-request → 이메일 형식 아니면 400", () => {
    return request(app.getHttpServer())
      .post("/auth/password/reset-request")
      .send({ email: "nope" })
      .expect(400);
  });

  it("POST /auth/password/reset-confirm → 200, { ok: true }", () => {
    return request(app.getHttpServer())
      .post("/auth/password/reset-confirm")
      .send({ token: "raw-token", newPassword: "newpassword123" })
      .expect(200)
      .expect((res) => {
        expect(res.body.ok).toBe(true);
      });
  });

  it("POST /auth/password/reset-confirm → 짧은 비밀번호는 400", () => {
    return request(app.getHttpServer())
      .post("/auth/password/reset-confirm")
      .send({ token: "raw-token", newPassword: "short" })
      .expect(400);
  });

  it("GET /users/me → 토큰 없으면 401", () => {
    return request(app.getHttpServer()).get("/users/me").expect(401);
  });

  it("GET /users/me → 유효 토큰이면 200, 해시는 노출 안 됨", () => {
    return request(app.getHttpServer())
      .get("/users/me")
      .set("Authorization", "Bearer valid")
      .expect(200)
      .expect((res) => {
        expect(res.body.email).toBe("a@b.com");
        expect(res.body.emailNotify).toBe(true);
        expect(res.body.avatarUrl).toBe("/users/u1/avatar/secret-key.png");
        expect(JSON.stringify(res.body)).not.toContain("secret-hash");
        expect(res.body).not.toHaveProperty("avatarKey");
      });
  });

  it("PATCH /users/me·POST /auth/password/change → 토큰 없으면 401", async () => {
    await request(app.getHttpServer()).patch("/users/me").send({ name: "새이름" }).expect(401);
    await request(app.getHttpServer())
      .post("/auth/password/change")
      .send({ currentPassword: "Old1234!", newPassword: "New1234!" })
      .expect(401);
  });

  it("POST /auth/password/change → 새 비밀번호가 규칙에 안 맞으면 400", () => {
    return request(app.getHttpServer())
      .post("/auth/password/change")
      .set("Authorization", "Bearer valid")
      .send({ currentPassword: "Old1234!", newPassword: "short" })
      .expect(400);
  });
});
