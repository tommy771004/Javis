export interface TaskExportInput {
  id: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'Completed' | 'Cancelled';
  createdAt: number;
  progress?: number;
  completedAt?: number;
}

export interface PendingTaskExportPayload {
  version: 1;
  source: 'HermesDashboard';
  exportedAt: string;
  taskCount: number;
  tasks: Array<{
    id: string;
    description: string;
    priority: 'Low' | 'Medium' | 'High';
    status: 'Pending';
    createdAt: string;
    progress: number;
  }>;
}

export function buildPendingTaskExportPayload(
  tasks: TaskExportInput[],
  now = Date.now(),
): PendingTaskExportPayload {
  const pendingTasks = tasks
    .filter((task) => task.status === 'Pending')
    .map((task) => ({
      id: task.id,
      description: task.description,
      priority: task.priority,
      status: 'Pending' as const,
      createdAt: new Date(task.createdAt).toISOString(),
      progress: Math.max(0, Math.min(100, task.progress ?? 0)),
    }));

  return {
    version: 1,
    source: 'HermesDashboard',
    exportedAt: new Date(now).toISOString(),
    taskCount: pendingTasks.length,
    tasks: pendingTasks,
  };
}
