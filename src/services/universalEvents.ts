export type AgentRuntime =
  | 'claude-code'
  | 'codex'
  | 'codex-cli'
  | 'openrouter'
  | 'cursor-agent'
  | 'devin'
  | 'gemini-cli'
  | 'copilot'
  | 'github-cli'
  | 'opencode'
  | 'kimi'
  | 'qwen'
  | 'pi'
  | 'hermes'
  | 'system';

export type UniversalEventKind =
  | 'session.started'
  | 'session.ended'
  | 'message.started'
  | 'message.completed'
  | 'text.delta'
  | 'text.completed'
  | 'tool.call'
  | 'tool.result'
  | 'runtime.error';

export type UniversalEventActor = 'system' | 'user' | 'assistant' | 'tool';

export interface UniversalEvent {
  eventId: string;
  sessionId: string;
  streamId: string;
  sequence: number;
  runtime: AgentRuntime;
  kind: UniversalEventKind;
  actor: UniversalEventActor;
  occurredAt: number;
  messageId?: string;
  itemId?: string;
  text?: string;
  delta?: string;
  toolCallId?: string;
  toolName?: string;
  argumentsText?: string;
  resultText?: string;
  isPartial?: boolean;
  reason?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface UniversalEventContext {
  sessionId: string;
  streamId: string;
  nextSequence: () => number;
  now?: () => number;
}

export interface NativeEventAdapter<TRaw> {
  readonly runtime: AgentRuntime;
  adapt(raw: TRaw, context: UniversalEventContext): UniversalEvent[];
}

type ClaudeCodeTextBlock = {
  type: 'text';
  text: string;
};

type ClaudeCodeToolUseBlock = {
  type: 'tool_use';
  id: string;
  name: string;
  input?: unknown;
};

type ClaudeCodeToolResultBlock = {
  type: 'tool_result';
  toolUseId: string;
  content: string;
};

export type ClaudeCodeBlock =
  | ClaudeCodeTextBlock
  | ClaudeCodeToolUseBlock
  | ClaudeCodeToolResultBlock;

export interface ClaudeCodeNativeEvent {
  type: 'message';
  messageId: string;
  role: UniversalEventActor;
  blocks: ClaudeCodeBlock[];
}

export type CodexNativeEvent =
  | { type: 'response.started'; messageId: string }
  | { type: 'response.output_text.delta'; messageId: string; itemId: string; delta: string }
  | { type: 'response.output_text.done'; messageId: string; itemId: string; text: string }
  | {
      type: 'response.tool_call';
      messageId: string;
      itemId: string;
      callId: string;
      toolName: string;
      argumentsText?: string;
    }
  | {
      type: 'response.tool_result.delta';
      messageId: string;
      itemId: string;
      callId: string;
      delta: string;
    }
  | {
      type: 'response.tool_result.done';
      messageId: string;
      itemId: string;
      callId: string;
      resultText: string;
    }
  | { type: 'response.completed'; messageId: string };

function toTimestamp(context: UniversalEventContext): number {
  return context.now ? context.now() : Date.now();
}

export function createUniversalEvent(
  runtime: AgentRuntime,
  kind: UniversalEventKind,
  actor: UniversalEventActor,
  context: UniversalEventContext,
  details: Partial<UniversalEvent> = {},
): UniversalEvent {
  const sequence = context.nextSequence();
  return {
    eventId: `${runtime}:${context.sessionId}:${sequence}`,
    sessionId: context.sessionId,
    streamId: context.streamId,
    sequence,
    runtime,
    kind,
    actor,
    occurredAt: toTimestamp(context),
    ...details,
  };
}

function serializeUnknown(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value ?? {});
}

export class ClaudeCodeEventAdapter implements NativeEventAdapter<ClaudeCodeNativeEvent> {
  readonly runtime = 'claude-code' as const;

  adapt(raw: ClaudeCodeNativeEvent, context: UniversalEventContext): UniversalEvent[] {
    if (raw.type !== 'message') {
      return [];
    }

    const events: UniversalEvent[] = [
      createUniversalEvent(this.runtime, 'message.started', raw.role, context, {
        messageId: raw.messageId,
      }),
    ];

    raw.blocks.forEach((block, index) => {
      const itemId = `${raw.messageId}:block:${index}`;
      if (block.type === 'text') {
        events.push(
          createUniversalEvent(this.runtime, 'text.completed', raw.role, context, {
            messageId: raw.messageId,
            itemId,
            text: block.text,
          }),
        );
        return;
      }

      if (block.type === 'tool_use') {
        events.push(
          createUniversalEvent(this.runtime, 'tool.call', raw.role, context, {
            messageId: raw.messageId,
            itemId,
            toolCallId: block.id,
            toolName: block.name,
            argumentsText: serializeUnknown(block.input),
          }),
        );
        return;
      }

      events.push(
        createUniversalEvent(this.runtime, 'tool.result', 'tool', context, {
          messageId: raw.messageId,
          itemId,
          toolCallId: block.toolUseId,
          resultText: block.content,
          isPartial: false,
        }),
      );
    });

    events.push(
      createUniversalEvent(this.runtime, 'message.completed', raw.role, context, {
        messageId: raw.messageId,
      }),
    );

    return events;
  }
}

export class CodexEventAdapter implements NativeEventAdapter<CodexNativeEvent> {
  readonly runtime = 'codex' as const;

  adapt(raw: CodexNativeEvent, context: UniversalEventContext): UniversalEvent[] {
    switch (raw.type) {
      case 'response.started':
        return [
          createUniversalEvent(this.runtime, 'message.started', 'assistant', context, {
            messageId: raw.messageId,
          }),
        ];
      case 'response.output_text.delta':
        return [
          createUniversalEvent(this.runtime, 'text.delta', 'assistant', context, {
            messageId: raw.messageId,
            itemId: raw.itemId,
            delta: raw.delta,
          }),
        ];
      case 'response.output_text.done':
        return [
          createUniversalEvent(this.runtime, 'text.completed', 'assistant', context, {
            messageId: raw.messageId,
            itemId: raw.itemId,
            text: raw.text,
          }),
        ];
      case 'response.tool_call':
        return [
          createUniversalEvent(this.runtime, 'tool.call', 'assistant', context, {
            messageId: raw.messageId,
            itemId: raw.itemId,
            toolCallId: raw.callId,
            toolName: raw.toolName,
            argumentsText: raw.argumentsText ?? '',
          }),
        ];
      case 'response.tool_result.delta':
        return [
          createUniversalEvent(this.runtime, 'tool.result', 'tool', context, {
            messageId: raw.messageId,
            itemId: raw.itemId,
            toolCallId: raw.callId,
            resultText: raw.delta,
            delta: raw.delta,
            isPartial: true,
          }),
        ];
      case 'response.tool_result.done':
        return [
          createUniversalEvent(this.runtime, 'tool.result', 'tool', context, {
            messageId: raw.messageId,
            itemId: raw.itemId,
            toolCallId: raw.callId,
            resultText: raw.resultText,
            isPartial: false,
          }),
        ];
      case 'response.completed':
        return [
          createUniversalEvent(this.runtime, 'message.completed', 'assistant', context, {
            messageId: raw.messageId,
          }),
        ];
      default:
        return [];
    }
  }
}

type AdapterRegistry = Partial<Record<AgentRuntime, NativeEventAdapter<unknown>>>;

export class AgentSidecar {
  constructor(private readonly adapters: AdapterRegistry) {}

  intercept(
    runtime: AgentRuntime,
    raw: unknown,
    context: UniversalEventContext,
  ): UniversalEvent[] {
    const adapter = this.adapters[runtime];
    if (!adapter) {
      return [];
    }

    return adapter.adapt(raw, context);
  }
}
