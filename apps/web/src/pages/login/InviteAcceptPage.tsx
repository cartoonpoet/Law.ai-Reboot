import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Spinner } from "@lawkit/ui";
import { AuthCard } from "./AuthCard";
import { InviteAcceptForm } from "./InviteAcceptForm";
import { getInviteInfo } from "../../api/auth";
import { getTenantRoleLabel } from "../../utils/tenantRoleLabel";
import * as css from "./auth.css";
import * as inviteCss from "./inviteAccept.css";

// 온보딩 3단계 — 초대 링크 랜딩(공개). 토큰으로 초대 정보 표시 후 가입/소속 추가.
export function InviteAcceptPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");

  const query = useQuery({
    queryKey: ["inviteInfo", token],
    queryFn: () => getInviteInfo(token ?? ""),
    enabled: token !== null,
    retry: false,
    // 만료·잘못된 초대 링크는 이 화면이 안내 문구로 보여준다.
    meta: { errorMode: "silent" },
  });

  if (token === null || query.isError) {
    return (
      <AuthCard>
        <h1 className={css.title}>초대 링크 오류</h1>
        <div className={css.fallbackCol}>
          <p className={css.fallbackText}>
            유효하지 않거나 만료된 초대 링크입니다. 초대한 담당자에게 재발송을 요청해
            주세요.
          </p>
          <Button variant="outline" color="secondary" onClick={() => navigate("/login")}>
            로그인으로 이동
          </Button>
        </div>
      </AuthCard>
    );
  }

  if (query.isLoading || !query.data) {
    return (
      <AuthCard>
        <Spinner label="초대 확인 중..." />
      </AuthCard>
    );
  }

  const invite = query.data;

  return (
    <AuthCard>
      <h1 className={css.title}>{invite.tenantName}에 초대되었습니다</h1>
      <p className={css.subtitle}>
        {invite.email} · 역할: {getTenantRoleLabel(invite.role)}
      </p>
      <div className={inviteCss.inviteBox}>
        <span className={inviteCss.inviteBadge}>{invite.tenantName.charAt(0)}</span>
        <span className={inviteCss.inviteText}>
          이름과 비밀번호만 정하면 바로 시작할 수 있습니다.
        </span>
      </div>
      <InviteAcceptForm token={token} tenantName={invite.tenantName} />
    </AuthCard>
  );
}
