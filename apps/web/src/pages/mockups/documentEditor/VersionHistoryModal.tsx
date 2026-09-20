import type { TemplateVersionDto } from "@lawai/contracts";
import { VersionHistoryModal as SharedVersionHistoryModal } from "../../../components/documentEditor/VersionHistoryModal";
import { MOCK_VERSIONS } from "./documentEditorMockData";

interface VersionHistoryModalProps {
  onClose: () => void;
}

/** 시안 저장 이력(MockVersion) → 공용 컴포넌트가 받는 TemplateVersionDto 모양으로 바꾼다. */
const MOCK_VERSION_DTOS: TemplateVersionDto[] = MOCK_VERSIONS.map((item) => ({
  versionNo: item.versionNo,
  content: {},
  clauseCount: null,
  createdById: "mock-user",
  createdByName: item.savedBy,
  createdAt: `${item.savedAt.replace(" ", "T")}:00.000Z`,
}));

/** 시안이라 실제로 되돌리지는 않는다 — 버튼이 눌리는 것만 보여준다. */
const handleMockRevert = () => undefined;

/** 시안용 버전 이력 모달 — 실제 API 대신 가짜 이력을 보여준다(되돌리기는 시안이라 동작하지 않는다). */
export const VersionHistoryModal = ({ onClose }: VersionHistoryModalProps) => (
  <SharedVersionHistoryModal versions={MOCK_VERSION_DTOS} onRevert={handleMockRevert} onClose={onClose} />
);
