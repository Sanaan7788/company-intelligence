import { useState, useRef } from 'react';
import { CompanyProfile, NewsItem, ProblemStatement } from 'shared';

interface Props {
  profile: CompanyProfile | null;
  loading: boolean;
  onResearch: (id: string, force?: boolean) => void;
  onRefresh?: () => void;
  onNewsRefresh?: () => void;
  onProblemsRefresh?: () => void;
  onUpdateTags?: (id: string, tags: string[]) => Promise<void>;
  onUpdateWebsite?: (id: string, website: string) => Promise<void>;
}

const SOURCE_COLORS: Record<string, string> = {
  reddit: 'text-orange-400 border-orange-800',
  linkedin: 'text-blue-400 border-blue-800',
  blog: 'text-purple-400 border-purple-800',
  article: 'text-cyan-400 border-cyan-800',
  hackernews: 'text-amber-400 border-amber-800',
  other: 'text-gray-400 border-gray-700',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  low: 'text-emerald-400 border-emerald-800',
  medium: 'text-amber-400 border-amber-800',
  high: 'text-red-400 border-red-800',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-gray-500 border-gray-700',
  researching: 'text-amber-400 border-amber-700',
  done: 'text-emerald-400 border-emerald-800',
  error: 'text-red-400 border-red-800',
};

type NewsFilter = 'all' | 'reddit' | 'linkedin' | 'blog' | 'article' | 'hackernews';

function daysSince(dateStr: string): number {
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <div className="border border-gray-800 p-3 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-sm text-gray-200 leading-snug">{item.title}</span>
        <span className={`text-xs border px-1 py-0.5 uppercase whitespace-nowrap ${SOURCE_COLORS[item.source_type] || SOURCE_COLORS.other}`}>
          {item.source_type}
        </span>
      </div>
      {item.summary && <p className="text-xs text-gray-500 mb-2 leading-relaxed">{item.summary}</p>}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {item.source_name && <span className="text-xs text-gray-400">{item.source_name}</span>}
          {item.published_at && <span className="text-xs text-gray-700">{item.published_at}</span>}
        </div>
        {item.source_url && (
          <a href={item.source_url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-cyan-500 hover:text-cyan-300 underline">
            View Source →
          </a>
        )}
      </div>
    </div>
  );
}

function ProblemCard({ item }: { item: ProblemStatement }) {
  return (
    <div className="border border-gray-800 p-3 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm text-gray-200 font-medium leading-snug">{item.title}</span>
        <span className={`text-xs border px-1.5 py-0.5 uppercase whitespace-nowrap ${DIFFICULTY_COLORS[item.difficulty] || DIFFICULTY_COLORS.medium}`}>
          {item.difficulty}
        </span>
      </div>
      <div className="mb-2">
        <span className="text-xs text-gray-500 uppercase tracking-wider">Problem</span>
        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.description}</p>
      </div>
      <div className="mb-2 border-l-2 border-amber-700 pl-2">
        <span className="text-xs text-amber-400 uppercase tracking-wider">Opportunity</span>
        <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">{item.opportunity}</p>
      </div>
      {item.source_url && (
        <a href={item.source_url} target="_blank" rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-cyan-500">
          via {item.source_name || item.source_url} →
        </a>
      )}
    </div>
  );
}

export function ProfilePanel({ profile, loading, onResearch, onRefresh, onNewsRefresh, onProblemsRefresh, onUpdateTags, onUpdateWebsite }: Props) {
  const [newsFilter, setNewsFilter] = useState<NewsFilter>('all');
  const [problemsOpen, setProblemsOpen] = useState(true);
  const [newsOpen, setNewsOpen] = useState(true);
  const [tagInput, setTagInput] = useState('');
  const [savingTags, setSavingTags] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const [editingWebsite, setEditingWebsite] = useState(false);
  const [websiteInput, setWebsiteInput] = useState('');
  const [savingWebsite, setSavingWebsite] = useState(false);

  if (!profile && !loading) {
    return (
      <main className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        Select a company to view its intelligence profile
      </main>
    );
  }

  if (loading && !profile) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-amber-400 text-xs uppercase tracking-widest animate-pulse">Loading profile...</div>
      </main>
    );
  }

  if (!profile) return null;

  const { company, news, problems } = profile;

  const filteredNews = newsFilter === 'all'
    ? news
    : news.filter(n => n.source_type === newsFilter);

  const newsTypes = ['all', ...Array.from(new Set(news.map(n => n.source_type)))] as NewsFilter[];

  const researchAgeDays = company.last_researched_at ? daysSince(company.last_researched_at) : null;
  const showAgeWarning = researchAgeDays !== null && researchAgeDays > 30;

  const handleAddTag = async (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || !onUpdateTags) return;
    const currentTags = company.tags || [];
    if (currentTags.includes(trimmed)) {
      setTagInput('');
      return;
    }
    setSavingTags(true);
    try {
      await onUpdateTags(company.id, [...currentTags, trimmed]);
      setTagInput('');
    } finally {
      setSavingTags(false);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!onUpdateTags) return;
    const currentTags = company.tags || [];
    setSavingTags(true);
    try {
      await onUpdateTags(company.id, currentTags.filter(t => t !== tag));
    } finally {
      setSavingTags(false);
    }
  };

  const handleExportPDF = () => {
    const original = document.title;
    document.title = company.name;
    window.print();
    document.title = original;
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-lg text-gray-200 font-bold">{company.name}</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            {editingWebsite ? (
              <>
                <input
                  type="text"
                  value={websiteInput}
                  onChange={e => setWebsiteInput(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key === 'Enter') {
                      setSavingWebsite(true);
                      try { await onUpdateWebsite?.(company.id, websiteInput); setEditingWebsite(false); }
                      finally { setSavingWebsite(false); }
                    }
                    if (e.key === 'Escape') setEditingWebsite(false);
                  }}
                  autoFocus
                  className="bg-[#111] border border-amber-700 text-cyan-400 text-xs px-2 py-0.5 focus:outline-none w-64"
                />
                <button
                  onClick={async () => {
                    setSavingWebsite(true);
                    try { await onUpdateWebsite?.(company.id, websiteInput); setEditingWebsite(false); }
                    finally { setSavingWebsite(false); }
                  }}
                  disabled={savingWebsite}
                  className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                >
                  {savingWebsite ? '...' : '✓'}
                </button>
                <button onClick={() => setEditingWebsite(false)} className="text-xs text-gray-500 hover:text-gray-300">✕</button>
              </>
            ) : (
              <>
                {!company.website.startsWith('unknown://') ? (
                  <a href={company.website} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-cyan-500 hover:text-cyan-300">
                    {company.website} ↗
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">No website</span>
                )}
                <button
                  onClick={() => { setWebsiteInput(company.website.startsWith('unknown://') ? '' : company.website); setEditingWebsite(true); }}
                  className="text-sm border border-gray-700 hover:border-amber-700 text-gray-400 hover:text-amber-400 px-2 py-0.5"
                  title="Edit website"
                >
                  ✎ edit
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-xs border px-1.5 py-0.5 uppercase ${STATUS_COLORS[company.status] || STATUS_COLORS.pending}`}>
              {company.status}
            </span>
            {company.last_researched_at && (
              <span className="text-xs text-gray-400">
                Last researched: {new Date(company.last_researched_at).toLocaleString()}
              </span>
            )}
            {showAgeWarning && (
              <span className="text-xs text-amber-400 border border-amber-700 px-1.5 py-0.5">
                ⚠ Research is {researchAgeDays} days old
              </span>
            )}
          </div>

          {/* Tags */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {(company.tags || []).map(tag => (
              <span key={tag} className="flex items-center gap-1 text-xs border border-gray-700 text-gray-400 px-1.5 py-0.5">
                {tag}
                {onUpdateTags && (
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-gray-600 hover:text-red-400 leading-none"
                    disabled={savingTags}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
            {onUpdateTags && (
              <input
                ref={tagInputRef}
                type="text"
                placeholder="+ tag"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(tagInput);
                  }
                }}
                disabled={savingTags}
                className="bg-transparent border border-gray-700 text-gray-400 text-xs px-1.5 py-0.5 w-16 focus:outline-none focus:border-amber-700 placeholder-gray-700"
              />
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap justify-end">
          {(company.status === 'done' || company.status === 'error') && (
            <button
              onClick={() => onResearch(company.id, true)}
              className="text-xs border border-amber-700 text-amber-400 hover:bg-amber-900/20 px-3 py-1.5 uppercase tracking-wider print:hidden"
            >
              Re-research
            </button>
          )}
          <button
            onClick={handleExportPDF}
            className="text-xs border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 px-3 py-1.5 uppercase tracking-wider print:hidden"
          >
            Export PDF
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-xs border border-gray-700 text-gray-500 hover:text-gray-300 px-3 py-1.5 print:hidden"
            >
              ↻
            </button>
          )}
        </div>
      </div>

      {/* Pending state */}
      {company.status === 'pending' && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-sm mb-4">No research data yet</div>
          <button
            onClick={() => onResearch(company.id)}
            className="bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold uppercase tracking-widest px-6 py-2 print:hidden"
          >
            Start Research
          </button>
        </div>
      )}

      {/* Researching state */}
      {company.status === 'researching' && (
        <div className="text-center py-12">
          <div className="text-amber-400 text-xs uppercase tracking-widest animate-pulse mb-2">
            ● Agent is scanning sources...
          </div>
          <div className="text-gray-400 text-xs">This may take 30–60 seconds</div>
        </div>
      )}

      {/* Error state */}
      {company.status === 'error' && (
        <div className="border border-red-900 bg-red-950/20 p-4">
          <div className="text-red-400 text-xs uppercase tracking-wider mb-2">Research Failed</div>
          <p className="text-gray-500 text-xs mb-3">The research agent encountered an error.</p>
          <button
            onClick={() => onResearch(company.id)}
            className="text-xs border border-red-900 text-red-400 hover:bg-red-950/20 px-3 py-1.5 uppercase print:hidden"
          >
            Retry
          </button>
        </div>
      )}

      {/* Done state — show data */}
      {company.status === 'done' && (
        <>
          {/* Problem Statements */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setProblemsOpen(o => !o)}
                className="flex items-center gap-2 flex-1 text-left group"
              >
                <span className="text-xs text-amber-400 uppercase tracking-widest font-bold">Problem Statements</span>
                <span className="text-xs text-gray-400 border border-gray-800 px-1">{problems.length}</span>
                <span className="text-xs text-gray-400 group-hover:text-gray-300">{problemsOpen ? '▲' : '▼'}</span>
              </button>
              {onProblemsRefresh && (
                <button
                  onClick={onProblemsRefresh}
                  className="text-xs text-gray-400 hover:text-amber-400 border border-gray-800 hover:border-amber-800 px-1.5 py-0.5 print:hidden"
                  title="Refresh problem statements"
                >
                  ↻ Problems
                </button>
              )}
            </div>
            {problemsOpen && (
              problems.length === 0 ? (
                <div className="text-xs text-gray-400">No problem statements found</div>
              ) : (
                <div className="space-y-2">
                  {problems.map(p => <ProblemCard key={p.id} item={p} />)}
                </div>
              )
            )}
          </section>

          {/* News Feed */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setNewsOpen(o => !o)}
                className="flex items-center gap-2 flex-1 text-left group"
              >
                <span className="text-xs text-cyan-500 uppercase tracking-widest font-bold">News Feed</span>
                <span className="text-xs text-gray-400 border border-gray-800 px-1">{news.length}</span>
                <span className="text-xs text-gray-400 group-hover:text-gray-300">{newsOpen ? '▲' : '▼'}</span>
              </button>
              {onNewsRefresh && (
                <button
                  onClick={onNewsRefresh}
                  className="text-xs text-gray-400 hover:text-cyan-500 border border-gray-800 hover:border-cyan-800 px-1.5 py-0.5 print:hidden"
                  title="Refresh news feed"
                >
                  ↻ News
                </button>
              )}
            </div>
            {newsOpen && (
              <>
                <div className="flex gap-1 mb-3 flex-wrap print:hidden">
                  {newsTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => setNewsFilter(type)}
                      className={`text-xs px-2 py-0.5 uppercase border ${newsFilter === type ? 'border-cyan-700 text-cyan-500' : 'border-gray-800 text-gray-400 hover:text-gray-300'}`}
                    >
                      {type} {type === 'all' ? `(${news.length})` : `(${news.filter(n => n.source_type === type).length})`}
                    </button>
                  ))}
                </div>
                {filteredNews.length === 0 ? (
                  <div className="text-xs text-gray-400">No news items for this filter</div>
                ) : (
                  <div className="space-y-2">
                    {filteredNews.map(n => <NewsCard key={n.id} item={n} />)}
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}
    </main>
  );
}
