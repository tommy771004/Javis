import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BufferedAgentEventSink,
  ControlPlaneSessionService,
  InMemoryUniversalEventStore,
} from '../src/services/agentStreaming';
import type { UniversalEvent } from '../src/services/universalEvents';

function makeEvent(sequence: number, sessionId = 'session-1'): UniversalEvent {
  return {
    eventId: `evt-${sessionId}-${sequence}`,
    sessionId,
    streamId: 'stream-1',
    sequence,
    runtime: 'codex',
    kind: 'text.delta',
    actor: 'assistant',
    messageId: 'msg-1',
    itemId: 'item-1',
    occurredAt: 1700000000000 + sequence,
    delta: `d${sequence}`,
  };
}

test('control plane bootstrap and attach replays DB history once and isolates client streams', () => {
  const store = new InMemoryUniversalEventStore();
  const sink = new BufferedAgentEventSink();
  const service = new ControlPlaneSessionService(store, sink);
  store.appendMany([makeEvent(1), makeEvent(2), makeEvent(1, 'session-2')]);

  const bootstrap = service.bootstrapClientSession('session-1');
  assert.deepEqual(bootstrap.events.map((event) => event.sequence), [1, 2]);
  assert.equal(bootstrap.latestSequence, 2);

  store.append(makeEvent(3));

  const clientA: number[] = [];
  const clientB: number[] = [];
  const otherSession: number[] = [];

  const detachA = service.attachClientStream({
    sessionId: 'session-1',
    clientId: 'tab-a',
    afterSequence: bootstrap.latestSequence,
    send: (event) => clientA.push(event.sequence),
  });
  const detachB = service.attachClientStream({
    sessionId: 'session-1',
    clientId: 'tab-b',
    afterSequence: 0,
    send: (event) => clientB.push(event.sequence),
  });
  const detachOther = service.attachClientStream({
    sessionId: 'session-2',
    clientId: 'tab-c',
    afterSequence: 0,
    send: (event) => otherSession.push(event.sequence),
  });

  assert.deepEqual(clientA, [3]);
  assert.deepEqual(clientB, [1, 2, 3]);
  assert.deepEqual(otherSession, [1]);

  service.publishPersistedEvents([makeEvent(4), makeEvent(2, 'session-2')]);
  assert.deepEqual(clientA, [3, 4]);
  assert.deepEqual(clientB, [1, 2, 3, 4]);
  assert.deepEqual(otherSession, [1, 2]);

  detachA();
  detachB();
  detachOther();
});

test('agent reconnect pulls buffered events after the last persisted sequence', () => {
  const store = new InMemoryUniversalEventStore();
  const sink = new BufferedAgentEventSink();
  const service = new ControlPlaneSessionService(store, sink);

  sink.push(makeEvent(1));
  sink.push(makeEvent(2));
  sink.push(makeEvent(3));

  store.append(makeEvent(1));
  store.append(makeEvent(2));
  sink.acknowledgeThrough('session-1', 2);

  const buffered = service.recoverAgentBufferedEvents('session-1', 2);
  assert.deepEqual(buffered.map((event) => event.sequence), [3]);
});
