import { ResearchResult } from 'shared';
import { getProvider } from './providers';
import { runWebSearches } from './webSearch';
import { recordTokens } from './tokenCounter';

const SYSTEM_PROMPT = `You are a company intelligence analyst. Your job is to research companies for job hunters.
Return ONLY a raw JSON object — no markdown fences, no preamble, no explanation — matching this exact schema:
{
  "website": string,
  "news": [
    {
      "title": string,
      "summary": string,
      "source_type": "reddit" | "linkedin" | "blog" | "article" | "hackernews" | "other",
      "source_name": string,
      "source_url": string,
      "published_at": string
    }
  ],
  "problem_statements": [
    {
      "title": string,
      "description": string,
      "opportunity": string,
      "source_url": string,
      "source_name": string,
      "difficulty": "low" | "medium" | "high"
    }
  ]
}

The "website" field must be the company's real homepage URL (e.g. "https://stripe.com").

Focus on:
- Recent news (last 12-18 months): funding, launches, layoffs, engineering blog posts, major incidents
- Technology problems: scaling challenges, migration efforts, reliability issues, performance bottlenecks
- Opportunity: frame each problem as a pitch for what a skilled engineer could build/propose
- Source every item with a real URL

Return at least 5 news items and 5 problem statements if information is available.`;

export async function researchCompany(name: string, website: string): Promise<ResearchResult> {
  const provider = getProvider();

  let userPrompt = `Research this company for a job hunter preparing for interviews and pitching solutions:

Company: ${name}
Website: ${website}

Find recent news, engineering challenges, technology problems, and opportunities for a skilled engineer to add value.`;

  if (!provider.supportsNativeWebSearch) {
    const searchResults = await runWebSearches(name);
    if (searchResults) {
      userPrompt += `\n\n--- SEARCH RESULTS CONTEXT ---\n${searchResults}\n--- END CONTEXT ---`;
    }
  }

  const response = await provider.chat(SYSTEM_PROMPT, userPrompt);
  recordTokens(response.prompt_tokens, response.completion_tokens);

  let cleaned = response.content.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');

  const parsed: ResearchResult = JSON.parse(cleaned);
  return parsed;
}
