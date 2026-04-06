import { getProvider } from './providers';
import { recordTokens } from './tokenCounter';

export interface EmailResult {
  subject: string;
  body: string;
  tone_used: string;
  data_sources_used: string[];
}

const SYSTEM_PROMPT = `You are an expert at writing cold outreach emails for software engineers seeking jobs.
Return ONLY a raw JSON object — no markdown fences, no preamble, no explanation — matching this exact schema:
{
  "subject": string,
  "body": string,
  "tone_used": string,
  "data_sources_used": string[]
}

Rules:
- Write a cold outreach email from a software engineer to a potential employer
- subject: compelling, specific, under 60 characters
- body: plain text, use \\n for line breaks, 150-250 words maximum
- Address a specific person if contact info is provided, otherwise use "Hi [Name],"
- Reference specific company problems or challenges you can solve — this is the hook
- Mention 1-2 relevant technologies if tech stack is available
- End with a clear, low-friction call to action (e.g. "Would you be open to a 20-minute call?")
- tone_used: the tone you used ("professional", "casual", or "direct")
- data_sources_used: list which data was available (e.g. ["problems", "tech_stack", "contacts", "jobs"])
- Do NOT use generic phrases like "I am passionate about..." or "I would love to..."
- Do NOT include placeholder text — write a complete, ready-to-send email`;

export async function generateEmail(
  name: string,
  website: string,
  context: {
    contact?: { name: string; title: string } | null;
    problems: { title: string; opportunity: string }[];
    tech_stack: { name: string }[];
    job_postings: { title: string }[];
    tone: string;
  }
): Promise<EmailResult> {
  const provider = getProvider();

  const parts: string[] = [];
  if (context.contact) parts.push(`Recipient: ${context.contact.name}, ${context.contact.title}`);
  if (context.problems.length > 0) {
    parts.push(`Known Problems/Opportunities:\n${context.problems.map(p => `- ${p.title}: ${p.opportunity}`).join('\n')}`);
  }
  if (context.tech_stack.length > 0) {
    parts.push(`Tech Stack: ${context.tech_stack.map(t => t.name).join(', ')}`);
  }
  if (context.job_postings.length > 0) {
    parts.push(`Open Roles: ${context.job_postings.map(j => j.title).join(', ')}`);
  }

  const userPrompt = `Write a cold outreach email for a software engineer applying to this company:

Company: ${name}
Website: ${website}
Requested Tone: ${context.tone}

${parts.join('\n\n')}

Write a complete, specific, ready-to-send email. Do not use placeholder text.`;

  const response = await provider.chat(SYSTEM_PROMPT, userPrompt);
  recordTokens(response.prompt_tokens, response.completion_tokens);
  let cleaned = response.content.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  return JSON.parse(cleaned);
}
