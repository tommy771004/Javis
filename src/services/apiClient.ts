// Client-side API wrapper communicating with the Node.js Server
import type { FtsScoreKind } from './telemetryPresentationPolicies';

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

export interface FtsSearchResult {
  type: 'message' | 'skill';
  title: string;
  excerpt: string;
  score: number;
  scoreKind: FtsScoreKind;
  scoreLabel: string;
}

export interface SystemLogEntry {
  timestamp: number;
  category: 'SYS' | 'HERMES' | 'DB' | 'NET' | 'API' | 'VOIP' | 'EXEC' | 'SEC';
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
}

export interface McpWebhook {
  id: string;
  name: string;
  url: string;
  active: boolean;
}

export interface McpRoutine {
  id: string;
  name: string;
  prompt: string;
}

class ApiClient {
  async init(): Promise<void> {
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
  async queryFTS(queryText: string): Promise<FtsSearchResult[]> {
    const res = await fetch('/api/memory/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: queryText })
    });
    if (!res.ok) throw new Error('FTS search request failed');
    return res.json();
  }

  // --- Cognitive Memory Bank API ---
  async getCognitiveMemories(): Promise<string[]> {
    const res = await fetch('/api/memory/cognitive');
    if (!res.ok) throw new Error('Failed to fetch cognitive memories');
    return res.json();
  }

  async addCognitiveMemory(memory: string): Promise<string[]> {
    const res = await fetch('/api/memory/cognitive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memory })
    });
    if (!res.ok) throw new Error('Failed to store cognitive memory');
    const data = await res.json();
    return data.memories;
  }

  async clearCognitiveMemories(): Promise<string[]> {
    const res = await fetch('/api/memory/cognitive/all', {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to purge all cognitive memories');
    const data = await res.json();
    return data.memories;
  }

  async deleteCognitiveMemory(index: number): Promise<string[]> {
    const res = await fetch(`/api/memory/cognitive/${index}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to purge cognitive memory fragment');
    const data = await res.json();
    return data.memories;
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

  async getSystemLogs(): Promise<SystemLogEntry[]> {
    const res = await fetch('/api/system/logs');
    if (!res.ok) throw new Error('Failed to fetch active system logs');
    return res.json();
  }

  // --- System & Settings ---
  async getSystemStats(): Promise<any> {
    const res = await fetch('/api/system/stats');
    if (!res.ok) throw new Error('Failed to fetch system stats');
    return res.json();
  }

  async getSettings(): Promise<any> {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  }

  async saveSettings(settings: any): Promise<void> {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Failed to save settings');
  }

  // --- MCP Endpoints ---
  async getMcpStatus(): Promise<any> {
    const res = await fetch('/api/mcp/status');
    if (!res.ok) throw new Error('Failed to fetch MCP status');
    return res.json();
  }

  async getMcpTools(): Promise<any> {
    const res = await fetch('/api/mcp/tools');
    if (!res.ok) throw new Error('Failed to fetch MCP tools');
    return res.json();
  }

  async connectMcp(serverName: string, command: string): Promise<any> {
    const res = await fetch('/api/mcp/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverName, command })
    });
    if (!res.ok) throw new Error('Failed to connect MCP');
    return res.json();
  }

  async executeMcpTool(serverName: string, toolName: string, args: any): Promise<any> {
    const res = await fetch('/api/mcp/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverName, toolName, args })
    });
    if (!res.ok) throw new Error('Failed to execute MCP tool');
    return res.json();
  }

  // --- Webhooks ---
  async getMcpWebhooks(): Promise<McpWebhook[]> {
    const res = await fetch('/api/mcp/webhooks');
    if (!res.ok) throw new Error('Failed to fetch MCP webhooks');
    return res.json();
  }

  async addMcpWebhook(name: string, url: string): Promise<any> {
    const res = await fetch('/api/mcp/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url })
    });
    if (!res.ok) throw new Error('Failed to add webhook');
    return res.json();
  }

  async deleteMcpWebhook(id: string): Promise<void> {
    const res = await fetch(`/api/mcp/webhooks/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete webhook');
  }

  async toggleMcpWebhook(id: string, active: boolean): Promise<any> {
    const res = await fetch(`/api/mcp/webhooks/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active })
    });
    if (!res.ok) throw new Error('Failed to toggle webhook');
    return res.json();
  }

  // --- Routines ---
  async getMcpRoutines(): Promise<McpRoutine[]> {
    const res = await fetch('/api/mcp/routines');
    if (!res.ok) throw new Error('Failed to fetch MCP routines');
    return res.json();
  }

  async addMcpRoutine(name: string, prompt: string): Promise<any> {
    const res = await fetch('/api/mcp/routines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, prompt })
    });
    if (!res.ok) throw new Error('Failed to add routine');
    return res.json();
  }

  async deleteMcpRoutine(id: string): Promise<void> {
    const res = await fetch(`/api/mcp/routines/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete routine');
  }

  async executeMcpRoutine(id: string): Promise<any> {
    const res = await fetch(`/api/mcp/routines/${id}/execute`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to execute routine');
    return res.json();
  }

  // --- Tasks ---
  async searchTasks(query: string): Promise<any[]> {
    const res = await fetch(`/api/tasks/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Failed to search tasks');
    return res.json();
  }

  async createTask(description: string, priority: string, tags: string[]): Promise<any> {
    const res = await fetch('/api/workspace/task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, priority, tags })
    });
    if (!res.ok) throw new Error('Failed to create task');
    return res.json();
  }

  async updateTaskStatus(id: string, status: string): Promise<void> {
    const res = await fetch(`/api/tasks/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update task status');
  }

  async updateTask(id: string, updates: any): Promise<void> {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update task');
  }

  async deleteTask(id: string): Promise<void> {
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete task');
  }

  async getTaskReports(taskId: string): Promise<string[]> {
    const res = await fetch(`/api/tasks/${taskId}/reports`);
    if (!res.ok) throw new Error('Failed to fetch task reports');
    const data = await res.json();
    return data.reports || [];
  }

  async getTaskReportContent(filename: string): Promise<string> {
    const res = await fetch(`/api/reports/${encodeURIComponent(filename)}`);
    if (!res.ok) throw new Error('Failed to fetch report content');
    const data = await res.json();
    return data.content || '';
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

export const apiClient = new ApiClient();
