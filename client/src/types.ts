export interface TaskEntry {
  companyId: string;
  companyName: string;
  taskType: 'Full Research' | 'News Refresh' | 'Problems Refresh';
  status: 'running' | 'done' | 'error';
  completedAt?: number;
}
