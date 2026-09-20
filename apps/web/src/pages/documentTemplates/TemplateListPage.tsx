import { useRef, useState } from "react";
import { Button, ButtonGroup, DataTable, EmptyState, Icon, Input } from "@lawkit/ui";
import type { TemplateCategoryTypes } from "@lawai/contracts";
import { Panel } from "../../components/ui/Panel";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { STANDARD_FORM_CATEGORIES } from "../../api/standardForms";
import { importDocument, fileToBase64 } from "../../api/documents";
import { TEMPLATE_COLUMNS } from "./templateColumns";
import { useTemplateList } from "./hooks/useTemplateList";
import { CreateTemplateModal } from "./CreateTemplateModal";
import * as css from "./documentTemplates.css";

/** 1. 표준양식 관리 — 목록. 분류별로 모아 보고, 새 양식은 빈 문서로 시작하거나 워드 파일을 올려 만든다. */
export const TemplateListPage = () => {
  const list = useTemplateList();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [uploadedHtml, setUploadedHtml] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const { html } = await importDocument(base64, file.name);
      setUploadedHtml(html);
      setIsCreateOpen(true);
    } finally {
      setIsUploading(false);
    }
  };

  const tabs = [
    { value: "all", label: "전체" },
    ...STANDARD_FORM_CATEGORIES.map((item) => ({
      value: item.id,
      label: `${item.label} ${list.counts?.[item.id as TemplateCategoryTypes] ?? 0}`,
    })),
  ];

  return (
    <div>
      <div className={css.pageHead}>
        <div>
          <Eyebrow>계약 관리</Eyebrow>
          <h1 className={css.pageTitle}>표준양식 관리</h1>
        </div>
        <div className={css.headActions}>
          {/* lds-exempt: 숨긴 파일 선택기 — 화면에 보이지 않는 트리거라 LDS FileUpload(드롭 영역 UI)로 대체할 수 없다. documentToolbar/InsertGroup 과 같은 방식. */}
          <input ref={fileInputRef} type="file" accept=".docx" hidden onChange={handleFileSelected} disabled={isUploading} />
          <Button
            variant="outline"
            color="secondary"
            iconLeft={<Icon name="uploadCloud" size="sm" />}
            disabled={isUploading}
            onClick={handlePickFile}
          >
            {isUploading ? "읽는 중…" : "워드 파일 올려서 만들기"}
          </Button>
          <Button iconLeft={<Icon name="plus" size="sm" />} onClick={() => setIsCreateOpen(true)}>
            빈 문서로 만들기
          </Button>
        </div>
      </div>

      <div className={css.filters}>
        <Input
          inputSize="medium"
          placeholder="양식 이름으로 찾기"
          value={list.keyword}
          onChange={(e) => list.setKeyword(e.target.value)}
          leftIcon={<Icon name="search" size="sm" />}
        />
      </div>

      <Panel flush>
        <ButtonGroup
          variant="segmented"
          items={tabs}
          value={list.categoryId}
          onChange={(next) => list.setCategoryId(next as TemplateCategoryTypes | "all")}
        />
        {list.isLoading && <p className={css.status}>불러오는 중…</p>}
        {list.isError && <p className={css.status}>목록을 불러오지 못했습니다.</p>}
        {!list.isLoading && !list.isError && list.items.length === 0 && (
          <EmptyState
            icon={<Icon name="fileText" size="lg" />}
            title="이 분류에는 아직 양식이 없어요"
            description="빈 문서로 새로 쓰거나, 쓰던 워드 파일을 올려 표준 양식으로 만들 수 있어요."
            action={
              <Button iconLeft={<Icon name="plus" size="sm" />} onClick={() => setIsCreateOpen(true)}>
                빈 문서로 만들기
              </Button>
            }
          />
        )}
        {!list.isLoading && !list.isError && list.items.length > 0 && (
          <DataTable data={list.items} columns={TEMPLATE_COLUMNS} getRowId={(item) => item.id} />
        )}
      </Panel>

      {isCreateOpen && (
        <CreateTemplateModal
          initialHtml={uploadedHtml}
          onClose={() => {
            setIsCreateOpen(false);
            setUploadedHtml(undefined);
          }}
        />
      )}
    </div>
  );
};
