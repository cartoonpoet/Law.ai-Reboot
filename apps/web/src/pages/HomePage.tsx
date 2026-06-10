import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { getMe } from "../api/auth";

export function HomePage() {
  const hasToken = !!localStorage.getItem("accessToken");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    enabled: hasToken,
    retry: false,
  });

  if (!hasToken) return <Navigate to="/login" replace />;
  if (isLoading) return <p>불러오는 중…</p>;
  if (isError) return <Navigate to="/login" replace />;

  return (
    <div style={{ padding: 24 }}>
      <h1>환영합니다, {data?.name}님</h1>
      <p>{data?.email}</p>
    </div>
  );
}
