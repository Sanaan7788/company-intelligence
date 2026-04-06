type Page = 'dashboard' | 'companies' | 'research';

interface TokenStats {
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_calls: number;
}

interface Props {
  current: Page;
  onChange: (page: Page) => void;
  provider: string;
  researchingCount: number;
  tokenStats: TokenStats;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

export function Nav({ current, onChange, provider, researchingCount, tokenStats }: Props) {
  const navItems: { id: Page; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'companies', label: 'Companies' },
    { id: 'research', label: 'Research' },
  ];

  return (
    <header className="flex items-center justify-between px-4 py-0 border-b border-gray-800 bg-[#0f0f0f] print:hidden shrink-0">
      <div className="flex items-center gap-6">
        <span className="text-amber-400 font-bold text-sm tracking-widest uppercase mr-4">INTEL//DASH</span>
        <nav className="flex">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`relative px-4 py-3 text-xs uppercase tracking-widest font-bold transition-colors ${
                current === item.id
                  ? 'text-amber-400 border-b-2 border-amber-500'
                  : 'text-gray-500 hover:text-gray-300 border-b-2 border-transparent'
              }`}
            >
              {item.label}
              {item.id === 'research' && researchingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 text-black text-[9px] font-bold flex items-center justify-center">
                  {researchingCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-1.5 text-xs border border-gray-800 px-2 py-0.5"
          title={`Prompt: ${tokenStats.prompt_tokens.toLocaleString()} · Completion: ${tokenStats.completion_tokens.toLocaleString()} · Calls: ${tokenStats.total_calls}`}
        >
          <span className="text-gray-600">tokens</span>
          <span className="text-gray-300 font-bold">{formatTokens(tokenStats.total_tokens)}</span>
          <span className="text-gray-700">·</span>
          <span className="text-gray-600">{tokenStats.total_calls} calls</span>
        </div>
        {provider && (
          <span className="text-xs text-gray-500 border border-gray-700 px-2 py-0.5">
            LLM: <span className="text-cyan-400">{provider}</span>
          </span>
        )}
      </div>
    </header>
  );
}
