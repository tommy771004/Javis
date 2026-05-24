export interface ReactorOverdriveRuntime {
  apiMessage: string;
  corePower: number;
  setHighPriority: boolean;
  speak: string;
  spawnWorkers: boolean;
  systemLog: string;
}

export type ShellMode = 'manual' | 'safe' | 'auto';

export function normalizeMeasuredPowerWatts(reading: number | null | undefined): number | null {
  if (typeof reading !== 'number' || !Number.isFinite(reading) || reading <= 0) {
    return null;
  }

  return Number(reading.toFixed(1));
}

export function getReactorOverdriveRuntime(active: boolean): ReactorOverdriveRuntime {
  if (active) {
    return {
      spawnWorkers: false,
      setHighPriority: false,
      corePower: 100,
      systemLog: 'Overdrive active: visualization mode enabled. Physical compute workers remain disabled.',
      apiMessage: 'Database router visualization set to overdrive display mode.',
      speak: 'Overdrive visualization enabled. Physical compute stress remains disabled.',
    };
  }

  return {
    spawnWorkers: false,
    setHighPriority: false,
    corePower: 98,
    systemLog: 'Overdrive deactivated: visualization mode returned to nominal operating range.',
    apiMessage: 'Database router visualization returned to nominal display mode.',
    speak: 'Overdrive visualization disabled. System load remains under normal control.',
  };
}

export function resolveAutoRepairCpuTarget(cpuUsage: number, _reactorOverdrive: boolean): number {
  if (!Number.isFinite(cpuUsage)) {
    return 0;
  }

  return Math.max(0, Math.min(100, cpuUsage));
}

export function resolveEffectiveShellMode(
  _requestedShellMode: string | undefined,
  persistedShellMode: string | undefined
): ShellMode {
  if (persistedShellMode === 'manual' || persistedShellMode === 'safe' || persistedShellMode === 'auto') {
    return persistedShellMode;
  }

  return 'manual';
}
