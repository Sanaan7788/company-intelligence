import { Company } from 'shared';
import { TaskEntry } from '../types';

interface Props {
  companies: Company[];
  tasks: Record<string, TaskEntry>;
  onResearch: (id: string, force?: boolean) => void;
  onDelete: (id: string) => void;
  onSelectCompany: (id: string) => void;
  onNavigateToCompanies: () => void;
}

function getDomain(website: string): string {
  try {
    return new URL(website).hostname.replace(/^www\./, '');
  } catch {
    return website;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ResearchPage({ companies, tasks, onResearch, onDelete, onSelectCompany, onNavigateToCompanies }: Props) {
  const pending = companies.filter(c => c.status === 'pending');
  const researching = companies.filter(c => c.status === 'researching');
  const errored = companies.filter(c => c.status === 'error');
  const completed = companies
    .filter(c => c.status === 'done' && c.last_researched_at)
    .sort((a, b) => new Date(b.last_researched_at!).getTime() - new Date(a.last_researched_at!).getTime())
    .slice(0, 20);

  const handleResearchAll = () => {
    pending.forEach(c => onResearch(c.id));
  };

  const handleRetryAll = () => {
    errored.forEach(c => onResearch(c.id));
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Active tasks */}
      {researching.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-amber-400 uppercase tracking-widest font-bold animate-pulse">● Active Research</span>
            <span className="text-xs text-gray-600 border border-gray-800 px-1">{researching.length}</span>
          </div>
          <div className="space-y-2">
            {researching.map(c => {
              const task = tasks[c.id];
              return (
                <div key={c.id} className="flex items-center justify-between border border-amber-900/40 bg-amber-900/10 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm text-gray-200 truncate">{c.name}</div>
                      {!c.website.startsWith('unknown://') && (
                        <div className="text-xs text-gray-500">{getDomain(c.website)}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <span className="text-xs text-gray-500">{task?.taskType || 'Full Research'}</span>
                    <span className="text-xs text-amber-400 uppercase">Scanning...</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Pending queue */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">Pending Queue</span>
            <span className="text-xs text-gray-600 border border-gray-800 px-1">{pending.length}</span>
          </div>
          {pending.length > 0 && (
            <button
              onClick={handleResearchAll}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-black font-bold px-3 py-1.5 uppercase tracking-wider"
            >
              Research All ({pending.length})
            </button>
          )}
        </div>
        {pending.length === 0 ? (
          <div className="text-xs text-gray-600 py-6 text-center border border-gray-800">No companies waiting for research</div>
        ) : (
          <div className="space-y-1">
            {pending.map(c => (
              <div key={c.id} className="flex items-center justify-between border border-gray-800 hover:border-gray-700 px-4 py-2.5 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-gray-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs text-gray-200 truncate">{c.name}</div>
                    {!c.website.startsWith('unknown://') && (
                      <div className="text-xs text-gray-600">{getDomain(c.website)}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <button
                    onClick={() => { onSelectCompany(c.id); onNavigateToCompanies(); }}
                    className="text-xs text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-600 px-2 py-0.5"
                  >
                    View
                  </button>
                  <button
                    onClick={() => onResearch(c.id)}
                    className="text-xs text-amber-400 hover:text-amber-300 border border-amber-900 hover:border-amber-700 px-2 py-0.5"
                  >
                    Research
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Errors */}
      {errored.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400 uppercase tracking-widest font-bold">Failed</span>
              <span className="text-xs text-gray-600 border border-gray-800 px-1">{errored.length}</span>
            </div>
            <button
              onClick={handleRetryAll}
              className="text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-3 py-1.5 uppercase"
            >
              Retry All
            </button>
          </div>
          <div className="space-y-1">
            {errored.map(c => (
              <div key={c.id} className="flex items-center justify-between border border-red-900/40 bg-red-900/10 px-4 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-red-400 text-xs shrink-0">✗</span>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-200 truncate">{c.name}</div>
                    {!c.website.startsWith('unknown://') && (
                      <div className="text-xs text-gray-600">{getDomain(c.website)}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <button
                    onClick={() => { onSelectCompany(c.id); onNavigateToCompanies(); }}
                    className="text-xs text-gray-500 hover:text-gray-300 border border-gray-800 px-2 py-0.5"
                  >
                    View
                  </button>
                  <button
                    onClick={() => onResearch(c.id)}
                    className="text-xs text-red-400 hover:text-red-300 border border-red-900 px-2 py-0.5"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => onDelete(c.id)}
                    className="text-xs text-gray-600 hover:text-red-400 border border-gray-800 px-2 py-0.5"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Completed recent */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-emerald-400 uppercase tracking-widest font-bold">Recently Completed</span>
          <span className="text-xs text-gray-600 border border-gray-800 px-1">{completed.length}</span>
        </div>
        {completed.length === 0 ? (
          <div className="text-xs text-gray-600 py-6 text-center border border-gray-800">No completed research yet</div>
        ) : (
          <div className="space-y-1">
            {completed.map(c => (
              <div key={c.id} className="flex items-center justify-between border border-gray-800 hover:border-gray-700 px-4 py-2.5 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-emerald-400 text-xs shrink-0">✓</span>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-200 truncate">{c.name}</div>
                    {!c.website.startsWith('unknown://') && (
                      <div className="text-xs text-gray-600">{getDomain(c.website)}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <span className="text-xs text-gray-600">{timeAgo(c.last_researched_at!)}</span>
                  <button
                    onClick={() => { onSelectCompany(c.id); onNavigateToCompanies(); }}
                    className="text-xs text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-600 px-2 py-0.5"
                  >
                    View
                  </button>
                  <button
                    onClick={() => onResearch(c.id, true)}
                    className="text-xs text-gray-500 hover:text-amber-400 border border-gray-800 hover:border-amber-900 px-2 py-0.5"
                  >
                    Re-research
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
