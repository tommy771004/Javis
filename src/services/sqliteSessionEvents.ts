import Database from 'better-sqlite3';

import type { UniversalEvent } from './universalEvents';

export const SQLITE_SESSION_EVENT_SCHEMA = `
CREATE TABLE IF NOT EXISTS session_events (
  event_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  stream_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  runtime TEXT NOT NULL,
  kind TEXT NOT NULL,
  actor TEXT NOT NULL,
  message_id TEXT,
  item_id TEXT,
  tool_call_id TEXT,
  tool_name TEXT,
  arguments_text TEXT,
  text_value TEXT,
  delta_value TEXT,
  result_text TEXT,
  is_partial INTEGER,
  reason TEXT,
  occurred_at INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  UNIQUE(session_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_session_events_session_sequence
  ON session_events(session_id, sequence);

CREATE TABLE IF NOT EXISTS pending_tool_results (
  session_id TEXT NOT NULL,
  aggregation_key TEXT NOT NULL,
  stream_id TEXT NOT NULL,
  runtime TEXT NOT NULL,
  actor TEXT NOT NULL,
  message_id TEXT,
  item_id TEXT,
  tool_call_id TEXT,
  first_sequence INTEGER NOT NULL,
  last_sequence INTEGER NOT NULL,
  first_occurred_at INTEGER NOT NULL,
  last_occurred_at INTEGER NOT NULL,
  flush_after INTEGER NOT NULL,
  result_text TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  PRIMARY KEY(session_id, aggregation_key)
);

CREATE INDEX IF NOT EXISTS idx_pending_tool_results_flush_after
  ON pending_tool_results(flush_after);
`;

type PendingToolResultRow = {
  session_id: string;
  aggregation_key: string;
  stream_id: string;
  runtime: UniversalEvent['runtime'];
  actor: UniversalEvent['actor'];
  message_id: string | null;
  item_id: string | null;
  tool_call_id: string | null;
  first_sequence: number;
  last_sequence: number;
  first_occurred_at: number;
  last_occurred_at: number;
  flush_after: number;
  result_text: string;
  payload_json: string;
};

function parseEvent(payloadJson: string): UniversalEvent {
  return JSON.parse(payloadJson) as UniversalEvent;
}

function toOptionalBoolean(value: number | null): boolean | undefined {
  if (value === null) {
    return undefined;
  }
  return value === 1;
}

function pendingAggregationKey(event: UniversalEvent): string {
  return event.toolCallId ?? event.itemId ?? event.messageId ?? event.eventId;
}

function toolResultFragment(event: UniversalEvent): string {
  return event.resultText ?? event.delta ?? '';
}

export class SqliteSessionEventStore {
  constructor(private readonly db: Database.Database) {}

  initialize(): void {
    this.db.exec(SQLITE_SESSION_EVENT_SCHEMA);
  }

  append(event: UniversalEvent): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO session_events (
          event_id,
          session_id,
          stream_id,
          sequence,
          runtime,
          kind,
          actor,
          message_id,
          item_id,
          tool_call_id,
          tool_name,
          arguments_text,
          text_value,
          delta_value,
          result_text,
          is_partial,
          reason,
          occurred_at,
          payload_json
        ) VALUES (
          @event_id,
          @session_id,
          @stream_id,
          @sequence,
          @runtime,
          @kind,
          @actor,
          @message_id,
          @item_id,
          @tool_call_id,
          @tool_name,
          @arguments_text,
          @text_value,
          @delta_value,
          @result_text,
          @is_partial,
          @reason,
          @occurred_at,
          @payload_json
        )`,
      )
      .run({
        event_id: event.eventId,
        session_id: event.sessionId,
        stream_id: event.streamId,
        sequence: event.sequence,
        runtime: event.runtime,
        kind: event.kind,
        actor: event.actor,
        message_id: event.messageId ?? null,
        item_id: event.itemId ?? null,
        tool_call_id: event.toolCallId ?? null,
        tool_name: event.toolName ?? null,
        arguments_text: event.argumentsText ?? null,
        text_value: event.text ?? null,
        delta_value: event.delta ?? null,
        result_text: event.resultText ?? null,
        is_partial: typeof event.isPartial === 'boolean' ? Number(event.isPartial) : null,
        reason: event.reason ?? null,
        occurred_at: event.occurredAt,
        payload_json: JSON.stringify(event),
      });
  }

  appendMany(events: UniversalEvent[]): void {
    const insertMany = this.db.transaction((items: UniversalEvent[]) => {
      items.forEach((event) => this.append(event));
    });
    insertMany(events);
  }

  listSessionEvents(sessionId: string): UniversalEvent[] {
    const rows = this.db
      .prepare(
        `SELECT payload_json, is_partial
         FROM session_events
         WHERE session_id = ?
         ORDER BY sequence ASC`,
      )
      .all(sessionId) as Array<{ payload_json: string; is_partial: number | null }>;

    return rows.map((row) => {
      const event = parseEvent(row.payload_json);
      if (typeof event.isPartial === 'undefined') {
        event.isPartial = toOptionalBoolean(row.is_partial);
      }
      return event;
    });
  }

  upsertPendingToolResult(event: UniversalEvent, flushAfter: number): void {
    const key = pendingAggregationKey(event);
    const existing = this.db
      .prepare(
        `SELECT *
         FROM pending_tool_results
         WHERE session_id = ? AND aggregation_key = ?`,
      )
      .get(event.sessionId, key) as PendingToolResultRow | undefined;

    if (!existing) {
      this.db
        .prepare(
          `INSERT INTO pending_tool_results (
            session_id,
            aggregation_key,
            stream_id,
            runtime,
            actor,
            message_id,
            item_id,
            tool_call_id,
            first_sequence,
            last_sequence,
            first_occurred_at,
            last_occurred_at,
            flush_after,
            result_text,
            payload_json
          ) VALUES (
            @session_id,
            @aggregation_key,
            @stream_id,
            @runtime,
            @actor,
            @message_id,
            @item_id,
            @tool_call_id,
            @first_sequence,
            @last_sequence,
            @first_occurred_at,
            @last_occurred_at,
            @flush_after,
            @result_text,
            @payload_json
          )`,
        )
        .run({
          session_id: event.sessionId,
          aggregation_key: key,
          stream_id: event.streamId,
          runtime: event.runtime,
          actor: event.actor,
          message_id: event.messageId ?? null,
          item_id: event.itemId ?? null,
          tool_call_id: event.toolCallId ?? null,
          first_sequence: event.sequence,
          last_sequence: event.sequence,
          first_occurred_at: event.occurredAt,
          last_occurred_at: event.occurredAt,
          flush_after: flushAfter,
          result_text: toolResultFragment(event),
          payload_json: JSON.stringify(event),
        });
      return;
    }

    const mergedPayload = parseEvent(existing.payload_json);
    mergedPayload.sequence = event.sequence;
    mergedPayload.eventId = event.eventId;
    mergedPayload.occurredAt = event.occurredAt;
    mergedPayload.resultText = `${existing.result_text}${toolResultFragment(event)}`;
    mergedPayload.delta = event.delta;
    mergedPayload.isPartial = true;

    this.db
      .prepare(
        `UPDATE pending_tool_results
         SET last_sequence = @last_sequence,
             last_occurred_at = @last_occurred_at,
             flush_after = @flush_after,
             result_text = @result_text,
             payload_json = @payload_json
         WHERE session_id = @session_id
           AND aggregation_key = @aggregation_key`,
      )
      .run({
        session_id: event.sessionId,
        aggregation_key: key,
        last_sequence: event.sequence,
        last_occurred_at: event.occurredAt,
        flush_after: flushAfter,
        result_text: mergedPayload.resultText,
        payload_json: JSON.stringify(mergedPayload),
      });
  }

  flushDuePendingToolResults(now: number): UniversalEvent[] {
    const rows = this.db
      .prepare(
        `SELECT *
         FROM pending_tool_results
         WHERE flush_after <= ?
         ORDER BY session_id ASC, last_sequence ASC`,
      )
      .all(now) as PendingToolResultRow[];

    return rows.map((row) => this.finalizePendingToolResult(row));
  }

  flushPendingToolResult(event: UniversalEvent): UniversalEvent {
    const key = pendingAggregationKey(event);
    const existing = this.db
      .prepare(
        `SELECT *
         FROM pending_tool_results
         WHERE session_id = ? AND aggregation_key = ?`,
      )
      .get(event.sessionId, key) as PendingToolResultRow | undefined;

    if (!existing) {
      const finalEvent = {
        ...event,
        resultText: toolResultFragment(event),
        isPartial: false,
      };
      this.append(finalEvent);
      return finalEvent;
    }

    const payload = parseEvent(existing.payload_json);
    const finalEvent: UniversalEvent = {
      ...payload,
      eventId: event.eventId,
      sequence: event.sequence,
      occurredAt: event.occurredAt,
      resultText: `${existing.result_text}${toolResultFragment(event)}`,
      delta: undefined,
      isPartial: false,
    };

    this.append(finalEvent);
    this.deletePendingToolResult(existing.session_id, existing.aggregation_key);
    return finalEvent;
  }

  flushPendingSession(sessionId: string): UniversalEvent[] {
    const rows = this.db
      .prepare(
        `SELECT *
         FROM pending_tool_results
         WHERE session_id = ?
         ORDER BY last_sequence ASC`,
      )
      .all(sessionId) as PendingToolResultRow[];

    return rows.map((row) => this.finalizePendingToolResult(row));
  }

  private finalizePendingToolResult(row: PendingToolResultRow): UniversalEvent {
    const payload = parseEvent(row.payload_json);
    const finalEvent: UniversalEvent = {
      ...payload,
      eventId: `${row.session_id}:${row.aggregation_key}:${row.last_sequence}`,
      sequence: row.last_sequence,
      occurredAt: row.last_occurred_at,
      resultText: row.result_text,
      delta: undefined,
      isPartial: false,
    };

    this.append(finalEvent);
    this.deletePendingToolResult(row.session_id, row.aggregation_key);
    return finalEvent;
  }

  private deletePendingToolResult(sessionId: string, aggregationKey: string): void {
    this.db
      .prepare(
        `DELETE FROM pending_tool_results
         WHERE session_id = ? AND aggregation_key = ?`,
      )
      .run(sessionId, aggregationKey);
  }
}

type SqliteSessionEventWriterOptions = {
  now?: () => number;
  toolResultWindowMs?: number;
};

export class SqliteSessionEventWriter {
  private readonly now: () => number;
  private readonly toolResultWindowMs: number;

  constructor(
    private readonly store: SqliteSessionEventStore,
    options: SqliteSessionEventWriterOptions = {},
  ) {
    this.now = options.now ?? (() => Date.now());
    this.toolResultWindowMs = options.toolResultWindowMs ?? 300;
  }

  ingest(event: UniversalEvent): UniversalEvent[] {
    if (event.kind === 'tool.result') {
      if (event.isPartial) {
        this.store.upsertPendingToolResult(event, this.now() + this.toolResultWindowMs);
        return [];
      }

      return [this.store.flushPendingToolResult(event)];
    }

    if (event.kind === 'session.ended') {
      const flushed = this.store.flushPendingSession(event.sessionId);
      this.store.append(event);
      return [...flushed, event];
    }

    this.store.append(event);
    return [event];
  }

  flushDue(): UniversalEvent[] {
    return this.store.flushDuePendingToolResults(this.now());
  }
}
