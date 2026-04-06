export interface Company {
  id: string;
  name: string;
  website: string;
  status: 'pending' | 'researching' | 'done' | 'error';
  created_at: string;
  last_researched_at: string | null;
}

export interface NewsItem {
  id: string;
  company_id: string;
  title: string;
  summary: string | null;
  source_type: 'reddit' | 'linkedin' | 'blog' | 'article' | 'hackernews' | 'other';
  source_name: string | null;
  source_url: string | null;
  published_at: string | null;
  created_at: string;
}

export interface ProblemStatement {
  id: string;
  company_id: string;
  title: string;
  description: string;
  opportunity: string;
  source_url: string | null;
  source_name: string | null;
  difficulty: 'low' | 'medium' | 'high';
  created_at: string;
}

export interface CompanyProfile {
  company: Company;
  news: NewsItem[];
  problems: ProblemStatement[];
}

export interface ResearchResult {
  news: {
    title: string;
    summary: string;
    source_type: 'reddit' | 'linkedin' | 'blog' | 'article' | 'hackernews' | 'other';
    source_name: string;
    source_url: string;
    published_at: string;
  }[];
  problem_statements: {
    title: string;
    description: string;
    opportunity: string;
    source_url: string;
    source_name: string;
    difficulty: 'low' | 'medium' | 'high';
  }[];
}

export interface BulkAddResult {
  name: string;
  website: string;
  status: 'success' | 'duplicate' | 'error';
  company?: Company;
  error?: string;
}
