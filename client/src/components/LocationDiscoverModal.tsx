import { useState } from 'react';
import { BulkAddResult } from 'shared';

interface DiscoveredCompany {
  name: string;
  website: string;
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function LocationDiscoverModal({ onClose, onSuccess }: Props) {
  const [location, setLocation] = useState('');
  const [industry, setIndustry] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveredCompany[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<BulkAddResult[]>([]);
  const [error, setError] = useState('');

  const handleDiscover = async () => {
    if (!location.trim()) {
      setError('Location is required');
      return;
    }
    setError('');
    setDiscovering(true);
    setDiscovered([]);
    setSelected(new Set());
    setResults([]);

    try {
      const res = await fetch('/api/companies/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: location.trim(), industry: industry.trim() }),
      });
      if (!res.ok) throw new Error('Discovery failed');
      const data = await res.json();
      setDiscovered(data.companies || []);
      // Select all by default
      setSelected(new Set((data.companies || []).map((_: DiscoveredCompany, i: number) => i)));
    } catch (err: any) {
      setError(err.message || 'Discovery failed');
    } finally {
      setDiscovering(false);
    }
  };

  const toggleSelect = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === discovered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(discovered.map((_, i) => i)));
    }
  };

  const handleImport = async () => {
    const toImport = discovered.filter((_, i) => selected.has(i));
    if (toImport.length === 0) return;

    setImporting(true);
    try {
      const res = await fetch('/api/companies/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toImport),
      });
      if (!res.ok) throw new Error('Import failed');
      const data: BulkAddResult[] = await res.json();
      setResults(data);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const STATUS_STYLES: Record<string, string> = {
    success: 'text-emerald-400',
    duplicate: 'text-amber-400',
    error: 'text-red-400',
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#111] border border-gray-700 w-full max-w-lg p-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-amber-400 uppercase tracking-widest">Discover by Location</span>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 text-lg">×</button>
        </div>

        {/* Inputs */}
        <div className="space-y-2 mb-3">
          <input
            type="text"
            placeholder="City or zip code (e.g. Austin TX, 10001, San Francisco)"
            value={location}
            onChange={e => setLocation(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleDiscover()}
            className="w-full bg-[#0a0a0a] border border-gray-700 text-gray-200 text-xs px-2 py-2 focus:outline-none focus:border-amber-700"
          />
          <input
            type="text"
            placeholder="Industry filter (optional — e.g. fintech, healthcare, SaaS)"
            value={industry}
            onChange={e => setIndustry(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleDiscover()}
            className="w-full bg-[#0a0a0a] border border-gray-700 text-gray-200 text-xs px-2 py-2 focus:outline-none focus:border-amber-700"
          />
        </div>

        {error && <div className="text-red-400 text-xs mb-2">{error}</div>}

        <button
          onClick={handleDiscover}
          disabled={discovering || !location.trim()}
          className="w-full bg-amber-500 hover:bg-amber-600 text-black text-xs py-2 font-bold uppercase tracking-wider disabled:opacity-50 mb-3"
        >
          {discovering ? 'Scanning...' : 'Discover Companies'}
        </button>

        {/* Results */}
        {discovered.length > 0 && results.length === 0 && (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">{discovered.length} companies found</span>
              <button
                onClick={toggleAll}
                className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-2 py-0.5"
              >
                {selected.size === discovered.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 mb-3 min-h-0">
              {discovered.map((c, i) => (
                <div
                  key={i}
                  onClick={() => toggleSelect(i)}
                  className={`flex items-center gap-2 px-2 py-2 cursor-pointer border text-xs ${selected.has(i) ? 'border-amber-700 bg-amber-900/20' : 'border-gray-800 hover:border-gray-700'}`}
                >
                  <span className={`w-3 h-3 border flex-shrink-0 flex items-center justify-center ${selected.has(i) ? 'border-amber-700 text-amber-400' : 'border-gray-600'}`}>
                    {selected.has(i) && '✓'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-gray-200 truncate">{c.name}</div>
                    {c.website && <div className="text-gray-400 truncate">{c.website}</div>}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleImport}
              disabled={importing || selected.size === 0}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black text-xs py-2 font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {importing ? 'Importing...' : `Import ${selected.size} Companies`}
            </button>
          </>
        )}

        {/* Import results */}
        {results.length > 0 && (
          <div className="border-t border-gray-800 pt-3">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">Import Results</div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-300 truncate">{r.name}</span>
                  <span className={`uppercase ml-2 ${STATUS_STYLES[r.status]}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
