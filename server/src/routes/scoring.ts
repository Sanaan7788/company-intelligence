import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { scoreCompany } from '../llm/scoreCompany';
import type { ScoringCriteria } from 'shared';

export const scoringRouter = Router();

// GET /api/scoring/criteria
scoringRouter.get('/criteria', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`SELECT * FROM scoring_criteria ORDER BY updated_at DESC LIMIT 1`);
    if (result.rows.length === 0) return res.status(404).json({ error: 'No criteria set' });
    return res.json(result.rows[0]);
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }); }
});

// PUT /api/scoring/criteria - save and trigger re-score
scoringRouter.put('/criteria', async (req: Request, res: Response) => {
  const { criteria } = req.body;
  if (!criteria) return res.status(400).json({ error: 'criteria is required' });
  try {
    // Upsert: delete old, insert new (single-row pattern)
    await pool.query(`DELETE FROM scoring_criteria`);
    const saved = await pool.query(
      `INSERT INTO scoring_criteria (criteria) VALUES ($1) RETURNING *`,
      [JSON.stringify(criteria)]
    );

    // Kick off background re-scoring of all done companies
    const companies = await pool.query(`SELECT id, name, website FROM companies WHERE status = 'done'`);
    res.json({ success: true, criteria: saved.rows[0], scoring_started: true, count: companies.rows.length });

    // Score sequentially with small delay to avoid hammering LLM
    (async () => {
      for (const company of companies.rows) {
        try {
          await scoreSingleCompany(company.id, company.name, company.website, criteria);
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) { console.error(`Scoring failed for ${company.name}:`, err); }
      }
    })();
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }); }
});

// POST /api/scoring/:id - score a single company
scoringRouter.post('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const companyResult = await pool.query(`SELECT * FROM companies WHERE id = $1`, [id]);
    if (companyResult.rows.length === 0) return res.status(404).json({ error: 'Company not found' });
    const criteriaResult = await pool.query(`SELECT criteria FROM scoring_criteria ORDER BY updated_at DESC LIMIT 1`);
    if (criteriaResult.rows.length === 0) return res.status(400).json({ error: 'No scoring criteria set' });

    res.json({ success: true, message: 'Scoring started' });

    (async () => {
      try {
        const company = companyResult.rows[0];
        const criteria = criteriaResult.rows[0].criteria;
        await scoreSingleCompany(id, company.name, company.website, criteria);
      } catch (err) { console.error('Scoring failed:', err); }
    })();
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }); }
});

async function scoreSingleCompany(id: string, name: string, website: string, criteria: ScoringCriteria) {
  const [problemsResult, techResult, jobsResult, newsResult] = await Promise.all([
    pool.query(`SELECT title, opportunity FROM problem_statements WHERE company_id = $1 LIMIT 5`, [id]),
    pool.query(`SELECT name, category FROM tech_stack WHERE company_id = $1`, [id]),
    pool.query(`SELECT title, remote_policy, seniority FROM job_postings WHERE company_id = $1 LIMIT 5`, [id]),
    pool.query(`SELECT title FROM news_items WHERE company_id = $1 LIMIT 5`, [id]),
  ]);

  const contextParts: string[] = [];
  if (techResult.rows.length > 0)
    contextParts.push(`Tech Stack: ${techResult.rows.map((t: any) => t.name).join(', ')}`);
  if (jobsResult.rows.length > 0)
    contextParts.push(`Open Roles: ${jobsResult.rows.map((j: any) => `${j.title} (${j.remote_policy})`).join(', ')}`);
  if (problemsResult.rows.length > 0)
    contextParts.push(`Known Challenges: ${problemsResult.rows.map((p: any) => p.title).join(', ')}`);
  if (newsResult.rows.length > 0)
    contextParts.push(`Recent News: ${newsResult.rows.map((n: any) => n.title).join(', ')}`);

  const companyContext = contextParts.join('\n');
  const result = await scoreCompany(name, website, companyContext, criteria);

  await pool.query(
    `INSERT INTO company_scores (company_id, fit_score, breakdown, reasoning, criteria_snapshot)
     VALUES ($1,$2,$3,$4,$5)`,
    [id, result.fit_score, JSON.stringify(result.breakdown), result.reasoning, JSON.stringify(criteria)]
  );
  await pool.query(`UPDATE companies SET fit_score = $1 WHERE id = $2`, [result.fit_score, id]);
}
