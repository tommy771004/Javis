import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AgentSidecar,
  ClaudeCodeEventAdapter,
  CodexEventAdapter,
  type ClaudeCodeNativeEvent,
  type CodexNativeEvent,
} from '../src/services/universalEvents';

function createContext() {
  let sequence = 0;
  return {
    sessionId: 'session-1',
    streamId: 'stream-1',
    now: () => 1700000000000,
    nextSequence: () => {
      sequence += 1;
      return sequence;
    },
  };
}

test('Claude adapter expands a coarse message into normalized UniversalEvents', () => {
  const adapter = new ClaudeCodeEventAdapter();
  const raw: ClaudeCodeNativeEvent = {
    type: 'message',
    messageId: 'msg-claude',
    role: 'assistant',
    blocks: [
      { type: 'text', text: 'Hello world' },
      { type: 'tool_use', id: 'tool-1', name: 'grep', input: { pattern: 'TODO' } },
      { type: 'tool_result', toolUseId: 'tool-1', content: '2 matches' },
    ],
  };

  const events = adapter.adapt(raw, createContext());

  assert.deepEqual(events.map((event) => event.kind), [
    'message.started',
    'text.completed',
    'tool.call',
    'tool.result',
    'message.completed',
  ]);
  assert.equal(events[1].text, 'Hello world');
  assert.equal(events[2].toolName, 'grep');
  assert.equal(events[3].toolCallId, 'tool-1');
});

test('Codex adapter preserves delta granularity for text and tool result streams', () => {
  const adapter = new CodexEventAdapter();
  const context = createContext();
  const rawEvents: CodexNativeEvent[] = [
    { type: 'response.started', messageId: 'msg-codex' },
    { type: 'response.output_text.delta', messageId: 'msg-codex', itemId: 'item-1', delta: 'Hel' },
    { type: 'response.output_text.delta', messageId: 'msg-codex', itemId: 'item-1', delta: 'lo' },
    { type: 'response.output_text.done', messageId: 'msg-codex', itemId: 'item-1', text: 'Hello' },
    { type: 'response.tool_call', messageId: 'msg-codex', itemId: 'item-2', callId: 'call-1', toolName: 'bash', argumentsText: 'ls' },
    { type: 'response.tool_result.delta', messageId: 'msg-codex', itemId: 'item-2', callId: 'call-1', delta: 'out-' },
    { type: 'response.tool_result.done', messageId: 'msg-codex', itemId: 'item-2', callId: 'call-1', resultText: 'out-final' },
    { type: 'response.completed', messageId: 'msg-codex' },
  ];

  const events = rawEvents.flatMap((raw) => adapter.adapt(raw, context));

  assert.deepEqual(events.map((event) => event.kind), [
    'message.started',
    'text.delta',
    'text.delta',
    'text.completed',
    'tool.call',
    'tool.result',
    'tool.result',
    'message.completed',
  ]);
  assert.equal(events[1].delta, 'Hel');
  assert.equal(events[5].isPartial, true);
  assert.equal(events[6].isPartial, false);
});

test('AgentSidecar routes native runtime events through the matching adapter only', () => {
  const sidecar = new AgentSidecar({
    'claude-code': new ClaudeCodeEventAdapter(),
    codex: new CodexEventAdapter(),
  });

  const claudeEvents = sidecar.intercept('claude-code', {
    type: 'message',
    messageId: 'msg-claude',
    role: 'assistant',
    blocks: [{ type: 'text', text: 'Hi' }],
  }, createContext());

  assert.equal(claudeEvents[0].runtime, 'claude-code');
  assert.equal(claudeEvents.at(-1)?.kind, 'message.completed');
});
