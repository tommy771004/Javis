// Client-side API wrapper communicating with the Node.js Server Database
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

class HermesDBClient {
  async init(): Promise<void> {
    // Zero-op on client side as server handles initialization
    return Promise.resolve();
  }

  // --- Messages API ---
  async getSessionMessages(sessionId: string): Promise<DbMessage[]> {
    const res = await fetch(`/api/messages?sessionId=${sessionId}`);
    if (!res.ok) throw new Error('Failed to fetch session messages');
    return res.json();
  }

  // --- Skills API ---
  async getSkills(): Promise<DbSkill[]> {
    const res = await fetch('/api/skills');
    if (!res.ok) throw new Error('Failed to fetch skills');
    return res.json();
  }

  async addOrUpdateSkill(skill: DbSkill): Promise<void> {
    const res = await fetch('/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(skill)
    });
    if (!res.ok) throw new Error('Failed to update skill on server');
  }

  // --- FTS Search API ---
  async queryFTS(queryText: string): Promise<Array<{ type: 'message' | 'skill'; title: string; excerpt: string; confidence: number }>> {
    const res = await fetch('/api/memory/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: queryText })
    });
    if (!res.ok) throw new Error('FTS search request failed');
    return res.json();
  }

  // --- Cost Logs & Stats ---
  async getCostLogs(): Promise<DbCostLog[]> {
    const res = await fetch('/api/gateway/stats');
    if (!res.ok) throw new Error('Failed to fetch gateway transaction logs');
    const data = await res.json();
    return data.costLogs || [];
  }

  async getGatewayStats(): Promise<{ budget: number; spent: number; cacheHits: number; costLogs: DbCostLog[] }> {
    const res = await fetch('/api/gateway/stats');
    if (!res.ok) throw new Error('Failed to fetch gateway stats');
    return res.json();
  }

  async resetBudget(): Promise<void> {
    const res = await fetch('/api/gateway/reset-budget', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset budget limits');
  }

  // Cost calculator fallback for frontend UI elements
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

export const hermesDB = new HermesDBClient();
