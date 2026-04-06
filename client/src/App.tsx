import { useState, useEffect, useCallback, useRef } from 'react';
import { Company, CompanyProfile } from 'shared';
import { fetchCompanies, fetchCompanyProfile, addCompany, bulkAddCompanies, deleteCompany, triggerResearch, triggerNewsRefresh, triggerProblemsRefresh, triggerTechStackResearch, triggerJobsResearch, triggerContactsResearch, triggerInterviewIntel, updateTags, toggleShortlist, updateWebsite, fetchProvider, fetchTokenStats } from './api';
import { Nav } from './components/Nav';
import { BulkAddModal } from './components/BulkAddModal';
import { LocationDiscoverModal } from './components/LocationDiscoverModal';
import { TaskTracker } from './components/TaskTracker';
import { DashboardPage } from './pages/DashboardPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { ResearchPage } from './pages/ResearchPage';
import { TaskEntry } from './types';

type Page = 'dashboard' | 'companies' | 'research';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [provider, setProvider] = useState<string>('');
  const [tokenStats, setTokenStats] = useState({ total_tokens: 0, prompt_tokens: 0, completion_tokens: 0, total_calls: 0 });
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [tasks, setTasks] = useState<Record<string, TaskEntry>>({});
  const prevCompaniesRef = useRef<Record<string, string>>({});

  const loadCompanies = useCallback(async () => {
    const data = await fetchCompanies();
    setCompanies(data);
  }, []);

  const loadProfile = useCallback(async (id: string) => {
    setProfileLoading(true);
    try {
      const data = await fetchCompanyProfile(id);
      setProfile(data);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
    fetchProvider().then(setProvider);
    fetchTokenStats().then(setTokenStats);
  }, [loadCompanies]);

  // Poll token stats every 5s
  useEffect(() => {
    const interval = setInterval(() => fetchTokenStats().then(setTokenStats), 5_000);
    return () => clearInterval(interval);
  }, []);

  // Detect status transitions to update task entries
  useEffect(() => {
    const prev = prevCompaniesRef.current;
    companies.forEach(company => {
      const prevStatus = prev[company.id];
      if (prevStatus === 'researching' && (company.status === 'done' || company.status === 'error')) {
        setTasks(t => {
          if (!t[company.id]) return t;
          return { ...t, [company.id]: { ...t[company.id], status: company.status as 'done' | 'error', completedAt: Date.now() } };
        });
        setTimeout(() => {
          setTasks(t => { const next = { ...t }; delete next[company.id]; return next; });
        }, 5000);
      }
    });
    const next: Record<string, string> = {};
    companies.forEach(c => { next[c.id] = c.status; });
    prevCompaniesRef.current = next;
  }, [companies]);

  // Poll while any company is researching
  useEffect(() => {
    const researching = companies.filter(c => c.status === 'researching');
    if (researching.length === 0) return;
    const interval = setInterval(async () => {
      await loadCompanies();
      if (selectedId && researching.some(c => c.id === selectedId)) {
        await loadProfile(selectedId);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [companies, selectedId, loadCompanies, loadProfile]);

  const handleSelectCompany = async (id: string) => {
    setSelectedId(id);
    await loadProfile(id);
  };

  const handleAddCompany = async (name: string, website: string) => {
    const company = await addCompany(name, website);
    await loadCompanies();
    return company;
  };

  const handleDelete = async (id: string) => {
    await deleteCompany(id);
    if (selectedId === id) { setSelectedId(null); setProfile(null); }
    await loadCompanies();
  };

  const addTask = (id: string, taskType: TaskEntry['taskType']) => {
    const company = companies.find(c => c.id === id);
    if (!company) return;
    setTasks(t => ({ ...t, [id]: { companyId: id, companyName: company.name, taskType, status: 'running' } }));
  };

  const handleResearch = async (id: string, force = false) => {
    addTask(id, 'Full Research');
    await triggerResearch(id, force);
    await loadCompanies();
    if (selectedId === id) await loadProfile(id);
  };

  const handleNewsRefresh = async (id: string) => {
    addTask(id, 'News Refresh');
    await triggerNewsRefresh(id);
    await loadCompanies();
    if (selectedId === id) await loadProfile(id);
  };

  const handleProblemsRefresh = async (id: string) => {
    addTask(id, 'Problems Refresh');
    await triggerProblemsRefresh(id);
    await loadCompanies();
    if (selectedId === id) await loadProfile(id);
  };

  const handleTechStackRefresh = async (id: string) => {
    addTask(id, 'Tech Stack');
    await triggerTechStackResearch(id);
    setTimeout(() => { if (selectedId === id) loadProfile(id); }, 15000);
  };

  const handleJobsRefresh = async (id: string) => {
    addTask(id, 'Job Search');
    await triggerJobsResearch(id);
    setTimeout(() => { if (selectedId === id) loadProfile(id); }, 15000);
  };

  const handleContactsRefresh = async (id: string) => {
    addTask(id, 'Contact Finder');
    await triggerContactsResearch(id);
    setTimeout(() => { if (selectedId === id) loadProfile(id); }, 15000);
  };

  const handleInterviewIntelRefresh = async (id: string) => {
    addTask(id, 'Interview Intel');
    await triggerInterviewIntel(id);
    setTimeout(() => { if (selectedId === id) loadProfile(id); }, 15000);
  };

  const handleUpdateWebsite = async (id: string, website: string) => {
    const updated = await updateWebsite(id, website);
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, website: updated.website } : c));
    if (profile && profile.company.id === id) {
      setProfile(prev => prev ? { ...prev, company: { ...prev.company, website: updated.website } } : prev);
    }
  };

  const handleUpdateTags = async (id: string, tags: string[]) => {
    const updated = await updateTags(id, tags);
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, tags: updated.tags } : c));
    if (profile && profile.company.id === id) {
      setProfile(prev => prev ? { ...prev, company: { ...prev.company, tags: updated.tags } } : prev);
    }
  };

  const handleToggleShortlist = async (id: string, shortlisted: boolean) => {
    const updated = await toggleShortlist(id, shortlisted);
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, shortlisted: updated.shortlisted } : c));
    if (profile && profile.company.id === id) {
      setProfile(prev => prev ? { ...prev, company: { ...prev.company, shortlisted: updated.shortlisted } } : prev);
    }
  };

  const researchingCount = companies.filter(c => c.status === 'researching').length;
  const runningTaskCount = Object.values(tasks).filter(t => t.status === 'running').length;

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-gray-200 overflow-hidden">
      <Nav current={page} onChange={setPage} provider={provider} researchingCount={researchingCount} tokenStats={tokenStats} />

      {page === 'dashboard' && (
        <DashboardPage
          companies={companies}
          onSelectCompany={handleSelectCompany}
          onAddCompany={handleAddCompany}
          onBulkAdd={() => setShowBulkModal(true)}
          onDiscover={() => setShowDiscoverModal(true)}
          onNavigateToCompanies={() => setPage('companies')}
          onNavigateToResearch={() => setPage('research')}
        />
      )}

      {page === 'companies' && (
        <CompaniesPage
          companies={companies}
          selectedId={selectedId}
          profile={profile}
          profileLoading={profileLoading}
          onSelect={handleSelectCompany}
          onDelete={handleDelete}
          onToggleShortlist={handleToggleShortlist}
          onResearch={handleResearch}
          onNewsRefresh={handleNewsRefresh}
          onProblemsRefresh={handleProblemsRefresh}
          onTechStackRefresh={selectedId ? () => handleTechStackRefresh(selectedId) : undefined}
          onJobsRefresh={selectedId ? () => handleJobsRefresh(selectedId) : undefined}
          onContactsRefresh={selectedId ? () => handleContactsRefresh(selectedId) : undefined}
          onInterviewIntelRefresh={selectedId ? () => handleInterviewIntelRefresh(selectedId) : undefined}
          onUpdateTags={handleUpdateTags}
          onUpdateWebsite={handleUpdateWebsite}
          onRefreshProfile={selectedId ? () => loadProfile(selectedId) : () => {}}
        />
      )}

      {page === 'research' && (
        <ResearchPage
          companies={companies}
          tasks={tasks}
          onResearch={handleResearch}
          onDelete={handleDelete}
          onSelectCompany={handleSelectCompany}
          onNavigateToCompanies={() => setPage('companies')}
        />
      )}

      {showBulkModal && (
        <BulkAddModal
          onClose={() => setShowBulkModal(false)}
          onSuccess={loadCompanies}
          bulkAdd={bulkAddCompanies}
        />
      )}

      {showDiscoverModal && (
        <LocationDiscoverModal
          onClose={() => setShowDiscoverModal(false)}
          onSuccess={loadCompanies}
        />
      )}

      <TaskTracker
        tasks={tasks}
        runningCount={runningTaskCount}
      />
    </div>
  );
}
