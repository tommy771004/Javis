import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAssistantBriefing,
  buildPersonalGreeting,
  resolveAssistantPresence,
} from '../src/services/personalAssistantPresentation';

test('buildPersonalGreeting uses the operator name and local time of day', () => {
  assert.equal(
    buildPersonalGreeting('Tommy', new Date('2026-05-24T09:00:00')),
    'Good morning, Tommy.'
  );
  assert.equal(
    buildPersonalGreeting('', new Date('2026-05-24T21:00:00')),
    'Good evening, Operator.'
  );
});

test('resolveAssistantPresence turns machine states into personal assistant copy', () => {
  assert.deepEqual(resolveAssistantPresence({ cognitiveState: 'idle', isMicActive: false }), {
    label: 'Ready when you are',
    detail: 'I am watching the workspace and waiting for the next useful instruction.',
  });

  assert.deepEqual(resolveAssistantPresence({ cognitiveState: 'thinking', isMicActive: false }), {
    label: 'Thinking it through',
    detail: 'I am comparing the next step against the current workspace state.',
  });

  assert.deepEqual(resolveAssistantPresence({ cognitiveState: 'idle', isMicActive: true, webrtcState: 'connected' }), {
    label: 'Listening',
    detail: 'Voice channel is open. Speak naturally and I will keep the context tidy.',
  });
});

test('buildAssistantBriefing is honest about attention items', () => {
  assert.equal(
    buildAssistantBriefing({ pendingTasks: 0, criticalAlerts: 0 }),
    'No urgent workspace items need your attention right now.'
  );

  assert.equal(
    buildAssistantBriefing({ pendingTasks: 3, criticalAlerts: 1 }),
    '1 critical alert and 3 pending tasks are waiting for review.'
  );
});
