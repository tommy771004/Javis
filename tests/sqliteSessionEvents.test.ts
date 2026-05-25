import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';

import {
  SQLITE_SESSION_EVENT_SCHEMA,
  SqliteSessionEventStore,
  SqliteSessionEventWriter,
} from '../src/services/sqliteSessionEvents';
import type { UniversalEvent } from '../src/services/universalEvents';

function makeBaseEvent(sequence: number, kind: UniversalEvent['kind']): UniversalEvent {
  return {
    eventId: `evt-${sequence}`,
    sessionId: 'session-1',
    streamId: 'stream-1',
    sequence,
    runtime: 'codex',
    kind,
    actor: 'assistant',
    messageId: 'msg-1',
    itemId: 'item-1',
    occurredAt: 1700000000000 + sequence,
  } as UniversalEvent;
}

test('text.completed and tool.call are appended immediately to SQLite session_events', () => {
  const db = new Database(':memory:');
  const store = new SqliteSessionEventStore(db);
  store.initialize();
  const writer = new SqliteSessionEventWriter(store, { now: () => 1700000000000 });

  writer.ingest({
    ...makeBaseEvent(1, 'text.completed'),
    text: 'Hello',
  });
  writer.ingest({
    ...makeBaseEvent(2, 'tool.call'),
    toolCallId: 'call-1',
    toolName: 'grep',
    argumentsText: '--help',
  });

  const events = store.listSessionEvents('session-1');
  assert.deepEqual(events.map((event) => event.kind), ['text.completed', 'tool.call']);
  assert.equal(events[0].text, 'Hello');
  assert.equal(events[1].toolName, 'grep');
});

test('tool.result partial bursts are aggregated in a 300ms window before a single flush', () => {
  const db = new Database(':memory:');
  const store = new SqliteSessionEventStore(db);
  store.initialize();
  let now = 1700000000000;
  const writer = new SqliteSessionEventWriter(store, { now: () => now, toolResultWindowMs: 300 });

  writer.ingest({
    ...makeBaseEvent(1, 'tool.result'),
    toolCallId: 'call-1',
    resultText: 'alpha-',
    isPartial: true,
  });
  now += 100;
  writer.ingest({
    ...makeBaseEvent(2, 'tool.result'),
    toolCallId: 'call-1',
    resultText: 'beta',
    isPartial: true,
  });

  assert.equal(store.listSessionEvents('session-1').length, 0);

  now += 299;
  writer.flushDue();
  assert.equal(store.listSessionEvents('session-1').length, 0);

  now += 2;
  writer.flushDue();
  const events = store.listSessionEvents('session-1');
  assert.equal(events.length, 1);
  assert.equal(events[0].kind, 'tool.result');
  assert.equal(events[0].resultText, 'alpha-beta');
});

test('session.ended forces pending tool_result aggregates to flush before the terminal event', () => {
  const db = new Database(':memory:');
  const store = new SqliteSessionEventStore(db);
  store.initialize();
  const writer = new SqliteSessionEventWriter(store, { now: () => 1700000000000, toolResultWindowMs: 300 });

  writer.ingest({
    ...makeBaseEvent(1, 'tool.result'),
    toolCallId: 'call-9',
    resultText: 'payload',
    isPartial: true,
  });
  writer.ingest({
    ...makeBaseEvent(2, 'session.ended'),
    reason: 'completed',
  });

  const events = store.listSessionEvents('session-1');
  assert.deepEqual(events.map((event) => event.kind), ['tool.result', 'session.ended']);
  assert.equal(events[0].resultText, 'payload');
});

test('schema keeps append-only events separate from pending aggregation rows', () => {
  const db = new Database(':memory:');
  const store = new SqliteSessionEventStore(db);
  store.initialize();

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as Array<{ name: string }>;
  assert.ok(SQLITE_SESSION_EVENT_SCHEMA.includes('CREATE TABLE IF NOT EXISTS session_events'));
  assert.ok(tables.some((table) => table.name === 'session_events'));
  assert.ok(tables.some((table) => table.name === 'pending_tool_results'));
});
