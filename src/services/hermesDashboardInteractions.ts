export type GlobalShortcutAction = 'open-settings' | 'focus-command-input';

export interface GlobalShortcutInput {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
}

export interface RadialProgressInput {
  centerX: number;
  centerY: number;
  clientX: number;
  clientY: number;
  step?: number;
}

export function clampTaskProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function roundProgressToStep(value: number, step = 5): number {
  const normalizedStep = Math.max(1, step);
  return clampTaskProgress(Math.round(value / normalizedStep) * normalizedStep);
}

export function resolveGlobalShortcutAction(input: GlobalShortcutInput): GlobalShortcutAction | null {
  if (!(input.ctrlKey || input.metaKey)) {
    return null;
  }

  if (input.key === 'Enter') {
    return 'open-settings';
  }

  if (input.key.toLowerCase() === 'f') {
    return 'focus-command-input';
  }

  return null;
}

export function resolveRadialProgressFromPoint(input: RadialProgressInput): number {
  const angle = Math.atan2(input.clientY - input.centerY, input.clientX - input.centerX);
  const normalizedAngle = (angle + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
  const rawProgress = (normalizedAngle / (Math.PI * 2)) * 100;
  return roundProgressToStep(rawProgress, input.step ?? 5);
}
