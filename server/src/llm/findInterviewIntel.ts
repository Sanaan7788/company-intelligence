import { getProvider } from './providers';
import { runWebSearches } from './webSearch';
import { recordTokens } from './tokenCounter';

export interface InterviewIntelResult {
  interview_process: string;
  common_questions: string[];
  culture_signals: string;
  salary_range_hint: string;
  difficulty_rating: 'easy' | 'medium' | 'hard' | 'unknown';
  overall_sentiment: 'positive' | 'mixed' | 'negative' | 'unknown';
  source_note: string;
}

const SYSTEM_PROMPT = `You are an interview research analyst. Synthesize publicly available information about a company's interview process and culture.
Return ONLY a raw JSON object — no markdown fences, no preamble, no explanation — matching this exact schema:
{
  "interview_process": string,
  "common_questions": string[],
  "culture_signals": string,
  "salary_range_hint": string,
  "difficulty_rating": "easy" | "medium" | "hard" | "unknown",
  "overall_sentiment": "positive" | "mixed" | "negative" | "unknown",
  "source_note": string
}

Rules:
- interview_process: describe the typical stages (e.g. "Phone screen → 2 technical rounds → system design → values interview")
- common_questions: 5-8 real or typical interview questions for this company/type
- culture_signals: 2-3 sentences on work culture, values, team dynamics based on public reviews
- salary_range_hint: estimated range for a senior software engineer (e.g. "Senior SWE: $160k-$200k base (estimated)"). Always note it is an estimate.
- source_note: explain your sources (e.g. "Synthesized from Glassdoor reviews, Blind posts, and Levels.fyi data patterns")
- difficulty_rating: overall interview difficulty
- overall_sentiment: employee sentiment from public reviews`;

export async function findInterviewIntel(name: string, website: string): Promise<InterviewIntelResult> {
  const provider = getProvider();

  let userPrompt = `Research the interview process and culture for this company:

Company: ${name}
Website: ${website}

Synthesize information from Glassdoor, Blind, Levels.fyi, and engineering blogs about their hiring process, interview questions, culture, and compensation.`;

  if (!provider.supportsNativeWebSearch) {
    const searchResults = await runWebSearches(`${name} interview process Glassdoor reviews culture salary software engineer`);
    if (searchResults) {
      userPrompt += `\n\n--- SEARCH CONTEXT ---\n${searchResults}\n--- END CONTEXT ---`;
    }
  }

  const response = await provider.chat(SYSTEM_PROMPT, userPrompt);
  recordTokens(response.prompt_tokens, response.completion_tokens);
  let cleaned = response.content.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  return JSON.parse(cleaned);
}
