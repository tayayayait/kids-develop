type AnnounceListener = (text: string) => void;

const listeners = new Set<AnnounceListener>();
const recentCodes = new Map<string, number>();

/**
 * 8-4 실시간 스크린리더 알림 함수
 * - pointermove 등 고빈도 이벤트 제외
 * - 동일 code 1초 내 중복 호출 억제
 */
export function announce(text: string, code?: string): void {
  if (!text) return;

  const now = Date.now();
  if (code) {
    const lastTime = recentCodes.get(code);
    if (lastTime && now - lastTime < 1000) {
      return; // 1초 내 동일 code 중복 방지
    }
    recentCodes.set(code, now);

    // 10초 지난 코드 정리
    for (const [c, time] of recentCodes.entries()) {
      if (now - time > 10000) {
        recentCodes.delete(c);
      }
    }
  }

  for (const listener of listeners) {
    listener(text);
  }
}

export function subscribeAnnouncer(listener: AnnounceListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clearAnnounceHistory(): void {
  recentCodes.clear();
}
