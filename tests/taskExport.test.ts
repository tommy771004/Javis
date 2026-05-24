import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPendingTaskExportPayload } from '../src/services/taskExport';

test('buildPendingTaskExportPayload serializes only pending tasks for external tools', () => {
  const payload = buildPendingTaskExportPayload([
    {
      id: 'task-1',
      description: 'Ship runtime endpoint',
      priority: 'High',
      status: 'Pending',
      createdAt: 1700000000000,
      progress: 42,
    },
    {
      id: 'task-2',
      description: 'Already finished',
      priority: 'Low',
      status: 'Completed',
      createdAt: 1700000001000,
      progress: 100,
      completedAt: 1700000002000,
    },
  ], 1700000010000);

  assert.equal(payload.taskCount, 1);
  assert.equal(payload.tasks.length, 1);
  assert.equal(payload.tasks[0].id, 'task-1');
  assert.equal(payload.tasks[0].status, 'Pending');
  assert.equal(payload.tasks[0].progress, 42);
  assert.equal(payload.exportedAt, '2023-11-14T22:13:30.000Z');
});

test('buildPendingTaskExportPayload preserves export metadata for downstream project tools', () => {
  const payload = buildPendingTaskExportPayload([], 1700000010000);

  assert.equal(payload.version, 1);
  assert.equal(payload.source, 'HermesDashboard');
  assert.equal(payload.taskCount, 0);
  assert.deepEqual(payload.tasks, []);
});
