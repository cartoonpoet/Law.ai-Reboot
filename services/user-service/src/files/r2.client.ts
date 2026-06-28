import { Injectable, Logger } from "@nestjs/common";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 S3Client wrapper.
 *
 * - env(R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET / R2_ENDPOINT?) 기반.
 * - 키 누락 시 client=null + disabled=true → presign/confirm/getDownloadUrl 호출 시 503 throw.
 *   (dev/CI 에서 키 없이도 빌드/유닛 테스트가 통과하도록 lazy init + null-안전.)
 * - region:"auto"·forcePathStyle:true 가 R2 권장값.
 */
@Injectable()
export class R2Client {
  private readonly logger = new Logger(R2Client.name);
  readonly client: S3Client | null;
  readonly bucket: string | null;
  readonly disabled: boolean;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET;
    const endpoint =
      process.env.R2_ENDPOINT ||
      (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

    if (!accessKeyId || !secretAccessKey || !bucket || !endpoint) {
      this.logger.warn("[files] R2 credentials missing — uploads disabled");
      this.client = null;
      this.bucket = null;
      this.disabled = true;
      return;
    }

    this.logger.log(`[files] R2 enabled — bucket=${bucket}`);
    this.client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
    this.bucket = bucket;
    this.disabled = false;
  }

  /**
   * R2 객체 best-effort 삭제. 실패는 로깅만 — 호출자(파일 삭제 흐름)는 DB row 정리를 우선하고
   * R2 cleanup 실패가 사용자 흐름을 깨지 않게 한다. 추후 cron-based 청소가 도입되면 그때 회수.
   */
  async deleteObject(storageKey: string): Promise<void> {
    if (this.disabled || !this.client || !this.bucket) return;
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }),
      );
    } catch (error) {
      this.logger.warn(
        `[files] R2 deleteObject 실패 (key=${storageKey}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * 여러 객체를 병렬로 삭제. allSettled 라 일부 실패가 다른 삭제를 막지 않는다.
   */
  async deleteObjects(storageKeys: string[]): Promise<void> {
    if (storageKeys.length === 0) return;
    await Promise.allSettled(storageKeys.map((k) => this.deleteObject(k)));
  }
}
