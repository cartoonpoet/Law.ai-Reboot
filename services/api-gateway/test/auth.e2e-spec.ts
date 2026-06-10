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
      return of(null);
    }),
  };
  const userClient = {
    send: jest.fn((pattern: string) => {
      if (pattern === USER_PATTERNS.FIND_BY_ID) {
        return of({
          id: "u1",
          email: "a@b.com",
          name: "A",
          passwordHash: "secret-hash",
          createdAt: "x",
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
        expect(JSON.stringify(res.body)).not.toContain("secret-hash");
      });
  });
});
