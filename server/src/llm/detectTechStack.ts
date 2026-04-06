import { getProvider } from './providers';
import { runWebSearches } from './webSearch';
import { recordTokens } from './tokenCounter';

export interface TechStackResult {
  tech_stack: {
    name: string;
    category: 'frontend' | 'backend' | 'infra' | 'data' | 'mobile' | 'devtools' | 'other';
    confidence: 'high' | 'medium' | 'low';
    source_note: string;
  }[];
}

const SYSTEM_PROMPT = `You are a technical analyst. Detect the technology stack a company uses based on all available context.
Return ONLY a raw JSON object — no markdown fences, no preamble, no explanation — matching this exact schema:
{
  "tech_stack": [
    {
      "name": string,
      "category": "frontend" | "backend" | "infra" | "data" | "mobile" | "devtools" | "other",
      "confidence": "high" | "medium" | "low",
      "source_note": string
    }
  ]
}

Rules:
- Use title case for technology names (e.g. "React" not "react", "PostgreSQL" not "postgres")
- confidence "high" = explicitly mentioned in job postings or engineering blog
- confidence "medium" = strongly implied by their product/stack choices
- confidence "low" = inferred from company type/industry
- source_note should be a short explanation like "mentioned in 3 job postings" or "inferred from fintech stack patterns"
- Return 5-20 technologies covering all relevant categories`;

export async function detectTechStack(name: string, website: string, jobContext: string): Promise<TechStackResult> {
  const provider = getProvider();

  let userPrompt = `Detect the technology stack for this company:

Company: ${name}
Website: ${website}
${jobContext ? `\nJob Posting Context:\n${jobContext}` : ''}

Identify all technologies they use across frontend, backend, infrastructure, data, mobile, and dev tools.`;

  if (!provider.supportsNativeWebSearch) {
    const searchResults = await runWebSearches(`${name} tech stack engineering blog job postings`);
    if (searchResults) {
      userPrompt += `\n\n--- SEARCH CONTEXT ---\n${searchResults}\n--- END CONTEXT ---`;
    }
  }

  const response = await provider.chat(SYSTEM_PROMPT, userPrompt);
  recordTokens(response.prompt_tokens, response.completion_tokens);
  let cleaned = response.content.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  return JSON.parse(cleaned);
}
