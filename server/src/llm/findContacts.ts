import { getProvider } from './providers';
import { runWebSearches } from './webSearch';
import { recordTokens } from './tokenCounter';

export interface ContactsResult {
  contacts: {
    name: string;
    title: string;
    department: 'engineering' | 'product' | 'hr' | 'sales' | 'leadership' | 'other';
    linkedin_url: string | null;
    source_note: string;
  }[];
}

const SYSTEM_PROMPT = `You are a recruiter researcher. Find key people at a company who are relevant to a software engineer's job search.
Return ONLY a raw JSON object — no markdown fences, no preamble, no explanation — matching this exact schema:
{
  "contacts": [
    {
      "name": string,
      "title": string,
      "department": "engineering" | "product" | "hr" | "sales" | "leadership" | "other",
      "linkedin_url": string | null,
      "source_note": string
    }
  ]
}

Rules:
- Focus on: engineering managers, VPs/CTOs of Engineering, technical recruiters, team leads, heads of product
- linkedin_url: only include if you are reasonably confident it exists — format as "https://linkedin.com/in/username". Mark uncertain ones as null.
- source_note: briefly explain how you found/inferred this person (e.g. "Listed as CTO on company website", "Inferred from LinkedIn job posting")
- Return 3-8 contacts
- Prioritize people who would receive or forward a cold outreach email from an engineer`;

export async function findContacts(name: string, website: string, jobContext: string): Promise<ContactsResult> {
  const provider = getProvider();

  let userPrompt = `Find key contacts at this company relevant to a software engineer's job search:

Company: ${name}
Website: ${website}
${jobContext ? `\nJob Posting Context (use hiring managers/recruiters mentioned here):\n${jobContext}` : ''}`;

  if (!provider.supportsNativeWebSearch) {
    const searchResults = await runWebSearches(`${name} CTO VP Engineering engineering manager recruiter LinkedIn`);
    if (searchResults) {
      userPrompt += `\n\n--- SEARCH CONTEXT ---\n${searchResults}\n--- END CONTEXT ---`;
    }
  }

  const response = await provider.chat(SYSTEM_PROMPT, userPrompt);
  recordTokens(response.prompt_tokens, response.completion_tokens);
  let cleaned = response.content.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  return JSON.parse(cleaned);
}
