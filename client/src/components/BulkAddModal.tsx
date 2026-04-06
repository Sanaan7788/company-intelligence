import { useState } from 'react';
import { BulkAddResult } from 'shared';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  bulkAdd: (companies: { name: string; website: string }[]) => Promise<BulkAddResult[]>;
}

export function BulkAddModal({ onClose, onSuccess, bulkAdd }: Props) {
  const [text, setText] = useState('');
  const [results, setResults] = useState<BulkAddResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const lines = text.trim().split('\n').filter(l => l.trim());
    const companies = lines.map(line => {
      const parts = line.split('|').map(p => p.trim());
      return { name: parts[0] || '', website: parts[1] || '' };
    });

    setLoading(true);
    try {
      const res = await bulkAdd(companies);
      setResults(res);
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  const STATUS_STYLES: Record<string, string> = {
    success: 'text-emerald-400',
    duplicate: 'text-amber-400',
    error: 'text-red-400',
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#111] border border-gray-700 w-full max-w-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-amber-400 uppercase tracking-widest">Bulk Add Companies</span>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 text-lg">×</button>
        </div>
        <div className="text-xs text-gray-500 mb-2">One per line: <span className="text-gray-400">Company Name | https://website.com</span></div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={"Stripe | https://stripe.com\nVercel | https://vercel.com"}
          rows={8}
          className="w-full bg-[#0a0a0a] border border-gray-700 text-gray-200 text-xs px-2 py-2 focus:outline-none focus:border-amber-700 resize-none font-mono mb-3"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !text.trim()}
          className="w-full bg-amber-500 hover:bg-amber-600 text-black text-xs py-2 font-bold uppercase tracking-wider disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Import'}
        </button>

        {results.length > 0 && (
          <div className="mt-3 border-t border-gray-800 pt-3">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">Results</div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-300 truncate">{r.name}</span>
                  <span className={`uppercase ml-2 ${STATUS_STYLES[r.status]}`}>
                    {r.status}{r.status === 'error' ? `: ${r.error}` : ''}
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
