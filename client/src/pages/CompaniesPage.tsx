import { useState, useMemo } from 'react';
import { Company, CompanyProfile } from 'shared';
import { ProfilePanel } from '../components/ProfilePanel';

interface Props {
  companies: Company[];
  selectedId: string | null;
  profile: CompanyProfile | null;
  profileLoading: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleShortlist: (id: string, shortlisted: boolean) => void;
  onResearch: (id: string, force?: boolean) => void;
  onNewsRefresh: (id: string) => void;
  onProblemsRefresh: (id: string) => void;
  onTechStackRefresh?: () => void;
  onJobsRefresh?: () => void;
  onContactsRefresh?: () => void;
  onInterviewIntelRefresh?: () => void;
  onUpdateTags: (id: string, tags: string[]) => Promise<void>;
  onUpdateWebsite: (id: string, website: string) => Promise<void>;
  onRefreshProfile: () => void;
}

type SortOption = 'newest' | 'oldest' | 'az' | 'za' | 'recent';
type StatusFilter = 'all' | 'pending' | 'researching' | 'done' | 'error';

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-gray-500 border-gray-700',
  researching: 'text-amber-400 border-amber-700 animate-pulse',
  done: 'text-emerald-400 border-emerald-800',
  error: 'text-red-400 border-red-800',
};

function getDomain(website: string): string {
  try {
    return new URL(website).hostname.replace(/^www\./, '');
  } catch {
    return website;
  }
}

export function CompaniesPage({
  companies, selectedId, profile, profileLoading,
  onSelect, onDelete, onToggleShortlist,
  onResearch, onNewsRefresh, onProblemsRefresh,
  onTechStackRefresh, onJobsRefresh, onContactsRefresh, onInterviewIntelRefresh,
  onUpdateTags, onUpdateWebsite, onRefreshProfile,
}: Props) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showShortlisted, setShowShortlisted] = useState(false);

  const filtered = useMemo(() => {
    let list = [...companies];
    if (showShortlisted) list = list.filter(c => c.shortlisted);
    if (statusFilter !== 'all') list = list.filter(c => c.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) || getDomain(c.website).toLowerCase().includes(q)
      );
    }
    switch (sort) {
      case 'newest': list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
      case 'oldest': list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
      case 'az': list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'za': list.sort((a, b) => b.name.localeCompare(a.name)); break;
      case 'recent': list.sort((a, b) => {
        const aT = a.last_researched_at ? new Date(a.last_researched_at).getTime() : 0;
        const bT = b.last_researched_at ? new Date(b.last_researched_at).getTime() : 0;
        return bT - aT;
      }); break;
    }
    return list;
  }, [companies, search, sort, statusFilter, showShortlisted]);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left panel — filters + list only */}
      <div className="w-72 shrink-0 flex flex-col border-r border-gray-800 bg-[#0d0d0d] overflow-hidden">
        {/* Search + filters */}
        <div className="p-3 border-b border-gray-800 shrink-0 space-y-2">
          <input
            type="text"
            placeholder="Search by name or domain..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#111] border border-gray-700 text-gray-200 text-xs px-2 py-1.5 focus:outline-none focus:border-cyan-700 placeholder-gray-600"
          />
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setShowShortlisted(false)}
              className={`text-xs px-1.5 py-0.5 border ${!showShortlisted ? 'border-amber-700 text-amber-400' : 'border-gray-800 text-gray-500 hover:text-gray-400'}`}
            >
              All
            </button>
            <button
              onClick={() => setShowShortlisted(true)}
              className={`text-xs px-1.5 py-0.5 border ${showShortlisted ? 'border-amber-700 text-amber-400' : 'border-gray-800 text-gray-500 hover:text-gray-400'}`}
            >
              ★
            </button>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as StatusFilter)}
              className="bg-[#111] border border-gray-700 text-gray-500 text-xs px-1 py-0.5 focus:outline-none ml-auto"
            >
              <option value="all">All status</option>
              <option value="pending">Pending</option>
              <option value="researching">Researching</option>
              <option value="done">Done</option>
              <option value="error">Error</option>
            </select>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortOption)}
              className="bg-[#111] border border-gray-700 text-gray-500 text-xs px-1 py-0.5 focus:outline-none"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="az">A-Z</option>
              <option value="za">Z-A</option>
              <option value="recent">Researched</option>
            </select>
          </div>
          <div className="text-xs text-gray-600">{filtered.length} of {companies.length} companies</div>
        </div>

        {/* Company list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map(company => (
            <div
              key={company.id}
              onClick={() => onSelect(company.id)}
              className={`group flex items-center justify-between px-3 py-2.5 cursor-pointer border-b border-gray-800/50 hover:bg-gray-800/30 ${selectedId === company.id ? 'bg-gray-800/50 border-l-2 border-l-amber-500' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <div className="text-xs text-gray-200 truncate">{company.name}</div>
                {!company.website.startsWith('unknown://') && (
                  <div className="text-xs text-gray-500 truncate">{getDomain(company.website)}</div>
                )}
              </div>
              <div className="flex items-center gap-1.5 ml-2 shrink-0">
                <span className={`text-xs border px-1 py-0.5 uppercase ${STATUS_COLORS[company.status] || STATUS_COLORS.pending}`}>
                  {company.status}
                </span>
                {company.shortlisted && <span className="text-amber-400 text-sm">★</span>}
                <button
                  onClick={e => { e.stopPropagation(); onToggleShortlist(company.id, !company.shortlisted); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-amber-400 text-xs px-1"
                  title={company.shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
                >
                  {company.shortlisted ? '★' : '☆'}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onDelete(company.id); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs px-1"
                  title="Delete"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-xs text-gray-600 text-center">
              {search || showShortlisted || statusFilter !== 'all' ? 'No matching companies' : 'No companies yet — add them from the Dashboard'}
            </div>
          )}
        </div>
      </div>

      {/* Right panel — profile */}
      <ProfilePanel
        profile={profile}
        loading={profileLoading}
        onResearch={onResearch}
        onRefresh={onRefreshProfile}
        onNewsRefresh={selectedId ? () => onNewsRefresh(selectedId) : undefined}
        onProblemsRefresh={selectedId ? () => onProblemsRefresh(selectedId) : undefined}
        onTechStackRefresh={onTechStackRefresh}
        onJobsRefresh={onJobsRefresh}
        onContactsRefresh={onContactsRefresh}
        onInterviewIntelRefresh={onInterviewIntelRefresh}
        onUpdateTags={onUpdateTags}
        onUpdateWebsite={onUpdateWebsite}
      />
    </div>
  );
}
