/**
 * AgentWorkflow — Agentic Search, CLAUDE.md Context, Start/Stop Hooks,
 *                 Directory-bound Skills, Subagent Delegation
 *
 * Implements Spec2.md requirements:
 *   1. Agentic Search    — search workspace BEFORE any edit; never guess
 *   2. CLAUDE.md Hierarchy — load per-directory context rules dynamically
 *   3. Directory-bound Skills — auto-mount skill modules by working path
 *   4. Start Hook        — snapshot env/package state at task begin
 *   5. Stop Hook         — self-heal via lint/test failure feedback loop
 *   6. Subagent Delegation — delegate token-heavy exploration tasks
 *
 * Pure TypeScript — zero Node.js APIs (safe for browser/React and server.ts).
 */

// ─── 1. Agentic Search ────────────────────────────────────────────────────────

export interface AgenticSearchTool {
  name: string;
  endpoint: string;
  description: string;
  params: Record<string, string>;
}

/**
 * Catalogue of workspace tool calls the LLM may emit.
 * Each tool maps to a real server endpoint.
 */
export const AGENTIC_SEARCH_TOOLS: ReadonlyArray<AgenticSearchTool> = [
  {
    name: 'SEARCH_WORKSPACE',
    endpoint: '/api/workspace/grep',
    description:
      'Regex or plain-text search across all workspace source files. Returns matching lines with file path and line number.',
    params: {
      pattern: 'regex or plain text to search for',
      caseSensitive: 'boolean (default false)',
      maxResults: 'number (default 30)',
    },
  },
  {
    name: 'READ_FILE',
    endpoint: '/api/workspace/read',
    description: 'Read the full contents of a specific workspace file.',
    params: { filePath: 'workspace-relative path to the file' },
  },
  {
    name: 'LIST_DIR',
    endpoint: '/api/workspace/list',
    description: 'List files and subdirectories inside a workspace directory.',
    params: { dirPath: 'workspace-relative directory path (default: workspace root)' },
  },
];

/**
 * Build the mandatory "Agentic Search" instruction block for the system prompt.
 * Tells the LLM it MUST call these tools before proposing any code change.
 */
export function buildAgenticSearchInstruction(): string {
  const toolLines = AGENTIC_SEARCH_TOOLS.map(t => {
    const paramStr = Object.entries(t.params)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    return `  [${t.name}]: ${t.description}\n    Params → ${paramStr}`;
  }).join('\n');

  return [
    'AGENTIC SEARCH PROTOCOL (MANDATORY — follow before ANY code edit):',
    '',
    '• NEVER guess file locations, function names, or variable signatures from training memory.',
    '• ALWAYS issue at least one search tool call FIRST to locate the exact symbol or file.',
    '• READ the target file before proposing any modification.',
    '• Resolve naming conflicts by tracing import chains — not by assuming.',
    '• Automatically ignore build artefacts: dist/, build/, node_modules/, .git/, task_reports/',
    '',
    'Available workspace tools (emit as JSON on a dedicated line):',
    toolLines,
    '',
    'Usage examples:',
    '  [SEARCH_WORKSPACE]: {"pattern": "buildHermesSystemPrompt", "maxResults": 5}',
    '  [READ_FILE]: {"filePath": "serverPromptPolicies.ts"}',
    '  [LIST_DIR]: {"dirPath": "src/services"}',
    '',
    'Only after confirming the current code shape should you emit [WRITE_FILE] or [EXECUTE_COMMAND].',
  ].join('\n');
}

// ─── 2. CLAUDE.md Hierarchical Context ───────────────────────────────────────

export interface ClaudeContextEntry {
  /** Workspace-relative path, e.g. "src/payment/CLAUDE.md" */
  path: string;
  content: string;
}

/**
 * Build the CLAUDE.md context section for the system prompt.
 * @param chain Array of CLAUDE.md entries, root-first (innermost last).
 *              Innermost (closest to the working directory) takes precedence.
 */
export function buildClaudeContextSection(chain: ClaudeContextEntry[]): string {
  if (chain.length === 0) return '';

  const formatted = chain.map(({ path: p, content }) =>
    `--- ${p} ---\n${content.trim()}`
  );

  return [
    'DIRECTORY CONTEXT (CLAUDE.md hierarchy — innermost rule overrides outermost):',
    '',
    ...formatted,
    '',
    'The above rules are mandatory for this working directory. Follow them exactly.',
  ].join('\n');
}

// ─── 3. Directory-bound Skill Resolution ─────────────────────────────────────

/**
 * Map of directory name segments → skill IDs to auto-load.
 * Keys are lowercased partial directory name segments.
 */
const DIRECTORY_SKILL_MAP: ReadonlyArray<{ segment: string; skills: string[] }> = [
  { segment: 'payment',   skills: ['security', 'pci-compliance'] },
  { segment: 'auth',      skills: ['security', 'oauth'] },
  { segment: 'security',  skills: ['security'] },
  { segment: 'database',  skills: ['database-migration'] },
  { segment: 'db',        skills: ['database-migration'] },
  { segment: 'migration', skills: ['database-migration'] },
  { segment: 'deploy',    skills: ['deployment'] },
  { segment: 'infra',     skills: ['deployment', 'infrastructure'] },
  { segment: 'k8s',       skills: ['deployment', 'kubernetes'] },
  { segment: 'perf',      skills: ['performance'] },
  { segment: 'benchmark', skills: ['performance'] },
  { segment: 'api',       skills: ['api-design'] },
];

/**
 * Return the list of skill IDs that are triggered by a working directory path.
 * Used to auto-mount only the relevant skill modules (防止 context explosion).
 */
export function getDirectoryBoundSkills(relPath: string): string[] {
  const normalized = relPath.toLowerCase().replace(/\\/g, '/');
  const segments = normalized.split('/');
  const triggered = new Set<string>();

  for (const { segment, skills } of DIRECTORY_SKILL_MAP) {
    if (segments.some(s => s.includes(segment))) {
      skills.forEach(skill => triggered.add(skill));
    }
  }

  return [...triggered];
}

// ─── 4. Start Hook ────────────────────────────────────────────────────────────

export interface StartHookContext {
  nodeVersion: string;
  packageName: string;
  packageVersion: string;
  mainDependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  envFileExists: boolean;
  workingDir: string;
  triggeredSkills: string[];
}

/**
 * Build the Start Hook context block for injection into the system prompt.
 * All data is passed in so this function remains free of Node.js I/O.
 */
export function buildStartHookContext(ctx: StartHookContext): string {
  const mainDeps =
    Object.entries(ctx.mainDependencies)
      .map(([k, v]) => `${k}@${v}`)
      .join(', ') || '(none)';
  const devDeps =
    Object.entries(ctx.devDependencies)
      .map(([k, v]) => `${k}@${v}`)
      .join(', ') || '(none)';

  const skillHint =
    ctx.triggeredSkills.length > 0
      ? `Auto-mounted skills (directory-bound): ${ctx.triggeredSkills.join(', ')}`
      : 'No directory-bound skills auto-mounted.';

  return [
    'START HOOK — Environment snapshot (verified at task start):',
    `  Runtime:    Node.js ${ctx.nodeVersion}`,
    `  Package:    ${ctx.packageName}@${ctx.packageVersion}`,
    `  .env file:  ${ctx.envFileExists ? 'PRESENT' : 'ABSENT'}`,
    `  Working dir: ${ctx.workingDir || '(workspace root)'}`,
    `  Dependencies:     ${mainDeps}`,
    `  Dev dependencies: ${devDeps}`,
    `  ${skillHint}`,
  ].join('\n');
}

// ─── 5. Stop Hook ─────────────────────────────────────────────────────────────

export interface StopHookResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Build a self-healing iteration prompt when the Stop Hook (lint/test) fails.
 * Feed this prompt back into the LLM so it can diagnose and fix the error.
 */
export function buildStopHookPrompt(
  taskDescription: string,
  result: StopHookResult,
): string {
  const cap = (s: string, n = 1500) =>
    s.length > n ? s.slice(0, n) + '\n…[truncated]' : s;

  return [
    `STOP HOOK FAILURE — post-task validation "${result.command}" exited with code ${result.exitCode}.`,
    '',
    '### STDOUT',
    '```',
    cap(result.stdout),
    '```',
    '',
    '### STDERR',
    '```',
    cap(result.stderr),
    '```',
    '',
    `Original task: "${taskDescription}"`,
    '',
    'Diagnose the errors above and emit the minimal corrective changes.',
    'Use [SEARCH_WORKSPACE] or [READ_FILE] to inspect the affected files before patching.',
    'After your fix the stop hook will re-run automatically. If the issue cannot be resolved',
    'by code alone, explain the blocker clearly.',
  ].join('\n');
}

/**
 * Decide whether a CLAUDE.md update suggestion should be surfaced to the developer.
 * Returns true when the task revealed an architecture constraint or reusable pattern.
 */
export function shouldSuggestClaudeMdUpdate(outcome: string): boolean {
  const signals = [
    /pitfall/i,
    /workaround/i,
    /constraint/i,
    /known\s+issue/i,
    /breaking\s+change/i,
    /migration\s+required/i,
    /incompatible/i,
    /deprecated/i,
  ];
  return signals.some(p => p.test(outcome));
}

/**
 * Build the prompt that asks the LLM whether a new architectural note
 * should be persisted into the local CLAUDE.md for future agents.
 */
export function buildClaudeMdUpdatePrompt(
  dirPath: string,
  taskDescription: string,
  outcome: string,
): string {
  return [
    `Task completed: "${taskDescription}"`,
    `Working directory: ${dirPath}`,
    '',
    `Outcome summary: ${outcome.slice(0, 500)}`,
    '',
    'Does this task reveal a recurring pattern, architectural constraint, or pitfall that',
    `future agents working in "${dirPath}" should know about?`,
    '',
    'If YES, respond with:',
    '[UPDATE_CLAUDE_MD]: <concise rule — max 2 sentences>',
    '',
    'If NO, respond with:',
    '[CLAUDE_MD_OK]',
  ].join('\n');
}

// ─── 6. Subagent Delegation ───────────────────────────────────────────────────

/**
 * Build the subagent delegation instruction block for the system prompt.
 * The main Agent (Manager) uses [DELEGATE_TASK] to offload exploration tasks
 * that would otherwise pollute its primary context window.
 */
export function buildSubagentDelegationInstruction(): string {
  return [
    'SUBAGENT DELEGATION (use for large exploration or documentation tasks):',
    '',
    'When a task requires scanning many files or generating large documentation sets,',
    'delegate it rather than polluting the main context window:',
    '',
    '  [DELEGATE_TASK]: {"subtask": "<description>", "scope": "<path or topic>"}',
    '',
    'The system executes the subtask in an isolated context and returns only the final',
    'summary as an Observation. You (the Manager) then incorporate that result and continue.',
    'Never perform large-scale exploration inline — always delegate.',
  ].join('\n');
}
