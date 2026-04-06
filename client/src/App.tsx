import { useState, useEffect, useCallback } from 'react';
import { Company, CompanyProfile } from 'shared';
import { fetchCompanies, fetchCompanyProfile, addCompany, bulkAddCompanies, deleteCompany, triggerResearch, fetchProvider } from './api';
import { Sidebar } from './components/Sidebar';
import { ProfilePanel } from './components/ProfilePanel';
import { BulkAddModal } from './components/BulkAddModal';

export default function App() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [provider, setProvider] = useState<string>('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const handleResearch = async (id: string, force = false) => {
    await triggerResearch(id, force);
    await loadCompanies();
    if (selectedId === id) {
      await loadProfile(id);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-gray-200">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-[#0f0f0f]">
        <div className="flex items-center gap-3">
          <span className="text-amber-400 font-bold text-sm tracking-widest uppercase">INTEL//DASH</span>
          <span className="text-gray-600 text-xs">company intelligence</span>
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
        />
        <ProfilePanel
          profile={profile}
          loading={loading}
          onResearch={handleResearch}
          onRefresh={selectedId ? () => loadProfile(selectedId) : undefined}
        />
      </div>

      {showBulkModal && (
        <BulkAddModal
          onClose={() => setShowBulkModal(false)}
          onSuccess={loadCompanies}
          bulkAdd={bulkAddCompanies}
        />
      )}
    </div>
  );
}
