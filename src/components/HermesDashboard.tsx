import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Skill {
  name: string;
  version: string;
  status: 'active' | 'evaluating' | 'archived';
  description: string;
}

const INITIAL_SKILLS: Skill[] = [
  { name: 'github-pr-reviewer', version: 'v2.4', status: 'active', description: 'Review git diffs, compile projects, and run testing checks.' },
  { name: 'mlops-orchestrator', version: 'v1.1', status: 'active', description: 'Deploy serverless modal jobs, optimize weights, and track pipelines.' },
  { name: 'code-refactorer', version: 'v4.2', status: 'active', description: 'Inspect complexity, run AST checks, and rewrite non-adjacent lines.' },
  { name: 'cost-aware-router', version: 'v3.0', status: 'active', description: 'Analyze token counts, check budget limits, and route to Haiku/Sonnet.' }
];

const MOCK_MEMORY_DATABASE = [
  { keywords: ['tommy', 'user', 'preference'], content: 'USER PROFILE: [Tommy] Senior Developer. Preferred Environment: Windows (PowerShell CLI). Style: High-fidelity, clean code, cost-optimized pipelines. (Confidence: 0.99)' },
  { keywords: ['powershell', 'windows', 'cli'], content: 'EXECUTION RULE: Never use "cd" commands directly in PowerShell; prefer invoking fully-qualified paths or setting tool execution contexts. (Confidence: 0.95)' },
  { keywords: ['cost', 'budget', 'tokens'], content: 'BUDGET POLICY: Limit session spent to $2.00 max. Route tasks <10k chars to Claude 3.5 Haiku ($0.80/1M); route tasks >=10k chars to Claude 3.5 Sonnet ($3.00/1M). (Confidence: 0.98)' },
  { keywords: ['github', 'git', 'pr'], content: 'SKILL PATH: d:\\Project\\github\\Javis\\src\\skills\\github-pr-reviewer.md. Implements automated git diff compilation checks using "npm run build". (Confidence: 0.92)' },
  { keywords: ['fts5', 'sqlite', 'memory'], content: 'SYSTEM PERSISTENCE: Session history logged in SQLite state.db with FTS5 virtual indexing. Enables sub-10ms keyword lookups across historical traces. (Confidence: 0.99)' }
];

export function HermesDashboard() {
  const [activeTab, setActiveTab] = useState<'matrix' | 'memory' | 'gateway' | 'docs'>('matrix');
  const [skills, setSkills] = useState<Skill[]>(INITIAL_SKILLS);
  
  // Terminal simulation state
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    '[SYSTEM] Hermes Self-Improving loop initialized.',
    '[SYSTEM] FTS5 index scanned. 142 session history records active.',
    '[SYSTEM] Awaiting curation tasks or evolutionary requests...'
  ]);
  const [isEvolving, setIsEvolving] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // FTS5 Memory search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Cost-Aware Gateway states
  const [budget, setBudget] = useState(2.00);
  const [spent, setSpent] = useState(0.42);
  const [cacheHits, setCacheHits] = useState(84);
  const [selectedModel, setSelectedModel] = useState<'haiku' | 'sonnet' | 'auto'>('auto');
  const [simulatedLogs, setSimulatedLogs] = useState<string[]>([
    '09:42:15 - Routed task "FTS5 Scan" to Claude Haiku (Tokens: 1,200 IN, 150 OUT) - Cost: $0.0016',
    '10:12:30 - Routed task "Audit AST" to Claude Sonnet (Tokens: 12,400 IN, 850 OUT) - Cost: $0.0500 [Cached input]',
    '11:05:04 - Routed task "Extract Skill" to Claude Sonnet (Tokens: 18,200 IN, 1,400 OUT) - Cost: $0.0756',
  ]);

  // Autoscroll terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  // Simulate Evolution (GEPA)
  const triggerSelfEvolution = () => {
    if (isEvolving) return;
    setIsEvolving(true);
    setTerminalLogs(prev => [...prev, '\n--- TRIGGERING DSPy + GEPA SELF-EVOLUTION LOOP ---']);
    
    let step = 0;
    const steps = [
      '[GEPA] Initializing DSPy bootstrap optimizer...',
      '[GEPA] Loading historic execution traces from state.db (3 failure modes detected).',
      '[GEPA] Compiling teleprompter. Zero-shot baseline success rate: 71.4%',
      '[GEPA] Running Genetic-Pareto Mutator (Gen 1/5)...',
      '[GEPA] Mutating prompt signature for "github-pr-reviewer"...',
      '[GEPA] Mutation 1 candidate generated (fitness: 0.86, token_cost_delta: -12.4%)',
      '[GEPA] Running validation tests on sandbox...',
      '[GEPA] Mutating prompt signature for "cost-aware-router" (Gen 2/5)...',
      '[GEPA] Caching headers optimized: Ephemeral cache markers injected.',
      '[GEPA] Mutation 2 candidate generated (fitness: 0.94, token_cost_delta: -35.2%)',
      '[GEPA] Selection phase complete. Evolved Pareto frontier updated.',
      '[GEPA] Saving optimized system prompts and updated skill Markdown files...',
      '[SUCCESS] Curation successful. github-pr-reviewer.md patched to v2.5.',
      '[SUCCESS] cost-aware-router.md patched to v3.1.',
      '[SYSTEM] Hermes Core self-evolution cycle complete. Success rate: 94.2% (+22.8% boost).'
    ];

    const timer = setInterval(() => {
      if (step < steps.length) {
        setTerminalLogs(prev => [...prev, steps[step]]);
        step++;
      } else {
        clearInterval(timer);
        setIsEvolving(false);
        // Mutate actual skill state
        setSkills(prev => prev.map(s => {
          if (s.name === 'github-pr-reviewer') return { ...s, version: 'v2.5', status: 'active' };
          if (s.name === 'cost-aware-router') return { ...s, version: 'v3.1', status: 'active' };
          return s;
        }));
      }
    }, 1200);
  };

  // Simulate FTS5 search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);

    setTimeout(() => {
      const queryLower = searchQuery.toLowerCase();
      const matches = MOCK_MEMORY_DATABASE.filter(item => 
        item.keywords.some(keyword => queryLower.includes(keyword))
      ).map(item => item.content);

      if (matches.length > 0) {
        setSearchResults(matches);
      } else {
        setSearchResults([`FTS5 QUERY RETURNED 0 MATCHES. Raw prompt token scan complete. No indexed memory matches found for "${searchQuery}".`]);
      }
      setIsSearching(false);
      setTerminalLogs(prev => [...prev, `[FTS5 SEARCH] Queried state.db for "${searchQuery}" -> Found ${matches.length} matches.`]);
    }, 800);
  };

  return (
    <div className="flex-1 relative flex flex-col border-l border-r border-emerald-900/40 px-6 mx-2 select-none h-full overflow-hidden font-mono bg-emerald-950/5">
      {/* Corner Brackets */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-emerald-500/50"></div>
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-emerald-500/50"></div>
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-emerald-500/50"></div>
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-emerald-500/50"></div>

      {/* Header Info */}
      <div className="flex justify-between items-center border-b border-emerald-800/40 pb-2 mb-4 mt-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
          <span className="text-xs text-emerald-400 tracking-[0.2em] font-bold">HERMES INTELLIGENCE MATRIX v4.5</span>
        </div>
        <div className="text-[10px] text-emerald-500 opacity-80">
          PROFILE: DEFAULT_DEV_SYS
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-2 mb-4 bg-emerald-950/20 p-1 border border-emerald-900/30">
        {(['matrix', 'memory', 'gateway', 'docs'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-[10px] tracking-widest text-center transition-all uppercase border ${
              activeTab === tab 
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[inset_0_0_8px_rgba(16,185,129,0.2)]' 
                : 'border-transparent text-emerald-600 hover:text-emerald-400 hover:bg-emerald-950/45'
            }`}
          >
            {tab === 'matrix' ? 'Learning Loop' : tab === 'memory' ? 'SQLite FTS5' : tab === 'gateway' ? 'Cost Gateway' : 'Tech Specs'}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-cyan mb-4">
        <AnimatePresence mode="wait">
          {activeTab === 'matrix' && (
            <motion.div
              key="matrix"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 h-full flex flex-col"
            >
              {/* Learning Loop SVG Visualizer */}
              <div className="border border-emerald-900/40 p-4 bg-emerald-950/10 flex items-center justify-center relative overflow-hidden h-[180px] flex-shrink-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08)_0%,transparent_70%)]"></div>
                
                {/* SVG Connections & Flows */}
                <svg className="w-full h-full max-w-[420px]" viewBox="0 0 400 160">
                  {/* Nodes */}
                  <g>
                    {/* User Experience Node */}
                    <circle cx="60" cy="80" r="24" fill="rgba(6,78,59,0.3)" stroke="#10b981" strokeWidth="1" strokeDasharray="3,3" />
                    <text x="60" y="83" fill="#34d399" fontSize="8" textAnchor="middle" fontFamily="monospace">EXPERIENCE</text>
                    
                    {/* Skill Curation Node */}
                    <circle cx="200" cy="40" r="24" fill="rgba(6,78,59,0.3)" stroke="#10b981" strokeWidth="1" />
                    <text x="200" y="43" fill="#34d399" fontSize="8" textAnchor="middle" fontFamily="monospace">CURATION</text>
                    
                    {/* Active Skills Repository */}
                    <circle cx="340" cy="80" r="24" fill="rgba(6,78,59,0.3)" stroke="#10b981" strokeWidth="1" strokeDasharray="3,3" />
                    <text x="340" y="83" fill="#34d399" fontSize="8" textAnchor="middle" fontFamily="monospace">SKILLS</text>
                    
                    {/* DSPy/GEPA Genetic Optimizer */}
                    <circle cx="200" cy="120" r="24" fill="rgba(6,78,59,0.3)" stroke="#10b981" strokeWidth="1.5" />
                    <text x="200" y="123" fill="#34d399" fontSize="8" textAnchor="middle" fontFamily="monospace">GEPA EVOLVE</text>
                  </g>

                  {/* Flow Paths with Pulse Markers */}
                  <g stroke="#047857" strokeWidth="1.5" fill="none">
                    {/* Exp -> Curation */}
                    <path d="M 80 65 Q 130 40 176 40" />
                    {/* Curation -> Skills */}
                    <path d="M 224 40 Q 270 40 320 65" />
                    {/* Skills -> GEPA */}
                    <path d="M 320 95 Q 270 120 224 120" />
                    {/* GEPA -> Exp */}
                    <path d="M 176 120 Q 130 120 80 95" />
                  </g>

                  {/* Dynamic pulse spheres traveling along paths */}
                  <motion.circle
                    r="4"
                    fill="#34d399"
                    animate={{
                      cx: [80, 130, 176],
                      cy: [65, 40, 40],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  />
                  <motion.circle
                    r="4"
                    fill="#10b981"
                    animate={{
                      cx: [224, 270, 320],
                      cy: [40, 40, 65],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: 1.5 }}
                  />
                  <motion.circle
                    r="4"
                    fill="#6ee7b7"
                    animate={{
                      cx: [320, 270, 224],
                      cy: [95, 120, 120],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: 0.7 }}
                  />
                </svg>
              </div>

              {/* Skills Grid */}
              <div>
                <div className="text-[10px] text-emerald-400 tracking-wider mb-2 border-b border-emerald-900/30 pb-1">
                  LOADED REUSABLE SKILLS
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {skills.map(skill => (
                    <div key={skill.name} className="border border-emerald-900/40 p-2 bg-emerald-950/15 relative">
                      <div className="flex justify-between items-center text-[10px] mb-1">
                        <span className="text-emerald-300 font-bold">{skill.name}</span>
                        <span className="text-emerald-500 font-bold bg-emerald-950 px-1 border border-emerald-900/50">{skill.version}</span>
                      </div>
                      <p className="text-[9px] text-emerald-500/80 leading-normal line-clamp-2">{skill.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* GEPA Evolution Console */}
              <div className="flex-1 flex flex-col min-h-[140px] border border-emerald-900/50 bg-[#021008] p-3 text-[10px] relative">
                <div className="flex justify-between items-center border-b border-emerald-900/60 pb-1.5 mb-2 flex-shrink-0">
                  <span className="text-emerald-400 text-xs font-bold tracking-widest uppercase">GEPA MUTATION TERMINAL</span>
                  <button
                    disabled={isEvolving}
                    onClick={triggerSelfEvolution}
                    className={`px-3 py-0.5 text-[9px] border uppercase transition-all tracking-wider ${
                      isEvolving 
                        ? 'border-emerald-800 text-emerald-700 bg-emerald-950/10 cursor-not-allowed' 
                        : 'border-emerald-500 text-emerald-300 bg-emerald-900/20 hover:bg-emerald-500/20 hover:text-white shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                    }`}
                  >
                    {isEvolving ? 'Evolving...' : 'Trigger Evolution'}
                  </button>
                </div>
                
                {/* Console Log Area */}
                <div className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-[9px] leading-relaxed text-emerald-500 max-h-[160px]">
                  {terminalLogs.map((log, index) => {
                    let color = 'text-emerald-500';
                    if (log.startsWith('[SUCCESS]')) color = 'text-green-300 font-bold shadow-[0_0_4px_rgba(34,197,94,0.2)]';
                    if (log.startsWith('[SYSTEM]')) color = 'text-emerald-400 opacity-90';
                    if (log.includes('GEPA SELF-EVOLUTION')) color = 'text-amber-400 font-bold tracking-widest';
                    return (
                      <div key={index} className={color}>
                        {log}
                      </div>
                    );
                  })}
                  <div ref={terminalEndRef} />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'memory' && (
            <motion.div
              key="memory"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Database Status HUD */}
              <div className="grid grid-cols-3 gap-2 border border-emerald-900/30 p-2.5 bg-emerald-950/10 text-center">
                <div className="border border-emerald-950 p-1">
                  <div className="text-[9px] opacity-60 text-emerald-500">ENGINE</div>
                  <div className="text-[10px] font-bold text-emerald-300">SQLite v3.45</div>
                </div>
                <div className="border border-emerald-950 p-1">
                  <div className="text-[9px] opacity-60 text-emerald-500">INDEXER</div>
                  <div className="text-[10px] font-bold text-emerald-300">FTS5 Virtual</div>
                </div>
                <div className="border border-emerald-950 p-1">
                  <div className="text-[9px] opacity-60 text-emerald-500">LOOKUP</div>
                  <div className="text-[10px] font-bold text-emerald-300">&lt; 8ms</div>
                </div>
              </div>

              {/* FTS5 Search Form */}
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter keywords (e.g. Tommy, powershell, cost)..."
                  className="flex-1 bg-[#020d06] border border-emerald-800/60 p-2 text-xs text-emerald-300 focus:outline-none focus:border-emerald-400 placeholder:text-emerald-800"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-4 bg-emerald-900/30 border border-emerald-500 text-emerald-300 text-xs hover:bg-emerald-500/20 active:scale-95 transition-all uppercase"
                >
                  {isSearching ? 'Scanning...' : 'FTS Query'}
                </button>
              </form>

              {/* Results Container */}
              <div className="border border-emerald-900/50 bg-[#021008] p-3 text-[10px] min-h-[180px] flex flex-col">
                <div className="text-[10px] text-emerald-400 font-bold border-b border-emerald-900/50 pb-1.5 mb-2 uppercase tracking-wider flex justify-between">
                  <span>SQLite FTS5 Query Returns</span>
                  <span className="text-[8px] font-normal text-emerald-600">state.db &gt; virtual_session_idx</span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 max-h-[220px] scrollbar-cyan pr-1">
                  {searchResults.length > 0 ? (
                    searchResults.map((result, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-2 border-l-2 border-emerald-500 bg-emerald-950/10 text-emerald-400 leading-relaxed text-[10px]"
                      >
                        {result}
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-[10px] text-emerald-700/80 italic text-center mt-12">
                      Ready to execute FTS5 keyword recall.<br/>
                      Try typing keywords such as <span className="underline text-emerald-500 cursor-pointer" onClick={() => { setSearchQuery('Tommy'); }}>"Tommy"</span>,{' '}
                      <span className="underline text-emerald-500 cursor-pointer" onClick={() => { setSearchQuery('powershell'); }}>"powershell"</span>, or{' '}
                      <span className="underline text-emerald-500 cursor-pointer" onClick={() => { setSearchQuery('fts5'); }}>"fts5"</span>.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'gateway' && (
            <motion.div
              key="gateway"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Cost Tracker Widgets */}
              <div className="grid grid-cols-3 gap-2">
                <div className="border border-emerald-900/30 p-2 bg-emerald-950/15">
                  <div className="text-[8px] opacity-60 text-emerald-500">BUDGET LIMIT</div>
                  <div className="text-xs font-bold text-emerald-300">${budget.toFixed(2)}</div>
                </div>
                <div className="border border-emerald-900/30 p-2 bg-emerald-950/15">
                  <div className="text-[8px] opacity-60 text-emerald-500">TOTAL SPENT</div>
                  <div className="text-xs font-bold text-amber-400">${spent.toFixed(4)}</div>
                </div>
                <div className="border border-emerald-900/30 p-2 bg-emerald-950/15">
                  <div className="text-[8px] opacity-60 text-emerald-500">CACHE HITS</div>
                  <div className="text-xs font-bold text-green-300">{cacheHits}%</div>
                </div>
              </div>

              {/* Progress bar budget tracker */}
              <div className="border border-emerald-900/40 p-2 bg-emerald-950/10">
                <div className="flex justify-between text-[9px] mb-1 text-emerald-500 font-bold">
                  <span>BUDGET CONSUMPTION PROFILE</span>
                  <span>{((spent / budget) * 100).toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-emerald-950 w-full overflow-hidden border border-emerald-900/40">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-1000" 
                    style={{ width: `${(spent / budget) * 100}%` }}
                  />
                </div>
              </div>

              {/* Model Router Mode */}
              <div className="border border-emerald-900/30 p-3 bg-emerald-950/10 space-y-2">
                <div className="text-[9px] text-emerald-400 font-bold tracking-wider uppercase border-b border-emerald-900/30 pb-1">
                  COST-AWARE ROUTING MATRIX POLICY
                </div>
                
                <div className="flex gap-2">
                  {(['auto', 'haiku', 'sonnet'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setSelectedModel(mode)}
                      className={`flex-1 py-1 border text-[9px] tracking-wider uppercase transition-all ${
                        selectedModel === mode 
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' 
                          : 'border-emerald-900/40 text-emerald-600 hover:border-emerald-700'
                      }`}
                    >
                      {mode === 'auto' ? 'Auto Router' : mode === 'haiku' ? 'Haiku Only' : 'Sonnet Only'}
                    </button>
                  ))}
                </div>

                <div className="text-[8px] text-emerald-500/80 leading-relaxed pt-1.5 space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span>• Input &lt; 10k Chars (Complexity: Low)</span>
                    <span className="text-emerald-400 font-bold">→ Claude Haiku ($0.80/1M)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Input &gt;= 10k Chars / Curation Task (High)</span>
                    <span className="text-emerald-400 font-bold">→ Claude Sonnet ($3.00/1M)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Dynamic Ephemeral Caching Headers</span>
                    <span className="text-emerald-400 font-bold">→ Enabled [Active]</span>
                  </div>
                </div>
              </div>

              {/* Live API Routing Logs */}
              <div className="border border-emerald-900/50 bg-[#021008] p-2.5 text-[9px] flex flex-col min-h-[100px]">
                <div className="text-[9px] text-emerald-400 font-bold border-b border-emerald-900/40 pb-1 mb-2 uppercase tracking-wider">
                  REAL-TIME GATEWAY CALL HISTORY (MUTATION TRACE)
                </div>
                <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[120px] scrollbar-cyan pr-1 text-emerald-600 font-mono">
                  {simulatedLogs.map((log, idx) => (
                    <div key={idx} className="border-b border-emerald-950 pb-1 font-mono hover:text-emerald-400 transition-colors">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'docs' && (
            <motion.div
              key="docs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 text-emerald-400/90 leading-relaxed text-[10px] pb-4"
            >
              <div className="border border-emerald-900/40 p-3 bg-emerald-950/15 space-y-3 font-mono max-h-[380px] overflow-y-auto scrollbar-cyan pr-2">
                <div>
                  <h4 className="text-emerald-300 font-bold text-xs tracking-wider border-b border-emerald-900/50 pb-1.5 uppercase mb-1">
                    NousResearch Hermes-Agent Specifications
                  </h4>
                  <p className="opacity-90 leading-relaxed">
                    Hermes Agent is an autonomous AI agent framework focusing on <strong>experience-driven evolution</strong>. Unlike stateless session setups, it records historical traces, parses failure nodes using DSPy, and updates its core system instructions dynamically.
                  </p>
                </div>

                <div>
                  <h5 className="text-emerald-300 font-bold border-l-2 border-emerald-500 pl-1.5 mb-1.5 uppercase tracking-wide">
                    1. Three-Layer Memory Persistence
                  </h5>
                  <ul className="list-disc pl-4 space-y-1 opacity-80">
                    <li><strong>Session Context:</strong> Auto-compresses tokens when context window boundaries are met.</li>
                    <li><strong>SQLite/FTS5 Database:</strong> Virtual key-text matching indices across full conversation histories, retrieving files/traces in sub-10ms intervals.</li>
                    <li><strong>Plain Markdown Profiles:</strong> Persists state using readable markdown files (<code className="text-emerald-300">USER.md</code> & <code className="text-emerald-300">MEMORY.md</code>).</li>
                  </ul>
                </div>

                <div>
                  <h5 className="text-emerald-300 font-bold border-l-2 border-emerald-500 pl-1.5 mb-1.5 uppercase tracking-wide">
                    2. Dynamic Skill Curation Standard
                  </h5>
                  <p className="opacity-80 leading-normal mb-1.5">
                    Successful workflows are packaged into reusable skills conforming to the <code className="text-emerald-300">agentskills.io</code> specification. Injected on-the-fly, avoiding repetitious context discovery.
                  </p>
                </div>

                <div>
                  <h5 className="text-emerald-300 font-bold border-l-2 border-emerald-500 pl-1.5 mb-1.5 uppercase tracking-wide">
                    3. GEPA evolutionary pipelines
                  </h5>
                  <p className="opacity-80 leading-normal">
                    Genetic-Pareto Prompt Evolution utilizes trace evaluation sets, runs mutations, filters signature changes based on Pareto cost constraints, and patches the system configurations to boost overall accuracy.
                  </p>
                </div>

                <div>
                  <h5 className="text-emerald-300 font-bold border-l-2 border-emerald-500 pl-1.5 mb-1.5 uppercase tracking-wide">
                    4. Command-Line Core CLI
                  </h5>
                  <div className="grid grid-cols-2 gap-1 border border-emerald-950 p-2 text-[9px] bg-black/20 font-mono">
                    <div><code className="text-emerald-300">hermes chat</code></div>
                    <div>Launch TUI/CLI chat</div>
                    <div><code className="text-emerald-300">hermes model</code></div>
                    <div>Interactive setup</div>
                    <div><code className="text-emerald-300">hermes skills</code></div>
                    <div>Manage curation list</div>
                    <div><code className="text-emerald-300">hermes doctor</code></div>
                    <div>Run diagnostic check</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Navigation Hints */}
      <div className="border-t border-emerald-900/40 pt-2 pb-2 text-[8px] text-emerald-500/70 tracking-widest uppercase flex justify-between flex-shrink-0">
        <span>SECURITY: SYSTEM CLEAR</span>
        <span>SYS FREQ: 98.7GHz</span>
      </div>
    </div>
  );
}
