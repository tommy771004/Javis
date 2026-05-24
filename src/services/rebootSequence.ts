export const REBOOT_SEQUENCE_EVENT = 'jarvis-reboot-sequence';

export interface RebootSequencePhase {
  id: 'preflight' | 'awaiting-shutdown' | 'offline' | 'reconnect' | 'complete';
  progress: number;
  message: string;
}

export interface RebootSequenceResponse {
  success: boolean;
  rebootId: string;
  acknowledgedAt: number;
  shutdownDelayMs: number;
  probeIntervalMs?: number;
  phases: RebootSequencePhase[];
}

export interface BuildRebootSequencePlanInput {
  cpuUsage: number;
  memoryUsage: number;
  uptimeSeconds: number;
  databaseIntegrity: 'ok' | 'corrupt' | 'unknown';
  shutdownDelayMs: number;
}

export interface ResolveRebootProbePhaseInput {
  hasSeenDisconnect: boolean;
  probeSucceeded: boolean;
}

export function buildRebootSequencePlan(input: BuildRebootSequencePlanInput): RebootSequencePhase[] {
  const integrityLabel = input.databaseIntegrity.toUpperCase();

  return [
    {
      id: 'preflight',
      progress: 12,
      message: `CTRL: RESTART REQUEST ACCEPTED. CPU ${input.cpuUsage}% | MEM ${input.memoryUsage}% | SQLITE ${integrityLabel} | UPTIME ${Math.floor(input.uptimeSeconds)}s.`,
    },
    {
      id: 'awaiting-shutdown',
      progress: 34,
      message: `CTRL: WAITING UP TO ${input.shutdownDelayMs}ms FOR PRIMARY PROCESS HANDOFF.`,
    },
    {
      id: 'offline',
      progress: 68,
      message: 'CTRL: PRIMARY PROCESS OFFLINE. WAITING FOR REPLACEMENT PROCESS TO BIND THE CONTROL PORT.',
    },
    {
      id: 'reconnect',
      progress: 88,
      message: 'CTRL: REPLACEMENT PROCESS DETECTED. REVALIDATING TELEMETRY AND DATABASE HEALTH.',
    },
    {
      id: 'complete',
      progress: 100,
      message: 'CTRL: RESTART COMPLETE. CONTROL PLANE ONLINE AND RESPONDING TO HEALTH PROBES.',
    },
  ];
}

export function resolveRebootProbePhase(input: ResolveRebootProbePhaseInput) {
  if (!input.probeSucceeded) {
    return {
      phase: 'offline' as const,
      hasSeenDisconnect: true,
    };
  }

  if (input.hasSeenDisconnect) {
    return {
      phase: 'reconnected' as const,
      hasSeenDisconnect: true,
    };
  }

  return {
    phase: 'awaiting-shutdown' as const,
    hasSeenDisconnect: false,
  };
}

export function emitRebootSequence(detail: RebootSequenceResponse) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(REBOOT_SEQUENCE_EVENT, { detail }));
}
