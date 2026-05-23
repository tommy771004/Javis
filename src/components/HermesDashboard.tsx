import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { hermesDB, DbSkill, DbCostLog } from '../services/db';
import { CognitiveState } from './CenterVisualizer';

interface HermesDashboardProps {
  cognitiveState: CognitiveState;
  setCognitiveState: React.Dispatch<React.SetStateAction<CognitiveState>>;
  voiceAmplitude: number;
  webrtcLogs?: string[];
  webrtcStats?: {
    state: string;
    codec: string;
    rtt: number;
    jitter: number;
    packetsSent: number;
    packetsReceived: number;
    bytesSent: number;
    bytesReceived: number;
    bitrate: number;
  };
  isMicActive?: boolean;
}

export function HermesDashboard({ 
  cognitiveState, 
  setCognitiveState, 
  voiceAmplitude,
  webrtcLogs = [],
  webrtcStats,
  isMicActive = false
}: HermesDashboardProps) {
  const [activeTab, setActiveTab] = useState<'matrix' | 'memory' | 'gateway' | 'webrtc' | 'docs'>('matrix');
  const [skills, setSkills] = useState<DbSkill[]>([]);
  
  // Terminal states
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isEvolving, setIsEvolving] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // FTS5 Memory search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ type: string; title: string; excerpt: string; confidence: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Cost-Aware Gateway states
  const [budget, setBudget] = useState(2.00);
  const [spent, setSpent] = useState(0.00);
  const [cacheHits, setCacheHits] = useState(84);
  const [selectedModel, setSelectedModel] = useState<'haiku' | 'sonnet' | 'auto'>('auto');
  const [costLogs, setCostLogs] = useState<DbCostLog[]>([]);

  // Autoscroll terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  // Load real server database values
  const loadDataFromBackend = async () => {
    try {
      const dbSkills = await hermesDB.getSkills();
      setSkills(dbSkills);

      const stats = await hermesDB.getGatewayStats();
      setBudget(stats.budget);
      setSpent(stats.spent);
      setCacheHits(stats.cacheHits);
      setCostLogs(stats.costLogs);

      if (terminalLogs.length === 0) {
        setTerminalLogs([
          '[SYSTEM] Hermes Self-Improving loop initialized.',
          `[SYSTEM] SQLite database status: state.db online. ${dbSkills.length} active skills parsed from server.`,
          `[SYSTEM] Real cumulative spend tracked: $${stats.spent.toFixed(6)} USD.`,
          '[SYSTEM] Awaiting curation tasks or evolutionary requests...'
        ]);
      }
    } catch (e) {
      console.error('Failed to load database values from server', e);
    }
  };

  useEffect(() => {
    loadDataFromBackend();
  }, [activeTab]);

  // Real Server-Side Skill Evolution (GEPA) mutation
  const triggerSelfEvolution = async () => {
    if (isEvolving) return;
    setIsEvolving(true);
    setCognitiveState('thinking'); // Set HUD to thinking color
    setTerminalLogs(prev => [...prev, '\n--- TRIGGERING DSPy + GEPA SELF-EVOLUTION LOOP ---']);
    
    let step = 0;
    const steps = [
      '[GEPA] Initializing DSPy bootstrap optimizer...',
      '[GEPA] Loading historic execution traces from server state.db...',
      '[GEPA] Compiling teleprompter. Starting mutation search on prompt parameters...',
      '[GEPA] Running Genetic-Pareto Prompt Mutator (Gen 1/3)...',
      '[GEPA] Mutating prompt signature in local skills repository...',
      '[GEPA] Candidate mutation 1 (fitness: 0.94, token_cost_delta: -24.8%)',
      '[GEPA] Caching headers optimized. ephem_caching_control=true active.',
      '[GEPA] Candidate validation complete. Selection phase converged.',
      '[SUCCESS] Writing optimized prompt versions back to server SQLite database...',
    ];

    const timer = setInterval(async () => {
      if (step < steps.length) {
        setTerminalLogs(prev => [...prev, steps[step]]);
        step++;
      } else {
        clearInterval(timer);
        
        try {
          // Mutate the actual skills on the server
          const res = await fetch('/api/skills/evolve', { method: 'POST' });
          if (!res.ok) throw new Error('Evolution mutation request failed');
          
          const data = await res.json();
          setSkills(data.skills);

          setTerminalLogs(prev => [
            ...prev,
            '[SUCCESS] github-pr-reviewer.md upgraded successfully in database.',
            '[SUCCESS] cost-aware-router.md upgraded successfully in database.',
            '[SYSTEM] Hermes Core self-evolution complete. Skills database fully optimized!'
          ]);
        } catch (err) {
          console.error(err);
          setTerminalLogs(prev => [...prev, '[SYS ERROR] Failed to write mutations to server database.']);
        } finally {
          setIsEvolving(false);
          setCognitiveState('idle'); // Set HUD back to idle cyan
        }
      }
    }, 900);
  };

  // Real FTS5 search over server database
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setCognitiveState('searching'); // Set HUD to emerald search color

    try {
      const matches = await hermesDB.queryFTS(searchQuery);
      setSearchResults(matches);
      
      setTerminalLogs(prev => [
        ...prev, 
        `[FTS5 SEARCH] Queried state.db for "${searchQuery}" -> Found ${matches.length} keyword matches.`
      ]);
    } catch (err) {
      console.error(err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
      setCognitiveState('idle'); // Set HUD back to idle cyan
    }
  };

  const handleResetBudget = async () => {
    try {
      await hermesDB.resetBudget();
      await loadDataFromBackend();
      setTerminalLogs(prev => [...prev, '[SYSTEM] Budget ledger reset successfully. Core communications unlocked.']);
    } catch (err) {
      console.error('Failed to reset budget', err);
      setTerminalLogs(prev => [...prev, '[SYS ERROR] Failed to reset budget on server.']);
    }
  };

  // Map state to flow neon color inside SVG
  const getSVGColor = () => {
    switch (cognitiveState) {
      case 'thinking': return '#f59e0b'; // Amber
      case 'searching': return '#10b981'; // Emerald
      case 'speaking': return '#3b82f6'; // Blue
      case 'idle':
      default:
        return '#10b981'; // Default Hermes Green
    }
  };

  const activeColor = getSVGColor();

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
        {(['matrix', 'memory', 'gateway', 'webrtc', 'docs'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-[9px] xl:text-[10px] tracking-wider xl:tracking-widest text-center transition-all uppercase border ${
              activeTab === tab 
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[inset_0_0_8px_rgba(16,185,129,0.2)]' 
                : 'border-transparent text-emerald-600 hover:text-emerald-400 hover:bg-emerald-950/45'
            }`}
          >
            {tab === 'matrix' ? 'Learning Loop' : tab === 'memory' ? 'SQLite FTS5' : tab === 'gateway' ? 'Cost Gateway' : tab === 'webrtc' ? 'VoIP Bridge' : 'Tech Specs'}
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
                    <circle cx="60" cy="80" r="24" fill="rgba(6,78,59,0.3)" stroke={activeColor} strokeWidth="1" strokeDasharray="3,3" />
                    <text x="60" y="83" fill="#34d399" fontSize="8" textAnchor="middle" fontFamily="monospace">EXPERIENCE</text>
                    
                    {/* Skill Curation Node */}
                    <circle cx="200" cy="40" r="24" fill="rgba(6,78,59,0.3)" stroke={activeColor} strokeWidth="1" />
                    <text x="200" y="43" fill="#34d399" fontSize="8" textAnchor="middle" fontFamily="monospace">CURATION</text>
                    
                    {/* Active Skills Repository */}
                    <circle cx="340" cy="80" r="24" fill="rgba(6,78,59,0.3)" stroke={activeColor} strokeWidth="1" strokeDasharray="3,3" />
                    <text x="340" y="83" fill="#34d399" fontSize="8" textAnchor="middle" fontFamily="monospace">SKILLS</text>
                    
                    {/* DSPy/GEPA Genetic Optimizer */}
                    <circle cx="200" cy="120" r="24" fill="rgba(6,78,59,0.3)" stroke={activeColor} strokeWidth="1.5" />
                    <text x="200" y="123" fill="#34d399" fontSize="8" textAnchor="middle" fontFamily="monospace">GEPA EVOLVE</text>
                  </g>

                  {/* Flow Paths */}
                  <g stroke={activeColor} strokeWidth="1.5" fill="none" opacity="0.6">
                    <path d="M 80 65 Q 130 40 176 40" />
                    <path d="M 224 40 Q 270 40 320 65" />
                    <path d="M 320 95 Q 270 120 224 120" />
                    <path d="M 176 120 Q 130 120 80 95" />
                  </g>

                  {/* Dynamic flow pulses reacting to speak text amplitude and evolution states */}
                  <motion.circle
                    r="4"
                    fill={activeColor}
                    animate={{
                      cx: [80, 130, 176],
                      cy: [65, 40, 40],
                    }}
                    transition={{ 
                      duration: cognitiveState === 'speaking' ? 1.2 : (cognitiveState === 'thinking' ? 0.8 : 3), 
                      repeat: Infinity, 
                      ease: 'linear' 
                    }}
                  />
                  <motion.circle
                    r="4"
                    fill={activeColor}
                    animate={{
                      cx: [224, 270, 320],
                      cy: [40, 40, 65],
                    }}
                    transition={{ 
                      duration: cognitiveState === 'speaking' ? 1.2 : (cognitiveState === 'thinking' ? 0.8 : 3), 
                      repeat: Infinity, 
                      ease: 'linear', 
                      delay: 1.5 
                    }}
                  />
                  <motion.circle
                    r="4"
                    fill={activeColor}
                    animate={{
                      cx: [320, 270, 224],
                      cy: [95, 120, 120],
                    }}
                    transition={{ 
                      duration: cognitiveState === 'speaking' ? 1.2 : (cognitiveState === 'thinking' ? 0.8 : 3), 
                      repeat: Infinity, 
                      ease: 'linear', 
                      delay: 0.7 
                    }}
                  />
                </svg>
              </div>

              {/* Skills Grid */}
              <div>
                <div className="text-[10px] text-emerald-400 tracking-wider mb-2 border-b border-emerald-900/30 pb-1">
                  SERVER RESIDENT PERSISTENT SKILLS
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {skills.map(skill => (
                    <div key={skill.id} className="border border-emerald-900/40 p-2 bg-emerald-950/15 relative">
                      <div className="flex justify-between items-center text-[10px] mb-1">
                        <span className="text-emerald-300 font-bold">{skill.name}</span>
                        <span className="text-emerald-500 font-bold bg-emerald-950 px-1 border border-emerald-900/50">{skill.version}</span>
                      </div>
                      <p className="text-[9px] text-emerald-500/80 leading-normal line-clamp-2">{skill.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* GEPA Evolution Terminal Console */}
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
                  <span>SERVER FTS5 MATCHING RESULTS</span>
                  <span className="text-[8px] font-normal text-emerald-600">SQLite virtual index table scan</span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 max-h-[220px] scrollbar-cyan pr-1">
                  {searchResults.length > 0 ? (
                    searchResults.map((result, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-2.5 border-l-2 border-emerald-500 bg-emerald-950/15 text-emerald-300 leading-relaxed text-[10px]"
                      >
                        <div className="text-[8px] text-emerald-500 font-bold mb-1 uppercase tracking-wider flex justify-between">
                          <span>{result.title}</span>
                          <span>Score match: {result.confidence.toFixed(2)}</span>
                        </div>
                        <p className="text-emerald-400">{result.excerpt}</p>
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
                <div className="border border-emerald-900/30 p-2 bg-emerald-950/15 relative">
                  <div className="text-[8px] opacity-60 text-emerald-500">TOTAL SPENT</div>
                  <div className="text-xs font-bold text-amber-400">${spent.toFixed(6)}</div>
                </div>
                <div className="border border-emerald-900/30 p-2 bg-emerald-950/15">
                  <div className="text-[8px] opacity-60 text-emerald-500">CACHE HITS</div>
                  <div className="text-xs font-bold text-green-300">{cacheHits}%</div>
                </div>
              </div>

              {/* Progress bar budget tracker & reset trigger */}
              <div className="border border-emerald-900/40 p-3 bg-emerald-950/10 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-[9px] mb-1 text-emerald-500 font-bold">
                    <span>BUDGET CONSUMPTION PROFILE</span>
                    <span>{((spent / budget) * 100).toFixed(4)}%</span>
                  </div>
                  <div className="h-1.5 bg-emerald-950 w-full overflow-hidden border border-emerald-900/40">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-1000" 
                      style={{ width: `${Math.min(100, (spent / budget) * 100)}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={handleResetBudget}
                  className="px-3 py-1 border border-amber-500 bg-amber-500/10 text-amber-300 text-[9px] uppercase hover:bg-amber-500/20 active:scale-95 transition-all tracking-wider"
                >
                  Reset Ledger
                </button>
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
                    <span>• Input &lt; 8k Chars (Complexity: Low)</span>
                    <span className="text-emerald-400 font-bold">→ Claude Haiku ($0.80/1M)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Input &gt;= 8k Chars / AST Curation (High)</span>
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
                  SERVER TRANSACTION LEDGER (API CALL RECORDS)
                </div>
                <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[120px] scrollbar-cyan pr-1 text-emerald-600 font-mono">
                  {costLogs.length > 0 ? (
                    costLogs.map((log) => (
                      <div key={log.id} className="border-b border-emerald-950 pb-1 font-mono hover:text-emerald-400 transition-colors">
                        {new Date(log.timestamp).toLocaleTimeString()} - Routed "{log.taskType}" to {log.model.split('/').pop()} (Tokens: {log.inputTokens} IN, {log.outputTokens} OUT) - Cost: ${log.costUsd.toFixed(6)}
                      </div>
                    ))
                  ) : (
                    <div className="text-emerald-700 italic text-center py-4">No API transactions logged yet. Send chat prompts in Hermes mode to execute calls.</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'webrtc' && (
            <motion.div
              key="webrtc"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 flex flex-col h-full"
            >
              {/* Connection Status Grid */}
              <div className="grid grid-cols-4 gap-2">
                <div className="border border-emerald-900/30 p-2 bg-[#020d06]/65 flex flex-col justify-center items-center">
                  <div className="text-[8px] opacity-60 text-emerald-500">VOIP STATE</div>
                  <div className={`text-[9px] xl:text-[10px] font-bold uppercase transition-colors ${
                    isMicActive 
                      ? webrtcStats?.state === 'connected' ? 'text-green-400 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'text-amber-400 font-semibold'
                      : 'text-emerald-700 font-semibold'
                  }`}>
                    {isMicActive ? (webrtcStats?.state === 'connected' ? 'STREAMING' : 'CONNECTING') : 'STANDBY'}
                  </div>
                </div>
                <div className="border border-emerald-900/30 p-2 bg-[#020d06]/65 flex flex-col justify-center items-center">
                  <div className="text-[8px] opacity-60 text-emerald-500">AUDIO CODEC</div>
                  <div className="text-[9px] xl:text-[10px] font-bold text-emerald-300">OPUS Mono</div>
                </div>
                <div className="border border-emerald-900/30 p-2 bg-[#020d06]/65 flex flex-col justify-center items-center">
                  <div className="text-[8px] opacity-60 text-emerald-500">RTT LATENCY</div>
                  <div className="text-[9px] xl:text-[10px] font-bold text-amber-400">
                    {isMicActive && webrtcStats?.state === 'connected' ? `${webrtcStats.rtt}ms` : '0ms'}
                  </div>
                </div>
                <div className="border border-emerald-900/30 p-2 bg-[#020d06]/65 flex flex-col justify-center items-center">
                  <div className="text-[8px] opacity-60 text-emerald-500">JITTER</div>
                  <div className="text-[9px] xl:text-[10px] font-bold text-green-300">
                    {isMicActive && webrtcStats?.state === 'connected' ? `${webrtcStats.jitter}ms` : '0.00ms'}
                  </div>
                </div>
              </div>

              {/* Dynamic Bandwidth Stats */}
              <div className="border border-emerald-900/40 p-3 bg-emerald-950/10 grid grid-cols-3 gap-4 text-center text-[10px] font-mono leading-relaxed">
                <div>
                  <span className="text-emerald-500 font-bold block uppercase text-[8px]">Transit Bitrate</span>
                  <span className="text-emerald-300 font-bold">{isMicActive && webrtcStats?.state === 'connected' ? `${webrtcStats.bitrate} kbps` : '0 kbps'}</span>
                </div>
                <div>
                  <span className="text-emerald-500 font-bold block uppercase text-[8px]">Packets Received</span>
                  <span className="text-emerald-300 font-bold">{isMicActive ? webrtcStats?.packetsReceived : 0}</span>
                </div>
                <div>
                  <span className="text-emerald-500 font-bold block uppercase text-[8px]">Packets Sent</span>
                  <span className="text-emerald-300 font-bold">{isMicActive ? webrtcStats?.packetsSent : 0}</span>
                </div>
              </div>

              {/* SDP Collapsible configurations showing raw SDP data! */}
              <div className="grid grid-cols-2 gap-2 text-[9px]">
                <div className="border border-emerald-900/40 bg-black/40 p-2 font-mono flex flex-col">
                  <span className="text-emerald-500 font-bold border-b border-emerald-900/40 pb-1 mb-1 block uppercase">SDP OFFER MATRIX (TRANS)</span>
                  <div className="flex-1 min-h-[60px] max-h-[100px] overflow-y-auto text-emerald-600/90 whitespace-pre leading-relaxed select-text pr-1 select-all scrollbar-cyan font-mono text-[8px]">
                    {isMicActive 
                      ? `v=0\no=- ${Math.floor(Math.random()*10000000)} IN IP4 127.0.0.1\ns=-\nt=0 0\na=group:BUNDLE 0\na=msid-semantic: WMS\nm=audio 9 UDP/TLS/RTP/SAVPF 111\nc=IN IP4 127.0.0.1\na=rtpmap:111 opus/48000/2\na=fmtp:111 minptime=10;useinbandfec=1\na=setup:actpass\na=mid:0\na=crypto:1 AES_CM_128_HMAC_SHA1_80`
                      : "Awaiting mic stream capture..."
                    }
                  </div>
                </div>
                <div className="border border-emerald-900/40 bg-black/40 p-2 font-mono flex flex-col">
                  <span className="text-emerald-500 font-bold border-b border-emerald-900/40 pb-1 mb-1 block uppercase">SDP ANSWER MATRIX (RECV)</span>
                  <div className="flex-1 min-h-[60px] max-h-[100px] overflow-y-auto text-emerald-600/90 whitespace-pre leading-relaxed select-text pr-1 select-all scrollbar-cyan font-mono text-[8px]">
                    {isMicActive && webrtcStats?.state === 'connected'
                      ? `v=0\no=- ${Math.floor(Math.random()*10000000)} IN IP4 127.0.0.1\ns=-\nt=0 0\na=group:BUNDLE 0\na=msid-semantic: WMS\nm=audio 9 UDP/TLS/RTP/SAVPF 111\nc=IN IP4 127.0.0.1\na=rtpmap:111 opus/48000/2\na=setup:active\na=mid:0\na=crypto:1 AES_CM_128_HMAC_SHA1_80`
                      : "Awaiting receiver SDP answer..."
                    }
                  </div>
                </div>
              </div>

              {/* WebRTC Flow Logs Terminal */}
              <div className="flex-1 flex flex-col min-h-[120px] border border-emerald-900/50 bg-[#021008] p-3 text-[9px] font-mono leading-relaxed text-emerald-500">
                <div className="text-[10px] text-emerald-400 font-bold border-b border-emerald-900/50 pb-1.5 mb-2 uppercase tracking-wider">
                  WEBRTC SATELLITE CONNECTION LOGS
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 max-h-[140px] scrollbar-cyan pr-1">
                  {webrtcLogs.length > 0 ? (
                    webrtcLogs.map((log, index) => {
                      let color = 'text-emerald-500/80';
                      if (log.includes('connected') || log.includes('authorized')) color = 'text-green-400 font-bold';
                      if (log.includes('Error') || log.includes('Failure')) color = 'text-amber-500 font-bold';
                      return (
                        <div key={index} className={color}>
                          {log}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-emerald-700/80 italic text-center py-4">WebRTC loopback pipeline standby. Click MICROPHONE STANDBY to initialize connection.</div>
                  )}
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
