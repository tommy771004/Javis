import type { UniversalEvent } from './universalEvents';

export interface ClientBootstrap {
  events: UniversalEvent[];
  latestSequence: number;
}

export interface StreamAttachment {
  sessionId: string;
  clientId: string;
  afterSequence: number;
  send: (event: UniversalEvent) => void;
}

interface ClientSubscription {
  sessionId: string;
  send: (event: UniversalEvent) => void;
  cursor: number;
}

export class InMemoryUniversalEventStore {
  private readonly eventsBySession = new Map<string, UniversalEvent[]>();

  append(event: UniversalEvent): void {
    const events = this.eventsBySession.get(event.sessionId) ?? [];
    events.push(event);
    events.sort((left, right) => left.sequence - right.sequence);
    this.eventsBySession.set(event.sessionId, events);
  }

  appendMany(events: UniversalEvent[]): void {
    events.forEach((event) => this.append(event));
  }

  listSessionEvents(sessionId: string, afterSequence = 0): UniversalEvent[] {
    return (this.eventsBySession.get(sessionId) ?? []).filter((event) => event.sequence > afterSequence);
  }

  getLatestSequence(sessionId: string): number {
    const events = this.eventsBySession.get(sessionId) ?? [];
    return events.at(-1)?.sequence ?? 0;
  }
}

export class BufferedAgentEventSink {
  private readonly bufferedBySession = new Map<string, UniversalEvent[]>();
  private readonly acknowledgedThrough = new Map<string, number>();

  push(event: UniversalEvent): void {
    const events = this.bufferedBySession.get(event.sessionId) ?? [];
    events.push(event);
    events.sort((left, right) => left.sequence - right.sequence);
    this.bufferedBySession.set(event.sessionId, events);
  }

  readBufferedAfter(sessionId: string, sequence: number): UniversalEvent[] {
    const acknowledged = this.acknowledgedThrough.get(sessionId) ?? 0;
    const floor = Math.max(sequence, acknowledged);
    return (this.bufferedBySession.get(sessionId) ?? []).filter((event) => event.sequence > floor);
  }

  acknowledgeThrough(sessionId: string, sequence: number): void {
    const previous = this.acknowledgedThrough.get(sessionId) ?? 0;
    const next = Math.max(previous, sequence);
    this.acknowledgedThrough.set(sessionId, next);

    const retained = (this.bufferedBySession.get(sessionId) ?? []).filter((event) => event.sequence > next);
    if (retained.length > 0) {
      this.bufferedBySession.set(sessionId, retained);
      return;
    }

    this.bufferedBySession.delete(sessionId);
  }
}

export class ControlPlaneSessionService {
  private readonly clients = new Map<string, ClientSubscription>();

  constructor(
    private readonly store: InMemoryUniversalEventStore,
    private readonly sink: BufferedAgentEventSink,
  ) {}

  bootstrapClientSession(sessionId: string): ClientBootstrap {
    const events = this.store.listSessionEvents(sessionId);
    return {
      events,
      latestSequence: events.at(-1)?.sequence ?? 0,
    };
  }

  attachClientStream(attachment: StreamAttachment): () => void {
    const subscription: ClientSubscription = {
      sessionId: attachment.sessionId,
      send: attachment.send,
      cursor: attachment.afterSequence,
    };

    const replay = this.store.listSessionEvents(attachment.sessionId, attachment.afterSequence);
    replay.forEach((event) => {
      subscription.send(event);
      subscription.cursor = Math.max(subscription.cursor, event.sequence);
    });

    this.clients.set(attachment.clientId, subscription);

    return () => {
      this.clients.delete(attachment.clientId);
    };
  }

  publishPersistedEvents(events: UniversalEvent[]): void {
    this.store.appendMany(events);

    events.forEach((event) => {
      this.clients.forEach((client) => {
        if (client.sessionId !== event.sessionId || event.sequence <= client.cursor) {
          return;
        }

        client.send(event);
        client.cursor = event.sequence;
      });
    });
  }

  recoverAgentBufferedEvents(sessionId: string, lastPersistedSequence: number): UniversalEvent[] {
    return this.sink.readBufferedAfter(sessionId, lastPersistedSequence);
  }
}
