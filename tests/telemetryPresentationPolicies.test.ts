import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateHeapHeadroomPercent,
  formatFtsScoreLabel,
  resolveStrictSandboxRequirement,
  summarizeSecuritySignals,
} from '../src/services/telemetryPresentationPolicies';

test('summarizeSecuritySignals reports positive signals, cautions, and CVEs without pretending to be a percentage', () => {
  const summary = summarizeSecuritySignals({
    isDocker: true,
    isWsl: false,
    trueSandboxApplied: false,
    defenderActive: true,
    firewallActive: true,
    isRoot: false,
    isPrivilegedPathProtected: true,
    memoryHardened: false,
    cveCount: 2,
  });

  assert.equal(summary, 'Signals 5 positive / 2 caution (CVEs: 2)');
});

test('resolveStrictSandboxRequirement only forces strict mode when there is no strong containment boundary', () => {
  assert.equal(
    resolveStrictSandboxRequirement({
      isDocker: false,
      isWsl: false,
      trueSandboxApplied: false,
      memoryHardened: false,
      isRoot: false,
      isPrivilegedPathProtected: true,
    }),
    true
  );

  assert.equal(
    resolveStrictSandboxRequirement({
      isDocker: true,
      isWsl: false,
      trueSandboxApplied: false,
      memoryHardened: false,
      isRoot: false,
      isPrivilegedPathProtected: true,
    }),
    false
  );
});

test('formatFtsScoreLabel preserves raw sqlite bm25 scores instead of fabricating confidence percentages', () => {
  assert.equal(formatFtsScoreLabel(-7.345, 'sqlite-bm25'), 'BM25 -7.35');
  assert.equal(formatFtsScoreLabel(1.8723, 'fallback-bm25'), 'Fallback BM25 1.87');
});

test('calculateHeapHeadroomPercent reports actual remaining heap capacity', () => {
  assert.equal(calculateHeapHeadroomPercent(25, 100), 75);
  assert.equal(calculateHeapHeadroomPercent(125, 100), 0);
});
