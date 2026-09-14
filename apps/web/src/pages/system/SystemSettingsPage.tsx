import { useState } from "react";
import { Button, Dropdown, Input, InputGroup, Spinner } from "@lawkit/ui";
import { useMyAiCredential } from "./hooks/useMyAiCredential";
import * as css from "./systemSettings.css";

const PROVIDER_OPTIONS = [{ value: "openai", label: "OpenAI" }];

const TIER_LABEL: Record<string, string> = {
  economy: "절약",
  standard: "표준",
  precision: "고정밀",
};

const formatDateTime = (iso: string): string => new Date(iso).toLocaleString("ko-KR");

export function SystemSettingsPage() {
  // 설정 조회 실패는 에러 경계가 본문을 오류 페이지로 바꾼다(useMyAiCredential meta: page).
  const { credential, isLoading, models, save, isSaving } = useMyAiCredential();
  const [modelOverride, setModelOverride] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const standardModelId = models.find((m) => m.tier === "standard")?.id ?? models[0]?.id ?? "";
  const selectedModel = modelOverride ?? credential?.model ?? standardModelId;
  const isConnected = credential?.hasApiKey ?? false;

  const modelOptions = models.map((m) => ({
    value: m.id,
    label: `${m.label} (${TIER_LABEL[m.tier] ?? m.tier})`,
  }));

  const handleSave = async () => {
    setErrorMessage(null);
    if (!apiKey.trim()) {
      setErrorMessage("API 키를 입력하세요.");
      return;
    }
    if (!selectedModel) {
      setErrorMessage("모델을 선택하세요.");
      return;
    }
    try {
      await save({ provider: "openai", model: selectedModel, apiKey: apiKey.trim() });
      setApiKey("");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "저장에 실패했습니다.");
    }
  };

  if (isLoading) {
    return (
      <div className={css.page}>
        <Spinner label="불러오는 중..." />
      </div>
    );
  }

  return (
    <div className={css.page}>
      <div className={css.headRow}>
        <h1 className={css.title}>내 AI 연동</h1>
      </div>

      <section className={css.card}>
        <div className={css.cardHead}>
          <span className={css.cardTitle}>연동 정보</span>
          <span
            className={`${css.badge} ${isConnected ? css.badgeState.ok : css.badgeState.none}`}
          >
            <span className={css.badgeDot} />
            {isConnected ? "정상" : "미설정"}
          </span>
        </div>

        <div className={css.field}>
          <span className={css.label}>프로바이더</span>
          <Dropdown options={PROVIDER_OPTIONS} value="openai" disabled />
        </div>

        <div className={css.field}>
          <span className={css.label}>모델</span>
          <Dropdown
            options={modelOptions}
            value={selectedModel}
            placeholder="모델 선택"
            onChange={(v) => setModelOverride(v as string)}
          />
        </div>

        <InputGroup
          label="API 키"
          helperText={
            credential?.lastVerifiedAt
              ? `마지막 확인: ${formatDateTime(credential.lastVerifiedAt)}`
              : "프로바이더에서 발급받은 API 키를 입력하세요."
          }
        >
          <Input
            type="password"
            state={errorMessage ? "warning" : "default"}
            value={apiKey}
            placeholder={isConnected ? "변경하려면 새 API 키를 입력하세요" : "sk-..."}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </InputGroup>

        {errorMessage ? (
          <p role="alert" className={css.errorText}>
            {errorMessage}
          </p>
        ) : null}

        <div className={css.saveRow}>
          <Button disabled={isSaving} onClick={() => void handleSave()}>
            저장
          </Button>
        </div>
      </section>
    </div>
  );
}
