import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

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

export interface DbSettings {
  shellMode: 'manual' | 'safe' | 'auto';
  writeMode: 'manual' | 'auto';
  taskMode: 'manual' | 'auto';
  voiceProfile: 'baritone' | 'fast' | 'standard';
  autoRepair: boolean;
  activeSkin?: string;
  satelliteName?: string;
  armorModel?: string;
  operatorName?: string;
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

const DB_FILE = path.join(process.cwd(), 'database.json');

const INITIAL_SKILLS: DbSkill[] = [
  { 
    id: 'sqlite-fts-indexer', 
    name: 'sqlite-fts-indexer', 
    version: 'v1.0', 
    status: 'active', 
    description: 'Builds and queries fast SQLite FTS5 index matrices.',
    yamlContent: '---\nname: sqlite-fts-indexer\ndescription: Core full-text indexing engine workflows.\nversion: 1.0\n---'
  },
  { 
    id: 'task-pipeline-manager', 
    name: 'task-pipeline-manager', 
    version: 'v1.2', 
    status: 'active', 
    description: 'Coordinates pending cognitive pipelines, tracking progress and status histories.',
    yamlContent: '---\nname: task-pipeline-manager\ndescription: Workflows for scheduling and evaluating multi-step tasks.\nversion: 1.2\n---'
  },
  { 
    id: 'workspace-file-writer', 
    name: 'workspace-file-writer', 
    version: 'v2.1', 
    status: 'active', 
    description: 'Reviews filesystem permission targets and applies structured file writes safely.',
    yamlContent: '---\nname: workspace-file-writer\ndescription: System writes and patch application with security guardrails.\nversion: 2.1\n---'
  },
  { 
    id: 'router-cost-estimator', 
    name: 'router-cost-estimator', 
    version: 'v1.5', 
    status: 'active', 
    description: 'Tracks language model token spend rates and prompts routing decisions dynamically.',
    yamlContent: '---\nname: router-cost-estimator\ndescription: Token and budget allocation workflows for API integrations.\nversion: 1.5\n---'
  }
];

class ServerPersistenceEngine {
  private cache: DatabaseSchema = { messages: [], skills: [], costLogs: [], tasks: [], cognitiveMemories: [] };
  private ftsDb: any;
  private systemLogs: SystemLogEntry[] = [
    { timestamp: Date.now() - 5000, category: 'SYS', level: 'INFO', message: 'JARVIS online.' },
    { timestamp: Date.now() - 4000, category: 'SYS', level: 'SUCCESS', message: 'System diagnostics initialized.' },
    { timestamp: Date.now() - 3000, category: 'SYS', level: 'INFO', message: 'Initializing core protocols...' },
    { timestamp: Date.now() - 2000, category: 'DB', level: 'SUCCESS', message: 'state.db mapped via FTS5 indexers.' },
    { timestamp: Date.now() - 1000, category: 'NET', level: 'INFO', message: 'VoIP satellite bridge listening.' }
  ];

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
    const initialCostLogs: DbCostLog[] = [
      {
        id: 'tx-init-01',
        timestamp: Date.now() - 3600000 * 2,
        model: 'anthropic/claude-3-5-haiku-latest',
        taskType: 'fts_query',
        costUsd: 0.00086,
        inputTokens: 1200,
        outputTokens: 120,
        cachedTokens: 960
      },
      {
        id: 'tx-init-02',
        timestamp: Date.now() - 3600000 * 1,
        model: 'anthropic/claude-3-5-sonnet-latest',
        taskType: 'prompt_evolution',
        costUsd: 0.01245,
        inputTokens: 8400,
        outputTokens: 480,
        cachedTokens: 7200
      }
    ];

    const INITIAL_COGNITIVE_MEMORIES = [
      "User prefers lightweight UI themes with clean developer metrics.",
      "Local system manages shell task execution safely based on permission filters.",
      "Task manager utilizes automatic file writing pipelines for reporting.",
      "Cost estimations are indexed continuously to preserve API budgets."
    ];

    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8').trim();
        if (raw) {
          this.cache = JSON.parse(raw);
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
      fs.writeFileSync(DB_FILE, JSON.stringify(this.cache, null, 2), 'utf8');
      this.syncMarkdownFiles();
      this.syncFTS();
    } catch (e) {
      console.error('Failed to write local database file', e);
    }
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
        satelliteName: 'STARK-SAT-4',
        armorModel: 'Mark LXXXV',
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
        launchOnStartup: false
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
    }
    return this.cache.settings;
  }

  updateSettings(newSettings: Partial<DbSettings>) {
    const current = this.getSettings();
    this.cache.settings = { ...current, ...newSettings };
    this.saveDb();
    this.addSystemLog('SYS', 'SUCCESS', `System configurables updated via manual override.`);
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
  queryFTS(queryText: string): Array<{ type: 'message' | 'skill'; title: string; excerpt: string; confidence: number }> {
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
        // BM25 in SQLite natively returns large negative numbers (more negative = better match)
        // Normalize into a 0.0 - 1.0 confidence score simply
        const absScore = Math.abs(r.fts_score || 0);
        const confidence = Math.min(0.99, Math.max(0.1, 1 - (absScore / 20)));
        
        return {
          type: r.type,
          title: r.title,
          excerpt: r.excerpt,
          confidence: parseFloat(confidence.toFixed(2))
        };
      });

      return results;
    } catch (sqlErr) {
      console.error("Native FTS5 Virtual Index failure, falling back to JS index:", sqlErr);
      return this.fallbackQueryFTS(queryText);
    }
  }

  // --- Fallback memory-based FTS matching ---
  fallbackQueryFTS(queryText: string): Array<{ type: 'message' | 'skill'; title: string; excerpt: string; confidence: number }> {
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

    const results: Array<{ type: 'message' | 'skill'; title: string; excerpt: string; confidence: number; rawScore: number }> = [];

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

        const confidenceVal = Math.min(99, Math.max(40, Math.round((0.42 + blendedScore * 0.55 * priorityBoost) * 100)));

        results.push({
          type: doc.type,
          title: doc.title,
          excerpt: doc.excerpt,
          confidence: confidenceVal,
          rawScore: score * priorityBoost
        });
      }
    });

    return results
      .sort((a, b) => b.rawScore - a.rawScore)
      .slice(0, 5)
      .map(({ type, title, excerpt, confidence }) => ({ type, title, excerpt, confidence }));
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
