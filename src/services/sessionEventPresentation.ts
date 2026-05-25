import type { UniversalEvent } from './universalEvents';

export interface SessionLogPresentationOptions {
  assistantLabel: string;
}

function resolveAssistantLabel(event: UniversalEvent, options: SessionLogPresentationOptions): string {
  if (event.runtime === 'hermes') {
    return 'HERMES';
  }

  return options.assistantLabel;
}

export function formatSessionEventAsLogLine(
  event: UniversalEvent,
  options: SessionLogPresentationOptions,
): string | null {
  if (event.kind === 'text.completed' && event.text) {
    if (event.actor === 'user') {
      return `USER: ${event.text}`;
    }

    if (event.actor === 'assistant') {
      return `${resolveAssistantLabel(event, options)}: ${event.text}`;
    }

    return `SYS: ${event.text}`;
  }

  if (event.kind === 'tool.call') {
    return `SYS: Running ${event.toolName || 'tool'} command...`;
  }

  if (event.kind === 'tool.result' && event.resultText) {
    return `OUTPUT: ${event.resultText}`;
  }

  if (event.kind === 'session.ended' && event.reason) {
    return `SYS: Session ended (${event.reason}).`;
  }

  return null;
}

export function buildSessionLogTranscript(
  events: UniversalEvent[],
  options: SessionLogPresentationOptions,
): string[] {
  return events
    .map((event) => formatSessionEventAsLogLine(event, options))
    .filter((line): line is string => Boolean(line));
}
