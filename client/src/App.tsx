import { useState, useEffect, useCallback, useRef } from 'react';
import { Company, CompanyProfile } from 'shared';
import { fetchCompanies, fetchCompanyProfile, addCompany, bulkAddCompanies, deleteCompany, triggerResearch, triggerNewsRefresh, triggerProblemsRefresh, updateTags, toggleShortlist, updateWebsite, fetchProvider } from './api';
import { Sidebar } from './components/Sidebar';
import { ProfilePanel } from './components/ProfilePanel';
import { BulkAddModal } from './components/BulkAddModal';
import { LocationDiscoverModal } from './components/LocationDiscoverModal';
import { TaskTracker } from './components/TaskTracker';
import { TaskEntry } from './types';

export default function App() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [provider, setProvider] = useState<string>('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<Record<string, TaskEntry>>({});
  // Keep a ref of the previous companies list to detect status transitions
  const prevCompaniesRef = useRef<Record<string, string>>({});

  const loadCompanies = useCallback(async () => {
    const data = await fetchCompanies();
    setCompanies(data);
  }, []);

  const loadProfile = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const data = await fetchCompanyProfile(id);
      setProfile(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
    fetchProvider().then(setProvider);
  }, [loadCompanies]);

  // Detect status transitions to update task entries
  useEffect(() => {
    const prev = prevCompaniesRef.current;
    companies.forEach(company => {
      const prevStatus = prev[company.id];
      if (prevStatus === 'researching' && (company.status === 'done' || company.status === 'error')) {
        // Transition detected — mark task completed
        setTasks(t => {
          if (!t[company.id]) return t;
          return {
            ...t,
            [company.id]: { ...t[company.id], status: company.status as 'done' | 'error', completedAt: Date.now() },
          };
        });
        // Remove after 5 seconds
        setTimeout(() => {
          setTasks(t => {
            const next = { ...t };
            delete next[company.id];
            return next;
          });
        }, 5000);
      }
    });
    // Update the ref
    const next: Record<string, string> = {};
    companies.forEach(c => { next[c.id] = c.status; });
    prevCompaniesRef.current = next;
  }, [companies]);

  // Poll for researching companies
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
    if (selectedId === id) {
      setSelectedId(null);
      setProfile(null);
    }
    await loadCompanies();
  };

  const addTask = (id: string, taskType: TaskEntry['taskType']) => {
    const company = companies.find(c => c.id === id);
    if (!company) return;
    setTasks(t => ({
      ...t,
      [id]: { companyId: id, companyName: company.name, taskType, status: 'running' },
    }));
  };

  const handleResearch = async (id: string, force = false) => {
    addTask(id, 'Full Research');
    await triggerResearch(id, force);
    await loadCompanies();
    if (selectedId === id) {
      await loadProfile(id);
    }
  };

  const handleNewsRefresh = async (id: string) => {
    addTask(id, 'News Refresh');
    await triggerNewsRefresh(id);
    await loadCompanies();
    if (selectedId === id) {
      await loadProfile(id);
    }
  };

  const handleProblemsRefresh = async (id: string) => {
    addTask(id, 'Problems Refresh');
    await triggerProblemsRefresh(id);
    await loadCompanies();
    if (selectedId === id) {
      await loadProfile(id);
    }
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

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-gray-200">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-[#0f0f0f] print:hidden">
        <div className="flex items-center gap-3">
          <span className="text-amber-400 font-bold text-sm tracking-widest uppercase">INTEL//DASH</span>
          <span className="text-gray-400 text-xs">company intelligence</span>
        </div>
        {provider && (
          <span className="text-xs text-gray-500 border border-gray-700 px-2 py-0.5">
            LLM: <span className="text-cyan-400">{provider}</span>
          </span>
        )}
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          companies={companies}
          selectedId={selectedId}
          onSelect={handleSelectCompany}
          onAdd={handleAddCompany}
          onDelete={handleDelete}
          onBulkAdd={() => setShowBulkModal(true)}
          onDiscover={() => setShowDiscoverModal(true)}
          onToggleShortlist={handleToggleShortlist}
        />
        <ProfilePanel
          profile={profile}
          loading={loading}
          onResearch={handleResearch}
          onRefresh={selectedId ? () => loadProfile(selectedId) : undefined}
          onNewsRefresh={selectedId ? () => handleNewsRefresh(selectedId) : undefined}
          onProblemsRefresh={selectedId ? () => handleProblemsRefresh(selectedId) : undefined}
          onUpdateTags={handleUpdateTags}
          onUpdateWebsite={handleUpdateWebsite}
        />
      </div>

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
        runningCount={Object.values(tasks).filter(t => t.status === 'running').length}
      />
    </div>
  );
}
