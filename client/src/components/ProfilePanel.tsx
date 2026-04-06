import { useState, useRef } from 'react';
import { CompanyProfile, NewsItem, ProblemStatement, TechStackItem, JobPosting, Contact, InterviewIntel, EmailDraft, ScoringCriteria } from 'shared';
import { generateEmail, updateEmailDraft, saveScoringCriteria, fetchScoringCriteria, triggerScoring } from '../api';

interface Props {
  profile: CompanyProfile | null;
  loading: boolean;
  onResearch: (id: string, force?: boolean) => void;
  onRefresh?: () => void;
  onNewsRefresh?: () => void;
  onProblemsRefresh?: () => void;
  onTechStackRefresh?: () => void;
  onJobsRefresh?: () => void;
  onContactsRefresh?: () => void;
  onInterviewIntelRefresh?: () => void;
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

const CATEGORY_COLORS: Record<string, string> = {
  frontend: 'text-blue-400 border-blue-900',
  backend: 'text-emerald-400 border-emerald-900',
  infra: 'text-orange-400 border-orange-900',
  data: 'text-purple-400 border-purple-900',
  mobile: 'text-cyan-400 border-cyan-900',
  devtools: 'text-gray-400 border-gray-700',
  other: 'text-gray-500 border-gray-800',
};

const SENIORITY_COLORS: Record<string, string> = {
  junior: 'text-emerald-400 border-emerald-900',
  mid: 'text-cyan-400 border-cyan-900',
  senior: 'text-amber-400 border-amber-900',
  staff: 'text-orange-400 border-orange-900',
  lead: 'text-red-400 border-red-900',
  unknown: 'text-gray-500 border-gray-800',
};

type Tab = 'intelligence' | 'people' | 'tech' | 'outreach';
type NewsFilter = 'all' | 'reddit' | 'linkedin' | 'blog' | 'article' | 'hackernews';

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function RefreshButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="text-xs text-gray-500 hover:text-amber-400 border border-gray-800 hover:border-amber-800 px-1.5 py-0.5 print:hidden"
    >
      ↻ {label}
    </button>
  );
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
          <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-500 hover:text-cyan-300 underline">
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
        <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-cyan-500">
          via {item.source_name || item.source_url} →
        </a>
      )}
    </div>
  );
}

function TechStackSection({ items, onRefresh }: { items: TechStackItem[]; onRefresh?: () => void }) {
  const [open, setOpen] = useState(true);
  const grouped = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, TechStackItem[]>);

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 flex-1 text-left group">
          <span className="text-xs text-emerald-400 uppercase tracking-widest font-bold">Tech Stack</span>
          <span className="text-xs text-gray-600 border border-gray-800 px-1">{items.length}</span>
          <span className="text-xs text-gray-600 group-hover:text-gray-400">{open ? '▲' : '▼'}</span>
        </button>
        {onRefresh && <RefreshButton onClick={onRefresh} label="Refresh" />}
      </div>
      {open && (
        items.length === 0 ? (
          <div className="text-xs text-gray-600 py-3">No tech stack data — click Refresh to detect</div>
        ) : (
          <div className="space-y-3">
            {Object.entries(grouped).map(([category, techs]) => (
              <div key={category}>
                <div className="text-xs text-gray-600 uppercase tracking-wider mb-1.5">{category}</div>
                <div className="flex flex-wrap gap-1.5">
                  {techs.map(t => (
                    <span
                      key={t.id}
                      className={`text-xs border px-2 py-0.5 ${CATEGORY_COLORS[t.category] || CATEGORY_COLORS.other} ${t.confidence === 'low' ? 'opacity-50' : ''}`}
                      title={t.source_note || ''}
                    >
                      {t.name}
                      {t.confidence === 'high' && <span className="ml-1 text-gray-600">●</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <div className="text-xs text-gray-700 mt-1">● = high confidence · faded = low confidence</div>
          </div>
        )
      )}
    </section>
  );
}

function JobPostingsSection({ jobs, onRefresh }: { jobs: JobPosting[]; onRefresh?: () => void }) {
  const [open, setOpen] = useState(true);

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 flex-1 text-left group">
          <span className="text-xs text-cyan-400 uppercase tracking-widest font-bold">Job Postings</span>
          <span className="text-xs text-gray-600 border border-gray-800 px-1">{jobs.length}</span>
          <span className="text-xs text-gray-600 group-hover:text-gray-400">{open ? '▲' : '▼'}</span>
        </button>
        {onRefresh && <RefreshButton onClick={onRefresh} label="Refresh" />}
      </div>
      {open && (
        jobs.length === 0 ? (
          <div className="text-xs text-gray-600 py-3">No job postings found — click Refresh to search</div>
        ) : (
          <div className="space-y-2">
            {jobs.map(job => (
              <div key={job.id} className="border border-gray-800 p-3 hover:border-gray-700 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <div className="text-sm text-gray-200 truncate">{job.title}</div>
                    {job.department && <div className="text-xs text-gray-500">{job.department}</div>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-xs border px-1 py-0.5 uppercase ${SENIORITY_COLORS[job.seniority] || SENIORITY_COLORS.unknown}`}>
                      {job.seniority}
                    </span>
                    <span className={`text-xs border px-1 py-0.5 uppercase ${job.remote_policy === 'remote' ? 'text-emerald-400 border-emerald-900' : job.remote_policy === 'hybrid' ? 'text-amber-400 border-amber-900' : 'text-gray-500 border-gray-800'}`}>
                      {job.remote_policy}
                    </span>
                  </div>
                </div>
                {job.tech_stack?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {job.tech_stack.map((t, i) => (
                      <span key={i} className="text-xs border border-gray-800 text-gray-500 px-1.5 py-0.5">{t}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  {job.posted_date && <span className="text-xs text-gray-600">{job.posted_date}</span>}
                  {job.url && (
                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-500 hover:text-cyan-300">
                      View Posting →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </section>
  );
}

function ContactsSection({ contacts, onRefresh }: { contacts: Contact[]; onRefresh?: () => void }) {
  const [open, setOpen] = useState(true);

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 flex-1 text-left group">
          <span className="text-xs text-amber-400 uppercase tracking-widest font-bold">Key Contacts</span>
          <span className="text-xs text-gray-600 border border-gray-800 px-1">{contacts.length}</span>
          <span className="text-xs text-gray-600 group-hover:text-gray-400">{open ? '▲' : '▼'}</span>
        </button>
        {onRefresh && <RefreshButton onClick={onRefresh} label="Refresh" />}
      </div>
      {open && (
        contacts.length === 0 ? (
          <div className="text-xs text-gray-600 py-3">No contacts found — click Refresh to search</div>
        ) : (
          <div className="space-y-2">
            {contacts.map(c => (
              <div key={c.id} className="border border-gray-800 p-3 hover:border-gray-700 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm text-gray-200 font-medium">{c.name}</div>
                    {c.title && <div className="text-xs text-gray-400">{c.title}</div>}
                    {c.source_note && <div className="text-xs text-gray-600 mt-0.5">{c.source_note}</div>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.department && (
                      <span className="text-xs border border-gray-800 text-gray-500 px-1.5 py-0.5 uppercase">{c.department}</span>
                    )}
                    {c.linkedin_url && (
                      <a
                        href={c.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 border border-blue-900 px-1.5 py-0.5"
                        title="Unverified — confirm before using"
                      >
                        LinkedIn ⚠
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div className="text-xs text-gray-700">⚠ LinkedIn URLs are LLM-inferred — verify before using</div>
          </div>
        )
      )}
    </section>
  );
}

function InterviewIntelSection({ intel, onRefresh }: { intel: InterviewIntel | null; onRefresh?: () => void }) {
  const [open, setOpen] = useState(true);

  const sentimentColor = intel?.overall_sentiment === 'positive' ? 'text-emerald-400 border-emerald-900'
    : intel?.overall_sentiment === 'negative' ? 'text-red-400 border-red-900'
    : 'text-amber-400 border-amber-900';

  const difficultyColor = intel?.difficulty_rating === 'easy' ? 'text-emerald-400 border-emerald-900'
    : intel?.difficulty_rating === 'hard' ? 'text-red-400 border-red-900'
    : 'text-amber-400 border-amber-900';

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 flex-1 text-left group">
          <span className="text-xs text-purple-400 uppercase tracking-widest font-bold">Interview Intel</span>
          <span className="text-xs text-gray-600 group-hover:text-gray-400">{open ? '▲' : '▼'}</span>
        </button>
        {onRefresh && <RefreshButton onClick={onRefresh} label="Refresh" />}
      </div>
      {open && (
        !intel ? (
          <div className="text-xs text-gray-600 py-3">No interview intel — click Refresh to research</div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <span className={`text-xs border px-1.5 py-0.5 uppercase ${difficultyColor}`}>
                {intel.difficulty_rating} difficulty
              </span>
              <span className={`text-xs border px-1.5 py-0.5 uppercase ${sentimentColor}`}>
                {intel.overall_sentiment} sentiment
              </span>
            </div>
            {intel.interview_process && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Interview Process</div>
                <p className="text-xs text-gray-300 leading-relaxed">{intel.interview_process}</p>
              </div>
            )}
            {intel.common_questions?.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Common Questions</div>
                <ol className="space-y-1">
                  {intel.common_questions.map((q, i) => (
                    <li key={i} className="text-xs text-gray-400 flex gap-2">
                      <span className="text-gray-600 shrink-0">{i + 1}.</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {intel.culture_signals && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Culture Signals</div>
                <p className="text-xs text-gray-400 leading-relaxed">{intel.culture_signals}</p>
              </div>
            )}
            {intel.salary_range_hint && (
              <div className="border border-gray-800 p-2">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Salary Estimate</div>
                <p className="text-xs text-gray-300">{intel.salary_range_hint}</p>
                <p className="text-xs text-gray-600 mt-1">⚠ LLM estimate — verify on Levels.fyi or Glassdoor</p>
              </div>
            )}
            {intel.source_note && (
              <div className="text-xs text-gray-700">{intel.source_note}</div>
            )}
          </div>
        )
      )}
    </section>
  );
}

function FitScoreSection({ companyId, fitScore, latestScore, onScoreRefresh }: {
  companyId: string;
  fitScore: number | null;
  latestScore: { fit_score: number; breakdown: Record<string, number>; reasoning: string } | null;
  onScoreRefresh?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [showCriteriaForm, setShowCriteriaForm] = useState(false);
  const [criteria, setCriteria] = useState<ScoringCriteria>({
    tech_stack_match: { weight: 30, target: [] },
    remote_policy: { weight: 25, preferred: 'remote' },
    company_size: { weight: 15, preferred: 'startup' },
    industry: { weight: 20, preferred: [] },
    growth_stage: { weight: 10, preferred: ['series-a', 'series-b'] },
  });
  const [saving, setSaving] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [techInput, setTechInput] = useState('');
  const [industryInput, setIndustryInput] = useState('');

  const scoreColor = !fitScore ? 'text-gray-500'
    : fitScore >= 7 ? 'text-emerald-400'
    : fitScore >= 4 ? 'text-amber-400'
    : 'text-red-400';

  const handleSaveCriteria = async () => {
    setSaving(true);
    try {
      await saveScoringCriteria(criteria);
      setShowCriteriaForm(false);
      if (onScoreRefresh) onScoreRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleScore = async () => {
    setScoring(true);
    try {
      const existing = await fetchScoringCriteria();
      if (!existing) { setShowCriteriaForm(true); return; }
      await triggerScoring(companyId);
      setTimeout(() => { if (onScoreRefresh) onScoreRefresh(); setScoring(false); }, 5000);
    } catch { setScoring(false); }
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 flex-1 text-left group">
          <span className="text-xs text-amber-400 uppercase tracking-widest font-bold">Fit Score</span>
          {fitScore && <span className={`text-lg font-bold ${scoreColor}`}>{fitScore.toFixed(1)}/10</span>}
          <span className="text-xs text-gray-600 group-hover:text-gray-400">{open ? '▲' : '▼'}</span>
        </button>
        <button
          onClick={() => setShowCriteriaForm(o => !o)}
          className="text-xs text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-600 px-1.5 py-0.5 print:hidden"
        >
          ⚙ Criteria
        </button>
        <button
          onClick={handleScore}
          disabled={scoring}
          className="text-xs text-amber-400 hover:text-amber-300 border border-amber-900 hover:border-amber-700 px-1.5 py-0.5 disabled:opacity-50 print:hidden"
        >
          {scoring ? 'Scoring...' : '↻ Score'}
        </button>
      </div>

      {showCriteriaForm && (
        <div className="border border-gray-800 bg-[#0d0d0d] p-3 mb-3 space-y-3">
          <div className="text-xs text-gray-400 uppercase tracking-widest">Configure Scoring Criteria</div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-gray-500 block mb-1">Tech Stack Match (weight %)</label>
              <input type="number" min={0} max={100} value={criteria.tech_stack_match.weight}
                onChange={e => setCriteria(c => ({ ...c, tech_stack_match: { ...c.tech_stack_match, weight: +e.target.value } }))}
                className="w-full bg-[#111] border border-gray-700 text-gray-200 px-2 py-1 focus:outline-none" />
              <input type="text" placeholder="Add tech (Enter)" value={techInput}
                onChange={e => setTechInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && techInput.trim()) { setCriteria(c => ({ ...c, tech_stack_match: { ...c.tech_stack_match, target: [...c.tech_stack_match.target, techInput.trim()] } })); setTechInput(''); } }}
                className="w-full mt-1 bg-[#111] border border-gray-700 text-gray-200 px-2 py-1 focus:outline-none placeholder-gray-700" />
              <div className="flex flex-wrap gap-1 mt-1">
                {criteria.tech_stack_match.target.map(t => (
                  <span key={t} className="border border-gray-700 text-gray-400 px-1.5 py-0.5 flex items-center gap-1">
                    {t}<button onClick={() => setCriteria(c => ({ ...c, tech_stack_match: { ...c.tech_stack_match, target: c.tech_stack_match.target.filter(x => x !== t) } }))} className="text-gray-600 hover:text-red-400">×</button>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="text-gray-500 block mb-1">Remote Policy (weight %)</label>
              <input type="number" min={0} max={100} value={criteria.remote_policy.weight}
                onChange={e => setCriteria(c => ({ ...c, remote_policy: { ...c.remote_policy, weight: +e.target.value } }))}
                className="w-full bg-[#111] border border-gray-700 text-gray-200 px-2 py-1 focus:outline-none mb-1" />
              <select value={criteria.remote_policy.preferred}
                onChange={e => setCriteria(c => ({ ...c, remote_policy: { ...c.remote_policy, preferred: e.target.value } }))}
                className="w-full bg-[#111] border border-gray-700 text-gray-400 px-2 py-1 focus:outline-none">
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite</option>
              </select>
            </div>
            <div>
              <label className="text-gray-500 block mb-1">Company Size (weight %)</label>
              <input type="number" min={0} max={100} value={criteria.company_size.weight}
                onChange={e => setCriteria(c => ({ ...c, company_size: { ...c.company_size, weight: +e.target.value } }))}
                className="w-full bg-[#111] border border-gray-700 text-gray-200 px-2 py-1 focus:outline-none mb-1" />
              <select value={criteria.company_size.preferred}
                onChange={e => setCriteria(c => ({ ...c, company_size: { ...c.company_size, preferred: e.target.value } }))}
                className="w-full bg-[#111] border border-gray-700 text-gray-400 px-2 py-1 focus:outline-none">
                <option value="startup">Startup (&lt;50)</option>
                <option value="mid">Mid-size (50-500)</option>
                <option value="enterprise">Enterprise (500+)</option>
              </select>
            </div>
            <div>
              <label className="text-gray-500 block mb-1">Industry (weight %)</label>
              <input type="number" min={0} max={100} value={criteria.industry.weight}
                onChange={e => setCriteria(c => ({ ...c, industry: { ...c.industry, weight: +e.target.value } }))}
                className="w-full bg-[#111] border border-gray-700 text-gray-200 px-2 py-1 focus:outline-none" />
              <input type="text" placeholder="Add industry (Enter)" value={industryInput}
                onChange={e => setIndustryInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && industryInput.trim()) { setCriteria(c => ({ ...c, industry: { ...c.industry, preferred: [...c.industry.preferred, industryInput.trim()] } })); setIndustryInput(''); } }}
                className="w-full mt-1 bg-[#111] border border-gray-700 text-gray-200 px-2 py-1 focus:outline-none placeholder-gray-700" />
              <div className="flex flex-wrap gap-1 mt-1">
                {criteria.industry.preferred.map(i => (
                  <span key={i} className="border border-gray-700 text-gray-400 px-1.5 py-0.5 flex items-center gap-1">
                    {i}<button onClick={() => setCriteria(c => ({ ...c, industry: { ...c.industry, preferred: c.industry.preferred.filter(x => x !== i) } }))} className="text-gray-600 hover:text-red-400">×</button>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button onClick={handleSaveCriteria} disabled={saving}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black text-xs py-1.5 font-bold uppercase tracking-wider disabled:opacity-50">
            {saving ? 'Saving...' : 'Save & Re-score All Companies'}
          </button>
        </div>
      )}

      {open && latestScore && (
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-1">
            {Object.entries(latestScore.breakdown).map(([key, val]) => (
              <div key={key} className="border border-gray-800 p-2 text-center">
                <div className={`text-sm font-bold ${val >= 7 ? 'text-emerald-400' : val >= 4 ? 'text-amber-400' : 'text-red-400'}`}>
                  {val.toFixed(0)}
                </div>
                <div className="text-xs text-gray-600 truncate">{key.replace(/_/g, ' ')}</div>
              </div>
            ))}
          </div>
          {latestScore.reasoning && (
            <p className="text-xs text-gray-400 leading-relaxed">{latestScore.reasoning}</p>
          )}
        </div>
      )}
      {open && !latestScore && (
        <div className="text-xs text-gray-600 py-3">Not scored yet — configure criteria and click Score</div>
      )}
    </section>
  );
}

function EmailSection({ companyId, draft, contacts, onDraftUpdate }: {
  companyId: string;
  draft: EmailDraft | null;
  contacts: Contact[];
  onDraftUpdate: (draft: EmailDraft) => void;
}) {
  const [open, setOpen] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tone, setTone] = useState('professional');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [subject, setSubject] = useState(draft?.subject || '');
  const [body, setBody] = useState(draft?.body || '');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (draft && !confirm('Regenerate will overwrite your current draft. Continue?')) return;
    setGenerating(true);
    try {
      const result = await generateEmail(companyId, tone, selectedContactId || undefined);
      setSubject(result.subject);
      setBody(result.body);
      onDraftUpdate(result);
    } catch (err) {
      console.error('Email generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateEmailDraft(companyId, subject, body);
      onDraftUpdate(result);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 flex-1 text-left group">
          <span className="text-xs text-cyan-400 uppercase tracking-widest font-bold">Cold Outreach Email</span>
          {draft && <span className="text-xs text-gray-600">draft saved</span>}
          <span className="text-xs text-gray-600 group-hover:text-gray-400">{open ? '▲' : '▼'}</span>
        </button>
      </div>
      {open && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap print:hidden">
            <select value={tone} onChange={e => setTone(e.target.value)}
              className="bg-[#111] border border-gray-700 text-gray-400 text-xs px-2 py-1 focus:outline-none">
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="direct">Direct</option>
            </select>
            {contacts.length > 0 && (
              <select value={selectedContactId} onChange={e => setSelectedContactId(e.target.value)}
                className="bg-[#111] border border-gray-700 text-gray-400 text-xs px-2 py-1 focus:outline-none">
                <option value="">Auto-select contact</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {c.title}</option>
                ))}
              </select>
            )}
            <button onClick={handleGenerate} disabled={generating}
              className="bg-amber-500 hover:bg-amber-600 text-black text-xs px-3 py-1 font-bold uppercase tracking-wider disabled:opacity-50">
              {generating ? 'Generating... (~30s)' : draft ? 'Regenerate' : 'Generate Email'}
            </button>
          </div>
          {generating && (
            <div className="text-xs text-amber-400 animate-pulse">Composing email — this may take up to 30 seconds...</div>
          )}
          {(subject || body) && (
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Subject</label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-gray-700 text-gray-200 text-xs px-2 py-1.5 focus:outline-none focus:border-amber-700" />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Body</label>
                <textarea value={body} onChange={e => setBody(e.target.value)} rows={12}
                  className="w-full bg-[#0a0a0a] border border-gray-700 text-gray-200 text-xs px-2 py-1.5 focus:outline-none focus:border-amber-700 resize-none leading-relaxed" />
              </div>
              <div className="flex gap-2 print:hidden">
                <button onClick={handleCopy}
                  className="text-xs border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-gray-200 px-3 py-1.5">
                  {copied ? '✓ Copied' : 'Copy to Clipboard'}
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="text-xs border border-emerald-900 hover:border-emerald-700 text-emerald-400 px-3 py-1.5 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Edits'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function ProfilePanel({
  profile, loading, onResearch, onRefresh,
  onNewsRefresh, onProblemsRefresh, onTechStackRefresh, onJobsRefresh,
  onContactsRefresh, onInterviewIntelRefresh, onUpdateTags, onUpdateWebsite,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('intelligence');
  const [newsFilter, setNewsFilter] = useState<NewsFilter>('all');
  const [problemsOpen, setProblemsOpen] = useState(true);
  const [newsOpen, setNewsOpen] = useState(true);
  const [tagInput, setTagInput] = useState('');
  const [savingTags, setSavingTags] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const [editingWebsite, setEditingWebsite] = useState(false);
  const [websiteInput, setWebsiteInput] = useState('');
  const [savingWebsite, setSavingWebsite] = useState(false);
  const [localDraft, setLocalDraft] = useState<EmailDraft | null>(null);

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

  const { company, news, problems, tech_stack, job_postings, contacts, interview_intel, email_draft, latest_score } = profile;
  const activeDraft = localDraft || email_draft;
  const activeScore = latest_score;

  const filteredNews = newsFilter === 'all' ? news : news.filter(n => n.source_type === newsFilter);
  const newsTypes = ['all', ...Array.from(new Set(news.map(n => n.source_type)))] as NewsFilter[];
  const researchAgeDays = company.last_researched_at ? daysSince(company.last_researched_at) : null;
  const showAgeWarning = researchAgeDays !== null && researchAgeDays > 30;

  const handleAddTag = async (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || !onUpdateTags) return;
    const currentTags = company.tags || [];
    if (currentTags.includes(trimmed)) { setTagInput(''); return; }
    setSavingTags(true);
    try { await onUpdateTags(company.id, [...currentTags, trimmed]); setTagInput(''); }
    finally { setSavingTags(false); }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!onUpdateTags) return;
    setSavingTags(true);
    try { await onUpdateTags(company.id, (company.tags || []).filter(t => t !== tag)); }
    finally { setSavingTags(false); }
  };

  const handleExportPDF = () => {
    const original = document.title;
    document.title = company.name;
    window.print();
    document.title = original;
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'intelligence', label: 'Intelligence', count: problems.length + news.length },
    { id: 'people', label: 'People', count: contacts.length + job_postings.length },
    { id: 'tech', label: 'Tech', count: tech_stack.length },
    { id: 'outreach', label: 'Outreach' },
  ];

  return (
    <main className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-lg text-gray-200 font-bold">{company.name}</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            {editingWebsite ? (
              <>
                <input type="text" value={websiteInput} onChange={e => setWebsiteInput(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key === 'Enter') { setSavingWebsite(true); try { await onUpdateWebsite?.(company.id, websiteInput); setEditingWebsite(false); } finally { setSavingWebsite(false); } }
                    if (e.key === 'Escape') setEditingWebsite(false);
                  }}
                  autoFocus className="bg-[#111] border border-amber-700 text-cyan-400 text-xs px-2 py-0.5 focus:outline-none w-64" />
                <button onClick={async () => { setSavingWebsite(true); try { await onUpdateWebsite?.(company.id, websiteInput); setEditingWebsite(false); } finally { setSavingWebsite(false); } }}
                  disabled={savingWebsite} className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50">
                  {savingWebsite ? '...' : '✓'}
                </button>
                <button onClick={() => setEditingWebsite(false)} className="text-xs text-gray-500 hover:text-gray-300">✕</button>
              </>
            ) : (
              <>
                {!company.website.startsWith('unknown://') ? (
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-500 hover:text-cyan-300">
                    {company.website} ↗
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">No website</span>
                )}
                <button onClick={() => { setWebsiteInput(company.website.startsWith('unknown://') ? '' : company.website); setEditingWebsite(true); }}
                  className="text-sm border border-gray-700 hover:border-amber-700 text-gray-400 hover:text-amber-400 px-2 py-0.5" title="Edit website">
                  ✎ edit
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-xs border px-1.5 py-0.5 uppercase ${STATUS_COLORS[company.status] || STATUS_COLORS.pending}`}>
              {company.status}
            </span>
            {company.fit_score && (
              <span className={`text-xs border px-1.5 py-0.5 font-bold ${company.fit_score >= 7 ? 'text-emerald-400 border-emerald-900' : company.fit_score >= 4 ? 'text-amber-400 border-amber-900' : 'text-red-400 border-red-900'}`}>
                Fit: {company.fit_score.toFixed(1)}/10
              </span>
            )}
            {company.last_researched_at && (
              <span className="text-xs text-gray-400">Last researched: {new Date(company.last_researched_at).toLocaleString()}</span>
            )}
            {showAgeWarning && (
              <span className="text-xs text-amber-400 border border-amber-700 px-1.5 py-0.5">⚠ Research is {researchAgeDays} days old</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {(company.tags || []).map(tag => (
              <span key={tag} className="flex items-center gap-1 text-xs border border-gray-700 text-gray-400 px-1.5 py-0.5">
                {tag}
                {onUpdateTags && (
                  <button onClick={() => handleRemoveTag(tag)} className="text-gray-600 hover:text-red-400 leading-none" disabled={savingTags}>×</button>
                )}
              </span>
            ))}
            {onUpdateTags && (
              <input ref={tagInputRef} type="text" placeholder="+ tag" value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(tagInput); } }}
                disabled={savingTags}
                className="bg-transparent border border-gray-700 text-gray-400 text-xs px-1.5 py-0.5 w-16 focus:outline-none focus:border-amber-700 placeholder-gray-700" />
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end print:hidden">
          {(company.status === 'done' || company.status === 'error') && (
            <button onClick={() => onResearch(company.id, true)}
              className="text-xs border border-amber-700 text-amber-400 hover:bg-amber-900/20 px-3 py-1.5 uppercase tracking-wider">
              Re-research
            </button>
          )}
          <button onClick={handleExportPDF}
            className="text-xs border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 px-3 py-1.5 uppercase tracking-wider">
            Export PDF
          </button>
          {onRefresh && (
            <button onClick={onRefresh} className="text-xs border border-gray-700 text-gray-500 hover:text-gray-300 px-3 py-1.5">↻</button>
          )}
        </div>
      </div>

      {/* Pending state */}
      {company.status === 'pending' && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-sm mb-4">No research data yet</div>
          <button onClick={() => onResearch(company.id)}
            className="bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold uppercase tracking-widest px-6 py-2 print:hidden">
            Start Research
          </button>
        </div>
      )}

      {/* Researching state */}
      {company.status === 'researching' && (
        <div className="text-center py-12">
          <div className="text-amber-400 text-xs uppercase tracking-widest animate-pulse mb-2">● Agent is scanning sources...</div>
          <div className="text-gray-400 text-xs">This may take 30–60 seconds</div>
        </div>
      )}

      {/* Error state */}
      {company.status === 'error' && (
        <div className="border border-red-900 bg-red-950/20 p-4">
          <div className="text-red-400 text-xs uppercase tracking-wider mb-2">Research Failed</div>
          <p className="text-gray-500 text-xs mb-3">The research agent encountered an error.</p>
          <button onClick={() => onResearch(company.id)}
            className="text-xs border border-red-900 text-red-400 hover:bg-red-950/20 px-3 py-1.5 uppercase print:hidden">
            Retry
          </button>
        </div>
      )}

      {/* Done state — tabbed content */}
      {company.status === 'done' && (
        <>
          {/* Tab bar */}
          <div className="flex border-b border-gray-800 print:hidden">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs uppercase tracking-wider font-bold border-b-2 transition-colors ${
                  activeTab === tab.id ? 'border-amber-500 text-amber-400' : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1.5 text-gray-600">({tab.count})</span>
                )}
              </button>
            ))}
          </div>

          {/* Intelligence tab */}
          {activeTab === 'intelligence' && (
            <div className="space-y-6">
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={() => setProblemsOpen(o => !o)} className="flex items-center gap-2 flex-1 text-left group">
                    <span className="text-xs text-amber-400 uppercase tracking-widest font-bold">Problem Statements</span>
                    <span className="text-xs text-gray-400 border border-gray-800 px-1">{problems.length}</span>
                    <span className="text-xs text-gray-400 group-hover:text-gray-300">{problemsOpen ? '▲' : '▼'}</span>
                  </button>
                  {onProblemsRefresh && <RefreshButton onClick={onProblemsRefresh} label="Problems" />}
                </div>
                {problemsOpen && (
                  problems.length === 0
                    ? <div className="text-xs text-gray-400">No problem statements found</div>
                    : <div className="space-y-2">{problems.map(p => <ProblemCard key={p.id} item={p} />)}</div>
                )}
              </section>
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={() => setNewsOpen(o => !o)} className="flex items-center gap-2 flex-1 text-left group">
                    <span className="text-xs text-cyan-500 uppercase tracking-widest font-bold">News Feed</span>
                    <span className="text-xs text-gray-400 border border-gray-800 px-1">{news.length}</span>
                    <span className="text-xs text-gray-400 group-hover:text-gray-300">{newsOpen ? '▲' : '▼'}</span>
                  </button>
                  {onNewsRefresh && <RefreshButton onClick={onNewsRefresh} label="News" />}
                </div>
                {newsOpen && (
                  <>
                    <div className="flex gap-1 mb-3 flex-wrap print:hidden">
                      {newsTypes.map(type => (
                        <button key={type} onClick={() => setNewsFilter(type)}
                          className={`text-xs px-2 py-0.5 uppercase border ${newsFilter === type ? 'border-cyan-700 text-cyan-500' : 'border-gray-800 text-gray-400 hover:text-gray-300'}`}>
                          {type} ({type === 'all' ? news.length : news.filter(n => n.source_type === type).length})
                        </button>
                      ))}
                    </div>
                    {filteredNews.length === 0
                      ? <div className="text-xs text-gray-400">No news items for this filter</div>
                      : <div className="space-y-2">{filteredNews.map(n => <NewsCard key={n.id} item={n} />)}</div>
                    }
                  </>
                )}
              </section>
            </div>
          )}

          {/* People tab */}
          {activeTab === 'people' && (
            <div className="space-y-6">
              <ContactsSection contacts={contacts} onRefresh={onContactsRefresh} />
              <JobPostingsSection jobs={job_postings} onRefresh={onJobsRefresh} />
            </div>
          )}

          {/* Tech tab */}
          {activeTab === 'tech' && (
            <div className="space-y-6">
              <TechStackSection items={tech_stack} onRefresh={onTechStackRefresh} />
              <InterviewIntelSection intel={interview_intel} onRefresh={onInterviewIntelRefresh} />
            </div>
          )}

          {/* Outreach tab */}
          {activeTab === 'outreach' && (
            <div className="space-y-6">
              <FitScoreSection
                companyId={company.id}
                fitScore={company.fit_score}
                latestScore={activeScore}
                onScoreRefresh={onRefresh}
              />
              <EmailSection
                companyId={company.id}
                draft={activeDraft}
                contacts={contacts}
                onDraftUpdate={(draft) => setLocalDraft(draft)}
              />
            </div>
          )}
        </>
      )}
    </main>
  );
}
