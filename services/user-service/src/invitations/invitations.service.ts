import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import type {
  AcceptInvitationRpcRequest,
  AcceptInvitationRpcResult,
  CancelInvitationRequest,
  CreateInvitationRequest,
  CreateInvitationResult,
  FindInvitationRequest,
  FindInvitationResult,
  RotateInvitationRequest,
  RotateInvitationResult,
  TenantRole,
} from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";

// 초대·취소가 가능한 테넌트 내 역할 (스펙 §2.2).
const INVITER_ROLES: TenantRole[] = ["contractManager", "inHouseCounsel"];

// 유효 초대 공통 조건 — acceptedAt/canceledAt 없음 + 미만료.
const validWhere = () => ({
  acceptedAt: null,
  canceledAt: null,
  expiresAt: { gt: new Date() },
});

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 초대 생성. 이미 이 테넌트 멤버이거나 유효 초대가 있는 이메일은 스킵(created=false).
   */
  async create(req: CreateInvitationRequest): Promise<CreateInvitationResult> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: req.email },
    });
    if (existingUser) {
      const membership = await this.prisma.userTenant.findFirst({
        where: { userId: existingUser.id, tenantId: req.tenantId },
      });
      if (membership) return { created: false };
    }
    const pending = await this.prisma.invitation.findFirst({
      where: { tenantId: req.tenantId, email: req.email, ...validWhere() },
    });
    if (pending) return { created: false };

    await this.prisma.invitation.create({
      data: {
        tenantId: req.tenantId,
        email: req.email,
        role: req.role,
        tokenHash: req.tokenHash,
        invitedById: req.invitedById,
        expiresAt: new Date(req.expiresAt),
      },
    });
    return { created: true };
  }

  /** 재발송 — 토큰 회전(구 링크 무효화). 메일용 email/tenantName 반환. */
  async rotate(req: RotateInvitationRequest): Promise<RotateInvitationResult> {
    const invite = await this.prisma.invitation.findFirst({
      where: { id: req.inviteId, tenantId: req.tenantId, ...validWhere() },
      include: { tenant: { select: { name: true } } },
    });
    if (!invite) {
      throw new RpcException({ status: 404, message: "유효한 초대를 찾을 수 없습니다" });
    }
    await this.prisma.invitation.update({
      where: { id: req.inviteId },
      data: { tokenHash: req.tokenHash, expiresAt: new Date(req.expiresAt) },
    });
    return { email: invite.email, tenantName: invite.tenant.name };
  }

  /** 취소 — 담당자(contractManager/inHouseCounsel) 또는 시스템 admin 만. */
  async cancel(req: CancelInvitationRequest): Promise<{ ok: true }> {
    const isAdmin = req.tenantContext?.isSystemAdmin === true;
    if (!isAdmin && (!req.inviterRole || !INVITER_ROLES.includes(req.inviterRole))) {
      throw new RpcException({ status: 403, message: "멤버 초대 권한이 없습니다" });
    }
    const where = isAdmin
      ? { id: req.inviteId }
      : { id: req.inviteId, tenantId: req.tenantContext?.tenantId };
    const invite = await this.prisma.invitation.findFirst({ where });
    if (!invite) {
      throw new RpcException({ status: 404, message: "초대를 찾을 수 없습니다" });
    }
    await this.prisma.invitation.update({
      where: { id: req.inviteId },
      data: { canceledAt: new Date() },
    });
    return { ok: true };
  }

  /** 토큰으로 유효 초대 조회(수락 페이지 표시용). 무효면 null. */
  async findValid(req: FindInvitationRequest): Promise<FindInvitationResult | null> {
    const invite = await this.prisma.invitation.findUnique({
      where: { tokenHash: req.tokenHash },
      include: { tenant: { select: { name: true } } },
    });
    if (
      !invite ||
      invite.acceptedAt !== null ||
      invite.canceledAt !== null ||
      invite.expiresAt <= new Date()
    ) {
      return null;
    }
    return {
      tenantId: invite.tenantId,
      tenantName: invite.tenant.name,
      email: invite.email,
      role: invite.role,
    };
  }

  /**
   * 수락 — 트랜잭션으로 초대 소비 + 사용자/멤버십 생성 원자화.
   * 신규 이메일: User + UserTenant 생성. 기존 이메일: 멤버십만 추가(이미 멤버면 초대만 소비).
   */
  async accept(req: AcceptInvitationRpcRequest): Promise<AcceptInvitationRpcResult> {
    return this.prisma.$transaction(async (tx) => {
      const invite = await tx.invitation.findUnique({
        where: { tokenHash: req.tokenHash },
        include: { tenant: { select: { name: true } } },
      });
      if (
        !invite ||
        invite.acceptedAt !== null ||
        invite.canceledAt !== null ||
        invite.expiresAt <= new Date()
      ) {
        throw new RpcException({
          status: 400,
          message: "유효하지 않거나 만료된 초대 링크입니다",
        });
      }

      const existing = await tx.user.findUnique({ where: { email: invite.email } });
      let userId: string;
      let existingUser: boolean;

      if (existing) {
        existingUser = true;
        userId = existing.id;
        const membership = await tx.userTenant.findUnique({
          where: { userId_tenantId: { userId, tenantId: invite.tenantId } },
        });
        if (!membership) {
          await tx.userTenant.create({
            data: { userId, tenantId: invite.tenantId, role: invite.role },
          });
        }
      } else {
        existingUser = false;
        const created = await tx.user.create({
          data: {
            email: invite.email,
            name: req.name,
            passwordHash: req.passwordHash,
          },
        });
        userId = created.id;
        await tx.userTenant.create({
          data: { userId, tenantId: invite.tenantId, role: invite.role },
        });
      }

      await tx.invitation.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });

      return { tenantId: invite.tenantId, existingUser, userId };
    });
  }
}
