import { useState, useMemo } from 'react';
import { Company } from 'shared';

interface Props {
  companies: Company[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (name: string, website: string) => Promise<Company>;
  onDelete: (id: string) => void;
  onBulkAdd: () => void;
  onToggleShortlist: (id: string, shortlisted: boolean) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-gray-500 border-gray-700',
  researching: 'text-amber-400 border-amber-700 animate-pulse',
  done: 'text-emerald-400 border-emerald-800',
  error: 'text-red-400 border-red-800',
};

type SortOption = 'newest' | 'oldest' | 'az' | 'za' | 'recent';

function getDomain(website: string): string {
  try {
    const url = new URL(website);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return website;
  }
}

export function Sidebar({ companies, selectedId, onSelect, onAdd, onDelete, onBulkAdd, onToggleShortlist }: Props) {
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [showShortlisted, setShowShortlisted] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() && !website.trim()) {
      setError('Name or website required');
      return;
    }
    setAdding(true);
    setError('');
    try {
      await onAdd(name.trim(), website.trim());
      setName('');
      setWebsite('');
    } catch (err: any) {
      setError(err.duplicate ? 'Already exists' : (err.message || 'Error'));
    } finally {
      setAdding(false);
    }
  };

  const filteredAndSorted = useMemo(() => {
    let list = [...companies];

    // Shortlist filter
    if (showShortlisted) {
      list = list.filter(c => c.shortlisted);
    }

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        getDomain(c.website).toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sort) {
      case 'newest':
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'az':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'za':
        list.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'recent':
        list.sort((a, b) => {
          const aTime = a.last_researched_at ? new Date(a.last_researched_at).getTime() : 0;
          const bTime = b.last_researched_at ? new Date(b.last_researched_at).getTime() : 0;
          return bTime - aTime;
        });
        break;
    }

    return list;
  }, [companies, search, sort, showShortlisted]);

  return (
    <aside className="w-72 flex flex-col border-r border-gray-800 bg-[#0d0d0d] overflow-hidden print:hidden">
      <div className="p-3 border-b border-gray-800">
        <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">Add Company</div>
        <input
          type="text"
          placeholder="Company name (optional)"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full bg-[#111] border border-gray-700 text-gray-200 text-xs px-2 py-1.5 mb-1.5 focus:outline-none focus:border-amber-600"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <input
          type="text"
          placeholder="https://company.com (optional)"
          value={website}
          onChange={e => setWebsite(e.target.value)}
          className="w-full bg-[#111] border border-gray-700 text-gray-200 text-xs px-2 py-1.5 mb-2 focus:outline-none focus:border-amber-600"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        {error && <div className="text-red-400 text-xs mb-2">{error}</div>}
        <div className="flex gap-1.5">
          <button
            onClick={handleAdd}
            disabled={adding}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-black text-xs py-1.5 font-bold uppercase tracking-wider disabled:opacity-50"
          >
            {adding ? '...' : 'Add'}
          </button>
          <button
            onClick={onBulkAdd}
            className="flex-1 border border-gray-600 hover:border-gray-400 text-gray-400 hover:text-gray-200 text-xs py-1.5 uppercase tracking-wider"
          >
            Bulk
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pt-2 pb-1 border-b border-gray-800">
        <input
          type="text"
          placeholder="Search by name or domain..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#111] border border-gray-700 text-gray-200 text-xs px-2 py-1.5 focus:outline-none focus:border-cyan-700 placeholder-gray-600"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Count + Sort + Filter row */}
        <div className="px-3 py-2 flex items-center gap-2 border-b border-gray-800">
          <span className="text-xs text-gray-600 uppercase tracking-widest flex-1">
            {filteredAndSorted.length} companies
          </span>
          {/* All / Shortlisted toggle */}
          <button
            onClick={() => setShowShortlisted(false)}
            className={`text-xs px-1.5 py-0.5 border ${!showShortlisted ? 'border-amber-700 text-amber-400' : 'border-gray-800 text-gray-600 hover:text-gray-400'}`}
          >
            All
          </button>
          <button
            onClick={() => setShowShortlisted(true)}
            className={`text-xs px-1.5 py-0.5 border ${showShortlisted ? 'border-amber-700 text-amber-400' : 'border-gray-800 text-gray-600 hover:text-gray-400'}`}
          >
            ★
          </button>
          {/* Sort dropdown */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortOption)}
            className="bg-[#111] border border-gray-700 text-gray-500 text-xs px-1 py-0.5 focus:outline-none focus:border-gray-500"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="az">A-Z</option>
            <option value="za">Z-A</option>
            <option value="recent">Researched</option>
          </select>
        </div>

        {filteredAndSorted.map(company => (
          <div
            key={company.id}
            onClick={() => onSelect(company.id)}
            className={`group flex items-center justify-between px-3 py-2.5 cursor-pointer border-b border-gray-800/50 hover:bg-gray-800/30 ${selectedId === company.id ? 'bg-gray-800/50 border-l-2 border-l-amber-500' : ''}`}
          >
            <div className="min-w-0 flex-1">
              <div className="text-xs text-gray-200 truncate">{company.name}</div>
              <div className="text-xs text-gray-600 truncate">{getDomain(company.website)}</div>
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              <span className={`text-xs border px-1 py-0.5 uppercase ${STATUS_COLORS[company.status] || STATUS_COLORS.pending}`}>
                {company.status}
              </span>
              {/* Shortlist star */}
              <button
                onClick={e => { e.stopPropagation(); onToggleShortlist(company.id, !company.shortlisted); }}
                className={`text-sm leading-none px-0.5 ${company.shortlisted ? 'text-amber-400' : 'text-gray-700 hover:text-gray-400'}`}
                title={company.shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
              >
                {company.shortlisted ? '★' : '☆'}
              </button>
              <button
                onClick={e => { e.stopPropagation(); onDelete(company.id); }}
                className="text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 text-xs px-1"
              >
                ×
              </button>
            </div>
          </div>
        ))}
        {filteredAndSorted.length === 0 && (
          <div className="px-3 py-6 text-xs text-gray-600 text-center">
            {search || showShortlisted ? 'No matching companies' : 'No companies yet'}
          </div>
        )}
      </div>
    </aside>
  );
}
