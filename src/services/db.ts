// Browser-based persistent database and FTS indexer for Javis-Hermes Agent
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

const DB_NAME = 'hermes_matrix_db';
const DB_VERSION = 1;

class HermesPersistenceEngine {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open Hermes IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('messages')) {
          const store = db.createObjectStore('messages', { keyPath: 'id' });
          store.createIndex('sessionId', 'sessionId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('skills')) {
          db.createObjectStore('skills', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('cost_logs')) {
          const store = db.createObjectStore('cost_logs', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Seed default skills
        const initialSkills: DbSkill[] = [
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
            yamlContent: '---\nname: code-refactorer\ndescription: Ast-aware deep code refactoring rules.\nversion: 4.2\n---'
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

        // Seed when stores are fully created
        const transaction = (event.target as any).transaction;
        const skillsStore = transaction.objectStore('skills');
        initialSkills.forEach(skill => skillsStore.put(skill));
      };
    });
  }

  // --- Message Persistence ---
  async addMessage(msg: DbMessage): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('messages', 'readwrite');
      const store = transaction.objectStore('messages');
      const request = store.add(msg);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSessionMessages(sessionId: string): Promise<DbMessage[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('messages', 'readonly');
      const store = transaction.objectStore('messages');
      const index = store.index('sessionId');
      const request = index.getAll(sessionId);

      request.onsuccess = () => {
        const sorted = (request.result as DbMessage[]).sort((a, b) => a.timestamp - b.timestamp);
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllMessages(): Promise<DbMessage[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('messages', 'readonly');
      const store = transaction.objectStore('messages');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Skills Persistence ---
  async getSkills(): Promise<DbSkill[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('skills', 'readonly');
      const store = transaction.objectStore('skills');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async addOrUpdateSkill(skill: DbSkill): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('skills', 'readwrite');
      const store = transaction.objectStore('skills');
      const request = store.put(skill);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Cost logs ---
  async addCostLog(log: DbCostLog): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('cost_logs', 'readwrite');
      const store = transaction.objectStore('cost_logs');
      const request = store.add(log);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCostLogs(): Promise<DbCostLog[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('cost_logs', 'readonly');
      const store = transaction.objectStore('cost_logs');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // --- REAL Full-Text Search (FTS5 simulation) ---
  async queryFTS(queryText: string): Promise<Array<{ type: 'message' | 'skill'; title: string; excerpt: string; confidence: number }>> {
    if (!queryText.trim()) return [];

    const terms = queryText.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(t => t.length > 1);
    if (terms.length === 0) return [];

    const messages = await this.getAllMessages();
    const skills = await this.getSkills();
    const results: Array<{ type: 'message' | 'skill'; title: string; excerpt: string; confidence: number; rawScore: number }> = [];

    // Helper to score match frequencies
    const scoreText = (text: string): number => {
      const textLower = text.toLowerCase();
      let matches = 0;
      terms.forEach(term => {
        const regex = new RegExp(`\\b${term}\\b`, 'g');
        const count = (textLower.match(regex) || []).length;
        // Exact term match gets higher weights, substring matches get lower
        if (count > 0) {
          matches += count * 2;
        } else if (textLower.includes(term)) {
          matches += 0.5;
        }
      });
      return matches;
    };

    // Index & Score Messages
    messages.forEach(msg => {
      if (msg.role === 'system') return;
      const score = scoreText(msg.content);
      if (score > 0) {
        const timeStr = new Date(msg.timestamp).toLocaleTimeString();
        results.push({
          type: 'message',
          title: `Session memory from historical turn [${msg.role.toUpperCase()} @ ${timeStr}]`,
          excerpt: msg.content.length > 150 ? msg.content.substring(0, 147) + '...' : msg.content,
          confidence: Math.min(0.99, 0.4 + (score * 0.15)),
          rawScore: score
        });
      }
    });

    // Index & Score Skills
    skills.forEach(skill => {
      const matchableText = `${skill.name} ${skill.description} ${skill.yamlContent || ''}`;
      const score = scoreText(matchableText);
      if (score > 0) {
        results.push({
          type: 'skill',
          title: `Skill repository: ${skill.name} (${skill.version})`,
          excerpt: skill.description,
          confidence: Math.min(0.99, 0.5 + (score * 0.2)),
          rawScore: score
        });
      }
    });

    // Sort by relevance score descending
    return results
      .sort((a, b) => b.rawScore - a.rawScore)
      .slice(0, 5)
      .map(({ type, title, excerpt, confidence }) => ({ type, title, excerpt, confidence }));
  }

  // --- REAL Dynamic Token Pricing Calculator ---
  calculateAPICost(model: string, inputTokens: number, outputTokens: number): number {
    const modelLower = model.toLowerCase();
    
    // Check for paid models
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
      // Claude 3.5 Sonnet: $3 / 1M input, $15 / 1M output
      return (inputTokens * 0.000003) + (outputTokens * 0.000015);
    }
    if (modelLower.includes('haiku')) {
      // Claude 3.5 Haiku: $0.80 / 1M input, $4 / 1M output
      return (inputTokens * 0.0000008) + (outputTokens * 0.000004);
    }

    // Default free models
    return 0.00;
  }
}

export const hermesDB = new HermesPersistenceEngine();
