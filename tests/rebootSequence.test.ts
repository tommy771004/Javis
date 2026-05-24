import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRebootObservationNote } from '../src/services/rebootSequence';

test('buildRebootObservationNote reports actual probe attempts instead of cinematic filler text', () => {
  const note = buildRebootObservationNote({
    probeAttempts: 3,
    elapsedMs: 1750,
    disconnectObserved: false,
  });

  assert.match(note, /3 health probes/i);
  assert.match(note, /1750ms/i);
  assert.match(note, /disconnect not observed yet/i);
});

test('buildRebootObservationNote acknowledges the observed disconnect and recovery path', () => {
  const note = buildRebootObservationNote({
    probeAttempts: 5,
    elapsedMs: 4200,
    disconnectObserved: true,
  });

  assert.match(note, /5 health probes/i);
  assert.match(note, /disconnect observed/i);
});
