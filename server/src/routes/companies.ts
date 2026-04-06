import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { normalizeWebsite } from '../utils/normalizeWebsite';
import { researchCompany } from '../llm';
import type { Company, BulkAddResult } from 'shared';

export const companiesRouter = Router();

function deriveName(website: string): string {
  try {
    const host = new URL(website).hostname.replace(/^www\./, '');
    const domain = host.split('.')[0];
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  } catch {
    return website;
  }
}

function syntheticWebsite(name: string): string {
  return `unknown://${name.toLowerCase().replace(/\s+/g, '-')}`;
}

// POST /api/companies - add single company
companiesRouter.post('/', async (req: Request, res: Response) => {
  let { name, website } = req.body;
  if (!name && !website) {
    return res.status(400).json({ error: 'name or website is required' });
  }

  if (website && !name) name = deriveName(website);
  if (name && !website) website = syntheticWebsite(name);

  const normalizedWebsite = normalizeWebsite(website);

  try {
    const result = await pool.query(
      `INSERT INTO companies (name, website) VALUES ($1, $2) RETURNING *`,
      [name.trim(), normalizedWebsite]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Company with this website already exists', duplicate: true });
    }
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/companies/bulk - add multiple companies
companiesRouter.post('/bulk', async (req: Request, res: Response) => {
  const companies: { name: string; website: string }[] = req.body;
  if (!Array.isArray(companies)) {
    return res.status(400).json({ error: 'Expected an array of companies' });
  }

  const results: BulkAddResult[] = [];

  for (const item of companies) {
    if (!item.name && !item.website) {
      results.push({ name: '', website: '', status: 'error', error: 'name or website is required' });
      continue;
    }

    if (item.website && !item.name) item.name = deriveName(item.website);
    if (item.name && !item.website) item.website = syntheticWebsite(item.name);

    const normalizedWebsite = normalizeWebsite(item.website);

    try {
      const result = await pool.query(
        `INSERT INTO companies (name, website) VALUES ($1, $2) RETURNING *`,
        [item.name.trim(), normalizedWebsite]
      );
      results.push({ name: item.name, website: normalizedWebsite, status: 'success', company: result.rows[0] });
    } catch (err: any) {
      if (err.code === '23505') {
        results.push({ name: item.name, website: normalizedWebsite, status: 'duplicate', error: 'Already exists' });
      } else {
        results.push({ name: item.name, website: normalizedWebsite, status: 'error', error: 'Database error' });
      }
    }
  }

  return res.json(results);
});

// GET /api/companies - list all
companiesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`SELECT * FROM companies ORDER BY created_at DESC`);
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/companies/:id - get full profile
companiesRouter.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const companyResult = await pool.query(`SELECT * FROM companies WHERE id = $1`, [id]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const newsResult = await pool.query(
      `SELECT * FROM news_items WHERE company_id = $1 ORDER BY created_at DESC`,
      [id]
    );
    const problemsResult = await pool.query(
      `SELECT * FROM problem_statements WHERE company_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    return res.json({
      company: companyResult.rows[0],
      news: newsResult.rows,
      problems: problemsResult.rows,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/companies/:id
companiesRouter.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM companies WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/companies/:id/research - trigger full research
companiesRouter.post('/:id/research', async (req: Request, res: Response) => {
  const { id } = req.params;
  const force = req.query.force === 'true';

  try {
    const companyResult = await pool.query(`SELECT * FROM companies WHERE id = $1`, [id]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const company: Company = companyResult.rows[0];

    // Set status to researching
    await pool.query(`UPDATE companies SET status = 'researching' WHERE id = $1`, [id]);

    // Respond immediately, research happens async
    res.json({ success: true, message: 'Research started' });

    // Run research in background
    (async () => {
      try {
        // Check cache: another company with same website that's already done
        if (!force) {
          const cached = await pool.query(
            `SELECT id FROM companies WHERE website = $1 AND status = 'done' AND id != $2 LIMIT 1`,
            [company.website, id]
          );
          if (cached.rows.length > 0) {
            const sourceId = cached.rows[0].id;
            await pool.query(`DELETE FROM news_items WHERE company_id = $1`, [id]);
            await pool.query(`DELETE FROM problem_statements WHERE company_id = $1`, [id]);
            await pool.query(
              `INSERT INTO news_items (company_id, title, summary, source_type, source_name, source_url, published_at)
               SELECT $1, title, summary, source_type, source_name, source_url, published_at FROM news_items WHERE company_id = $2`,
              [id, sourceId]
            );
            await pool.query(
              `INSERT INTO problem_statements (company_id, title, description, opportunity, source_url, source_name, difficulty)
               SELECT $1, title, description, opportunity, source_url, source_name, difficulty FROM problem_statements WHERE company_id = $2`,
              [id, sourceId]
            );
            await pool.query(
              `UPDATE companies SET status = 'done', last_researched_at = NOW() WHERE id = $1`,
              [id]
            );
            console.log(`Cache hit for ${company.website} — cloned from ${sourceId}`);
            return;
          }
        }

        const result = await researchCompany(company.name, company.website);

        // Clear old data
        await pool.query(`DELETE FROM news_items WHERE company_id = $1`, [id]);
        await pool.query(`DELETE FROM problem_statements WHERE company_id = $1`, [id]);

        // Insert news items
        for (const item of result.news) {
          await pool.query(
            `INSERT INTO news_items (company_id, title, summary, source_type, source_name, source_url, published_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [id, item.title, item.summary, item.source_type, item.source_name, item.source_url, item.published_at]
          );
        }

        // Insert problem statements
        for (const ps of result.problem_statements) {
          await pool.query(
            `INSERT INTO problem_statements (company_id, title, description, opportunity, source_url, source_name, difficulty)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [id, ps.title, ps.description, ps.opportunity, ps.source_url, ps.source_name, ps.difficulty]
          );
        }

        await pool.query(
          `UPDATE companies SET status = 'done', last_researched_at = NOW() WHERE id = $1`,
          [id]
        );
      } catch (err) {
        console.error('Research failed:', err);
        await pool.query(`UPDATE companies SET status = 'error' WHERE id = $1`, [id]);
      }
    })();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/companies/:id/research/news - refresh only news
companiesRouter.post('/:id/research/news', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const companyResult = await pool.query(`SELECT * FROM companies WHERE id = $1`, [id]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const company: Company = companyResult.rows[0];

    await pool.query(`UPDATE companies SET status = 'researching' WHERE id = $1`, [id]);

    res.json({ success: true, message: 'News refresh started' });

    (async () => {
      try {
        const result = await researchCompany(company.name, company.website);

        await pool.query(`DELETE FROM news_items WHERE company_id = $1`, [id]);

        for (const item of result.news) {
          await pool.query(
            `INSERT INTO news_items (company_id, title, summary, source_type, source_name, source_url, published_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [id, item.title, item.summary, item.source_type, item.source_name, item.source_url, item.published_at]
          );
        }

        await pool.query(
          `UPDATE companies SET status = 'done', last_researched_at = NOW() WHERE id = $1`,
          [id]
        );
      } catch (err) {
        console.error('News refresh failed:', err);
        await pool.query(`UPDATE companies SET status = 'error' WHERE id = $1`, [id]);
      }
    })();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/companies/:id/research/problems - refresh only problem statements
companiesRouter.post('/:id/research/problems', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const companyResult = await pool.query(`SELECT * FROM companies WHERE id = $1`, [id]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const company: Company = companyResult.rows[0];

    await pool.query(`UPDATE companies SET status = 'researching' WHERE id = $1`, [id]);

    res.json({ success: true, message: 'Problems refresh started' });

    (async () => {
      try {
        const result = await researchCompany(company.name, company.website);

        await pool.query(`DELETE FROM problem_statements WHERE company_id = $1`, [id]);

        for (const ps of result.problem_statements) {
          await pool.query(
            `INSERT INTO problem_statements (company_id, title, description, opportunity, source_url, source_name, difficulty)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [id, ps.title, ps.description, ps.opportunity, ps.source_url, ps.source_name, ps.difficulty]
          );
        }

        await pool.query(
          `UPDATE companies SET status = 'done', last_researched_at = NOW() WHERE id = $1`,
          [id]
        );
      } catch (err) {
        console.error('Problems refresh failed:', err);
        await pool.query(`UPDATE companies SET status = 'error' WHERE id = $1`, [id]);
      }
    })();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/companies/:id/tags - update tags
companiesRouter.patch('/:id/tags', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { tags } = req.body;

  if (!Array.isArray(tags)) {
    return res.status(400).json({ error: 'tags must be an array of strings' });
  }

  try {
    const result = await pool.query(
      `UPDATE companies SET tags = $1 WHERE id = $2 RETURNING *`,
      [tags, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/companies/:id/shortlist - toggle shortlist
companiesRouter.patch('/:id/shortlist', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { shortlisted } = req.body;

  if (typeof shortlisted !== 'boolean') {
    return res.status(400).json({ error: 'shortlisted must be a boolean' });
  }

  try {
    const result = await pool.query(
      `UPDATE companies SET shortlisted = $1 WHERE id = $2 RETURNING *`,
      [shortlisted, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
