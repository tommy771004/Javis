export type HermesRuntimeState = 'starting' | 'running' | 'stopping' | 'stopped' | 'error';

export interface HermesRuntimeStatus {
  desiredState: 'running' | 'stopped';
  state: HermesRuntimeState;
  driver: 'child_process';
  pendingTaskCount: number;
  currentTaskId: string | null;
  lastHeartbeatAt: number | null;
  lastStartedAt: number | null;
  processId: number | null;
  error: string | null;
}

export interface HermesRuntimeUiState {
  active: boolean;
  pending: boolean;
  tone: 'busy' | 'active' | 'idle' | 'error';
  label: string;
  detail: string;
}

export function resolveHermesRuntimeUiState(
  status: HermesRuntimeStatus | null | undefined,
): HermesRuntimeUiState {
  if (!status) {
    return {
      active: false,
      pending: false,
      tone: 'idle',
      label: 'Activate AI CORE_SYNC',
      detail: 'Daemon status unavailable.',
    };
  }

  if (status.state === 'error') {
    return {
      active: false,
      pending: false,
      tone: 'error',
      label: 'AI CORE_SYNC fault',
      detail: status.error || 'Daemon reported an error.',
    };
  }

  if (status.state === 'starting') {
    return {
      active: true,
      pending: true,
      tone: 'busy',
      label: 'AI CORE_SYNC starting',
      detail: `Preparing persistent daemon${status.processId ? ` [PID ${status.processId}]` : ''}.`,
    };
  }

  if (status.state === 'stopping') {
    return {
      active: false,
      pending: true,
      tone: 'busy',
      label: 'AI CORE_SYNC stopping',
      detail: 'Waiting for daemon shutdown acknowledgement.',
    };
  }

  if (status.state === 'running') {
    return {
      active: true,
      pending: false,
      tone: 'active',
      label: 'AI CORE_SYNC online',
      detail: status.currentTaskId
        ? `Processing ${status.pendingTaskCount} queued task(s); active task ${status.currentTaskId}.`
        : `Daemon online with ${status.pendingTaskCount} pending task(s).`,
    };
  }

  return {
    active: false,
    pending: false,
    tone: 'idle',
    label: 'Activate AI CORE_SYNC',
    detail: 'Persistent daemon is offline.',
  };
}
