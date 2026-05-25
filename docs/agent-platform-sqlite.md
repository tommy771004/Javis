# Agent Platform Reference (SQLite)

This reference layer keeps runtime-specific event shapes out of the UI and persistence code.

## UniversalEvent

`src/services/universalEvents.ts` defines a runtime-neutral `UniversalEvent` envelope:

- `sessionId`, `streamId`, `sequence`, and `occurredAt` provide ordering and replay.
- `runtime` records the originating agent (`claude-code` or `codex`) without leaking raw vendor event shapes.
- `kind` normalizes message lifecycle, text, tool calls, tool results, and session terminal events.

Adapters isolate native runtime differences:

- `ClaudeCodeEventAdapter` expands one coarse message into a deterministic event sequence.
- `CodexEventAdapter` preserves fine-grained deltas for text and tool output.
- `AgentSidecar` is the interception point that converts native runtime events into `UniversalEvent[]`.

## Streaming and Reconnect

`src/services/agentStreaming.ts` models the control-plane contract:

- The durable event store is the source of truth for bootstrap and replay.
- `attachClientStream()` replays persisted history after a client cursor, then subscribes that client for isolated live fan-out.
- `BufferedAgentEventSink` represents agent-side buffered events that were produced but not yet durably acknowledged.
- `recoverAgentBufferedEvents()` lets the control plane pull buffered events after the last persisted sequence when an agent reconnects.

This gives a two-phase client handshake:

1. Read the full persisted session history from storage.
2. Attach a live stream using the latest persisted sequence as the cursor.

## SQLite Persistence

`src/services/sqliteSessionEvents.ts` replaces the previous PostgreSQL-oriented approach with SQLite-friendly append-only storage:

- `session_events` stores immutable normalized events.
- `pending_tool_results` stores short-lived aggregation rows for large tool outputs.

Write policy:

- `text.completed`: append once, after the item is complete.
- `tool.call`: append once.
- `tool.result` partial bursts: aggregate into `pending_tool_results`, extend the 300ms flush deadline, and emit a single final append-only row when flushed.
- `session.ended`: force-flush all pending tool results for the session before appending the terminal event.

This avoids repeated large-payload rewrites and keeps live tool output buffering separate from the canonical append-only event log.
