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

  // Add new columns safely (idempotent)
  await pool.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'`);
  await pool.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS shortlisted BOOLEAN DEFAULT FALSE`);

  console.log('Database initialized');
}
