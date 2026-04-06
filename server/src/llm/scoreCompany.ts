import { ScoringCriteria } from 'shared';
import { getProvider } from './providers';
import { recordTokens } from './tokenCounter';

export interface ScoreResult {
  fit_score: number;
  breakdown: Record<string, number>;
  reasoning: string;
}

const SYSTEM_PROMPT = `You are a job fit analyst. Score how well a company matches a candidate's preferences.
Return ONLY a raw JSON object — no markdown fences, no preamble, no explanation — matching this exact schema:
{
  "fit_score": number,
  "breakdown": {
    "tech_stack_match": number,
    "remote_policy": number,
    "company_size": number,
    "industry": number,
    "growth_stage": number
  },
  "reasoning": string
}

Rules:
- fit_score: weighted average from 1.0 to 10.0 (one decimal place)
- breakdown: each sub-score from 1-10
- reasoning: 2-3 sentences explaining the overall score
- Base scores on all available company data provided`;

export async function scoreCompany(
  name: string,
  website: string,
  companyContext: string,
  criteria: ScoringCriteria
): Promise<ScoreResult> {
  const provider = getProvider();

  const userPrompt = `Score this company against the candidate's preferences:

Company: ${name}
Website: ${website}

Company Context:
${companyContext}

Scoring Criteria (weights must sum to 100):
- Tech Stack Match (weight: ${criteria.tech_stack_match.weight}%): Candidate wants ${criteria.tech_stack_match.target.join(', ')}
- Remote Policy (weight: ${criteria.remote_policy.weight}%): Candidate prefers ${criteria.remote_policy.preferred}
- Company Size (weight: ${criteria.company_size.weight}%): Candidate prefers ${criteria.company_size.preferred}
- Industry (weight: ${criteria.industry.weight}%): Candidate prefers ${criteria.industry.preferred.join(', ')}
- Growth Stage (weight: ${criteria.growth_stage.weight}%): Candidate prefers ${criteria.growth_stage.preferred.join(', ')}

Score each dimension 1-10 based on how well the company matches the preference. Calculate the weighted fit_score.`;

  const response = await provider.chat(SYSTEM_PROMPT, userPrompt);
  recordTokens(response.prompt_tokens, response.completion_tokens);
  let cleaned = response.content.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  return JSON.parse(cleaned);
}
