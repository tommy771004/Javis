import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import Database from 'better-sqlite3';
import { formatFtsScoreLabel, type FtsScoreKind } from './src/services/telemetryPresentationPolicies';

// ---------------------------------------------------------------------------
// Real AES-256-GCM encryption for database.json at rest
// Key is derived deterministically from machine identity (hostname + arch +
// total memory) so the same machine always produces the same key — no key
// storage file needed — while still being unguessable from the ciphertext.
// ---------------------------------------------------------------------------
const DB_ALGO = 'aes-256-gcm' as const;
const IV_LEN = 16; // bytes
const MACHINE_KEY = (() => {
  const fingerprint = [os.hostname(), os.arch(), String(os.totalmem())].join('|');
  return crypto.createHash('sha256').update(fingerprint).digest(); // 32 bytes
})();

/** HMAC-SHA256 truncated to 8 hex chars — shown in the security audit panel. */
export const DB_KEY_FINGERPRINT = crypto
  .createHmac('sha256', MACHINE_KEY)
  .update('javis-db-fingerprint')
  .digest('hex')
  .substring(0, 8)
  .toUpperCase();

function encryptData(plain: string): Buffer {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(DB_ALGO, MACHINE_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag(); // 16 bytes GCM tag
  // Layout: [iv (16)] [authTag (16)] [ciphertext (n)]
  return Buffer.concat([iv, authTag, encrypted]);
}

function decryptData(buf: Buffer): string {
  const iv = buf.subarray(0, IV_LEN);
  const authTag = buf.subarray(IV_LEN, IV_LEN + 16);
  const ciphertext = buf.subarray(IV_LEN + 16);
  const decipher = crypto.createDecipheriv(DB_ALGO, MACHINE_KEY, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
}

export interface DbMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  cachedTokens?: number;
}

export interface DbSkill {
  id: string;
  name: string;
  version: string;
  status: 'active' | 'evaluating' | 'archived';
  description: string;
  yamlContent?: string;
}

export interface DbCostLog {
  id: string;
  timestamp: number;
  model: string;
  taskType: string;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
}

export interface DbTask {
  id: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'Completed' | 'Cancelled';
  createdAt: number;
  progress?: number;
  completedAt?: number;
}

export interface SystemLogEntry {
  timestamp: number;
  category: 'SYS' | 'HERMES' | 'DB' | 'NET' | 'API' | 'VOIP' | 'EXEC' | 'SEC' | 'GEPA';
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
}

export interface FtsSearchResult {
  type: 'message' | 'skill';
  title: string;
  excerpt: string;
  score: number;
  scoreKind: FtsScoreKind;
  scoreLabel: string;
}

export interface CliMapping {
  id: string;
  name: string;
  cmd: string;
  executionTemplate: string;
  statusColor: string;
  iconText: string;
  iconBg: string;
  tag?: string;
  isInstalled?: boolean;
  version?: string;
}

export interface DbSettings {
  shellMode: 'manual' | 'safe' | 'auto';
  writeMode: 'manual' | 'auto';
  taskMode: 'manual' | 'auto';
  voiceProfile: 'baritone' | 'fast' | 'standard';
  autoRepair: boolean;
  isLightMode?: boolean;
  activeSkin?: string;
  satelliteName?: string;
  armorModel?: string;
  operatorName?: string;
  locale?: string;
  sttProvider?: string;
  ttsProvider?: string;
  byokKey?: string;
  byokModel?: string;
  byokEndpoint?: string;
  byokProtocol?: string;
  byokTemplate?: string;
  byokResponsePath?: string;
  systemPrompt?: string;
  activeCli?: string;
  elevenLabsKey?: string;
  alwaysOnTop?: boolean;
  launchOnStartup?: boolean;
  gatewayRoutingModel?: 'auto' | 'haiku' | 'sonnet';
  activeLoopNode?: 'experience' | 'curation' | 'skills' | 'gepa';
  cliPackageMap?: Record<string, string>;
  // Provider API keys managed via UI (encrypted in database.enc)
  openrouterKey?: string;  // OpenRouter — used as primary LLM gateway
  openaiKey?: string;      // OpenAI — used for Whisper STT
  geminiKey?: string;      // Google Gemini — backup LLM + Gemini STT
  cliMappings?: CliMapping[]; // Dynamic CLI definitions
  lastSqliteVacuumAt?: number | null;
}

export interface DbMcpWebhook {
  id: string;
  name: string;
  url: string;
  active: boolean;
}

export interface DbMcpRoutine {
  id: string;
  name: string;
  prompt: string;
  // Optional: when set, the routine targets a specific connected MCP server
  targetServer?: string;
}

interface DatabaseSchema {
  messages: DbMessage[];
  skills: DbSkill[];
  costLogs: DbCostLog[];
  tasks: DbTask[];
  archivedTasks?: DbTask[];
  cognitiveMemories: string[];
  settings?: DbSettings;
  mcpWebhooks?: DbMcpWebhook[];
  mcpRoutines?: DbMcpRoutine[];
}

const DB_FILE = path.join(process.cwd(), 'database.enc');

const INITIAL_SKILLS: DbSkill[] = [];

class ServerPersistenceEngine {
  private cache: DatabaseSchema = { messages: [], skills: [], costLogs: [], tasks: [], cognitiveMemories: [] };
  private ftsDb: any;
  private systemLogs: SystemLogEntry[] = [];
  private dataListeners: (() => void)[] = [];
  private dbFlushCount = 0;

  onDataChanged(cb: () => void) {
    this.dataListeners.push(cb);
  }

  constructor() {
    this.ftsDb = new Database('jarvis_fts.sqlite');
    this.initFTS();
    this.initDb();
  }

  private initFTS() {
    this.ftsDb.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS fts_docs USING fts5(
        type, title, excerpt, content, tokenize='porter'
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS fts_tasks USING fts5(
        id, description, status, priority, tokenize='porter'
      );
    `);
  }

  private syncFTS() {
    try {
      this.ftsDb.exec('BEGIN TRANSACTION;');
      this.ftsDb.exec('DELETE FROM fts_docs;');
      this.ftsDb.exec('DELETE FROM fts_tasks;');

      const insertDoc = this.ftsDb.prepare('INSERT INTO fts_docs (type, title, excerpt, content) VALUES (?, ?, ?, ?)');
      this.cache.messages.forEach(msg => {
        if (msg.role !== 'system') {
          const timeStr = new Date(msg.timestamp).toLocaleTimeString();
          insertDoc.run('message', `Server Turn Memory [${msg.role.toUpperCase()} @ ${timeStr}]`, msg.content.substring(0, 147) + (msg.content.length > 147 ? '...' : ''), msg.content);
        }
      });
      this.cache.skills.forEach(skill => {
        insertDoc.run('skill', `Server Skill Module: ${skill.name} (${skill.version})`, skill.description, `${skill.name} ${skill.description} ${skill.yamlContent || ''}`);
      });
      (this.cache.cognitiveMemories || []).forEach((mem, index) => {
        insertDoc.run('message', `Cognitive Memory Directive [Slot ${index + 1}]`, mem.substring(0, 147) + (mem.length > 147 ? '...' : ''), mem);
      });

      const insertTask = this.ftsDb.prepare('INSERT INTO fts_tasks (id, description, status, priority) VALUES (?, ?, ?, ?)');
      this.cache.tasks.forEach(task => {
        insertTask.run(task.id, task.description, task.status, task.priority);
      });

      this.ftsDb.exec('COMMIT;');
    } catch (e) {
      if (this.ftsDb.inTransaction) this.ftsDb.exec('ROLLBACK;');
      console.error("FTS sync error", e);
    }
  }

  addSystemLog(category: SystemLogEntry['category'], level: SystemLogEntry['level'], message: string) {
    const timestamp = Date.now();
    this.systemLogs.push({ timestamp, category, level, message });
    console.log(`[${new Date(timestamp).toISOString()}] [${category}/${level}] ${message}`);
    if (this.systemLogs.length > 50) {
      this.systemLogs.shift();
    }
  }

  getSystemLogs(): SystemLogEntry[] {
    return this.systemLogs;
  }

  private initDb() {
    const initialCostLogs: DbCostLog[] = [];

    const INITIAL_COGNITIVE_MEMORIES: string[] = [];

    // Migrate legacy plaintext database.json → encrypted database.enc
    const legacyFile = path.join(process.cwd(), 'database.json');
    if (fs.existsSync(legacyFile) && !fs.existsSync(DB_FILE)) {
      try {
        const legacy = fs.readFileSync(legacyFile, 'utf8').trim();
        if (legacy) {
          const parsed = JSON.parse(legacy);
          this.cache = parsed;
          this.saveDb(); // write encrypted version
          fs.renameSync(legacyFile, legacyFile + '.migrated');
          console.log('[DB] Migrated database.json → database.enc (AES-256-GCM)');
        }
      } catch (e) {
        console.warn('[DB] Legacy migration failed, starting fresh:', e);
      }
    }

    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE);
        let decrypted: string;
        try {
          decrypted = decryptData(raw);
        } catch {
          // Fallback: file might still be plain JSON (edge case)
          decrypted = raw.toString('utf8');
        }
        if (decrypted.trim()) {
          this.cache = JSON.parse(decrypted);
        } else {
          this.cache = {
            messages: [],
            skills: INITIAL_SKILLS,
            costLogs: initialCostLogs,
            tasks: [],
            archivedTasks: [],
            cognitiveMemories: INITIAL_COGNITIVE_MEMORIES
          };
          this.saveDb();
        }
        // Sync skills if empty
        if (!this.cache.skills || this.cache.skills.length === 0) {
          this.cache.skills = INITIAL_SKILLS;
          this.saveDb();
        }
        if (!this.cache.tasks) {
          this.cache.tasks = [];
          this.saveDb();
        }
        if (!this.cache.archivedTasks) {
          this.cache.archivedTasks = [];
          this.saveDb();
        }
        if (!this.cache.costLogs || this.cache.costLogs.length === 0) {
          this.cache.costLogs = initialCostLogs;
          this.saveDb();
        }
        if (!this.cache.cognitiveMemories || this.cache.cognitiveMemories.length === 0) {
          this.cache.cognitiveMemories = INITIAL_COGNITIVE_MEMORIES;
          this.saveDb();
        }
      } else {
        this.cache = {
          messages: [],
          skills: INITIAL_SKILLS,
          costLogs: initialCostLogs,
          tasks: [],
          archivedTasks: [],
          cognitiveMemories: INITIAL_COGNITIVE_MEMORIES
        };
        this.saveDb();
      }
      this.addSystemLog('SYS', 'SUCCESS', 'Persistent server DB initialized.');
      this.syncMarkdownFiles();
    } catch (e: any) {
      console.error('Failed to initialize local server database file, resetting database.json', e);
      this.cache = {
        messages: [],
        skills: INITIAL_SKILLS,
        costLogs: initialCostLogs,
        tasks: [],
        archivedTasks: [],
        cognitiveMemories: INITIAL_COGNITIVE_MEMORIES
      };
      this.saveDb();
    }
  }

  private syncMarkdownFiles() {
    try {
      // 1. Generate USER.md content
      const settings = this.getSettings();
      const userMdContent = `# NoseResearch Hermes User Profile

- **Operator Name**: ${settings.operatorName || "Tommy (Admin)"}
- **Shell Execute Mode**: ${settings.shellMode || "auto"}
- **File Write Mode**: ${settings.writeMode || "auto"}
- **Task Orchestration Mode**: ${settings.taskMode || "auto"}
- **Active HUD Interface Skin**: ${settings.activeSkin || "Carbon HUD"}
- **Local SQLite DB Identifier**: ${settings.satelliteName || "LOCAL_SQLITE_DB"}
- **System Memory Core Version**: ${settings.armorModel || "Core v4.5"}
- **Voice Synthesis Profile**: ${settings.voiceProfile || "standard"}
- **Auto-Repair Protocol**: ${settings.autoRepair ? "Enabled" : "Disabled"}
- **Gateway Model Selector**: ${settings.gatewayRoutingModel || "auto"}
- **BYOK Endpoint Status**: ${settings.byokEndpoint ? `Configured (${settings.byokEndpoint})` : "Not Configured / Direct Model Gateway"}

---
*Synchronized automatically from HERMES database settings layer.*
`;

      fs.writeFileSync(path.join(process.cwd(), 'USER.md'), userMdContent, 'utf8');

      // 2. Generate MEMORY.md content
      const memories = this.getCognitiveMemories();
      const memoryLines = memories.map((mem, index) => `${index + 1}. ${mem}`).join('\n');
      const memoryMdContent = `# JARVIS Long-Term Cognitive Memories

Active workspace guidelines, past feedback loops, and preference vectors synchronized back into plain markdown trace profiles:

### Stored Memory Vectors
${memoryLines || "*No cognitive memories stored in active memory bank, sir.*"}

---
*Neural state vector cache updated automatically.*
`;

      fs.writeFileSync(path.join(process.cwd(), 'MEMORY.md'), memoryMdContent, 'utf8');

    } catch (e: any) {
      console.error('Failed to write physical markdown sync files:', e);
    }
  }

  private saveDb() {
    try {
      const plaintext = JSON.stringify(this.cache);
      const cipherBuf = encryptData(plaintext);
      fs.writeFileSync(DB_FILE, cipherBuf);
      this.dbFlushCount++;
      this.syncMarkdownFiles();
      this.syncFTS();
      this.dataListeners.forEach(cb => { try { cb(); } catch(e) {} });
    } catch (e) {
      console.error('Failed to write local database file', e);
    }
  }

  /** Monotonically increasing count of actual disk flushes since process start. */
  getDbFlushCount(): number {
    return this.dbFlushCount;
  }

  purgeCache() {
    // Keep cognitiveMemories and skills, but purge conversations, logs and tasks
    this.cache.messages = [];
    this.cache.costLogs = [];
    this.cache.tasks = [];
    this.cache.archivedTasks = [];
    this.saveDb();
    this.addSystemLog('SYS', 'SUCCESS', 'Persistent memory and temporal logs successfully purged.');
  }

  getSettings(): DbSettings {
    if (!this.cache.settings) {
      this.cache.settings = {
        shellMode: 'safe',
        writeMode: 'manual',
        taskMode: 'manual',
        voiceProfile: 'baritone',
        autoRepair: false,
        gatewayRoutingModel: 'auto',
        activeSkin: 'cyan',
        satelliteName: 'Main Router',
        armorModel: 'Production Build',
        operatorName: 'T. STARK',
        byokKey: '',
        byokModel: 'google/gemini-2.5-flash',
        byokEndpoint: 'https://openrouter.ai/api/v1',
        byokProtocol: 'openrouter',
        byokTemplate: '{\n  "model": "${model}",\n  "messages": "${messages}"\n}',
        byokResponsePath: 'choices[0].message.content',
        systemPrompt: '',
        activeCli: 'openrouter',
        elevenLabsKey: '',
        alwaysOnTop: false,
        launchOnStartup: false,
        lastSqliteVacuumAt: null,
        cliPackageMap: {
          "claude-code": "@anthropic-ai/claude-code",
          "github-cli": "github-cli",
          "cursor-agent": "cursor",
          "devin": "devin",
          "gemini-cli": "gemini-cli",
          "codex-cli": "codex-cli",
          "copilot": "@githubnext/github-copilot-cli",
          "hermes": "javis-hermes"
        }
      };
      this.saveDb();
    } else {
      if (this.cache.settings.activeSkin === undefined) this.cache.settings.activeSkin = 'cyan';
      if (this.cache.settings.satelliteName === undefined) this.cache.settings.satelliteName = 'STARK-SAT-4';
      if (this.cache.settings.armorModel === undefined) this.cache.settings.armorModel = 'Mark LXXXV';
      if (this.cache.settings.operatorName === undefined) this.cache.settings.operatorName = 'T. STARK';
      if (this.cache.settings.byokKey === undefined) this.cache.settings.byokKey = '';
      if (this.cache.settings.byokModel === undefined) this.cache.settings.byokModel = 'google/gemini-2.5-flash';
      if (this.cache.settings.byokEndpoint === undefined) this.cache.settings.byokEndpoint = 'https://openrouter.ai/api/v1';
      if (this.cache.settings.byokProtocol === undefined) this.cache.settings.byokProtocol = 'openrouter';
      if (this.cache.settings.byokTemplate === undefined) this.cache.settings.byokTemplate = '{\n  "model": "${model}",\n  "messages": "${messages}"\n}';
      if (this.cache.settings.byokResponsePath === undefined) this.cache.settings.byokResponsePath = 'choices[0].message.content';
      if (this.cache.settings.systemPrompt === undefined) this.cache.settings.systemPrompt = '';
      if (this.cache.settings.activeCli === undefined) this.cache.settings.activeCli = 'openrouter';
      if (this.cache.settings.elevenLabsKey === undefined) this.cache.settings.elevenLabsKey = '';
      if (this.cache.settings.alwaysOnTop === undefined) this.cache.settings.alwaysOnTop = false;
      if (this.cache.settings.launchOnStartup === undefined) this.cache.settings.launchOnStartup = false;
      if (this.cache.settings.lastSqliteVacuumAt === undefined) this.cache.settings.lastSqliteVacuumAt = null;
      if (this.cache.settings.cliPackageMap === undefined) {
        this.cache.settings.cliPackageMap = {
          "claude-code": "@anthropic-ai/claude-code",
          "github-cli": "github-cli",
          "cursor-agent": "cursor",
          "devin": "devin",
          "gemini-cli": "gemini-cli",
          "codex-cli": "codex-cli",
          "copilot": "@githubnext/github-copilot-cli",
          "hermes": "javis-hermes"
        };
      }
      if (this.cache.settings.cliMappings === undefined) {
        try {
          const mappingPath = path.join(process.cwd(), 'cli-mapping.json');
          if (fs.existsSync(mappingPath)) {
            const fileData = fs.readFileSync(mappingPath, 'utf8');
            this.cache.settings.cliMappings = JSON.parse(fileData);
          } else {
            this.cache.settings.cliMappings = [];
          }
        } catch (e) {
          console.error('[DB] Failed to initialize cliMappings from cli-mapping.json', e);
          this.cache.settings.cliMappings = [];
        }
      }
    }
    
    // Also handle the initial case where cache.settings was just created
    if (this.cache.settings.cliMappings === undefined) {
       try {
          const mappingPath = path.join(process.cwd(), 'cli-mapping.json');
          if (fs.existsSync(mappingPath)) {
            const fileData = fs.readFileSync(mappingPath, 'utf8');
            this.cache.settings.cliMappings = JSON.parse(fileData);
          } else {
            this.cache.settings.cliMappings = [];
          }
        } catch (e) {
          console.error('[DB] Failed to initialize cliMappings from cli-mapping.json', e);
          this.cache.settings.cliMappings = [];
        }
    }
    
    return this.cache.settings;
  }

  updateSettings(newSettings: Partial<DbSettings>) {
    const current = this.getSettings();
    this.cache.settings = { ...current, ...newSettings };
    this.saveDb();
    this.addSystemLog('SYS', 'SUCCESS', `System configurables updated via manual override.`);
  }

  getCliMappings(): CliMapping[] {
    return this.getSettings().cliMappings || [];
  }

  updateCliMappings(mappings: CliMapping[]) {
    const current = this.getSettings();
    this.cache.settings = { ...current, cliMappings: mappings };
    this.saveDb();
    this.addSystemLog('SYS', 'SUCCESS', `CLI Mappings updated via UI.`);
  }

  // --- Messages API ---
  addMessage(msg: DbMessage) {
    this.cache.messages.push(msg);
    this.saveDb();
  }

  getMessages(sessionId: string): DbMessage[] {
    return this.cache.messages
      .filter(m => m.sessionId === sessionId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  getAllMessages(): DbMessage[] {
    return this.cache.messages;
  }

  // --- Skills API ---
  getSkills(): DbSkill[] {
    return this.cache.skills || [];
  }

  addOrUpdateSkill(skill: DbSkill) {
    const idx = this.cache.skills.findIndex(s => s.id === skill.id);
    if (idx !== -1) {
      this.cache.skills[idx] = skill;
    } else {
      this.cache.skills.push(skill);
    }
    this.saveDb();
  }

  // --- Cost Logs API ---
  addCostLog(log: DbCostLog) {
    this.cache.costLogs.push(log);
    this.saveDb();
  }

  getCostLogs(): DbCostLog[] {
    return this.cache.costLogs || [];
  }

  resetBudget() {
    this.cache.costLogs = [];
    // Reset message costs in history too
    this.cache.messages.forEach(m => {
      m.costUsd = 0;
      m.inputTokens = 0;
      m.outputTokens = 0;
      m.cachedTokens = 0;
    });
    this.saveDb();
    this.addSystemLog('SEC', 'SUCCESS', 'Budget consumption ledger reset completed.');
  }

  // --- Tasks API ---
  addTask(task: DbTask) {
    if (task.progress === undefined) {
      task.progress = 0;
    }
    this.cache.tasks.push(task);
    this.saveDb();
  }

  getTasks(): DbTask[] {
    return this.cache.tasks || [];
  }

  getTask(id: string): DbTask | undefined {
    return (this.cache.tasks || []).find(task => task.id === id);
  }

  getSqliteHealth() {
    const databasePath = path.join(process.cwd(), 'jarvis_fts.sqlite');

    try {
      const pageCount = Number(this.ftsDb.prepare('PRAGMA page_count').pluck().get() || 0);
      const pageSize = Number(this.ftsDb.prepare('PRAGMA page_size').pluck().get() || 0);
      const integrityRaw = String(this.ftsDb.prepare('PRAGMA integrity_check').pluck().get() || 'unknown');

      return {
        databasePath,
        fileSizeBytes: fs.existsSync(databasePath) ? fs.statSync(databasePath).size : 0,
        connectionOk: true,
        integrity: integrityRaw === 'ok' ? 'ok' as const : 'corrupt' as const,
        lastVacuumAt: this.getSettings().lastSqliteVacuumAt || null,
        pageCount,
        pageSize,
      };
    } catch (error) {
      console.error('Failed to inspect SQLite health', error);

      return {
        databasePath,
        fileSizeBytes: fs.existsSync(databasePath) ? fs.statSync(databasePath).size : 0,
        connectionOk: false,
        integrity: 'unknown' as const,
        lastVacuumAt: this.getSettings().lastSqliteVacuumAt || null,
        pageCount: 0,
        pageSize: 0,
      };
    }
  }

  recordSqliteVacuum(timestamp = Date.now()) {
    this.ftsDb.exec('VACUUM');
    this.updateSettings({ lastSqliteVacuumAt: timestamp });
    this.addSystemLog('DB', 'SUCCESS', `SQLite maintenance vacuum completed at ${new Date(timestamp).toISOString()}.`);
  }

  // --- Overdrive Deep Indexing API ---
  addDeepIndex(title: string, content: string) {
    try {
      if (!this.ftsDb) return;
      const insertDoc = this.ftsDb.prepare('INSERT INTO fts_docs (type, title, excerpt, content) VALUES (?, ?, ?, ?)');
      insertDoc.run('skill', title, content.substring(0, 100), content);
    } catch(e) {
      console.error("Deep index FTS insertion failed", e);
    }
  }

  // --- Backend FTS5 Matching for Tasks ---
  searchTasks(queryText: string): DbTask[] {
    if (!queryText.trim()) return this.getTasks();

    const terms = queryText.trim().replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s]/g, ' ').split(/\s+/).filter(Boolean);
    if (terms.length === 0) return this.getTasks();

    const ftsQuery = terms.map(t => `${t}*`).join(' OR ');
    
    try {
      const stmt = this.ftsDb.prepare(`
        SELECT id FROM fts_tasks 
        WHERE fts_tasks MATCH ? 
        ORDER BY bm25(fts_tasks)
      `);
      const results = stmt.all(ftsQuery) as { id: string }[];
      
      const matchedIds = new Set(results.map(r => r.id));
      return this.cache.tasks.filter(t => matchedIds.has(t.id));
    } catch (e) {
      console.error("FTS Task Search failed", e);
      return this.getTasks();
    }
  }

  updateTaskStatus(id: string, status: DbTask['status']) {
    const task = this.cache.tasks.find(t => t.id === id);
    if (task) {
      task.status = status;
      if (status === 'Completed') {
        task.progress = 100;
        task.completedAt = Date.now();
      } else {
        delete task.completedAt;
      }
      this.saveDb();
    }
  }

  updateTask(id: string, updates: Partial<DbTask>) {
    const task = this.cache.tasks.find(t => t.id === id);
    if (task) {
      Object.assign(task, updates);
      if (updates.progress !== undefined) {
        if (updates.progress === 100) {
          task.status = 'Completed';
          task.completedAt = task.completedAt || Date.now();
        } else if (updates.progress < 100 && task.status === 'Completed') {
          task.status = 'Pending';
          delete task.completedAt;
        }
      } else if (updates.status !== undefined) {
        if (updates.status === 'Completed') {
          task.progress = 100;
          task.completedAt = task.completedAt || Date.now();
        } else {
          delete task.completedAt;
        }
      }
      this.saveDb();
    }
  }

  deleteTask(id: string) {
    this.cache.tasks = (this.cache.tasks || []).filter(t => t.id !== id);
    if (this.cache.archivedTasks) {
      this.cache.archivedTasks = this.cache.archivedTasks.filter(t => t.id !== id);
    }
    this.saveDb();
  }

  archiveTask(id: string) {
    const task = this.cache.tasks.find(t => t.id === id);
    if (task) {
      if (!this.cache.archivedTasks) {
        this.cache.archivedTasks = [];
      }
      // Check for duplicates before pushing
      if (!this.cache.archivedTasks.some(t => t.id === id)) {
        this.cache.archivedTasks.push({
          ...task,
          completedAt: task.completedAt || Date.now()
        });
      }
      this.cache.tasks = this.cache.tasks.filter(t => t.id !== id);
      this.saveDb();
      this.addSystemLog('DB', 'SUCCESS', `Archived task: "${task.description.substring(0, 35)}..."`);
    }
  }

  getArchivedTasks(): DbTask[] {
    return this.cache.archivedTasks || [];
  }

  // --- Backend FTS5 Matching Search ---
  queryFTS(queryText: string): FtsSearchResult[] {
    if (!queryText.trim()) return [];

    try {
      const terms = queryText.trim()
        .replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

      if (terms.length === 0) return [];

      // FTS5 OR search with suffix wildcard *
      const ftsQuery = terms.map(t => `${t}*`).join(' OR ');

      // Query persistent SQLite FTS5 with standard bm25 ranking helper built-in
      const queryStmt = this.ftsDb.prepare(`
        SELECT type, title, excerpt, content, bm25(fts_docs) AS fts_score
        FROM fts_docs
        WHERE fts_docs MATCH ?
        ORDER BY fts_score ASC
        LIMIT 5;
      `);

      const sqlResults = queryStmt.all(ftsQuery) as Array<{
        type: 'message' | 'skill';
        title: string;
        excerpt: string;
        content: string;
        fts_score: number;
      }>;

      // Transform raw SQLite rows back into normalized JSON structure
      const results = sqlResults.map(r => {
        const score = Number((r.fts_score || 0).toFixed(2));

        return {
          type: r.type,
          title: r.title,
          excerpt: r.excerpt,
          score,
          scoreKind: 'sqlite-bm25' as const,
          scoreLabel: formatFtsScoreLabel(score, 'sqlite-bm25')
        };
      });

      return results;
    } catch (sqlErr) {
      console.error("Native FTS5 Virtual Index failure, falling back to JS index:", sqlErr);
      return this.fallbackQueryFTS(queryText);
    }
  }

  // --- Fallback memory-based FTS matching ---
  fallbackQueryFTS(queryText: string): FtsSearchResult[] {
    if (!queryText.trim()) return [];

    const terms = queryText.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(t => t.length > 1);
    if (terms.length === 0) return [];

    interface FtsDocument {
      type: 'message' | 'skill';
      title: string;
      excerpt: string;
      text: string;
      tokens: string[];
      docLength: number;
    }

    const documents: FtsDocument[] = [];

    // 1. Collect Messages
    this.cache.messages.forEach(msg => {
      if (msg.role === 'system') return;
      const text = msg.content;
      const tokens = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
      const timeStr = new Date(msg.timestamp).toLocaleTimeString();
      documents.push({
        type: 'message',
        title: `Server Turn Memory [${msg.role.toUpperCase()} @ ${timeStr}]`,
        excerpt: msg.content.length > 150 ? msg.content.substring(0, 147) + '...' : msg.content,
        text,
        tokens,
        docLength: tokens.length
      });
    });

    // 2. Collect Skills
    this.cache.skills.forEach(skill => {
      const text = `${skill.name} ${skill.description} ${skill.yamlContent || ''}`;
      const tokens = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
      documents.push({
        type: 'skill',
        title: `Server Skill Module: ${skill.name} (${skill.version})`,
        excerpt: skill.description,
        text,
        tokens,
        docLength: tokens.length
      });
    });

    // 3. Collect Cognitive Memories
    (this.cache.cognitiveMemories || []).forEach((mem, index) => {
      const text = mem;
      const tokens = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
      documents.push({
        type: 'message',
        title: `Cognitive Memory Directive [Slot ${index + 1}]`,
        excerpt: mem.length > 150 ? mem.substring(0, 147) + '...' : mem,
        text,
        tokens,
        docLength: tokens.length
      });
    });

    // 4. Collect Workspace Physical Uploaded Files
    const uploadsDir = path.resolve(process.cwd(), "uploads");
    if (fs.existsSync(uploadsDir)) {
      try {
        const files = fs.readdirSync(uploadsDir);
        files.forEach(file => {
          const filePath = path.join(uploadsDir, file);
          if (fs.statSync(filePath).isDirectory()) return;
          try {
            const content = fs.readFileSync(filePath, "utf8");
            const paragraphs = content
              .split(/\n\s*\n+/)
              .map(p => p.trim())
              .filter(p => p.length > 10);
              
            paragraphs.forEach((p, chunkIdx) => {
              const tokens = p.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
              documents.push({
                type: 'message',
                title: `📂 Workspace Doc: ${file} [Sec ${chunkIdx + 1}]`,
                excerpt: p.length > 150 ? p.substring(0, 147) + '...' : p,
                text: p,
                tokens,
                docLength: tokens.length
              });
            });
          } catch (fileErr) {
            console.error(`Error reading ${file} for queryFTS system:`, fileErr);
          }
        });
      } catch (dirErr) {
        console.error("Error indexing uploads directory for queryFTS system:", dirErr);
      }
    }

    const N = documents.length;
    if (N === 0) return [];

    // Compute Document Frequency (df) for each term
    const docFrequency: Record<string, number> = {};
    terms.forEach(term => {
      let count = 0;
      documents.forEach(doc => {
        if (doc.tokens.some(token => token.includes(term))) {
          count++;
        }
      });
      docFrequency[term] = count;
    });

    // Compute Inverse Document Frequency (IDF) for each term
    const IDF: Record<string, number> = {};
    let sumIDFs = 0;
    terms.forEach(term => {
      const df = docFrequency[term] || 0;
      const idf = Math.max(0.0001, Math.log((N - df + 0.5) / (df + 0.5) + 1));
      IDF[term] = idf;
      sumIDFs += idf;
    });

    // Compute Average Document Length
    const totalLength = documents.reduce((sum, doc) => sum + doc.docLength, 0);
    const avgdl = totalLength / N || 1;

    // BM25 Tuning parameters
    const k1 = 1.5;
    const b = 0.75;

    const results: Array<FtsSearchResult & { rawScore: number }> = [];

    // Score all documents using standard Okapi BM25 matching
    documents.forEach(doc => {
      let score = 0;
      let matchedTermsCount = 0;

      terms.forEach(term => {
        let tf = 0;
        doc.tokens.forEach(token => {
          if (token === term) {
            tf += 1.0;
          } else if (token.includes(term)) {
            tf += 0.3;
          }
        });

        if (tf > 0) {
          matchedTermsCount++;
          const idf = IDF[term] || 0.0001;
          const numerator = tf * (k1 + 1);
          const denominator = tf + k1 * (1 - b + b * (doc.docLength / avgdl));
          score += idf * (numerator / denominator);
        }
      });

      if (score > 0) {
        const matchRatio = matchedTermsCount / terms.length;
        let priorityBoost = 1.0;
        if (doc.title.includes("Cognitive Memory")) {
          priorityBoost = 1.15;
        } else if (doc.title.includes("Server Skill Module")) {
          priorityBoost = 1.05;
        } else if (doc.title.includes("Workspace Doc")) {
          priorityBoost = 1.10;
        }

        const maxPossibleBM25 = (k1 + 1) * sumIDFs;
        const normalizedScore = maxPossibleBM25 > 0 ? (score / maxPossibleBM25) : 0;
        const blendedScore = normalizedScore * 0.7 + matchRatio * 0.3;
        const weightedScore = Number((score * priorityBoost * Math.max(0.5, blendedScore)).toFixed(2));

        results.push({
          type: doc.type,
          title: doc.title,
          excerpt: doc.excerpt,
          score: weightedScore,
          scoreKind: 'fallback-bm25',
          scoreLabel: formatFtsScoreLabel(weightedScore, 'fallback-bm25'),
          rawScore: score * priorityBoost
        });
      }
    });

    return results
      .sort((a, b) => b.rawScore - a.rawScore)
      .slice(0, 5)
      .map(({ type, title, excerpt, score, scoreKind, scoreLabel }) => ({
        type,
        title,
        excerpt,
        score,
        scoreKind,
        scoreLabel
      }));
  }


  // --- Dynamic Pricing Calculator with Caching Discounts ---
  calculateAPICost(model: string, inputTokens: number, outputTokens: number, cachedTokens: number = 0): number {
    const modelLower = model.toLowerCase();
    const nonCachedTokens = Math.max(0, inputTokens - cachedTokens);
    
    let inputPrice = 0.00000005; // extremely cheap default/free
    let cachedPrice = 0.00000001;
    let outputPrice = 0.00000015;
    
    if (modelLower.includes('gemini-1.5-pro') || modelLower.includes('gemini-2.5-pro')) {
      inputPrice = 0.00000125;
      cachedPrice = 0.0000003125; // 75% off
      outputPrice = 0.000005;
    } else if (modelLower.includes('gemini-1.5-flash') || modelLower.includes('gemini-2.5-flash')) {
      inputPrice = 0.000000075;
      cachedPrice = 0.00000001875;
      outputPrice = 0.0000003;
    } else if (modelLower.includes('gpt-4o-mini')) {
      inputPrice = 0.00000015;
      cachedPrice = 0.000000075;
      outputPrice = 0.0000006;
    } else if (modelLower.includes('sonnet')) {
      inputPrice = 0.000003;
      cachedPrice = 0.0000003; // Anthropic prompt cache read is 10% of base input cost
      outputPrice = 0.000015;
    } else if (modelLower.includes('haiku')) {
      inputPrice = 0.0000008;
      cachedPrice = 0.00000008; // 90% off
      outputPrice = 0.000004;
    } else if (modelLower.includes('llama-3.3-70b')) {
      inputPrice = 0.0000007;
      cachedPrice = 0.00000007;
      outputPrice = 0.0000009;
    }
    
    const cost = (nonCachedTokens * inputPrice) + (cachedTokens * cachedPrice) + (outputTokens * outputPrice);
    return Number(cost.toFixed(8));
  }

  // --- Cognitive Memory Bank API ---
  getCognitiveMemories(): string[] {
    return this.cache.cognitiveMemories || [];
  }

  addCognitiveMemory(memory: string) {
    if (!this.cache.cognitiveMemories) {
      this.cache.cognitiveMemories = [];
    }
    this.cache.cognitiveMemories.push(memory);
    this.saveDb();
    this.addSystemLog('DB', 'SUCCESS', `Stored new cognitive fragment in memory bank: "${memory.substring(0, 32)}..."`);
  }

  clearCognitiveMemories() {
    this.cache.cognitiveMemories = [];
    this.saveDb();
    this.addSystemLog('DB', 'WARN', `Purged entire cognitive memory bank.`);
  }

  deleteCognitiveMemory(index: number) {
    if (this.cache.cognitiveMemories && this.cache.cognitiveMemories[index] !== undefined) {
      const purged = this.cache.cognitiveMemories[index];
      this.cache.cognitiveMemories.splice(index, 1);
      this.saveDb();
      this.addSystemLog('DB', 'WARN', `Purged cognitive fragment from memory bank: "${purged.substring(0, 32)}..."`);
    }
  }

  // --- External MCP Webhooks API ---
  getMcpWebhooks(): DbMcpWebhook[] {
    return this.cache.mcpWebhooks || [];
  }

  addMcpWebhook(webhook: DbMcpWebhook) {
    if (!this.cache.mcpWebhooks) this.cache.mcpWebhooks = [];
    this.cache.mcpWebhooks.push(webhook);
    this.saveDb();
    this.addSystemLog('SYS', 'SUCCESS', `Added new MCP Webhook connector: ${webhook.name}.`);
  }

  deleteMcpWebhook(id: string) {
    if (this.cache.mcpWebhooks) {
      this.cache.mcpWebhooks = this.cache.mcpWebhooks.filter(w => w.id !== id);
      this.saveDb();
      this.addSystemLog('SYS', 'WARN', `Deleted MCP Webhook connector.`);
    }
  }

  toggleMcpWebhookFocus(id: string, active: boolean) {
    if (this.cache.mcpWebhooks) {
      const w = this.cache.mcpWebhooks.find(w => w.id === id);
      if (w) {
        w.active = active;
        this.saveDb();
        this.addSystemLog('SYS', 'INFO', `MCP Webhook state changed to ${active ? 'ACTIVE' : 'INACTIVE'}.`);
      }
    }
  }

  // --- MCP Routines API ---
  getMcpRoutines(): DbMcpRoutine[] {
    return this.cache.mcpRoutines || [];
  }

  addMcpRoutine(routine: DbMcpRoutine) {
    if (!this.cache.mcpRoutines) this.cache.mcpRoutines = [];
    this.cache.mcpRoutines.push(routine);
    this.saveDb();
    this.addSystemLog('SYS', 'SUCCESS', `Added new MCP Routine sequence: ${routine.name}.`);
  }

  deleteMcpRoutine(id: string) {
    if (this.cache.mcpRoutines) {
      this.cache.mcpRoutines = this.cache.mcpRoutines.filter(r => r.id !== id);
      this.saveDb();
      this.addSystemLog('SYS', 'WARN', `Deleted MCP Routine sequence.`);
    }
  }
}

export const serverDB = new ServerPersistenceEngine();
