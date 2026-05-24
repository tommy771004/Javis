import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveHermesRuntimeUiState, type HermesRuntimeStatus } from '../src/services/hermesRuntime';

test('resolveHermesRuntimeUiState marks a starting daemon as busy but active', () => {
  const status: HermesRuntimeStatus = {
    desiredState: 'running',
    state: 'starting',
    driver: 'child_process',
    pendingTaskCount: 2,
    currentTaskId: null,
    lastHeartbeatAt: null,
    lastStartedAt: 1700000000000,
    processId: 4321,
    error: null,
  };

  const uiState = resolveHermesRuntimeUiState(status);

  assert.equal(uiState.active, true);
  assert.equal(uiState.pending, true);
  assert.equal(uiState.tone, 'busy');
  assert.match(uiState.label, /starting/i);
});

test('resolveHermesRuntimeUiState reports a stopped daemon as ready to activate', () => {
  const status: HermesRuntimeStatus = {
    desiredState: 'stopped',
    state: 'stopped',
    driver: 'child_process',
    pendingTaskCount: 0,
    currentTaskId: null,
    lastHeartbeatAt: null,
    lastStartedAt: null,
    processId: null,
    error: null,
  };

  const uiState = resolveHermesRuntimeUiState(status);

  assert.equal(uiState.active, false);
  assert.equal(uiState.pending, false);
  assert.equal(uiState.tone, 'idle');
  assert.match(uiState.label, /activate/i);
});

test('resolveHermesRuntimeUiState surfaces daemon faults without pretending it is active', () => {
  const status: HermesRuntimeStatus = {
    desiredState: 'running',
    state: 'error',
    driver: 'child_process',
    pendingTaskCount: 1,
    currentTaskId: 'task-7',
    lastHeartbeatAt: 1700000005000,
    lastStartedAt: 1700000000000,
    processId: 7777,
    error: 'child exited with code 1',
  };

  const uiState = resolveHermesRuntimeUiState(status);

  assert.equal(uiState.active, false);
  assert.equal(uiState.pending, false);
  assert.equal(uiState.tone, 'error');
  assert.match(uiState.detail, /code 1/i);
});
