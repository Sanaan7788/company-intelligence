import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { normalizeWebsite } from '../utils/normalizeWebsite';
import { researchCompany } from '../llm';
import { detectTechStack } from '../llm/detectTechStack';
import { findJobs } from '../llm/findJobs';
import { findContacts } from '../llm/findContacts';
import { findInterviewIntel } from '../llm/findInterviewIntel';
import { generateEmail } from '../llm/generateEmail';
import { getProvider } from '../llm/providers';
import { recordTokens } from '../llm/tokenCounter';
import type { Company, BulkAddResult } from 'shared';

export const companiesRouter = Router();

// POST /api/companies/discover - find companies by location
companiesRouter.post('/discover', async (req: Request, res: Response) => {
  const { location, industry, count } = req.body;
  if (!location) {
    return res.status(400).json({ error: 'location is required' });
  }

  const maxCount = Math.min(200, Math.max(5, parseInt(count) || 25));

  const systemPrompt = `You are a company research assistant. Return ONLY a raw JSON object — no markdown fences, no preamble, no explanation — matching this exact schema:
{
  "companies": [
    { "name": string, "website": string }
  ]
}
Return real companies only. Include each company's actual homepage URL. Return up to ${maxCount} companies. If fewer than ${maxCount} real companies exist in that area, return as many as you can find — do not pad with fake or uncertain entries.`;

  const industryClause = industry ? ` in the ${industry} industry` : '';
  const userPrompt = `List up to ${maxCount} companies${industryClause} located in or near ${location}. Include their name and website URL. Return as many real companies as you can find, up to ${maxCount}.`;

  try {
    const provider = getProvider();
    const response = await provider.chat(systemPrompt, userPrompt);
    recordTokens(response.prompt_tokens, response.completion_tokens);
    let cleaned = response.content.trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '');
    const parsed = JSON.parse(cleaned);
    return res.json(parsed);
  } catch (err) {
    console.error('Discovery failed:', err);
    return res.status(500).json({ error: 'Discovery failed' });
  }
});

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

  // Normalize and validate all entries upfront
  const prepared: { name: string; website: string; normalizedWebsite: string }[] = [];
  const results: BulkAddResult[] = [];

  for (const item of companies) {
    if (!item.name && !item.website) {
      results.push({ name: '', website: '', status: 'error', error: 'name or website is required' });
      prepared.push({ name: '', website: '', normalizedWebsite: '' }); // placeholder to keep index alignment
      continue;
    }
    if (item.website && !item.name) item.name = deriveName(item.website);
    if (item.name && !item.website) item.website = syntheticWebsite(item.name);
    const normalizedWebsite = normalizeWebsite(item.website);
    prepared.push({ name: item.name.trim(), website: item.website, normalizedWebsite });
  }

  // Batch insert all valid entries in a single query using unnest
  const validItems = prepared.filter(p => p.name);
  if (validItems.length > 0) {
    const names = validItems.map(p => p.name);
    const websites = validItems.map(p => p.normalizedWebsite);

    try {
      const insertResult = await pool.query(
        `INSERT INTO companies (name, website)
         SELECT * FROM unnest($1::text[], $2::text[])
         ON CONFLICT (website) DO NOTHING
         RETURNING name, website`,
        [names, websites]
      );

      const inserted = new Set(insertResult.rows.map((r: any) => r.website));

      for (const item of validItems) {
        if (inserted.has(item.normalizedWebsite)) {
          results.push({ name: item.name, website: item.normalizedWebsite, status: 'success' });
        } else {
          results.push({ name: item.name, website: item.normalizedWebsite, status: 'duplicate', error: 'Already exists' });
        }
      }
    } catch (err: any) {
      console.error('Bulk insert failed:', err);
      for (const item of validItems) {
        results.push({ name: item.name, website: item.normalizedWebsite, status: 'error', error: 'Database error' });
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

    const [newsResult, problemsResult, techStackResult, jobsResult, contactsResult, intelResult, emailResult, scoreResult] = await Promise.all([
      pool.query(`SELECT * FROM news_items WHERE company_id = $1 ORDER BY created_at DESC`, [id]),
      pool.query(`SELECT * FROM problem_statements WHERE company_id = $1 ORDER BY created_at DESC`, [id]),
      pool.query(`SELECT * FROM tech_stack WHERE company_id = $1 ORDER BY confidence DESC, name ASC`, [id]),
      pool.query(`SELECT * FROM job_postings WHERE company_id = $1 ORDER BY created_at DESC`, [id]),
      pool.query(`SELECT * FROM contacts WHERE company_id = $1 ORDER BY created_at ASC`, [id]),
      pool.query(`SELECT * FROM interview_intel WHERE company_id = $1`, [id]),
      pool.query(`SELECT * FROM email_drafts WHERE company_id = $1`, [id]),
      pool.query(`SELECT fit_score, breakdown, reasoning FROM company_scores WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1`, [id]),
    ]);

    return res.json({
      company: companyResult.rows[0],
      news: newsResult.rows,
      problems: problemsResult.rows,
      tech_stack: techStackResult.rows,
      job_postings: jobsResult.rows,
      contacts: contactsResult.rows,
      interview_intel: intelResult.rows[0] || null,
      email_draft: emailResult.rows[0] || null,
      latest_score: scoreResult.rows[0] || null,
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

        // If website was a placeholder and LLM returned the real one, update it
        if (company.website.startsWith('unknown://') && result.website) {
          try {
            const realWebsite = normalizeWebsite(result.website);
            await pool.query(`UPDATE companies SET website = $1 WHERE id = $2`, [realWebsite, id]);
          } catch {
            // ignore if it conflicts with an existing company
          }
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

// POST /api/companies/:id/research/techstack
companiesRouter.post('/:id/research/techstack', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const companyResult = await pool.query(`SELECT * FROM companies WHERE id = $1`, [id]);
    if (companyResult.rows.length === 0) return res.status(404).json({ error: 'Company not found' });
    const company: Company = companyResult.rows[0];
    res.json({ success: true, message: 'Tech stack detection started' });
    (async () => {
      try {
        const jobsResult = await pool.query(`SELECT title, tech_stack FROM job_postings WHERE company_id = $1`, [id]);
        const jobContext = jobsResult.rows.map((j: any) =>
          `${j.title}${j.tech_stack?.length ? ': ' + j.tech_stack.join(', ') : ''}`
        ).join('\n');
        const result = await detectTechStack(company.name, company.website, jobContext);
        await pool.query(`DELETE FROM tech_stack WHERE company_id = $1`, [id]);
        for (const item of result.tech_stack) {
          await pool.query(
            `INSERT INTO tech_stack (company_id, name, category, confidence, source_note) VALUES ($1,$2,$3,$4,$5)`,
            [id, item.name, item.category, item.confidence, item.source_note]
          );
        }
      } catch (err) { console.error('Tech stack detection failed:', err); }
    })();
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }); }
});

// POST /api/companies/:id/research/jobs
companiesRouter.post('/:id/research/jobs', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const companyResult = await pool.query(`SELECT * FROM companies WHERE id = $1`, [id]);
    if (companyResult.rows.length === 0) return res.status(404).json({ error: 'Company not found' });
    const company: Company = companyResult.rows[0];
    res.json({ success: true, message: 'Job search started' });
    (async () => {
      try {
        const result = await findJobs(company.name, company.website);
        await pool.query(`DELETE FROM job_postings WHERE company_id = $1`, [id]);
        for (const job of result.job_postings) {
          await pool.query(
            `INSERT INTO job_postings (company_id, title, department, url, posted_date, tech_stack, seniority, remote_policy)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [id, job.title, job.department, job.url, job.posted_date, job.tech_stack, job.seniority, job.remote_policy]
          );
        }
      } catch (err) { console.error('Job search failed:', err); }
    })();
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }); }
});

// POST /api/companies/:id/research/contacts
companiesRouter.post('/:id/research/contacts', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const companyResult = await pool.query(`SELECT * FROM companies WHERE id = $1`, [id]);
    if (companyResult.rows.length === 0) return res.status(404).json({ error: 'Company not found' });
    const company: Company = companyResult.rows[0];
    res.json({ success: true, message: 'Contact search started' });
    (async () => {
      try {
        const jobsResult = await pool.query(`SELECT title FROM job_postings WHERE company_id = $1 LIMIT 10`, [id]);
        const jobContext = jobsResult.rows.map((j: any) => j.title).join('\n');
        const result = await findContacts(company.name, company.website, jobContext);
        await pool.query(`DELETE FROM contacts WHERE company_id = $1`, [id]);
        for (const contact of result.contacts) {
          await pool.query(
            `INSERT INTO contacts (company_id, name, title, department, linkedin_url, source_note)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [id, contact.name, contact.title, contact.department, contact.linkedin_url, contact.source_note]
          );
        }
      } catch (err) { console.error('Contact search failed:', err); }
    })();
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }); }
});

// POST /api/companies/:id/research/intel
companiesRouter.post('/:id/research/intel', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const companyResult = await pool.query(`SELECT * FROM companies WHERE id = $1`, [id]);
    if (companyResult.rows.length === 0) return res.status(404).json({ error: 'Company not found' });
    const company: Company = companyResult.rows[0];
    res.json({ success: true, message: 'Interview intel research started' });
    (async () => {
      try {
        const result = await findInterviewIntel(company.name, company.website);
        await pool.query(
          `INSERT INTO interview_intel (company_id, interview_process, common_questions, culture_signals, salary_range_hint, difficulty_rating, overall_sentiment, source_note)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (company_id) DO UPDATE SET
             interview_process = EXCLUDED.interview_process,
             common_questions = EXCLUDED.common_questions,
             culture_signals = EXCLUDED.culture_signals,
             salary_range_hint = EXCLUDED.salary_range_hint,
             difficulty_rating = EXCLUDED.difficulty_rating,
             overall_sentiment = EXCLUDED.overall_sentiment,
             source_note = EXCLUDED.source_note,
             updated_at = NOW()`,
          [id, result.interview_process, result.common_questions, result.culture_signals,
           result.salary_range_hint, result.difficulty_rating, result.overall_sentiment, result.source_note]
        );
      } catch (err) { console.error('Interview intel failed:', err); }
    })();
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }); }
});

// POST /api/companies/:id/email/generate - synchronous email draft
companiesRouter.post('/:id/email/generate', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { tone = 'professional', contact_id } = req.body;
  try {
    const companyResult = await pool.query(`SELECT * FROM companies WHERE id = $1`, [id]);
    if (companyResult.rows.length === 0) return res.status(404).json({ error: 'Company not found' });
    const company: Company = companyResult.rows[0];

    const [problemsResult, techResult, jobsResult, contactsResult] = await Promise.all([
      pool.query(`SELECT title, opportunity FROM problem_statements WHERE company_id = $1 LIMIT 3`, [id]),
      pool.query(`SELECT name FROM tech_stack WHERE company_id = $1 AND confidence != 'low' LIMIT 10`, [id]),
      pool.query(`SELECT title FROM job_postings WHERE company_id = $1 LIMIT 5`, [id]),
      contact_id
        ? pool.query(`SELECT name, title FROM contacts WHERE id = $1`, [contact_id])
        : pool.query(`SELECT name, title FROM contacts WHERE company_id = $1 ORDER BY created_at ASC LIMIT 1`, [id]),
    ]);

    const result = await generateEmail(company.name, company.website, {
      contact: contactsResult.rows[0] || null,
      problems: problemsResult.rows,
      tech_stack: techResult.rows,
      job_postings: jobsResult.rows,
      tone,
    });

    const draft = await pool.query(
      `INSERT INTO email_drafts (company_id, subject, body, tone, data_sources_used)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (company_id) DO UPDATE SET
         subject = EXCLUDED.subject, body = EXCLUDED.body,
         tone = EXCLUDED.tone, data_sources_used = EXCLUDED.data_sources_used,
         generated_at = NOW()
       RETURNING *`,
      [id, result.subject, result.body, result.tone_used, result.data_sources_used]
    );
    return res.json(draft.rows[0]);
  } catch (err) { console.error('Email generation failed:', err); return res.status(500).json({ error: 'Email generation failed' }); }
});

// PATCH /api/companies/:id/email - save manual edits to draft
companiesRouter.patch('/:id/email', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { subject, body } = req.body;
  try {
    const result = await pool.query(
      `UPDATE email_drafts SET subject = $1, body = $2 WHERE company_id = $3 RETURNING *`,
      [subject, body, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No draft found' });
    return res.json(result.rows[0]);
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }); }
});

// PATCH /api/companies/:id/website - update website
companiesRouter.patch('/:id/website', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { website } = req.body;
  if (!website) {
    return res.status(400).json({ error: 'website is required' });
  }
  const normalizedWebsite = normalizeWebsite(website);
  try {
    const result = await pool.query(
      `UPDATE companies SET website = $1 WHERE id = $2 RETURNING *`,
      [normalizedWebsite, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    return res.json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A company with this website already exists' });
    }
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
