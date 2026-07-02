import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { partsToRows, summarizeParts, type DiffRow, type DiffSpan } from "./computeDiffRows";
import type { Change } from "diff";
import type { PreviewFileRef } from "./FilePreviewModal";

// 한글 폰트 — Google Fonts 의 NotoSansKR TTF (jsDelivr 미러). 다른 폰트로 교체하려면 여기만.
// @react-pdf 는 기본 폰트(Helvetica)로 한글이 렌더 안 되므로 등록 필수. 1회만 등록 OK.
let fontRegistered = false;
const registerFont = () => {
  if (fontRegistered) return;
  Font.register({
    family: "NotoSansKR",
    fonts: [
      {
        src: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Regular.otf",
        fontWeight: 400,
      },
      {
        src: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Bold.otf",
        fontWeight: 700,
      },
    ],
  });
  fontRegistered = true;
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansKR",
    fontSize: 10,
    padding: 36,
    color: "#111827",
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 3,
    fontSize: 10,
    color: "#4b5563",
  },
  metaLabel: {
    fontWeight: 700,
    minWidth: 60,
  },
  summaryBox: {
    marginTop: 16,
    marginBottom: 18,
    padding: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 4,
    flexDirection: "row",
    gap: 16,
  },
  summaryItem: {
    fontSize: 11,
    fontWeight: 700,
  },
  summaryAdd: { color: "#15803d" },
  summaryRemove: { color: "#b91c1c" },
  diffLine: {
    flexDirection: "row",
    paddingVertical: 1,
    paddingHorizontal: 6,
    fontFamily: "NotoSansKR",
    fontSize: 9,
    lineHeight: 1.35,
  },
  diffSign: {
    width: 12,
    fontWeight: 700,
  },
  diffText: { flex: 1 },
  diffAdd: { backgroundColor: "#dcfce7", color: "#14532d" },
  diffRemove: { backgroundColor: "#fee2e2", color: "#7f1d1d" },
  diffContext: { color: "#6b7280" },
  diffPairedAdd: { backgroundColor: "#f0fdf4", borderLeftWidth: 2, borderLeftColor: "#16a34a" },
  diffPairedRemove: { backgroundColor: "#fef2f2", borderLeftWidth: 2, borderLeftColor: "#dc2626" },
  spanAdd: { backgroundColor: "#bbf7d0", color: "#14532d" },
  spanRemove: { backgroundColor: "#fecaca", color: "#7f1d1d", textDecoration: "line-through" },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "center",
  },
});

interface ChangeReportProps {
  fileA: PreviewFileRef;
  fileB: PreviewFileRef;
  parts: Change[];
  generatedAt: string; // ISO timestamp
  generatedBy?: string; // 사용자 이름 (선택)
}

/**
 * 두 파일 비교 결과 PDF — 결재 첨부물/감사 보관 용도.
 * 표지 메타 + 변경 요약 + 텍스트 diff(unified) 1장.
 */
export function ChangeReport({
  fileA,
  fileB,
  parts,
  generatedAt,
  generatedBy,
}: ChangeReportProps) {
  registerFont();

  const { added, removed } = summarizeParts(parts);
  const rows = partsToRows(parts);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>문서 비교 변경 보고서</Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>A (원본):</Text>
          <Text>{fileA.name}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>B (변경):</Text>
          <Text>{fileB.name}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>비교 시각:</Text>
          <Text>{new Date(generatedAt).toLocaleString("ko-KR")}</Text>
        </View>
        {generatedBy && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>비교자:</Text>
            <Text>{generatedBy}</Text>
          </View>
        )}

        <View style={styles.summaryBox}>
          <Text style={[styles.summaryItem, styles.summaryAdd]}>
            + 추가 {added} 라인
          </Text>
          <Text style={[styles.summaryItem, styles.summaryRemove]}>
            − 삭제 {removed} 라인
          </Text>
        </View>

        {rows.map((row, i) => renderPdfRow(row, i))}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Law.ai 변경보고서 · ${pageNumber} / ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

const renderPdfRow = (row: DiffRow, key: number) => {
  if (row.kind === "context") {
    return (
      <View key={key} style={[styles.diffLine, styles.diffContext]} wrap={false}>
        <Text style={styles.diffSign}> </Text>
        <Text style={styles.diffText}>{row.text || " "}</Text>
      </View>
    );
  }
  if (row.kind === "add") {
    return (
      <View key={key} style={[styles.diffLine, styles.diffAdd]} wrap={false}>
        <Text style={styles.diffSign}>+</Text>
        <Text style={styles.diffText}>{row.text || " "}</Text>
      </View>
    );
  }
  if (row.kind === "remove") {
    return (
      <View key={key} style={[styles.diffLine, styles.diffRemove]} wrap={false}>
        <Text style={styles.diffSign}>−</Text>
        <Text style={styles.diffText}>{row.text || " "}</Text>
      </View>
    );
  }
  if (row.kind === "paired-remove") {
    return (
      <View key={key} style={[styles.diffLine, styles.diffPairedRemove]} wrap={false}>
        <Text style={styles.diffSign}>−</Text>
        <Text style={styles.diffText}>{row.spans.map((s, i) => renderPdfSpan(s, i))}</Text>
      </View>
    );
  }
  // paired-add
  return (
    <View key={key} style={[styles.diffLine, styles.diffPairedAdd]} wrap={false}>
      <Text style={styles.diffSign}>+</Text>
      <Text style={styles.diffText}>{row.spans.map((s, i) => renderPdfSpan(s, i))}</Text>
    </View>
  );
};

const renderPdfSpan = (span: DiffSpan, key: number) => {
  if (span.kind === "add") {
    return (
      <Text key={key} style={styles.spanAdd}>
        {span.text}
      </Text>
    );
  }
  if (span.kind === "remove") {
    return (
      <Text key={key} style={styles.spanRemove}>
        {span.text}
      </Text>
    );
  }
  return <Text key={key}>{span.text}</Text>;
};
