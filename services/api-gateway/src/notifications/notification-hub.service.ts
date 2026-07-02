import { Injectable, type MessageEvent } from "@nestjs/common";
import { Observable, Subject, finalize } from "rxjs";

/**
 * 인메모리 SSE 허브(단일 인스턴스 전제·brokerless fan-out).
 * userId 별로 다중 탭(다중 연결)을 Set<Subject> 로 관리하고,
 * 연결 종료 시 finalize 에서 정리해 메모리 누수를 막는다.
 * 멀티 인스턴스로 승격 시 push 인터페이스를 Redis pub/sub 으로 교체.
 */
@Injectable()
export class NotificationHubService {
  private readonly streams = new Map<string, Set<Subject<MessageEvent>>>();

  /** userId 의 새 SSE 연결을 등록하고, 연결 종료 시 정리되는 Observable 을 반환. */
  subscribe(userId: string): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();
    const set = this.streams.get(userId) ?? new Set<Subject<MessageEvent>>();
    set.add(subject);
    this.streams.set(userId, set);

    return subject.asObservable().pipe(
      finalize(() => {
        const current = this.streams.get(userId);
        if (!current) {
          return;
        }
        current.delete(subject);
        if (current.size === 0) {
          this.streams.delete(userId);
        }
      }),
    );
  }

  /** userId 의 모든 연결로 데이터를 push. 연결이 없으면 no-op. */
  push(userId: string, data: unknown): void {
    const set = this.streams.get(userId);
    if (!set) {
      return;
    }
    for (const subject of set) {
      subject.next({ data } as MessageEvent);
    }
  }
}
