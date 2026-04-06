import type { Company, CompanyProfile, BulkAddResult } from 'shared';

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

export async function fetchProvider(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/config/provider`);
  if (!res.ok) return 'unknown';
  const data = await res.json();
  return data.provider;
}
