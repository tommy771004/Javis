import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isSystemStatsEvent,
  parseSystemStreamMessage,
  resolveStreamAgeMs,
} from '../src/services/systemStreamEvents';

test('parseSystemStreamMessage returns null for malformed stream payloads', () => {
  assert.equal(parseSystemStreamMessage('{not-json'), null);
  assert.equal(parseSystemStreamMessage(''), null);
});

test('isSystemStatsEvent recognizes pushed stats payloads', () => {
  const event = parseSystemStreamMessage(JSON.stringify({
    type: 'SYSTEM_STATS',
    timestamp: 1000,
    stats: { cpu: 12, mem: 40 },
  }));

  assert.ok(event);
  assert.equal(isSystemStatsEvent(event), true);
});

test('resolveStreamAgeMs reports local age without negative values', () => {
  assert.equal(resolveStreamAgeMs(900, 1000), 100);
  assert.equal(resolveStreamAgeMs(1200, 1000), 0);
  assert.equal(resolveStreamAgeMs(undefined, 1000), 0);
});
