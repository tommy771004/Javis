import type { AgentRuntime } from './universalEvents';

export interface CliExecutionTemplateEntry {
  id: string;
  executionTemplate?: string;
}

export const CLI_BINARY_MAP: Record<string, string> = {
  copilot: 'gh',
  'github-cli': 'gh',
  'claude-code': 'npx',
  'cursor-agent': 'cursor',
  devin: 'devin',
  'gemini-cli': 'gemini',
  'codex-cli': 'codex',
  opencode: 'opencode',
  kimi: 'kimi',
  qwen: 'qwen',
  pi: 'pi',
};

const CHAT_FALLBACK_TEMPLATES: Record<string, string> = {
  'claude-code': 'npx -y @anthropic-ai/claude-code --print -p "{{prompt}}"',
  'cursor-agent': 'cursor --agent --prompt "{{prompt}}"',
  devin: 'devin --interactive false --instruction "{{prompt}}"',
  'gemini-cli': 'gemini query "{{prompt}}"',
  'codex-cli': 'codex "{{prompt}}"',
  opencode: 'opencode "{{prompt}}"',
  kimi: 'kimi "{{prompt}}"',
  qwen: 'qwen "{{prompt}}"',
  pi: 'pi "{{prompt}}"',
  copilot: 'gh copilot suggest -t shell "{{prompt}}"',
  'github-cli': 'gh copilot suggest -t shell "{{prompt}}"',
};

const KNOWN_RUNTIMES = new Set<AgentRuntime>([
  'claude-code',
  'codex',
  'codex-cli',
  'openrouter',
  'cursor-agent',
  'devin',
  'gemini-cli',
  'copilot',
  'github-cli',
  'opencode',
  'kimi',
  'qwen',
  'pi',
  'hermes',
  'system',
]);

export function normalizeCliRuntime(activeCli: string): AgentRuntime {
  if (activeCli === 'codex-cli') {
    return 'codex';
  }

  if (KNOWN_RUNTIMES.has(activeCli as AgentRuntime)) {
    return activeCli as AgentRuntime;
  }

  return 'system';
}

export function resolveCliBinary(activeCli: string): string | undefined {
  return CLI_BINARY_MAP[activeCli];
}

export function resolveChatExecutionTemplate(
  activeCli: string,
  mappings: CliExecutionTemplateEntry[] = [],
): string | null {
  if (activeCli === 'openrouter' || activeCli === 'hermes') {
    return null;
  }

  const mapped = mappings.find((entry) => entry.id === activeCli)?.executionTemplate;
  if (mapped) {
    return mapped;
  }

  return CHAT_FALLBACK_TEMPLATES[activeCli] ?? null;
}
