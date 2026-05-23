import fs from 'fs';
import path from 'path';

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
}

export interface SystemLogEntry {
  timestamp: number;
  category: 'SYS' | 'HERMES' | 'DB' | 'NET' | 'API' | 'VOIP' | 'EXEC' | 'SEC';
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
}

interface DatabaseSchema {
  messages: DbMessage[];
  skills: DbSkill[];
  costLogs: DbCostLog[];
  tasks: DbTask[];
  cognitiveMemories: string[];
}

const DB_FILE = path.join(process.cwd(), 'database.json');

const INITIAL_SKILLS: DbSkill[] = [
  { 
    id: 'github-pr-reviewer', 
    name: 'github-pr-reviewer', 
    version: 'v2.4', 
    status: 'active', 
    description: 'Review git diffs, compile projects, and run testing checks.',
    yamlContent: '---\nname: github-pr-reviewer\ndescription: Core git PR compiler and review workflow.\nversion: 2.4\n---'
  },
  { 
    id: 'mlops-orchestrator', 
    name: 'mlops-orchestrator', 
    version: 'v1.1', 
    status: 'active', 
    description: 'Deploy serverless modal jobs, optimize weights, and track pipelines.',
    yamlContent: '---\nname: mlops-orchestrator\ndescription: Modal serverless MLOps deployment pipeline.\nversion: 1.1\n---'
  },
  { 
    id: 'code-refactorer', 
    name: 'code-refactorer', 
    version: 'v4.2', 
    status: 'active', 
    description: 'Inspect complexity, run AST checks, and rewrite non-adjacent lines.',
    yamlContent: '---\nname: code-refactorer\ndescription: AST-aware deep code refactoring rules.\nversion: 4.2\n---'
  },
  { 
    id: 'cost-aware-router', 
    name: 'cost-aware-router', 
    version: 'v3.0', 
    status: 'active', 
    description: 'Analyze token counts, check budget limits, and route to Haiku/Sonnet.',
    yamlContent: '---\nname: cost-aware-router\ndescription: Model routing and prompt caching optimizations.\nversion: 3.0\n---'
  }
];

class ServerPersistenceEngine {
  private cache: DatabaseSchema = { messages: [], skills: [], costLogs: [], tasks: [], cognitiveMemories: [] };
  private systemLogs: SystemLogEntry[] = [
    { timestamp: Date.now() - 5000, category: 'SYS', level: 'INFO', message: 'JARVIS online.' },
    { timestamp: Date.now() - 4000, category: 'SYS', level: 'SUCCESS', message: 'System diagnostics initialized.' },
    { timestamp: Date.now() - 3000, category: 'SYS', level: 'INFO', message: 'Initializing core protocols...' },
    { timestamp: Date.now() - 2000, category: 'DB', level: 'SUCCESS', message: 'state.db mapped via FTS5 indexers.' },
    { timestamp: Date.now() - 1000, category: 'NET', level: 'INFO', message: 'VoIP satellite bridge listening.' }
  ];

  constructor() {
    this.initDb();
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
    try {
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
        "User prefer voice speed matrix set to British Baritone cadence.",
        "Local host operates powershell Start-Process hooks bypassing safe confirmation.",
        "Stark Industries home assistant terminal core version initialized perfectly.",
        "OpenRouter bypass keys stored locally for cognitive inference routines."
      ];

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.cache = JSON.parse(raw);
        // Sync skills if empty
        if (!this.cache.skills || this.cache.skills.length === 0) {
          this.cache.skills = INITIAL_SKILLS;
          this.saveDb();
        }
        if (!this.cache.tasks) {
          this.cache.tasks = [];
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
          cognitiveMemories: INITIAL_COGNITIVE_MEMORIES
        };
        this.saveDb();
      }
      this.addSystemLog('SYS', 'SUCCESS', 'Persistent server DB initialized.');
    } catch (e: any) {
      console.error('Failed to initialize local server database file', e);
      this.cache = { messages: [], skills: INITIAL_SKILLS, costLogs: [], tasks: [], cognitiveMemories: [] };
    }
  }

  private saveDb() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.cache, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to write local database file', e);
    }
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

  updateTaskStatus(id: string, status: DbTask['status']) {
    const task = this.cache.tasks.find(t => t.id === id);
    if (task) {
      task.status = status;
      if (status === 'Completed') {
        task.progress = 100;
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
        } else if (updates.progress < 100 && task.status === 'Completed') {
          task.status = 'Pending';
        }
      }
      this.saveDb();
    }
  }

  deleteTask(id: string) {
    this.cache.tasks = (this.cache.tasks || []).filter(t => t.id !== id);
    this.saveDb();
  }

  // --- Backend FTS5 Matching Search ---
  queryFTS(queryText: string): Array<{ type: 'message' | 'skill'; title: string; excerpt: string; confidence: number }> {
    if (!queryText.trim()) return [];

    const terms = queryText.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(t => t.length > 1);
    if (terms.length === 0) return [];

    const results: Array<{ type: 'message' | 'skill'; title: string; excerpt: string; confidence: number; rawScore: number }> = [];

    const scoreText = (text: string): number => {
      const textLower = text.toLowerCase();
      let matches = 0;
      terms.forEach(term => {
        const regex = new RegExp(`\\b${term}\\b`, 'g');
        const count = (textLower.match(regex) || []).length;
        if (count > 0) {
          matches += count * 2;
        } else if (textLower.includes(term)) {
          matches += 0.5;
        }
      });
      return matches;
    };

    // Score Messages
    this.cache.messages.forEach(msg => {
      if (msg.role === 'system') return;
      const score = scoreText(msg.content);
      if (score > 0) {
        const timeStr = new Date(msg.timestamp).toLocaleTimeString();
        results.push({
          type: 'message',
          title: `Server Turn Memory [${msg.role.toUpperCase()} @ ${timeStr}]`,
          excerpt: msg.content.length > 150 ? msg.content.substring(0, 147) + '...' : msg.content,
          confidence: Math.min(0.99, 0.4 + (score * 0.15)),
          rawScore: score
        });
      }
    });

    // Score Skills
    this.cache.skills.forEach(skill => {
      const matchableText = `${skill.name} ${skill.description} ${skill.yamlContent || ''}`;
      const score = scoreText(matchableText);
      if (score > 0) {
        results.push({
          type: 'skill',
          title: `Server Skill Module: ${skill.name} (${skill.version})`,
          excerpt: skill.description,
          confidence: Math.min(0.99, 0.5 + (score * 0.2)),
          rawScore: score
        });
      }
    });

    // Score Cognitive Memories
    (this.cache.cognitiveMemories || []).forEach((mem, index) => {
      const score = scoreText(mem);
      if (score > 0) {
        results.push({
          type: 'message',
          title: `Cognitive Memory Directive [Slot ${index + 1}]`,
          excerpt: mem.length > 150 ? mem.substring(0, 147) + '...' : mem,
          confidence: Math.min(0.99, 0.45 + (score * 0.2)),
          rawScore: score + 1.0 // Priority boost for user-defined configuration directives
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

  deleteCognitiveMemory(index: number) {
    if (this.cache.cognitiveMemories && this.cache.cognitiveMemories[index] !== undefined) {
      const purged = this.cache.cognitiveMemories[index];
      this.cache.cognitiveMemories.splice(index, 1);
      this.saveDb();
      this.addSystemLog('DB', 'WARN', `Purged cognitive fragment from memory bank: "${purged.substring(0, 32)}..."`);
    }
  }
}

export const serverDB = new ServerPersistenceEngine();
