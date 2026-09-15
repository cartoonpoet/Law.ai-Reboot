import { Injectable } from "@nestjs/common";
import type { ContractStatus, PublicStatsResponse } from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";

// 법무 검토가 끝난 뒤의 단계들.
export const REVIEWED_STATUSES: ContractStatus[] = ["reviewDone", "signing", "signed", "fulfilling", "closed"];

/**
 * 로그인 화면 "지금까지 검토된 계약" — 인증 없이 보이는 곳이라 전체 합계 숫자 하나만 돌려준다.
 *
 * 검토된 계약 = 삭제되지 않았고, 검토 완료 이후 단계이며, 담당자가 배정된 계약.
 * 체결 완료 등록(검토 없이 서명본으로 바로 등록)은 담당자를 배정하지 않으므로 자연히 빠진다.
 */
@Injectable()
export class PublicStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<PublicStatsResponse> {
    const reviewedContractCount = await this.prisma.contract.count({
      where: { deletedAt: null, ownerId: { not: null }, status: { in: REVIEWED_STATUSES } },
    });
    return { reviewedContractCount };
  }
}
