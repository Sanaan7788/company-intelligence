import { useState } from 'react';
import { Company } from 'shared';

interface Props {
  companies: Company[];
  onSelectCompany: (id: string) => void;
  onAddCompany: (name: string, website: string) => Promise<Company>;
  onBulkAdd: () => void;
  onDiscover: () => void;
  onNavigateToCompanies: () => void;
  onNavigateToResearch: () => void;
}

function getDomain(website: string): string {
  try {
    return new URL(website).hostname.replace(/^www\./, '');
  } catch {
    return website;
  }
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-gray-500 border-gray-700',
  researching: 'text-amber-400 border-amber-700 animate-pulse',
  done: 'text-emerald-400 border-emerald-800',
  error: 'text-red-400 border-red-800',
};

export function DashboardPage({ companies, onSelectCompany, onAddCompany, onBulkAdd, onDiscover, onNavigateToCompanies, onNavigateToResearch }: Props) {
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const total = companies.length;
  const done = companies.filter(c => c.status === 'done').length;
  const pending = companies.filter(c => c.status === 'pending').length;
  const researching = companies.filter(c => c.status === 'researching').length;
  const shortlisted = companies.filter(c => c.shortlisted).length;
  const errored = companies.filter(c => c.status === 'error').length;

  const shortlistedCompanies = companies.filter(c => c.shortlisted);
  const recentlyResearched = companies
    .filter(c => c.last_researched_at)
    .sort((a, b) => new Date(b.last_researched_at!).getTime() - new Date(a.last_researched_at!).getTime())
    .slice(0, 6);

  const handleAdd = async () => {
    if (!name.trim() && !website.trim()) { setError('Name or website required'); return; }
    setAdding(true);
    setError('');
    try {
      const company = await onAddCompany(name.trim(), website.trim());
      setName('');
      setWebsite('');
      onSelectCompany(company.id);
      onNavigateToCompanies();
    } catch (err: any) {
      setError(err.duplicate ? 'Already exists' : (err.message || 'Error'));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: total, color: 'text-gray-200', border: 'border-gray-700' },
          { label: 'Researched', value: done, color: 'text-emerald-400', border: 'border-emerald-900' },
          { label: 'Pending', value: pending, color: 'text-gray-400', border: 'border-gray-700' },
          { label: 'Running', value: researching, color: 'text-amber-400', border: 'border-amber-900', pulse: researching > 0 },
          { label: 'Shortlisted', value: shortlisted, color: 'text-amber-400', border: 'border-amber-900' },
          { label: 'Failed', value: errored, color: 'text-red-400', border: 'border-red-900' },
        ].map(stat => (
          <div key={stat.label} className={`border ${stat.border} bg-[#111] p-3`}>
            <div className={`text-2xl font-bold ${stat.color} ${(stat as any).pulse ? 'animate-pulse' : ''}`}>{stat.value}</div>
            <div className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Add companies — all 3 methods */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Single add */}
        <div className="border border-gray-800 bg-[#111] p-4">
          <div className="text-xs text-amber-400 uppercase tracking-widest mb-3">Add Company</div>
          <input
            type="text"
            placeholder="Company name (optional)"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="w-full bg-[#0a0a0a] border border-gray-700 text-gray-200 text-xs px-2 py-1.5 mb-2 focus:outline-none focus:border-amber-700"
          />
          <input
            type="text"
            placeholder="https://company.com (optional)"
            value={website}
            onChange={e => setWebsite(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="w-full bg-[#0a0a0a] border border-gray-700 text-gray-200 text-xs px-2 py-1.5 mb-3 focus:outline-none focus:border-amber-700"
          />
          {error && <div className="text-red-400 text-xs mb-2">{error}</div>}
          <button
            onClick={handleAdd}
            disabled={adding}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black text-xs py-2 font-bold uppercase tracking-wider disabled:opacity-50"
          >
            {adding ? 'Adding...' : 'Add Company'}
          </button>
        </div>

        {/* Bulk add */}
        <div className="border border-gray-800 bg-[#111] p-4 flex flex-col">
          <div className="text-xs text-amber-400 uppercase tracking-widest mb-2">Bulk Import</div>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Paste a list of companies — one per line. Accepts names, URLs, or both.<br />
            Duplicates are skipped automatically.
          </p>
          <button
            onClick={onBulkAdd}
            className="mt-auto w-full border border-gray-600 hover:border-amber-700 text-gray-400 hover:text-amber-400 text-xs py-2 uppercase tracking-wider transition-colors"
          >
            Open Bulk Import
          </button>
        </div>

        {/* Discover by location */}
        <div className="border border-cyan-900/40 bg-[#111] p-4 flex flex-col">
          <div className="text-xs text-cyan-500 uppercase tracking-widest mb-2">⌖ Discover by Location</div>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Enter a city, zip code, or region with an optional industry filter. AI will find real companies in that area.
          </p>
          <button
            onClick={onDiscover}
            className="mt-auto w-full border border-cyan-800 hover:border-cyan-600 text-cyan-500 hover:text-cyan-300 text-xs py-2 uppercase tracking-wider transition-colors"
          >
            Discover Companies
          </button>
        </div>
      </div>

      {/* Shortlisted */}
      <div className="border border-gray-800 bg-[#111] p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-amber-400 uppercase tracking-widest">★ Shortlisted</span>
          {shortlistedCompanies.length > 0 && (
            <button onClick={onNavigateToCompanies} className="text-xs text-gray-500 hover:text-gray-300">
              View all →
            </button>
          )}
        </div>
        {shortlistedCompanies.length === 0 ? (
          <div className="text-xs text-gray-600 py-4 text-center">No shortlisted companies yet — star companies from the Companies page</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {shortlistedCompanies.map(c => (
              <button
                key={c.id}
                onClick={() => { onSelectCompany(c.id); onNavigateToCompanies(); }}
                className="flex items-center justify-between p-2 border border-gray-800 hover:border-amber-800 text-left transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-xs text-gray-200 truncate">{c.name}</div>
                  {!c.website.startsWith('unknown://') && (
                    <div className="text-xs text-gray-600 truncate">{getDomain(c.website)}</div>
                  )}
                </div>
                <span className={`text-xs border px-1 py-0.5 uppercase ml-2 shrink-0 ${STATUS_COLORS[c.status]}`}>
                  {c.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recently Researched */}
      <div className="border border-gray-800 bg-[#111] p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-cyan-500 uppercase tracking-widest">Recently Researched</span>
          <button onClick={onNavigateToCompanies} className="text-xs text-gray-500 hover:text-gray-300">
            All companies →
          </button>
        </div>
        {recentlyResearched.length === 0 ? (
          <div className="text-xs text-gray-600 py-4 text-center">No companies researched yet</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {recentlyResearched.map(c => (
              <button
                key={c.id}
                onClick={() => { onSelectCompany(c.id); onNavigateToCompanies(); }}
                className="flex items-center justify-between p-2 border border-gray-800 hover:border-cyan-900 text-left transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-xs text-gray-200 truncate">{c.name}</div>
                  <div className="text-xs text-gray-600">
                    {daysSince(c.last_researched_at!) === 0 ? 'today' : `${daysSince(c.last_researched_at!)}d ago`}
                  </div>
                </div>
                {c.shortlisted && <span className="text-amber-400 text-sm ml-2 shrink-0">★</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Needs attention */}
      {(pending > 0 || errored > 0) && (
        <div className="border border-gray-800 bg-[#111] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-400 uppercase tracking-widest">Needs Attention</span>
            <button onClick={onNavigateToResearch} className="text-xs text-amber-400 hover:text-amber-300">
              Go to Research →
            </button>
          </div>
          <div className="flex gap-6 text-xs text-gray-500">
            {pending > 0 && <span><span className="text-gray-300 font-bold">{pending}</span> companies awaiting research</span>}
            {errored > 0 && <span><span className="text-red-400 font-bold">{errored}</span> research failures</span>}
          </div>
        </div>
      )}
    </div>
  );
}
