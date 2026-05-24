import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOperationalSpeechFallback,
  buildTelemetryWaveHeights,
  formatMetricValue,
  formatPercentMetric,
  formatTextMetric,
} from '../src/services/truthfulUiPolicies';

test('buildOperationalSpeechFallback produces deterministic truthful messages instead of random filler', () => {
  assert.equal(
    buildOperationalSpeechFallback('[EXECUTE_COMMAND]: powershell -Command "Get-Process"'),
    'The command has been handed off for local execution.'
  );

  assert.equal(
    buildOperationalSpeechFallback(''),
    'The operation completed without additional spoken output.'
  );
});

test('format helpers return N/A when telemetry is unavailable', () => {
  assert.equal(formatMetricValue(null, 'ms'), 'N/A');
  assert.equal(formatMetricValue(0, 'kbps'), '0 kbps');
  assert.equal(formatPercentMetric(null), 'N/A');
  assert.equal(formatPercentMetric(84), '84%');
  assert.equal(formatTextMetric(''), 'N/A');
  assert.equal(formatTextMetric('opus mono'), 'opus mono');
});

test('buildTelemetryWaveHeights is deterministic for the same telemetry frame', () => {
  const first = buildTelemetryWaveHeights({
    count: 6,
    timestampMs: 1000,
    rxSpeed: 4096,
    txSpeed: 2048,
    voiceAmplitude: 12,
    cognitiveState: 'thinking',
  });
  const second = buildTelemetryWaveHeights({
    count: 6,
    timestampMs: 1000,
    rxSpeed: 4096,
    txSpeed: 2048,
    voiceAmplitude: 12,
    cognitiveState: 'thinking',
  });

  assert.deepEqual(first, second);
  assert.equal(first.length, 6);
  assert.ok(first.every(value => value >= 2));
});
