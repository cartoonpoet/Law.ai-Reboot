import { Injectable } from "@nestjs/common";
import { AiCredentialsService } from "../ai-credentials/ai-credentials.service";
import { AiServiceClient } from "../ai-credentials/ai-service.client";

// 스캔 PDF 1건을 AI 로 읽을 최대 크기·쪽수 — 넘으면 읽지 않는다(AI 비용·요청 크기 보호).
export const MAX_OCR_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_OCR_PAGES = 20;
// 읽은 결과를 기억해 둘 파일 수. 파일은 올릴 때마다 새 저장 키라 같은 키면 같은 내용이다.
const CACHE_SIZE = 50;

/**
 * 글자 층이 없는 PDF(스캔본)를 AI 로 읽어 글자로 옮긴다.
 * - 분석을 요청한 사람의 AI 연동(모델·키)을 쓰므로 비용도 그 연동으로 청구된다. 연동이 없거나 제한을 넘으면 null.
 * - 사전 점검·리스크 분석이 같은 파일을 연달아(또는 동시에) 읽어도 AI 호출은 한 번만 하도록 저장 키별로 결과를 기억한다.
 *   실패하거나 못 읽은 결과는 기억하지 않는다(다음 요청자가 다시 시도할 수 있게).
 */
@Injectable()
export class ScannedPdfReader {
  private readonly readsByStorageKey = new Map<string, Promise<string | null>>();

  constructor(
    private readonly credentials: AiCredentialsService,
    private readonly aiClient: AiServiceClient,
  ) {}

  read(params: {
    userId: string;
    storageKey: string;
    fileName: string;
    bytes: Uint8Array;
    pageCount: number;
  }): Promise<string | null> {
    const { storageKey, bytes, pageCount } = params;
    if (bytes.length > MAX_OCR_FILE_BYTES || pageCount > MAX_OCR_PAGES) return Promise.resolve(null);

    const remembered = this.readsByStorageKey.get(storageKey);
    if (remembered) return remembered;

    const reading = this.requestRead(params).then(
      (text) => {
        if (text === null) this.readsByStorageKey.delete(storageKey);
        return text;
      },
      (error: unknown) => {
        this.readsByStorageKey.delete(storageKey);
        throw error;
      },
    );
    this.remember(storageKey, reading);
    return reading;
  }

  private async requestRead(params: { userId: string; fileName: string; bytes: Uint8Array }): Promise<string | null> {
    const credential = await this.credentials.getDecryptedKeyFor(params.userId);
    if (!credential) return null;

    const { text } = await this.aiClient.readDocument({
      model: credential.model,
      apiKey: credential.apiKey,
      fileName: params.fileName,
      mimeType: "application/pdf",
      fileBase64: Buffer.from(params.bytes).toString("base64"),
    });
    return text.trim() || null;
  }

  // 가장 오래 기억한 것부터 지워 크기를 유지한다(Map 은 넣은 순서를 지킨다).
  private remember(storageKey: string, reading: Promise<string | null>): void {
    this.readsByStorageKey.set(storageKey, reading);
    if (this.readsByStorageKey.size > CACHE_SIZE) {
      const oldestKey = this.readsByStorageKey.keys().next().value;
      if (oldestKey !== undefined) this.readsByStorageKey.delete(oldestKey);
    }
  }
}
