import type { CognitiveState } from '../components/CenterVisualizer';

export function buildOperationalSpeechFallback(rawText: string): string {
  if (rawText.includes('[WRITE_FILE]')) {
    const fileMatch = rawText.match(/\[WRITE_FILE\]:([^\s\n]+)/i);
    const fileName = fileMatch ? fileMatch[1].split(/[\\/]/).pop() : '';
    return fileName
      ? `The requested file update for ${fileName} has been prepared.`
      : 'The requested file update has been prepared.';
  }

  if (rawText.includes('[EXECUTE_COMMAND]') || rawText.includes('[RUN_COMMAND]')) {
    return 'The command has been handed off for local execution.';
  }

  if (rawText.includes('[CREATE_TASK]')) {
    return 'The task has been recorded in the tracker.';
  }

  return 'The operation completed without additional spoken output.';
}

export function formatMetricValue(value: number | null | undefined, unit?: string): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A';
  }

  return unit ? `${value} ${unit}` : String(value);
}

export function formatPercentMetric(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A';
  }

  return `${value}%`;
}

export function formatTextMetric(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : 'N/A';
}

interface TelemetryWaveInput {
  count: number;
  timestampMs: number;
  rxSpeed?: number;
  txSpeed?: number;
  voiceAmplitude?: number;
  cognitiveState: CognitiveState;
}

const STATE_GAIN: Record<CognitiveState, number> = {
  idle: 0.6,
  thinking: 1,
  searching: 1.2,
  speaking: 1.35,
};

export function buildTelemetryWaveHeights({
  count,
  timestampMs,
  rxSpeed = 0,
  txSpeed = 0,
  voiceAmplitude = 0,
  cognitiveState,
}: TelemetryWaveInput): number[] {
  const trafficBase = Math.min(10, Math.max(rxSpeed, txSpeed) / 2048);
  const amplitudeBase = Math.min(8, voiceAmplitude / 8);
  const activity = Math.max(1.4, (trafficBase + amplitudeBase + 1.2) * STATE_GAIN[cognitiveState]);
  const time = timestampMs / 240;

  return Array.from({ length: count }, (_, index) => {
    const phase = index * 0.42;
    const carrier = Math.sin(time - phase) * 0.65;
    const harmonic = Math.cos((time * 0.55) + (phase * 0.9)) * 0.35;
    const envelope = Math.max(0.15, 1 + carrier + harmonic);
    return Number((2 + (activity * envelope)).toFixed(3));
  });
}
