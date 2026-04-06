import type { Company, CompanyProfile, BulkAddResult, ScoringCriteria, EmailDraft } from 'shared';

const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function fetchCompanies(): Promise<Company[]> {
  const res = await fetch(`${BASE_URL}/api/companies`);
  if (!res.ok) throw new Error('Failed to fetch companies');
  return res.json();
}

export async function fetchCompanyProfile(id: string): Promise<CompanyProfile> {
  const res = await fetch(`${BASE_URL}/api/companies/${id}`);
  if (!res.ok) throw new Error('Failed to fetch company profile');
  return res.json();
}

export async function addCompany(name: string, website: string): Promise<Company> {
  const res = await fetch(`${BASE_URL}/api/companies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, website }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw Object.assign(new Error(err.error || 'Failed to add company'), { duplicate: err.duplicate });
  }
  return res.json();
}

export async function bulkAddCompanies(companies: { name: string; website: string }[]): Promise<BulkAddResult[]> {
  const res = await fetch(`${BASE_URL}/api/companies/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(companies),
  });
  if (!res.ok) throw new Error('Failed to bulk add companies');
  return res.json();
}

export async function deleteCompany(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/companies/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete company');
}

export async function triggerResearch(id: string, force = false): Promise<void> {
  const url = `${BASE_URL}/api/companies/${id}/research${force ? '?force=true' : ''}`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to trigger research');
}

export async function triggerNewsRefresh(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/companies/${id}/research/news`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to trigger news refresh');
}

export async function triggerProblemsRefresh(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/companies/${id}/research/problems`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to trigger problems refresh');
}

export async function triggerTechStackResearch(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/companies/${id}/research/techstack`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to trigger tech stack detection');
}

export async function triggerJobsResearch(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/companies/${id}/research/jobs`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to trigger job search');
}

export async function triggerContactsResearch(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/companies/${id}/research/contacts`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to trigger contact search');
}

export async function triggerInterviewIntel(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/companies/${id}/research/intel`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to trigger interview intel');
}

export async function triggerScoring(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/scoring/${id}`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to trigger scoring');
}

export async function fetchScoringCriteria(): Promise<{ criteria: ScoringCriteria } | null> {
  const res = await fetch(`${BASE_URL}/api/scoring/criteria`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch scoring criteria');
  return res.json();
}

export async function saveScoringCriteria(criteria: ScoringCriteria): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/scoring/criteria`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ criteria }),
  });
  if (!res.ok) throw new Error('Failed to save scoring criteria');
}

export async function generateEmail(id: string, tone: string, contactId?: string): Promise<EmailDraft> {
  const res = await fetch(`${BASE_URL}/api/companies/${id}/email/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tone, contact_id: contactId }),
  });
  if (!res.ok) throw new Error('Failed to generate email');
  return res.json();
}

export async function updateEmailDraft(id: string, subject: string, body: string): Promise<EmailDraft> {
  const res = await fetch(`${BASE_URL}/api/companies/${id}/email`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, body }),
  });
  if (!res.ok) throw new Error('Failed to save email draft');
  return res.json();
}

export async function updateTags(id: string, tags: string[]): Promise<Company> {
  const res = await fetch(`${BASE_URL}/api/companies/${id}/tags`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tags }),
  });
  if (!res.ok) throw new Error('Failed to update tags');
  return res.json();
}

export async function updateWebsite(id: string, website: string): Promise<Company> {
  const res = await fetch(`${BASE_URL}/api/companies/${id}/website`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ website }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update website');
  }
  return res.json();
}

export async function toggleShortlist(id: string, shortlisted: boolean): Promise<Company> {
  const res = await fetch(`${BASE_URL}/api/companies/${id}/shortlist`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shortlisted }),
  });
  if (!res.ok) throw new Error('Failed to update shortlist');
  return res.json();
}

export async function fetchProvider(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/config/provider`);
  if (!res.ok) return 'unknown';
  const data = await res.json();
  return data.provider;
}

export async function fetchTokenStats(): Promise<{ prompt_tokens: number; completion_tokens: number; total_tokens: number; total_calls: number }> {
  const res = await fetch(`${BASE_URL}/api/config/tokens`);
  if (!res.ok) return { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, total_calls: 0 };
  return res.json();
}
