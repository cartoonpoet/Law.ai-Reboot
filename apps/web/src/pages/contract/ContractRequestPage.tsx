import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Icon,
  Button,
  Card,
  Input,
  InputGroup,
  ButtonGroup,
  Dropdown,
  Alert,
  FileUploadArea,
  Avatar,
} from "@lawkit/ui";
import type { IconName } from "@lawkit/ui";
import { T } from "../../design/tokens";
import { LIST_FILTERS } from "./mock-data";
import { contractRequestSchema, contractRequestDefaults } from "./request-schema";
import type { ContractRequestForm } from "./request-schema";

function pickValue(v: string | string[]): string {
  return Array.isArray(v) ? (v[0] ?? "") : v;
}

function CardTitle({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <Icon name={icon} size="sm" style={{ width: 16, height: 16, color: T.muted }} />
      {children}
    </span>
  );
}

function ErrText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div role="alert" style={{ marginTop: 5, fontSize: 12, color: T.danger }}>
      {msg}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: T.faint,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        marginBottom: 7,
      }}
    >
      {children}
    </div>
  );
}

export function ContractRequestPage() {
  const navigate = useNavigate();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ContractRequestForm>({
    resolver: zodResolver(contractRequestSchema),
    defaultValues: contractRequestDefaults,
  });

  const onValid = () => {
    // 실제 API 연동 전: 제출 성공 시 상세 화면으로 이동(샘플)
    navigate("/contract/C20250710-0004");
  };

  const full = { gridColumn: "1 / -1" } as const;
  const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 20px" } as const;

  return (
    <form onSubmit={handleSubmit(onValid)}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 18,
        }}
      >
        <div>
          <Eyebrow>계약</Eyebrow>
          <h1
            style={{
              margin: 0,
              fontSize: 23,
              fontWeight: 800,
              color: T.heading,
              letterSpacing: "-0.025em",
            }}
          >
            계약서 검토 요청
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="button" variant="outline" color="secondary" onClick={() => navigate("/contract/list")}>
            목록
          </Button>
          <Button type="submit" iconLeft={<Icon name="submit" size="sm" style={{ width: 14, height: 14 }} />}>
            검토 요청
          </Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
          <Card header={<CardTitle icon="fileText">기본정보</CardTitle>} bordered>
            <div style={grid2}>
              <InputGroup label="계약 단계" required>
                <Controller
                  name="stage"
                  control={control}
                  render={({ field }) => (
                    <ButtonGroup
                      value={field.value}
                      onChange={field.onChange}
                      items={[
                        { value: "new", label: "신규계약" },
                        { value: "change", label: "변경·해지" },
                      ]}
                    />
                  )}
                />
              </InputGroup>
              <InputGroup label="보안 여부" required>
                <Controller
                  name="secure"
                  control={control}
                  render={({ field }) => (
                    <ButtonGroup
                      value={field.value}
                      onChange={field.onChange}
                      items={[
                        { value: "top", label: "극비" },
                        { value: "secure", label: "보안" },
                        { value: "normal", label: "일반" },
                      ]}
                    />
                  )}
                />
              </InputGroup>
              <InputGroup label="계약명" required style={full}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <Input placeholder="계약명을 입력하세요" value={field.value} onChange={field.onChange} />
                  )}
                />
                <ErrText msg={errors.name?.message} />
              </InputGroup>
              <InputGroup label="검토 요청자" required>
                <Input
                  value="손준호 (법무팀)"
                  readOnly
                  leftIcon={<Icon name="user" size="sm" style={{ width: 15, height: 15, color: T.faint }} />}
                />
              </InputGroup>
              <InputGroup label="계약서 유형" required>
                <Controller
                  name="ctype"
                  control={control}
                  render={({ field }) => (
                    <ButtonGroup
                      value={field.value}
                      onChange={field.onChange}
                      items={[
                        { value: "normal", label: "일반 검토요청" },
                        { value: "std", label: "표준계약서 기반" },
                      ]}
                    />
                  )}
                />
              </InputGroup>
              <InputGroup label="계약 당사자" required>
                <Controller
                  name="party"
                  control={control}
                  render={({ field }) => (
                    <Dropdown
                      options={LIST_FILTERS.party.slice(1).map((o) => ({ value: o, label: o }))}
                      value={field.value}
                      placeholder="선택"
                      onChange={(v) => field.onChange(pickValue(v))}
                    />
                  )}
                />
                <ErrText msg={errors.party?.message} />
              </InputGroup>
              <InputGroup label="계약 대분류" required>
                <Controller
                  name="cat"
                  control={control}
                  render={({ field }) => (
                    <Dropdown
                      options={LIST_FILTERS.cat.slice(1).map((o) => ({ value: o, label: o }))}
                      value={field.value}
                      placeholder="선택"
                      onChange={(v) => field.onChange(pickValue(v))}
                    />
                  )}
                />
                <ErrText msg={errors.cat?.message} />
              </InputGroup>
              <InputGroup label="계약 기간" required style={full}>
                <Controller
                  name="period"
                  control={control}
                  render={({ field }) => (
                    <Input
                      placeholder="YYYY-MM-DD ~ YYYY-MM-DD"
                      value={field.value}
                      onChange={field.onChange}
                      leftIcon={<Icon name="calendar" size="sm" style={{ width: 15, height: 15, color: T.faint }} />}
                    />
                  )}
                />
                <ErrText msg={errors.period?.message} />
              </InputGroup>
            </div>
          </Card>

          <Card header={<CardTitle icon="paperclip">계약서 첨부</CardTitle>} bordered>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Alert type="info" size="small">
                검토 정확도를 위해 편집 가능한 워드(.docx) 파일 첨부를 권장합니다. 첨부 즉시 AI가 주요 리스크 조항을
                사전 점검합니다.
              </Alert>
              <InputGroup label="계약서">
                <FileUploadArea
                  description=".docx · .hwp · .pdf · 최대 30MB — 파일을 끌어다 놓거나 클릭해 첨부"
                  onFilesAdded={() => {}}
                  accept=".docx,.hwp,.pdf"
                />
              </InputGroup>
            </div>
          </Card>

          <Card header={<CardTitle icon="list">상세정보</CardTitle>} bordered>
            <div style={grid2}>
              <InputGroup label="계약 언어">
                <Controller
                  name="lang"
                  control={control}
                  render={({ field }) => (
                    <ButtonGroup
                      value={field.value}
                      onChange={field.onChange}
                      items={[
                        { value: "ko", label: "국문" },
                        { value: "en", label: "영문" },
                        { value: "koen", label: "국영문" },
                      ]}
                    />
                  )}
                />
              </InputGroup>
              <InputGroup label="법무 분류">
                <Controller
                  name="legal"
                  control={control}
                  render={({ field }) => (
                    <ButtonGroup
                      value={field.value}
                      onChange={field.onChange}
                      items={[
                        { value: "dom", label: "국내 법무" },
                        { value: "intl", label: "해외 법무" },
                      ]}
                    />
                  )}
                />
              </InputGroup>
              <InputGroup label="계약 규모 (대가)">
                <Controller
                  name="amount"
                  control={control}
                  render={({ field }) => (
                    <Input
                      placeholder="0"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      rightIcon={<span style={{ fontSize: 12, color: T.faint }}>원</span>}
                    />
                  )}
                />
              </InputGroup>
              <InputGroup label="계약의 배경 및 목적" required style={full}>
                <Controller
                  name="purpose"
                  control={control}
                  render={({ field }) => (
                    <Input
                      placeholder="계약을 체결하는 배경과 목적을 입력하세요"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <ErrText msg={errors.purpose?.message} />
              </InputGroup>
            </div>
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, position: "sticky", top: 16 }}>
          <Card bordered header={<CardTitle icon="approvalCompleted">결재선</CardTitle>}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { n: "손준호", r: "기안 · 법무팀", c: "primary" as const },
                { n: "이법무", r: "검토 · 법무팀장", c: "info" as const },
                { n: "정상무", r: "승인 · 경영지원본부", c: "success" as const },
              ].map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      width: 16,
                      fontSize: 11,
                      fontWeight: 800,
                      color: T.faint,
                      textAlign: "center",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <Avatar initials={p.n[0]} color={p.c} size="sm" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.heading }}>{p.n}</div>
                    <div style={{ fontSize: 11, color: T.faint }}>{p.r}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}
