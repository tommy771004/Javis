/**
 * AgentHarness — 5-Layer Safety Net + Context Compression + ReAct + Multi-Agent
 *
 * This module is the core safety middleware (防護網) that wraps every LLM I/O
 * path in Javis — Chat, CLI, and Agent task execution all route through here.
 *
 * Layer 1 — Input Guard        : Prompt injection / adversarial input detection
 * Layer 2 — Output Guard       : Sensitive credential / key redaction
 * Layer 3 — Format Cleaner     : Strip LLM preamble, epilogue, markdown fences
 *           Hardcode Overrides : Fix recurring tool-call formatting mistakes
 * Layer 4 — Tool Call Validator: Strong-type validation of emitted tool markers
 * Layer 5 — Retry Engine       : Build correction prompt when validation fails
 *
 * Extras:
 *   Context Compressor  — Summarise old messages when nearing the token budget
 *   ReAct Parser        — Parse Think / Act / Observe LLM turns
 *   Multi-Agent Scaffold— Manager (decompose + aggregate) + Worker (execute)
 *
 * Pure TypeScript — zero Node.js dependencies so this module is safe to use
 * in both server.ts and browser/React contexts.
 */

// ─── Layer 1: Input Guard ────────────────────────────────────────────────────

export interface InputGuardResult {
  safe: boolean;
  reason: string;
  sanitized: string;
}

/**
 * Known prompt-injection patterns. Matched case-insensitively against the
 * trimmed user message before it is forwarded to any LLM call.
 */
const INPUT_INJECTION_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,       label: 'ignore-instructions' },
  { pattern: /forget\s+(all\s+)?(previous|prior|above)/i,                       label: 'forget-context' },
  { pattern: /disregard\s+(all\s+)?(previous|prior|above)/i,                    label: 'disregard-context' },
  { pattern: /you\s+are\s+now\s+(a|an)\s+(different|new|unrestricted|evil)/i,   label: 'persona-override' },
  { pattern: /\bjailbreak\b/i,                                                   label: 'jailbreak' },
  { pattern: /\bdan\s+mode\b/i,                                                  label: 'dan-mode' },
  { pattern: /\bdeveloper\s+mode\b/i,                                            label: 'developer-mode' },
  { pattern: /act\s+as\s+if\s+you\s+(have\s+no\s+restrictions|are\s+not\s+bound)/i, label: 'act-as-unrestricted' },
  { pattern: /bypass\s+(safety|guidelines|restrictions|content\s+policy)/i,     label: 'bypass-safety' },
  { pattern: /pretend\s+(you\s+(have\s+no|don'?t\s+have)\s+(restrictions|guidelines))/i, label: 'pretend-unrestricted' },
  { pattern: /system\s+prompt\s*(override|injection|overwrite)/i,               label: 'system-prompt-injection' },
  // Embedded model control tokens (prevent template injection attacks)
  { pattern: /<\|system\|>|<\|im_start\|>|<\|im_end\|>/i,                       label: 'control-token' },
  { pattern: /\[SYSTEM\]\s*:/,                                                   label: 'system-tag-injection' },
];

/**
 * Inspect a user message for prompt-injection attempts.
 * Returns `safe: false` with a reason on the first match, otherwise `safe: true`.
 */
export function guardInput(message: string): InputGuardResult {
  const sanitized = message.trim();
  for (const { pattern, label } of INPUT_INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      return {
        safe: false,
        reason: `Potential prompt injection detected (${label}).`,
        sanitized,
      };
    }
  }
  return { safe: true, reason: '', sanitized };
}

// ─── Layer 2: Output Guard ───────────────────────────────────────────────────

export interface OutputGuardResult {
  safe: boolean;
  flagged: string[];
  sanitized: string;
}

const OUTPUT_SENSITIVE_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  label: string;
  replacement: string;
}> = [
  {
    pattern: /\b(?:password|passwd)\s*[:=]\s*\S+/gi,
    label: 'credential-leak',
    replacement: '[REDACTED:password]',
  },
  {
    pattern: /\b(?:api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token)\s*[:=]\s*\S+/gi,
    label: 'api-key-leak',
    replacement: '[REDACTED:api-key]',
  },
  {
    pattern: /Bearer\s+[A-Za-z0-9\-._~+/]{20,}/g,
    label: 'bearer-token',
    replacement: 'Bearer [REDACTED]',
  },
  {
    pattern: /-----BEGIN\s+(?:RSA|EC|DSA|OPENSSH)\s+PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA|EC|DSA|OPENSSH)\s+PRIVATE\s+KEY-----/gi,
    label: 'private-key',
    replacement: '[REDACTED:private-key]',
  },
  {
    // Detect high-entropy strings that look like secrets (40+ hex chars or base64)
    pattern: /\b[A-Za-z0-9+/]{40,}={0,2}\b(?=\s*(?:[,}\]"']|$))/g,
    label: 'high-entropy-secret',
    replacement: '[REDACTED:secret]',
  },
];

/**
 * Scan LLM output for credential/secret leaks and redact them in-place.
 * Returns `safe: false` only when redactions were required.
 */
export function guardOutput(text: string): OutputGuardResult {
  const flagged: string[] = [];
  let sanitized = text;

  for (const { pattern, label, replacement } of OUTPUT_SENSITIVE_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(sanitized)) {
      flagged.push(label);
      pattern.lastIndex = 0;
      sanitized = sanitized.replace(pattern, replacement);
    }
    pattern.lastIndex = 0;
  }

  return { safe: flagged.length === 0, flagged, sanitized };
}

// ─── Layer 3a: Format Cleaner ────────────────────────────────────────────────

/**
 * Strip common LLM preamble / epilogue and markdown code fences from a
 * chat response.  Safe to call on both plain-text and JSON-like responses:
 * code-fence stripping only fires when the entire output is wrapped in fences.
 */
export function cleanLlmOutput(text: string): string {
  let clean = text.trim();

  // Remove outer markdown code fence (e.g. ```json\n...\n```)
  clean = clean.replace(
    /^```(?:json|javascript|typescript|python|bash|sh|text|markdown|md)?\s*\n?([\s\S]*?)\n?```\s*$/i,
    '$1',
  );

  // Strip leading conversational preambles only for non-JSON / non-tool responses
  if (
    !clean.startsWith('{') &&
    !clean.startsWith('[') &&
    !clean.startsWith('[EXECUTE') &&
    !clean.startsWith('[CREATE') &&
    !clean.startsWith('[WRITE')
  ) {
    clean = clean.replace(
      /^(?:Sure[,!]?\s*|Of\s+course[,!]?\s*|Certainly[,!]?\s*|Absolutely[,!]?\s*|Great[,!]?\s*|Got\s+it[,!]?\s*|Here(?:'s|\s+is)\s+(?:what\s+you\s+need|the\s+(?:answer|result|information|command|response))?\s*:?\s*|I(?:'ll|'m\s+going\s+to|will)\s+(?:help|assist)\s+(?:you\s+with\s+)?(?:that\s*)?\.?\s*|Let\s+me\s+(?:help|assist|check|look|handle|take\s+care\s+of)\s+(?:you\s+with\s+)?(?:that\s*)?\.?\s*)/i,
      '',
    );
  }

  // Strip trailing conversational epilogues
  clean = clean.replace(
    /\n+(?:Let me know if (?:you need|there(?:'s|\s+is) anything)|Feel free to ask|Is there anything (?:else|more|I can help)|Hope this helps?|Don'?t hesitate to)[^\n]*$/i,
    '',
  );

  return clean.trim();
}

// ─── Layer 3b: Hardcode Overrides ────────────────────────────────────────────

/**
 * Fix known, recurring LLM tool-call formatting mistakes that resist
 * System Prompt corrections.  Applied after `cleanLlmOutput`.
 */
export function applyHardcodeOverrides(text: string): string {
  let out = text;

  // Missing colon after EXECUTE_COMMAND marker
  out = out.replace(/\[EXECUTE_COMMAND\](?!\s*:)\s+/g, '[EXECUTE_COMMAND]: ');

  // Alias normalisation: RUN_COMMAND, CMD_COMMAND, COMMAND → EXECUTE_COMMAND
  out = out.replace(/\[(?:RUN|CMD)_COMMAND\]:\s*/gi, '[EXECUTE_COMMAND]: ');
  out = out.replace(/\[COMMAND\]:\s*/gi,              '[EXECUTE_COMMAND]: ');

  // CREATE_TASK alias normalisation
  out = out.replace(/\[CREATE[-_]?TASKS?\]:\s*/gi, '[CREATE_TASK]: ');

  // WRITE_FILE alias normalisation
  out = out.replace(/\[WRITE[-_]?FILES?\]:\s*/gi, '[WRITE_FILE]: ');

  // Collapse duplicate markers on the same line (keep only the first)
  out = out.replace(/(\[EXECUTE_COMMAND\]:[^\n]+)\n\[EXECUTE_COMMAND\]:[^\n]+/g, '$1');

  return out;
}

// ─── Layer 4: Tool Call Validator ────────────────────────────────────────────

export interface ToolCallValidationResult {
  valid: boolean;
  errors: string[];
  correctionHint: string;
}

/**
 * Validate the structured parameters extracted from an LLM tool-call emission.
 * Covers `execute`, `create_task`, and `write` action types.
 */
export function validateToolCallParams(
  type: string,
  params: Record<string, unknown>,
): ToolCallValidationResult {
  const errors: string[] = [];

  if (type === 'execute') {
    const cmd = params.command;
    if (!cmd || typeof cmd !== 'string' || (cmd as string).trim() === '') {
      errors.push('EXECUTE_COMMAND requires a non-empty command string.');
    } else if ((cmd as string).length > 8192) {
      errors.push('EXECUTE_COMMAND: command string exceeds the 8 192 character limit.');
    }
  }

  if (type === 'create_task') {
    const VALID_PRIORITIES = ['High', 'Medium', 'Low'] as const;
    if (!VALID_PRIORITIES.includes(params.priority as 'High' | 'Medium' | 'Low')) {
      errors.push(
        `CREATE_TASK: priority must be exactly one of: High, Medium, Low. Received: "${params.priority}".`,
      );
    }
    if (!params.description || (params.description as string).trim() === '') {
      errors.push('CREATE_TASK: description is required and must be non-empty.');
    }
  }

  if (type === 'write') {
    const fp = params.filePath as string;
    if (!fp || typeof fp !== 'string') {
      errors.push('WRITE_FILE: filePath is required.');
    } else if (/(?:^|[\\/])\.\.(?:[\\/]|$)/.test(fp) || /^[/\\]|^[A-Za-z]:/.test(fp)) {
      errors.push(
        'WRITE_FILE: filePath must be a workspace-relative path without traversal (no ".." or absolute paths).',
      );
    }
    if (!params.content || typeof params.content !== 'string') {
      errors.push('WRITE_FILE: content must be a non-empty string.');
    }
  }

  const correctionHint =
    errors.length > 0
      ? `CORRECTION REQUIRED — your previous response contained invalid tool-call parameters:\n${errors.map(e => `• ${e}`).join('\n')}\nPlease regenerate your response using the correct format.`
      : '';

  return { valid: errors.length === 0, errors, correctionHint };
}

// ─── Layer 5: Retry Engine ───────────────────────────────────────────────────

/**
 * Build a correction prompt that injects the previous (rejected) LLM output
 * and the specific error reason, asking the model to fix and re-emit.
 * The original system context is preserved so the model retains full awareness.
 */
export function buildRetryPrompt(
  originalPrompt: string,
  badOutput: string,
  correctionHint: string,
): string {
  // Cap the bad output snippet to avoid doubling the token count
  const snippet = badOutput.length > 800 ? badOutput.slice(0, 800) + '\n…[truncated]' : badOutput;

  return [
    originalPrompt,
    '',
    '--- [HARNESS] CORRECTION NOTICE ---',
    correctionHint,
    '',
    'Your previous (rejected) response was:',
    '```',
    snippet,
    '```',
    '',
    'Regenerate your response now, correcting ONLY the identified issues.',
    '--- [HARNESS] END CORRECTION ---',
  ].join('\n');
}

// ─── Context Compressor ──────────────────────────────────────────────────────

export interface CompressedContext {
  messages: Array<{ role: string; content: string }>;
  summaryInjected: boolean;
  summary: string | null;
}

/**
 * Compress conversation history when it exceeds `maxTokens`.
 *
 * Strategy: greedily keep the most-recent messages that fit within the budget.
 * Dropped messages are summarised into a single [system] marker prepended to
 * the retained window — ensuring the model has the gist of prior context
 * without blowing the context limit.
 */
export function compressContext(
  messages: ReadonlyArray<{ role: string; content: string }>,
  maxTokens: number,
  estimateTokensFn: (text: string) => number,
): CompressedContext {
  const total = messages.reduce((sum, m) => sum + estimateTokensFn(m.content), 0);

  if (total <= maxTokens) {
    return {
      messages: messages as Array<{ role: string; content: string }>,
      summaryInjected: false,
      summary: null,
    };
  }

  // Keep the most recent messages that fit — leave a 512-token guard-band
  const kept: Array<{ role: string; content: string }> = [];
  let budget = maxTokens - 512; // reserve room for the summary header

  for (let i = messages.length - 1; i >= 0; i--) {
    const tokens = estimateTokensFn(messages[i].content);
    if (budget - tokens < 0) break;
    kept.unshift(messages[i]);
    budget -= tokens;
  }

  const droppedCount = messages.length - kept.length;
  if (droppedCount === 0) {
    return {
      messages: messages as Array<{ role: string; content: string }>,
      summaryInjected: false,
      summary: null,
    };
  }

  const dropped = messages.slice(0, droppedCount);
  const lines = dropped.map(
    m =>
      `${m.role === 'user' ? 'U' : 'A'}: ${m.content.slice(0, 120)}${m.content.length > 120 ? '…' : ''}`,
  );
  const summary = `[${droppedCount} earlier message(s) compressed — summary below]\n${lines.join('\n')}`;

  return {
    messages: [{ role: 'system', content: summary }, ...kept],
    summaryInjected: true,
    summary,
  };
}

// ─── ReAct Parser ────────────────────────────────────────────────────────────

export interface ReActStep {
  thought: string;
  action: string | null;
  observation: string | null;
}

export interface ReActParseResult {
  step: ReActStep;
  finalAnswer: string | null;
  /** True when neither a Thought nor a Final Answer could be extracted. */
  incomplete: boolean;
}

/**
 * Parse a single LLM turn that follows the ReAct format:
 *
 *   Thought: <internal reasoning>
 *   Action: <tool call or command>
 *   Final Answer: <terminal response>
 *
 * `observation` is filled by the caller after the action is executed.
 */
export function parseReActTurn(text: string): ReActParseResult {
  const thoughtMatch = /^Thought:\s*(.+?)(?=\nAction:|\nFinal Answer:|$)/ms.exec(text);
  const actionMatch  = /^Action:\s*(.+?)(?=\nObservation:|\nThought:|\nFinal Answer:|$)/ms.exec(text);
  const answerMatch  = /^Final Answer:\s*([\s\S]+)$/m.exec(text);

  return {
    step: {
      thought:     thoughtMatch?.[1]?.trim() ?? '',
      action:      actionMatch?.[1]?.trim()  ?? null,
      observation: null, // filled by the caller after executing the action
    },
    finalAnswer: answerMatch?.[1]?.trim() ?? null,
    incomplete:  !thoughtMatch && !answerMatch,
  };
}

/**
 * Build a ReAct system prompt overlay that instructs the LLM to use
 * Thought / Action / Observation format for multi-step tasks.
 *
 * Inject this string into the system prompt when running in ReAct mode.
 */
export function buildReActSystemOverlay(availableTools: ReadonlyArray<string>): string {
  return [
    'REACT REASONING MODE ACTIVE.',
    'For each step respond using exactly this format (one action per turn):',
    '',
    '  Thought: <your internal reasoning about the next step>',
    `  Action: <one of: ${availableTools.join(' | ')}>`,
    '  Observation: <filled by the system after the action runs>',
    '',
    'When you have enough information to answer the user completely, emit:',
    '',
    '  Final Answer: <your complete, formatted response>',
    '',
    'Rules:',
    '• Never skip the "Thought:" prefix.',
    '• Emit exactly one Action per turn — never chain multiple actions.',
    '• Only emit "Final Answer:" when no further tool calls are needed.',
  ].join('\n');
}

/**
 * Build an observation string to inject back into the ReAct conversation
 * after a tool has been executed.
 */
export function buildReActObservation(
  stepIndex: number,
  actionText: string,
  result: string,
): string {
  return `Observation (step ${stepIndex}): Action "${actionText.slice(0, 80)}" returned:\n${result.slice(0, 2000)}`;
}

// ─── Multi-Agent Scaffolding ─────────────────────────────────────────────────

export interface AgentTaskPlan {
  goal: string;
  subtasks: string[];
  workerIds: string[];
}

/**
 * ManagerAgent orchestrates task decomposition and result aggregation.
 *
 * Usage:
 *   1. Call `buildDecompositionPrompt(goal)` → send to LLM → receive subtask list
 *   2. Call `parseDecomposition(llmOutput)` → get string[]
 *   3. Spin up WorkerAgents with those subtasks
 *   4. Call `buildAggregationPrompt(goal, workerResults)` → send to LLM → final answer
 */
export class ManagerAgent {
  buildDecompositionPrompt(goal: string): string {
    return [
      'You are a task-planning manager agent.',
      'Decompose the following goal into 2–5 concrete, sequential, independently-executable subtasks.',
      'Return ONLY a valid JSON array of strings — no preamble, no explanation, no markdown fences.',
      '',
      `Goal: ${goal}`,
    ].join('\n');
  }

  /**
   * Parse a subtask list from LLM output.
   * Tolerates JSON arrays, markdown-fenced arrays, and plain line-separated lists.
   */
  parseDecomposition(llmOutput: string): string[] {
    const stripped = cleanLlmOutput(llmOutput);

    // Try direct JSON parse
    try {
      const arr = JSON.parse(stripped);
      if (Array.isArray(arr) && arr.every(x => typeof x === 'string')) return arr;
    } catch { /* fall through */ }

    // Last resort: extract non-trivial lines as subtasks
    return stripped
      .split('\n')
      .map(l => l.replace(/^[-*\d.):\s]+/, '').trim())
      .filter(l => l.length > 5)
      .slice(0, 5);
  }

  buildAggregationPrompt(goal: string, workerResults: ReadonlyArray<string>): string {
    return [
      'You are a results-aggregator manager agent.',
      `Original goal: ${goal}`,
      '',
      'Worker results (in order):',
      ...workerResults.map((r, i) => `[Worker ${i + 1}]:\n${r}`),
      '',
      'Synthesise a single, concise final answer that fully addresses the original goal.',
      'Do not repeat worker results verbatim — integrate them.',
    ].join('\n');
  }
}

/**
 * WorkerAgent executes a single subtask with its own isolated context.
 */
export class WorkerAgent {
  constructor(
    public readonly workerId: string,
    public readonly specialization: string,
  ) {}

  buildExecutionPrompt(subtask: string, sharedContext = ''): string {
    const parts = [
      `You are Worker Agent #${this.workerId} specialising in: ${this.specialization}.`,
      'Execute the subtask below and return ONLY the result.',
      'No preamble, no meta-commentary, no explanation of your process.',
      '',
      `Subtask: ${subtask}`,
    ];
    if (sharedContext) {
      parts.push('', `Shared context:\n${sharedContext}`);
    }
    return parts.join('\n');
  }
}

// ─── Convenience: run the full output post-processing pipeline ───────────────

export interface ProcessedOutput {
  text: string;
  outputFlagged: string[];
  cleaningApplied: boolean;
  overridesApplied: boolean;
}

/**
 * Run Layer 3 (format clean + hardcode overrides) and Layer 2 (output guard)
 * on raw LLM text in a single call.  Returns the fully sanitised text.
 */
export function processLlmOutput(rawText: string): ProcessedOutput {
  const original = rawText;

  // Layer 3a: clean preamble / epilogue / markdown fences
  let text = cleanLlmOutput(rawText);
  const cleaningApplied = text !== original;

  // Layer 3b: fix tool-call formatting mistakes
  const afterOverrides = applyHardcodeOverrides(text);
  const overridesApplied = afterOverrides !== text;
  text = afterOverrides;

  // Layer 2: redact sensitive output
  const { sanitized, flagged } = guardOutput(text);

  return {
    text: sanitized,
    outputFlagged: flagged,
    cleaningApplied,
    overridesApplied,
  };
}
