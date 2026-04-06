import { useState } from 'react';
import { Company } from 'shared';

interface Props {
  companies: Company[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (name: string, website: string) => Promise<Company>;
  onDelete: (id: string) => void;
  onBulkAdd: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-gray-500 border-gray-700',
  researching: 'text-amber-400 border-amber-700 animate-pulse',
  done: 'text-emerald-400 border-emerald-800',
  error: 'text-red-400 border-red-800',
};

function getDomain(website: string): string {
  try {
    const url = new URL(website);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return website;
  }
}

export function Sidebar({ companies, selectedId, onSelect, onAdd, onDelete, onBulkAdd }: Props) {
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

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

  return (
    <aside className="w-72 flex flex-col border-r border-gray-800 bg-[#0d0d0d] overflow-hidden">
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

      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-2 text-xs text-gray-600 uppercase tracking-widest border-b border-gray-800">
          {companies.length} companies
        </div>
        {companies.map(company => (
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
              <button
                onClick={e => { e.stopPropagation(); onDelete(company.id); }}
                className="text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 text-xs px-1"
              >
                ×
              </button>
            </div>
          </div>
        ))}
        {companies.length === 0 && (
          <div className="px-3 py-6 text-xs text-gray-600 text-center">No companies yet</div>
        )}
      </div>
    </aside>
  );
}
