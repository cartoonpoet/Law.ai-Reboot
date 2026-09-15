import { HttpException, HttpStatus } from "@nestjs/common";
import type { Readable } from "node:stream";

/**
 * 요청 본문을 정확히 size 바이트만큼 모은다 — 넘치면 바로 멈춰 메모리를 지키고, 모자라도 거절한다.
 * R2 는 길이를 모르는 스트림 업로드를 받지 않아 게이트웨이 업로드 중계들이 본문을 모아 길이와 함께 보낸다.
 */
export const readBodyOfSize = async (stream: Readable, size: number, mismatchMessage: string): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  let received = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    received += buffer.length;
    if (received > size) {
      throw new HttpException(mismatchMessage, HttpStatus.BAD_REQUEST);
    }
    chunks.push(buffer);
  }
  if (received !== size) {
    throw new HttpException(mismatchMessage, HttpStatus.BAD_REQUEST);
  }
  return Buffer.concat(chunks, size);
};
