export interface Company {
  id: string;
  name: string;
  website: string;
  status: 'pending' | 'researching' | 'done' | 'error';
  created_at: string;
  last_researched_at: string | null;
  tags: string[];
  shortlisted: boolean;
  fit_score: number | null;
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

export interface TechStackItem {
  id: string;
  company_id: string;
  name: string;
  category: 'frontend' | 'backend' | 'infra' | 'data' | 'mobile' | 'devtools' | 'other';
  confidence: 'high' | 'medium' | 'low';
  source_note: string | null;
  created_at: string;
}

export interface JobPosting {
  id: string;
  company_id: string;
  title: string;
  department: string | null;
  url: string | null;
  posted_date: string | null;
  tech_stack: string[];
  seniority: 'junior' | 'mid' | 'senior' | 'staff' | 'lead' | 'unknown';
  remote_policy: 'remote' | 'hybrid' | 'onsite' | 'unknown';
  created_at: string;
}

export interface Contact {
  id: string;
  company_id: string;
  name: string;
  title: string | null;
  department: string | null;
  linkedin_url: string | null;
  source_note: string | null;
  created_at: string;
}

export interface InterviewIntel {
  id: string;
  company_id: string;
  interview_process: string | null;
  common_questions: string[];
  culture_signals: string | null;
  salary_range_hint: string | null;
  difficulty_rating: 'easy' | 'medium' | 'hard' | 'unknown';
  overall_sentiment: 'positive' | 'mixed' | 'negative' | 'unknown';
  source_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailDraft {
  id: string;
  company_id: string;
  subject: string;
  body: string;
  tone: string | null;
  data_sources_used: string[];
  generated_at: string;
}

export interface ScoringCriteria {
  tech_stack_match: { weight: number; target: string[] };
  remote_policy: { weight: number; preferred: string };
  company_size: { weight: number; preferred: string };
  industry: { weight: number; preferred: string[] };
  growth_stage: { weight: number; preferred: string[] };
}

export interface CompanyScore {
  fit_score: number;
  breakdown: Record<string, number>;
  reasoning: string;
}

export interface CompanyProfile {
  company: Company;
  news: NewsItem[];
  problems: ProblemStatement[];
  tech_stack: TechStackItem[];
  job_postings: JobPosting[];
  contacts: Contact[];
  interview_intel: InterviewIntel | null;
  email_draft: EmailDraft | null;
  latest_score: CompanyScore | null;
}

export interface ResearchResult {
  website?: string;
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
