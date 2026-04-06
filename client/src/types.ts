export interface TaskEntry {
  companyId: string;
  companyName: string;
  taskType: 'Full Research' | 'News Refresh' | 'Problems Refresh' | 'Tech Stack' | 'Job Search' | 'Contact Finder' | 'Interview Intel' | 'Scoring';
  status: 'running' | 'done' | 'error';
  completedAt?: number;
}
