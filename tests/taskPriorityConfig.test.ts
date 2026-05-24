import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TASK_PRIORITY_ORDER,
  buildTaskPriorityDistribution,
  getTaskPriorityVisual,
} from '../src/services/taskPriorityConfig';

test('TASK_PRIORITY_ORDER keeps priority rendering in a single shared order', () => {
  assert.deepEqual(TASK_PRIORITY_ORDER, ['High', 'Medium', 'Low']);
});

test('buildTaskPriorityDistribution uses centralized visual config for counts and colors', () => {
  const distribution = buildTaskPriorityDistribution([
    { priority: 'High' },
    { priority: 'High' },
    { priority: 'Medium' },
    { priority: 'Low' },
  ]);

  assert.equal(distribution.length, 3);
  assert.deepEqual(
    distribution.map((item) => ({
      name: item.name,
      value: item.value,
      color: item.color,
    })),
    [
      { name: 'High', value: 2, color: '#ef4444' },
      { name: 'Medium', value: 1, color: '#f59e0b' },
      { name: 'Low', value: 1, color: '#10b981' },
    ],
  );
});

test('getTaskPriorityVisual exposes the shared glow tokens for tooltip and arc styling', () => {
  const high = getTaskPriorityVisual('High');

  assert.equal(high.glow, 'rgba(239, 68, 68, 0.45)');
  assert.equal(high.textClass, 'text-red-400');
  assert.equal(high.barClass, 'bg-red-500');
});
