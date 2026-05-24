export type TaskPriorityLevel = 'High' | 'Medium' | 'Low';

export interface TaskPriorityVisual {
  level: TaskPriorityLevel;
  color: string;
  glow: string;
  textClass: string;
  dotClass: string;
  barClass: string;
  badgeClass: string;
  tooltipBorder: string;
  tooltipShadow: string;
}

export const TASK_PRIORITY_ORDER: TaskPriorityLevel[] = ['High', 'Medium', 'Low'];

export const TASK_PRIORITY_VISUALS: Record<TaskPriorityLevel, TaskPriorityVisual> = {
  High: {
    level: 'High',
    color: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.45)',
    textClass: 'text-red-400',
    dotClass: 'bg-red-500',
    barClass: 'bg-red-500',
    badgeClass: 'border-red-500/50 text-red-400 bg-red-900/20',
    tooltipBorder: 'rgba(239, 68, 68, 0.6)',
    tooltipShadow: '0 0 15px rgba(239, 68, 68, 0.2)',
  },
  Medium: {
    level: 'Medium',
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.45)',
    textClass: 'text-amber-400',
    dotClass: 'bg-amber-500',
    barClass: 'bg-amber-500',
    badgeClass: 'border-amber-500/50 text-amber-400 bg-amber-900/20',
    tooltipBorder: 'rgba(245, 158, 11, 0.6)',
    tooltipShadow: '0 0 15px rgba(245, 158, 11, 0.2)',
  },
  Low: {
    level: 'Low',
    color: '#10b981',
    glow: 'rgba(16, 185, 129, 0.45)',
    textClass: 'text-emerald-400',
    dotClass: 'bg-emerald-500',
    barClass: 'bg-emerald-500',
    badgeClass: 'border-emerald-500/50 text-emerald-400 bg-emerald-900/20',
    tooltipBorder: 'rgba(16, 185, 129, 0.6)',
    tooltipShadow: '0 0 15px rgba(16, 185, 129, 0.2)',
  },
};

export interface PriorityTaskLike {
  priority: TaskPriorityLevel;
}

export function getTaskPriorityVisual(level: TaskPriorityLevel) {
  return TASK_PRIORITY_VISUALS[level];
}

export function buildTaskPriorityDistribution(tasks: PriorityTaskLike[]) {
  const total = tasks.length;
  if (total === 0) {
    return [];
  }

  return TASK_PRIORITY_ORDER
    .map((level) => {
      const value = tasks.filter((task) => task.priority === level).length;
      const visual = getTaskPriorityVisual(level);

      return {
        name: level,
        value,
        percentage: total > 0 ? (value / total) * 100 : 0,
        color: visual.color,
        glow: visual.glow,
      };
    })
    .filter((item) => item.value > 0);
}
