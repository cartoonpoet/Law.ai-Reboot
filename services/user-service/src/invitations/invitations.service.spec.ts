import { Test } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { InvitationsService } from "./invitations.service";
import { PrismaService } from "../prisma/prisma.service";

describe("InvitationsService (Spec 4)", () => {
  let service: InvitationsService;
  const tx = {
    invitation: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn(), create: jest.fn() },
    userTenant: { findUnique: jest.fn(), create: jest.fn() },
  };
  const prismaMock = {
    invitation: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userTenant: { findFirst: jest.fn(), findMany: jest.fn() },
    user: { findUnique: jest.fn() },
    tenant: { create: jest.fn() },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [InvitationsService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = moduleRef.get(InvitationsService);
  });

  const validInvite = {
    id: "i1",
    tenantId: "t1",
    email: "new@x.com",
    role: "general",
    tokenHash: "hash1",
    invitedById: "u0",
    expiresAt: new Date(Date.now() + 86_400_000),
    acceptedAt: null,
    canceledAt: null,
    createdAt: new Date(),
    tenant: { name: "D물산" },
  };

  it("create: 이미 멤버인 이메일이면 created=false 로 스킵한다", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1" });
    prismaMock.userTenant.findFirst.mockResolvedValue({ id: "m1" });
    const res = await service.create({
      tenantId: "t1", email: "member@x.com", role: "general",
      tokenHash: "h", invitedById: "u0", expiresAt: new Date().toISOString(),
    });
    expect(res.created).toBe(false);
    expect(prismaMock.invitation.create).not.toHaveBeenCalled();
  });

  it("create: 유효 초대가 이미 있으면 created=false", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.invitation.findFirst.mockResolvedValue(validInvite);
    const res = await service.create({
      tenantId: "t1", email: "new@x.com", role: "general",
      tokenHash: "h", invitedById: "u0", expiresAt: new Date().toISOString(),
    });
    expect(res.created).toBe(false);
  });

  it("create: 신규 이메일이면 초대를 생성한다", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.invitation.findFirst.mockResolvedValue(null);
    prismaMock.invitation.create.mockResolvedValue(validInvite);
    const res = await service.create({
      tenantId: "t1", email: "new@x.com", role: "outsideCounsel",
      tokenHash: "h2", invitedById: "u0", expiresAt: "2026-09-17T00:00:00.000Z",
    });
    expect(res.created).toBe(true);
    expect(prismaMock.invitation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tenantId: "t1", email: "new@x.com", role: "outsideCounsel", tokenHash: "h2" }),
    });
  });

  it("findValid: 만료/취소/수락된 토큰이면 null", async () => {
    prismaMock.invitation.findUnique.mockResolvedValue({ ...validInvite, canceledAt: new Date() });
    const res = await service.findValid({ tokenHash: "hash1" });
    expect(res).toBeNull();
  });

  it("findValid: 유효 토큰이면 테넌트명 포함 정보를 반환한다", async () => {
    prismaMock.invitation.findUnique.mockResolvedValue(validInvite);
    const res = await service.findValid({ tokenHash: "hash1" });
    expect(res).toEqual({ tenantId: "t1", tenantName: "D물산", email: "new@x.com", role: "general" });
  });

  it("accept: 신규 이메일이면 User+UserTenant 를 만들고 existingUser=false", async () => {
    tx.invitation.findUnique.mockResolvedValue(validInvite);
    tx.user.findUnique.mockResolvedValue(null);
    tx.user.create.mockResolvedValue({ id: "nu1" });
    const res = await service.accept({ tokenHash: "hash1", name: "박준영", passwordHash: "ph" });
    expect(tx.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: "new@x.com", name: "박준영", passwordHash: "ph" }),
    });
    expect(tx.userTenant.create).toHaveBeenCalledWith({
      data: { userId: "nu1", tenantId: "t1", role: "general" },
    });
    expect(tx.invitation.update).toHaveBeenCalled();
    expect(res).toEqual({ tenantId: "t1", existingUser: false, userId: "nu1" });
  });

  it("accept: 기존 이메일이면 멤버십만 추가하고 existingUser=true", async () => {
    tx.invitation.findUnique.mockResolvedValue(validInvite);
    tx.user.findUnique.mockResolvedValue({ id: "eu1" });
    tx.userTenant.findUnique.mockResolvedValue(null);
    const res = await service.accept({ tokenHash: "hash1", name: "무시", passwordHash: "ph" });
    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.userTenant.create).toHaveBeenCalledWith({
      data: { userId: "eu1", tenantId: "t1", role: "general" },
    });
    expect(res).toEqual({ tenantId: "t1", existingUser: true, userId: "eu1" });
  });

  it("accept: 무효 토큰이면 400 RpcException", async () => {
    tx.invitation.findUnique.mockResolvedValue(null);
    await expect(
      service.accept({ tokenHash: "bad", name: "x", passwordHash: "p" }),
    ).rejects.toBeInstanceOf(RpcException);
  });

  it("cancel: 권한 없는 역할이면 403", async () => {
    await expect(
      service.cancel({ inviteId: "i1", tenantContext: { tenantId: "t1", isSystemAdmin: false }, inviterRole: "general" }),
    ).rejects.toBeInstanceOf(RpcException);
  });

  it("cancel: 담당자는 자기 테넌트 초대를 취소할 수 있다", async () => {
    prismaMock.invitation.findFirst.mockResolvedValue(validInvite);
    prismaMock.invitation.update.mockResolvedValue({ ...validInvite, canceledAt: new Date() });
    await service.cancel({ inviteId: "i1", tenantContext: { tenantId: "t1", isSystemAdmin: false }, inviterRole: "contractManager" });
    expect(prismaMock.invitation.findFirst).toHaveBeenCalledWith({
      where: { id: "i1", tenantId: "t1" },
    });
    expect(prismaMock.invitation.update).toHaveBeenCalledWith({
      where: { id: "i1" },
      data: { canceledAt: expect.any(Date) },
    });
  });

  it("rotate: tokenHash/expiresAt 를 갱신하고 메일용 정보를 반환한다", async () => {
    prismaMock.invitation.findFirst.mockResolvedValue(validInvite);
    prismaMock.invitation.update.mockResolvedValue(validInvite);
    const res = await service.rotate({
      inviteId: "i1", tenantId: "t1", tokenHash: "newHash", expiresAt: "2026-09-20T00:00:00.000Z",
    });
    expect(prismaMock.invitation.update).toHaveBeenCalledWith({
      where: { id: "i1" },
      data: { tokenHash: "newHash", expiresAt: new Date("2026-09-20T00:00:00.000Z") },
    });
    expect(res).toEqual({ email: "new@x.com", tenantName: "D물산" });
  });
});
