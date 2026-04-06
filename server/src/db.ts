import { Pool } from 'pg';

let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _pool;
}

export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    return (getPool() as any)[prop];
  },
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      website VARCHAR(500) UNIQUE NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_researched_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS news_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      summary TEXT,
      source_type VARCHAR(100),
      source_name VARCHAR(255),
      source_url TEXT,
      published_at VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS problem_statements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      title VARCHAR(500) NOT NULL,
      description TEXT NOT NULL,
      opportunity TEXT NOT NULL,
      source_url TEXT,
      source_name VARCHAR(255),
      difficulty VARCHAR(10),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // New feature tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tech_stack (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      confidence VARCHAR(20),
      source_note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS job_postings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      title VARCHAR(500) NOT NULL,
      department VARCHAR(100),
      url TEXT,
      posted_date VARCHAR(100),
      tech_stack TEXT[],
      seniority VARCHAR(50),
      remote_policy VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      title VARCHAR(255),
      department VARCHAR(100),
      linkedin_url TEXT,
      source_note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS interview_intel (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
      interview_process TEXT,
      common_questions TEXT[],
      culture_signals TEXT,
      salary_range_hint TEXT,
      difficulty_rating VARCHAR(20),
      overall_sentiment VARCHAR(20),
      source_note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS email_drafts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      tone VARCHAR(50),
      data_sources_used TEXT[],
      generated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS scoring_criteria (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      criteria JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS company_scores (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      fit_score NUMERIC(4,2) NOT NULL,
      breakdown JSONB,
      reasoning TEXT,
      criteria_snapshot JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Add new columns safely (idempotent)
  await pool.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'`);
  await pool.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS shortlisted BOOLEAN DEFAULT FALSE`);
  await pool.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS fit_score NUMERIC(4,2)`);

  console.log('Database initialized');
}
