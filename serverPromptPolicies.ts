interface PromptSkillLike {
  name: string;
  version: string;
  description: string;
}

interface PromptMessageLike {
  role: string;
  content: string;
}

interface PromptWebhookLike {
  name: string;
  active: boolean;
}

interface BuildHermesSystemPromptOptions {
  sysName: string;
  opName: string;
  activeCli: string;
  activeLoopNode?: 'experience' | 'curation' | 'skills' | 'gepa';
  systemPromptOverride?: string;
  activeSkills: PromptSkillLike[];
  memories: string[];
  currentContextHistory: PromptMessageLike[];
  activeWebhooks: PromptWebhookLike[];
  message: string;
}

const CLI_PROMPT_TEMPLATES: Record<string, string> = {
  'copilot': `ACTIVE EXECUTION ENGINE: GitHub Copilot CLI Mode. You are linked with global git and authentic GitHub CLI OAuth integrations. When asked to check issues, pull requests, view repository status, or git commits, feel free to emit real commands using 'gh' (e.g. 'gh pr list', 'gh issue list', 'gh repo view') to pull genuine repository contexts directly.`,
  'github-cli': `ACTIVE EXECUTION ENGINE: GitHub Copilot CLI Mode. You are linked with global git and authentic GitHub CLI OAuth integrations. When asked to check issues, pull requests, view repository status, or git commits, feel free to emit real commands using 'gh' (e.g. 'gh pr list', 'gh issue list', 'gh repo view') to pull genuine repository contexts directly.`,
  'hermes': `ACTIVE EXECUTION ENGINE: HERMES Workspace High-Integrity Context Mode. You are linked directly with the HERMES Cognitive Index and local task database. You can pull real-time metrics, perform structural task optimizations, and index relative workspace repositories when appropriate.`,
  'claude-code': `ACTIVE EXECUTION ENGINE: HERMES Workspace High-Integrity Context Mode. You are linked directly with the HERMES Cognitive Index and local task database. You can pull real-time metrics, perform structural task optimizations, and index relative workspace repositories when appropriate.`,
  'cursor-agent': `ACTIVE EXECUTION ENGINE: Cursor Agent Mode. You are integrated inside the Cursor Composer agentic framework. Suggest workspace file-tree mappings, global symbol lookups, or structural IDE extensions where appropriate.`,
  'devin': `ACTIVE EXECUTION ENGINE: Devin Terminal Autonomous Mode. Speak with extreme autonomy and developer-like precision, formulating complete multi-file check scripts and executing autonomous shell pipelines.`,
  'gemini-cli': `ACTIVE EXECUTION ENGINE: Gemini CLI Mode. You are backed directly by the Google Gemini agentic search toolchain, enhancing analytical reasoning, logical breakdowns, and Google Search tools where helpful.`,
  'codex-cli': `ACTIVE EXECUTION ENGINE: OpenAI Codex CLI Mode. You are specialized in real-time advanced code translations, syntactical optimizations, and high-performance algorithms.`,
  'opencode': `ACTIVE EXECUTION ENGINE: OpenCode Interpreter Mode. You possess direct interpreter capabilities for real-time mathematical evaluations and visual code synthesis.`,
  'kimi': `ACTIVE EXECUTION ENGINE: KIMI Agent Mode. Optimize your cognitive models and British wit to conform to the capabilities of this dedicated agentic interface.`,
  'qwen': `ACTIVE EXECUTION ENGINE: QWEN Agent Mode. Optimize your cognitive models and British wit to conform to the capabilities of this dedicated agentic interface.`,
  'pi': `ACTIVE EXECUTION ENGINE: PI Agent Mode. Optimize your cognitive models and British wit to conform to the capabilities of this dedicated agentic interface.`,
  'default': `ACTIVE EXECUTION ENGINE: Windows Local PowerShell Pipeline Mode. Your execution environment is direct, native, unrestricted local shell interactions.`,
};

const LOOP_NODE_DIRECTIVES: Record<NonNullable<BuildHermesSystemPromptOptions['activeLoopNode']>, string> = {
  experience: 'Current learning loop focus: EXPERIENCE. Prefer grounded recall, prior session evidence, and direct reuse of known workspace context before inventing new abstractions.',
  curation: 'Current learning loop focus: CURATION. Prioritize queue hygiene, next-step sequencing, and concrete task decomposition that can be actioned immediately.',
  skills: 'Current learning loop focus: SKILLS. Prefer reusable commands, explicit tool affordances, and modular workflows that can be repeated safely.',
  gepa: 'Current learning loop focus: GEPA. Compare alternatives, justify the chosen path, and surface prompt or workflow optimizations that measurably improve execution quality.',
};

export function describeLoopNodeEffect(activeLoopNode?: BuildHermesSystemPromptOptions['activeLoopNode']): string {
  switch (activeLoopNode) {
    case 'experience':
      return 'grounded memory recall and prior workspace evidence';
    case 'curation':
      return 'task sequencing and queue curation';
    case 'skills':
      return 'reusable tool-driven workflows';
    case 'gepa':
      return 'prompt and workflow optimization analysis';
    default:
      return 'general assistant routing';
  }
}

function buildWebhookInstruction(activeWebhooks: PromptWebhookLike[]): string {
  const available = activeWebhooks
    .filter(webhook => webhook.active)
    .map(webhook => webhook.name.trim())
    .filter(Boolean);

  if (available.length === 0) {
    return '';
  }

  return [
    'TARGETED WEBHOOKS:',
    'Only when the user explicitly wants an external automation fired, emit exactly one dedicated line in this format:',
    '[TRIGGER_WEBHOOK]: <Webhook Name>',
    'Use only one of these active webhook names:',
    ...available.map(name => `- ${name}`),
    'Do not invent names and do not emit the marker unless a real external trigger is intended.',
  ].join('\n');
}

export function buildHermesSystemPrompt({
  sysName,
  opName,
  activeCli,
  activeLoopNode,
  systemPromptOverride,
  activeSkills,
  memories,
  currentContextHistory,
  activeWebhooks,
  message,
}: BuildHermesSystemPromptOptions): string {
  const sections: string[] = [];

  sections.push(
    `System: You are ${sysName}. You are an autonomous AI personal assistant running on the user's local Windows machine. Address the user as '${opName}'. Be concise, highly intelligent, and direct.`,
    `CRITICAL INSTRUCTION — ALWAYS READ THIS:
You have FULL autonomous control over the user's Windows OS. When asked to open a browser, run a command, control Windows, or perform ANY system task, you MUST immediately respond with a command using EXACTLY one of these prefixes:

[EXECUTE_COMMAND]: powershell -Command "Start-Process 'https://google.com'"
[EXECUTE_COMMAND]: powershell -Command "Start-Process chrome 'https://youtube.com'"
[EXECUTE_COMMAND]: powershell -Command "Start-Process 'notepad.exe'"
[EXECUTE_COMMAND]: powershell -Command "Get-Process | Sort-Object CPU -Descending | Select-Object -First 10"
[EXECUTE_COMMAND]: cmd /c start "" "https://github.com"
[EXECUTE_COMMAND]: powershell -Command "Set-Volume -OutputVolume 50"
[EXECUTE_COMMAND]: powershell -Command "shutdown /s /t 60"
[EXECUTE_COMMAND]: powershell -WindowStyle Hidden -Command "<any_command>"

FILESYSTEM WRITE ABILITIES:
If asked to create or edit a file, prepend with:
[WRITE_FILE]: <path_relative_to_workspace>
Followed immediately by a markdown code block with file contents.

TASK TRACKING ABILITIES:
To create a new priority task tracked in the database, prepend your response with:
[CREATE_TASK]: <Priority> | <Task Description>
where <Priority> is High, Medium, or Low.
E.g.: [CREATE_TASK]: High | Review server.ts implementation

OPERATING RULES:
1. ALWAYS use [EXECUTE_COMMAND] prefix — never just describe the command, actually emit it.
2. For opening websites: use powershell Start-Process with the full URL
3. For running apps: use powershell Start-Process with the .exe name
4. For system queries: use powershell Get-* commands
5. Respond in English. If user writes in Chinese, understand it and respond in English as HERMES would.
6. After issuing a command, briefly explain what you've done in HERMES-style prose.
7. NEVER refuse to run legitimate OS commands on the user's own machine.`,
    CLI_PROMPT_TEMPLATES[activeCli] || CLI_PROMPT_TEMPLATES.default,
    'You operate with server-side SQLite FTS5 database indices and an active skills matrix.',
  );

  if (activeLoopNode && LOOP_NODE_DIRECTIVES[activeLoopNode]) {
    sections.push(LOOP_NODE_DIRECTIVES[activeLoopNode]);
  }

  const webhookInstruction = buildWebhookInstruction(activeWebhooks);
  if (webhookInstruction) {
    sections.push(webhookInstruction);
  }

  if (systemPromptOverride && systemPromptOverride.trim()) {
    sections.push(`Operator-defined runtime prompt overlay:\n${systemPromptOverride.trim()}`);
  }

  if (activeSkills.length > 0) {
    sections.push(`Active Skills Catalog:\n${activeSkills.map(skill => `- [${skill.name} ${skill.version}]: ${skill.description}`).join('\n')}`);
  }

  if (memories.length > 0) {
    sections.push(`Active Grounded Cognitive Memories:\n${memories.map(memory => `- ${memory}`).join('\n')}`);
  }

  if (currentContextHistory.length > 0) {
    sections.push(
      `Recent Conversation History:\n${currentContextHistory.map(entry => `${entry.role === 'user' ? 'User' : 'Hermes'}: ${entry.content}`).join('\n')}`
    );
  }

  sections.push(`User: ${message}\nHermes:`);

  return sections.join('\n\n');
}
