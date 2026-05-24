import test from 'node:test';
import assert from 'node:assert/strict';

import { buildHermesSystemPrompt } from '../serverPromptPolicies';

test('buildHermesSystemPrompt uses loop-node context, UI system prompt, and active targeted webhooks', () => {
  const prompt = buildHermesSystemPrompt({
    sysName: 'HERMES',
    opName: 'Operator',
    activeCli: 'devin',
    activeLoopNode: 'gepa',
    systemPromptOverride: 'Always return concrete next steps and cite local evidence first.',
    activeSkills: [
      { name: 'planner', version: '1.0', description: 'Plans work' },
    ],
    memories: ['The workspace prefers direct edits.'],
    currentContextHistory: [
      { role: 'user', content: 'Need a real webhook trigger.' },
      { role: 'assistant', content: 'I will wire one through the control plane.' },
    ],
    activeWebhooks: [
      { name: 'Deploy Pipeline', active: true },
      { name: 'Dormant Hook', active: false },
    ],
    message: 'Ship the monitoring update.',
  });

  assert.match(prompt, /ACTIVE EXECUTION ENGINE: Devin Terminal Autonomous Mode\./);
  assert.match(prompt, /Current learning loop focus: GEPA/i);
  assert.match(prompt, /Always return concrete next steps and cite local evidence first\./);
  assert.match(prompt, /\[TRIGGER_WEBHOOK\]: <Webhook Name>/);
  assert.match(prompt, /Deploy Pipeline/);
  assert.doesNotMatch(prompt, /Dormant Hook/);
  assert.match(prompt, /User: Ship the monitoring update\./);
});

test('buildHermesSystemPrompt omits targeted webhook instructions when nothing is active', () => {
  const prompt = buildHermesSystemPrompt({
    sysName: 'HERMES',
    opName: 'Operator',
    activeCli: 'hermes',
    activeLoopNode: 'experience',
    systemPromptOverride: '',
    activeSkills: [],
    memories: [],
    currentContextHistory: [],
    activeWebhooks: [],
    message: 'Summarize the database state.',
  });

  assert.doesNotMatch(prompt, /\[TRIGGER_WEBHOOK\]: <Webhook Name>/);
  assert.match(prompt, /Current learning loop focus: EXPERIENCE/i);
});
