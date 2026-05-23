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
}

interface DatabaseSchema {
  messages: DbMessage[];
  skills: DbSkill[];
  costLogs: DbCostLog[];
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
  private cache: DatabaseSchema = { messages: [], skills: [], costLogs: [] };

  constructor() {
    this.initDb();
  }

  private initDb() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.cache = JSON.parse(raw);
        // Sync skills if empty
        if (!this.cache.skills || this.cache.skills.length === 0) {
          this.cache.skills = INITIAL_SKILLS;
          this.saveDb();
        }
      } else {
        this.cache = {
          messages: [],
          skills: INITIAL_SKILLS,
          costLogs: []
        };
        this.saveDb();
      }
    } catch (e) {
      console.error('Failed to initialize local server database file', e);
      this.cache = { messages: [], skills: INITIAL_SKILLS, costLogs: [] };
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
    });
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

    return results
      .sort((a, b) => b.rawScore - a.rawScore)
      .slice(0, 5)
      .map(({ type, title, excerpt, confidence }) => ({ type, title, excerpt, confidence }));
  }

  // --- Dynamic Pricing Calculator ---
  calculateAPICost(model: string, inputTokens: number, outputTokens: number): number {
    const modelLower = model.toLowerCase();
    
    if (modelLower.includes('gemini-1.5-pro')) {
      return (inputTokens * 0.00000125) + (outputTokens * 0.000005);
    }
    if (modelLower.includes('gemini-1.5-flash')) {
      return (inputTokens * 0.000000075) + (outputTokens * 0.0000003);
    }
    if (modelLower.includes('gpt-4o-mini')) {
      return (inputTokens * 0.00000015) + (outputTokens * 0.0000006);
    }
    if (modelLower.includes('sonnet')) {
      return (inputTokens * 0.000003) + (outputTokens * 0.000015);
    }
    if (modelLower.includes('haiku')) {
      return (inputTokens * 0.0000008) + (outputTokens * 0.000004);
    }

    return 0.00;
  }
}

export const serverDB = new ServerPersistenceEngine();
