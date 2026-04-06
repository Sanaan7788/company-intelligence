import { getProvider } from './providers';
import { runWebSearches } from './webSearch';
import { recordTokens } from './tokenCounter';

export interface JobsResult {
  job_postings: {
    title: string;
    department: string;
    url: string | null;
    posted_date: string;
    tech_stack: string[];
    seniority: 'junior' | 'mid' | 'senior' | 'staff' | 'lead' | 'unknown';
    remote_policy: 'remote' | 'hybrid' | 'onsite' | 'unknown';
  }[];
}

const SYSTEM_PROMPT = `You are a job market analyst. Find active job postings for a company, focusing on engineering and technical roles.
Return ONLY a raw JSON object — no markdown fences, no preamble, no explanation — matching this exact schema:
{
  "job_postings": [
    {
      "title": string,
      "department": string,
      "url": string | null,
      "posted_date": string,
      "tech_stack": string[],
      "seniority": "junior" | "mid" | "senior" | "staff" | "lead" | "unknown",
      "remote_policy": "remote" | "hybrid" | "onsite" | "unknown"
    }
  ]
}

Rules:
- Focus on software engineering, data, DevOps, product, and technical leadership roles
- tech_stack should list specific technologies mentioned in the job description
- posted_date can be approximate (e.g. "Q1 2025", "~2 weeks ago", "2025-03")
- url should be the direct job posting URL if known, otherwise null
- Return 5-15 roles if available
- If the company is not currently hiring, return an empty array`;

export async function findJobs(name: string, website: string): Promise<JobsResult> {
  const provider = getProvider();

  let userPrompt = `Find active job postings for this company, focusing on technical and engineering roles:

Company: ${name}
Website: ${website}
Careers page likely at: ${website}/careers or ${website}/jobs`;

  if (!provider.supportsNativeWebSearch) {
    const searchResults = await runWebSearches(`${name} jobs hiring engineering 2025 site:greenhouse.io OR site:lever.co OR site:linkedin.com`);
    if (searchResults) {
      userPrompt += `\n\n--- SEARCH CONTEXT ---\n${searchResults}\n--- END CONTEXT ---`;
    }
  }

  const response = await provider.chat(SYSTEM_PROMPT, userPrompt);
  recordTokens(response.prompt_tokens, response.completion_tokens);
  let cleaned = response.content.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  return JSON.parse(cleaned);
}
