export interface ReportTaskLike {
  id: string;
  description: string;
  status: 'Pending' | 'Completed' | 'Cancelled';
  progress?: number;
  priority: 'Low' | 'Medium' | 'High';
}

export interface McpTemplateDefinition {
  id: string;
  name: string;
  icon?: string;
  config: Record<string, unknown>;
}

export function buildDefaultTaskReport(task: ReportTaskLike): string {
  return `# Task Report

Task ID: ${task.id}
Objective: ${task.description}
Status: ${task.status}
Progress: ${task.progress ?? 0}%
Priority: ${task.priority}

This report was generated from the current task ledger because no physical execution artifacts were found for the task yet.
`;
}

export function resolveMcpTemplateById(
  templates: McpTemplateDefinition[],
  templateId: string
): McpTemplateDefinition | null {
  return templates.find(template => template.id === templateId) || null;
}
