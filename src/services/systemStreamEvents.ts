export interface SystemStreamEvent {
  type: string;
  timestamp?: number;
  stats?: Record<string, unknown>;
  [key: string]: unknown;
}

export function parseSystemStreamMessage(data: string): SystemStreamEvent | null {
  if (!data.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(data);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.type !== 'string') {
      return null;
    }
    return parsed as SystemStreamEvent;
  } catch {
    return null;
  }
}

export function isSystemStatsEvent(event: SystemStreamEvent | null): event is SystemStreamEvent & { stats: Record<string, unknown> } {
  return event?.type === 'SYSTEM_STATS' && Boolean(event.stats) && typeof event.stats === 'object';
}

export function resolveStreamAgeMs(timestamp: number | undefined, now = Date.now()): number {
  if (timestamp === undefined || !Number.isFinite(timestamp)) {
    return 0;
  }

  return Math.max(0, now - timestamp);
}
