import { useState, useMemo, useRef, useEffect } from 'react';
import { Company } from 'shared';

interface Props {
  companies: Company[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (name: string, website: string) => Promise<Company>;
  onDelete: (id: string) => void;
  onBulkAdd: () => void;
  onDiscover: () => void;
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

function CompanyMenu({ company, onDelete, onToggleShortlist }: {
  company: Company;
  onDelete: (id: string) => void;
  onToggleShortlist: (id: string, shortlisted: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(o => !o)}
        className="text-white font-bold opacity-0 group-hover:opacity-100 hover:text-amber-400 px-1 text-lg leading-none"
        title="Options"
      >
        ⋮
      </button>
      {open && (
        <div className="absolute right-0 top-5 z-50 bg-[#1a1a1a] border border-gray-800 min-w-[140px] shadow-lg">
          <button
            onClick={() => { onToggleShortlist(company.id, !company.shortlisted); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-gray-800 text-left"
          >
            <span className={company.shortlisted ? 'text-amber-400' : 'text-gray-400'}>
              {company.shortlisted ? '★' : '☆'}
            </span>
            <span className={company.shortlisted ? 'text-amber-400' : 'text-gray-400'}>
              {company.shortlisted ? 'Remove shortlist' : 'Add to shortlist'}
            </span>
          </button>
          <button
            onClick={() => { onDelete(company.id); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-gray-800 text-red-400 text-left border-t border-gray-800"
          >
            <span>×</span>
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ companies, selectedId, onSelect, onAdd, onDelete, onBulkAdd, onDiscover, onToggleShortlist }: Props) {
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
          className="w-full bg-[#111] border border-gray-700 text-gray-200 text-xs px-2 py-1.5 mb-1.5 focus:outline-none focus:border-amber-700"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <input
          type="text"
          placeholder="https://company.com (optional)"
          value={website}
          onChange={e => setWebsite(e.target.value)}
          className="w-full bg-[#111] border border-gray-700 text-gray-200 text-xs px-2 py-1.5 mb-2 focus:outline-none focus:border-amber-700"
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
        <button
          onClick={onDiscover}
          className="w-full mt-1.5 border border-cyan-800 hover:border-cyan-700 text-cyan-500 hover:text-cyan-300 text-xs py-1.5 uppercase tracking-wider"
        >
          ⌖ Discover by Location
        </button>
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
          <span className="text-xs text-gray-400 uppercase tracking-widest flex-1">
            {filteredAndSorted.length} companies
          </span>
          {/* All / Shortlisted toggle */}
          <button
            onClick={() => setShowShortlisted(false)}
            className={`text-xs px-1.5 py-0.5 border ${!showShortlisted ? 'border-amber-700 text-amber-400' : 'border-gray-800 text-gray-400 hover:text-gray-400'}`}
          >
            All
          </button>
          <button
            onClick={() => setShowShortlisted(true)}
            className={`text-xs px-1.5 py-0.5 border ${showShortlisted ? 'border-amber-700 text-amber-400' : 'border-gray-800 text-gray-400 hover:text-gray-400'}`}
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
              {!company.website.startsWith('unknown://') && (
                <div className="text-xs text-gray-400 truncate">{getDomain(company.website)}</div>
              )}
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              <span className={`text-xs border px-1 py-0.5 uppercase ${STATUS_COLORS[company.status] || STATUS_COLORS.pending}`}>
                {company.status}
              </span>
              {company.shortlisted && (
                <span className="text-amber-400 text-sm leading-none">★</span>
              )}
              <CompanyMenu company={company} onDelete={onDelete} onToggleShortlist={onToggleShortlist} />
            </div>
          </div>
        ))}
        {filteredAndSorted.length === 0 && (
          <div className="px-3 py-6 text-xs text-gray-400 text-center">
            {search || showShortlisted ? 'No matching companies' : 'No companies yet'}
          </div>
        )}
      </div>
    </aside>
  );
}
