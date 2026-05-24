import type { CognitiveState } from '../components/CenterVisualizer';

export function buildPersonalGreeting(operatorName: string | null | undefined, now = new Date()): string {
  const hour = now.getHours();
  const name = operatorName?.trim() || 'Operator';
  const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  return `Good ${period}, ${name}.`;
}

interface PresenceInput {
  cognitiveState: CognitiveState;
  isMicActive: boolean;
  webrtcState?: string;
}

interface PresenceCopy {
  label: string;
  detail: string;
}

export function resolveAssistantPresence({ cognitiveState, isMicActive, webrtcState }: PresenceInput): PresenceCopy {
  if (isMicActive) {
    if (webrtcState === 'connected') {
      return {
        label: 'Listening',
        detail: 'Voice channel is open. Speak naturally and I will keep the context tidy.',
      };
    }

    return {
      label: 'Opening voice channel',
      detail: 'I am checking the audio path before I listen.',
    };
  }

  switch (cognitiveState) {
    case 'thinking':
      return {
        label: 'Thinking it through',
        detail: 'I am comparing the next step against the current workspace state.',
      };
    case 'searching':
      return {
        label: 'Looking through context',
        detail: 'I am checking memory, tasks, and local signals for the right answer.',
      };
    case 'speaking':
      return {
        label: 'Responding',
        detail: 'I am turning the result into something useful and readable.',
      };
    case 'idle':
    default:
      return {
        label: 'Ready when you are',
        detail: 'I am watching the workspace and waiting for the next useful instruction.',
      };
  }
}

interface BriefingInput {
  pendingTasks: number;
  criticalAlerts: number;
}

export function buildAssistantBriefing({ pendingTasks, criticalAlerts }: BriefingInput): string {
  const alertPart = criticalAlerts === 1
    ? '1 critical alert'
    : criticalAlerts > 1
      ? `${criticalAlerts} critical alerts`
      : '';
  const taskPart = pendingTasks === 1
    ? '1 pending task'
    : pendingTasks > 1
      ? `${pendingTasks} pending tasks`
      : '';

  if (!alertPart && !taskPart) {
    return 'No urgent workspace items need your attention right now.';
  }

  if (alertPart && taskPart) {
    return `${alertPart} and ${taskPart} are waiting for review.`;
  }

  return `${alertPart || taskPart} ${criticalAlerts + pendingTasks === 1 ? 'is' : 'are'} waiting for review.`;
}
