import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { hermesDB, DbSkill, DbCostLog } from '../services/db';
import { CognitiveState } from './CenterVisualizer';
import { TaskPriorityDonut } from './TaskPriorityDonut';
import { useI18n } from '../services/i18n';

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
    offerSdp?: string;
    answerSdp?: string;
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
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'matrix' | 'memory' | 'tasks' | 'gateway' | 'webrtc' | 'docs'>('tasks');
  const [skills, setSkills] = useState<DbSkill[]>([]);
  
  // Terminal states
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isEvolving, setIsEvolving] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // FTS5 Memory search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ type: string; title: string; excerpt: string; confidence: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Task states
  const [tasks, setTasks] = useState<any[]>([]);
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    taskId: string | null;
  } | null>(null);
  const [editingTask, setEditingTask] = useState<{ id: string; description: string } | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // Close context menu on any outside click or context menu trigger
  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    window.addEventListener('contextmenu', closeMenu);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('contextmenu', closeMenu);
    };
  }, []);

  // Cost-Aware Gateway states
  const [budget, setBudget] = useState(2.00);
  const [spent, setSpent] = useState(0.00);
  const [cacheHits, setCacheHits] = useState(84);
  const [selectedModel, setSelectedModel] = useState<'haiku' | 'sonnet' | 'auto'>('auto');
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [costLogs, setCostLogs] = useState<DbCostLog[]>([]);
  const [cognitiveMemoriesCount, setCognitiveMemoriesCount] = useState(0);
  const [selectedLoopNode, setSelectedLoopNode] = useState<'experience' | 'curation' | 'skills' | 'gepa'>('experience');
  const [systemStats, setSystemStats] = useState<{ freq: string; os: string }>({ freq: '4.2GHz', os: 'STARK_OS' });

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
      
      let memoriesCount = 0;
      try {
        const memories = await hermesDB.getCognitiveMemories();
        memoriesCount = memories.length;
      } catch (err) {
        console.warn("Failed to load cognitive memories in dashboard loop:", err);
      }
      setCognitiveMemoriesCount(memoriesCount);
      
      const settingsRes = await fetch('/api/settings');
      const tasksRes = await fetch('/api/tasks');
      
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        if (data.gatewayRoutingModel) {
          setSelectedModel(data.gatewayRoutingModel);
        } else {
          // Fallback to local storage if not in DB yet
          const localModel = localStorage.getItem('jarvis_gateway_routing_model');
          if (localModel === 'haiku' || localModel === 'sonnet' || localModel === 'auto') {
            setSelectedModel(localModel as 'haiku' | 'sonnet' | 'auto');
          }
        }
      }

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData);
      }

      // Sync Terminal Logs with real server-side system logs
      const logsRes = await fetch('/api/system/logs');
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        const formatted = logsData.map((l: any) => `[${l.category}] ${l.message}`);
        setTerminalLogs(formatted);
      }

      const statsRes = await fetch('/api/system/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setSystemStats({
          freq: statsData.freq || '4.2GHz',
          os: `STARK_OS_${statsData.os || 'GENRIC'}`
        });
      }

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

  const handleAddTask = async () => {
    if (!newTaskText.trim()) return;
    
    const res = await fetch('/api/workspace/task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        description: newTaskText, 
        priority: newTaskPriority, 
        taskMode: 'manual', 
        userApproved: true 
      })
    });
    
    if (res.ok) {
      setNewTaskText('');
      setNewTaskPriority('Medium');
      loadDataFromBackend();
    }
  };

  const saveRoutingPolicy = async (mode: 'haiku' | 'sonnet' | 'auto') => {
    setSelectedModel(mode);
    localStorage.setItem('jarvis_gateway_routing_model', mode);
    
    // Optionally persist to backend settings
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gatewayRoutingModel: mode })
      });
    } catch (e) {
      console.warn("Failed to save routing policy to backend", e);
    }
  };

  useEffect(() => {
    loadDataFromBackend();
    const handleUpdate = () => loadDataFromBackend();
    window.addEventListener('task-list-updated', handleUpdate);
    window.addEventListener('skills-updated', handleUpdate);
    window.addEventListener('cognitive-memory-updated', handleUpdate);

    // Regular polling for autonomous updates (tasks, logs, budget)
    const pollInterval = setInterval(() => {
      loadDataFromBackend();
    }, 4000);

    // Regular stats polling for footer metrics
    const statsInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/system/stats');
        if (res.ok) {
          const data = await res.json();
          setSystemStats({
            freq: data.freq || '4.2GHz',
            os: `STARK_OS_${data.os || 'GENRIC'}`
          });
        }
      } catch (e) {}
    }, 5000);

    return () => {
      window.removeEventListener('task-list-updated', handleUpdate);
      window.removeEventListener('skills-updated', handleUpdate);
      window.removeEventListener('cognitive-memory-updated', handleUpdate);
      clearInterval(statsInterval);
    };
  }, [activeTab]);

  // Real Server-Side Skill Evolution (GEPA) mutation
  const triggerSelfEvolution = () => {
    if (isEvolving) return;
    setIsEvolving(true);
    setCognitiveState('thinking'); // Set HUD to thinking color
    setTerminalLogs(prev => [...prev, '\n--- TRIGGERING DSPy + GEPA SELF-EVOLUTION LOOP ---']);
    setTerminalLogs(prev => [...prev, '[GEPA] Connecting to Cognitive Quantum Matrix via SSE stream...']);

    // Initialize EventSource pointing to our new GET SSE endpoint
    const eventSource = new EventSource('/api/skills/evolve');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.log) {
          setTerminalLogs(prev => [...prev, data.log]);
        }
      } catch (err) {
        console.error("Error parsing stream message:", err);
      }
    };

    eventSource.addEventListener('done', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        if (data.skills) {
          setSkills(data.skills);
        }
        setTerminalLogs(prev => [
          ...prev,
          '[SYSTEM] Hermes Core self-evolution complete. Skills database fully optimized!'
        ]);
        window.dispatchEvent(new CustomEvent('skills-updated'));
      } catch (err) {
        console.error("Error parsing stream done payload:", err);
      } finally {
        eventSource.close();
        setIsEvolving(false);
        setCognitiveState('idle'); // Set HUD back to idle cyan
      }
    });

    eventSource.addEventListener('error', (event: any) => {
      console.error("EventSource encountered error:", event);
      setTerminalLogs(prev => [...prev, '[SYS ERROR] Evolution stream failed or aborted.']);
      eventSource.close();
      setIsEvolving(false);
      setCognitiveState('idle');
    });
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
          <span className="text-xs text-emerald-400 tracking-[0.2em] font-bold">{t.hermesMatrixTitle}</span>
        </div>
        <div className="text-[10px] text-emerald-500 opacity-80 uppercase">
          {t.hermesProfile}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-2 mb-4 bg-emerald-950/20 p-1 border border-emerald-900/30">
        {(['matrix', 'memory', 'tasks', 'gateway', 'webrtc', 'docs'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-[9px] xl:text-[10px] tracking-wider xl:tracking-widest text-center transition-all uppercase border ${
              activeTab === tab 
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[inset_0_0_8px_rgba(16,185,129,0.2)]' 
                : 'border-transparent text-emerald-600 hover:text-emerald-400 hover:bg-emerald-950/45'
            }`}
          >
            {tab === 'matrix' ? t.hermesTabLoop : tab === 'memory' ? t.hermesTabFts : tab === 'tasks' ? t.hermesTabTasks : tab === 'gateway' ? t.hermesTabGateway : tab === 'webrtc' ? t.hermesTabVoip : t.hermesTabDocs}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-cyan mb-4">
        <AnimatePresence mode="wait">
          {activeTab === 'tasks' && (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 h-full flex flex-col relative"
            >
              {/* Dynamic Task Priority Distribution (D3 Donut Chart) */}
              <TaskPriorityDonut tasks={tasks} />

              <div className="border border-emerald-900/40 p-3 bg-emerald-950/10 flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-3 border-b border-emerald-900/30 pb-2">
                  <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px]">{t.hermesTaskTrackerTitle}</span>
                  <div className="flex gap-2 items-center text-[9px] font-bold uppercase">
                    <span className="text-emerald-600">{t.hermesPendingLabel.replace('{count}', String(tasks.filter(t => t.status === 'Pending').length))}</span>
                    <span className="text-emerald-800">|</span>
                    <span className="text-emerald-600 animate-pulse">{t.hermesRightClickTip}</span>
                  </div>
                </div>

                {/* Task Search Input Bar */}
                <div className="mb-3 relative">
                  <input
                    type="text"
                    placeholder={t.hermesSearchPlaceholder}
                    value={taskSearchQuery}
                    onChange={(e) => setTaskSearchQuery(e.target.value)}
                    className="w-full bg-[#020d06] border border-emerald-900/60 p-2 text-[10px] tracking-widest text-emerald-300 placeholder:text-emerald-800/80 focus:outline-none focus:border-emerald-500/80 rounded-sm font-mono uppercase"
                  />
                  {taskSearchQuery && (
                    <button 
                      onClick={() => setTaskSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500 hover:text-emerald-300 text-[9px] font-bold font-mono"
                    >
                      [CLEAR]
                    </button>
                  )}
                </div>

                {/* Task Creation Input Bar */}
                <div className="mb-4 flex gap-2">
                  <input
                    type="text"
                    placeholder="ENTER NEW OBJECTIVE..."
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                    className="flex-1 bg-[#020d06] border border-emerald-900/60 p-2 text-[10px] tracking-widest text-emerald-300 placeholder:text-emerald-800/80 focus:outline-none focus:border-emerald-500/80 rounded-sm font-mono uppercase"
                  />
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="bg-[#020d06] border border-emerald-900/60 p-2 text-[10px] text-emerald-400 focus:outline-none focus:border-emerald-500/80 rounded-sm font-mono uppercase cursor-pointer"
                  >
                    <option value="Low">LOW</option>
                    <option value="Medium">MED</option>
                    <option value="High">HIGH</option>
                  </select>
                  <button
                    onClick={handleAddTask}
                    disabled={!newTaskText.trim()}
                    className="px-4 py-2 bg-emerald-900/20 hover:bg-emerald-800/40 border border-emerald-700/50 text-emerald-400 text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-sm"
                  >
                    ADD
                  </button>
                </div>

                {/* Task Search Input Bar */}
                <div className="mb-3 relative">
                  <input
                    type="text"
                    placeholder={t.hermesSearchPlaceholder}
                    value={taskSearchQuery}
                    onChange={(e) => setTaskSearchQuery(e.target.value)}
                    className="w-full bg-[#020d06] border border-emerald-900/60 p-2 text-[10px] tracking-widest text-emerald-300 placeholder:text-emerald-800/80 focus:outline-none focus:border-emerald-500/80 rounded-sm font-mono uppercase"
                  />
                  {taskSearchQuery && (
                    <button 
                      onClick={() => setTaskSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500 hover:text-emerald-300 text-[9px] font-bold font-mono"
                    >
                      [CLEAR]
                    </button>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-cyan">
                  {(() => {
                    const filteredTasks = tasks.filter(task => 
                      task.description.toLowerCase().includes(taskSearchQuery.toLowerCase())
                    );
                    return filteredTasks.length > 0 ? (
                      filteredTasks.map(task => (
                        <div 
                          key={task.id} 
                          className={`border p-3 flex flex-col gap-2 transition-all cursor-pointer relative select-none ${
                            task.status === 'Completed' 
                              ? 'border-emerald-900/20 bg-emerald-950/5 opacity-50' 
                              : task.priority === 'High'
                                ? 'border-red-900/40 bg-red-950/10 hover:border-red-500/50 animate-border-pulse'
                                : task.priority === 'Medium'
                                  ? 'border-amber-900/40 bg-amber-950/10 hover:border-amber-500/50'
                                  : 'border-emerald-900/40 bg-emerald-950/20 hover:border-emerald-500/50'
                          }`}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setContextMenu({
                              visible: true,
                              x: e.clientX,
                              y: e.clientY,
                              taskId: task.id
                            });
                          }}
                          onClick={async () => {
                             if (task.status === 'Completed') return;
                             const res = await fetch(`/api/tasks/${task.id}/status`, {
                               method: 'PUT',
                               headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({ status: 'Completed' })
                             });
                             if (res.ok) {
                               loadDataFromBackend();
                             }
                          }}
                        >
                          <div className="flex justify-between items-center text-[10px]">
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-500 opacity-60 font-mono">ID: {task.id}</span>
                              <span className={`px-1 text-[8px] uppercase border font-bold ${
                                task.priority === 'High' ? 'border-red-500/50 text-red-400 bg-red-900/20' : 
                                task.priority === 'Medium' ? 'border-amber-500/50 text-amber-400 bg-amber-900/20' : 
                                'border-emerald-500/50 text-emerald-400 bg-emerald-900/20'
                              }`}>{task.priority}</span>
                              {task.status === 'Completed' && (
                                 <span className="px-1 text-[8px] uppercase font-bold border border-green-500/50 text-green-400 bg-green-900/20">DONE</span>
                              )}
                            </div>
                            <span className="text-emerald-700 font-mono">{new Date(task.createdAt).toLocaleDateString()}</span>
                          </div>
                          
                          <div className={`text-[11px] ${task.status === 'Completed' ? 'text-emerald-600 line-through' : 'text-emerald-300'}`}>
                            {task.description}
                          </div>

                          {/* Linear progress bar for tracking ongoing completion percentage */}
                          {task.status === 'Completed' ? (
                            <div className="mt-2 pt-2 border-t border-emerald-950/45 flex items-center gap-3">
                              <span className="text-[8px] text-emerald-500/70 font-bold tracking-wider">SYNC:</span>
                              <div className="flex-1 h-1.5 bg-emerald-950 border border-emerald-900/60 rounded-sm overflow-hidden">
                                <div className="h-full bg-emerald-500 w-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                              </div>
                              <span className="text-[9px] text-emerald-400 font-bold font-mono min-w-[32px] text-right">100%</span>
                            </div>
                          ) : (
                            <div className="mt-2 pt-2 border-t border-emerald-950/45 flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[7.5px] text-emerald-500/70 font-bold tracking-widest uppercase">Cognitive Tracking Active</span>
                                <span className="text-[7.5px] text-emerald-600 animate-pulse font-bold">[HEURISTIC_SYNC]</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[8px] text-emerald-500/70 font-bold tracking-wider">SYNC:</span>
                                <input 
                                  type="range" 
                                  min="0" 
                                  max="100" 
                                  step="5"
                                  value={task.progress || 0}
                                  onChange={async (e) => {
                                    const newProgress = parseInt(e.target.value);
                                    // Live optimistic update for seamless experience
                                    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, progress: newProgress, status: newProgress === 100 ? 'Completed' : t.status } : t));
                                    const res = await fetch(`/api/tasks/${task.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ progress: newProgress })
                                    });
                                    if (res.ok) {
                                      // Soft refresh list
                                      const freshRes = await fetch('/api/tasks');
                                      if (freshRes.ok) {
                                        setTasks(await freshRes.json());
                                      }
                                    }
                                  }}
                                  className="flex-1 h-1 bg-emerald-950 accent-emerald-400 border border-emerald-900/60 rounded-sm cursor-pointer"
                                />
                                <span className="text-[9px] text-emerald-400 font-bold font-mono min-w-[32px] text-right">
                                  {task.progress || 0}%
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-emerald-700/70 text-[10px] italic">
                        {taskSearchQuery ? t.hermesNoResults : t.hermesNoTasks}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Absolute Context Menu overlay inside tasks viewport */}
              {contextMenu && contextMenu.visible && (
                <div 
                  className="fixed z-50 bg-[#03150a] border border-emerald-500/70 py-1 shadow-[0_4px_24px_rgba(16,185,129,0.3)] font-mono text-[9px] tracking-wider min-w-[170px]"
                  style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-2.5 py-1 border-b border-emerald-950 text-emerald-500/85 text-[7px] font-bold uppercase tracking-widest font-mono">
                    Actions: Task {contextMenu.taskId?.substring(0, 8)}
                  </div>
                  
                  <button 
                    onClick={() => {
                      const taskId = contextMenu.taskId;
                      setContextMenu(null);
                      if (!taskId) return;
                      const targetTask = tasks.find(t => t.id === taskId);
                      if (targetTask) {
                        setEditingTask({ id: taskId, description: targetTask.description });
                      }
                    }}
                    className="w-full text-left px-3 py-1.5 text-emerald-300 hover:bg-emerald-500/20 hover:text-white transition-all uppercase font-bold"
                  >
                    {t.hermesEditDesc}
                  </button>

                  <div className="border-t border-emerald-950/60 my-0.5"></div>

                  <button 
                    onClick={async () => {
                      const taskId = contextMenu.taskId;
                      setContextMenu(null);
                      if (!taskId) return;
                      const res = await fetch(`/api/tasks/${taskId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ priority: 'High' })
                      });
                      if (res.ok) {
                        loadDataFromBackend();
                      }
                    }}
                    className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-red-500/20 hover:text-white transition-all uppercase font-bold"
                  >
                    {t.hermesMoveHigh}
                  </button>

                  <button 
                    onClick={async () => {
                      const taskId = contextMenu.taskId;
                      setContextMenu(null);
                      if (!taskId) return;
                      const res = await fetch(`/api/tasks/${taskId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ priority: 'Medium' })
                      });
                      if (res.ok) {
                        loadDataFromBackend();
                      }
                    }}
                    className="w-full text-left px-3 py-1.5 text-amber-400 hover:bg-amber-500/20 hover:text-white transition-all uppercase font-bold"
                  >
                    {t.hermesMoveMedium}
                  </button>

                  <button 
                    onClick={async () => {
                      const taskId = contextMenu.taskId;
                      setContextMenu(null);
                      if (!taskId) return;
                      const res = await fetch(`/api/tasks/${taskId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ priority: 'Low' })
                      });
                      if (res.ok) {
                        loadDataFromBackend();
                      }
                    }}
                    className="w-full text-left px-3 py-1.5 text-emerald-400 hover:bg-emerald-500/20 hover:text-white transition-all uppercase font-bold"
                  >
                    {t.hermesMoveLow}
                  </button>

                  <div className="border-t border-emerald-950/60 my-0.5"></div>

                  <button 
                    onClick={() => {
                      const taskId = contextMenu.taskId;
                      setContextMenu(null);
                      if (!taskId) return;
                      setDeletingTaskId(taskId);
                    }}
                    className="w-full text-left px-3 py-1.5 text-red-500 hover:bg-red-950 hover:text-white transition-all uppercase font-bold"
                  >
                    {t.hermesDeleteTask}
                  </button>
                </div>
              )}

              {/* Custom Integrated Edit description Dialog Modal */}
              {editingTask && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4" onClick={() => setEditingTask(null)}>
                  <div className="bg-[#03140a] border border-emerald-500 p-4 max-w-sm w-full font-mono text-[10px] text-emerald-300 shadow-[0_0_32px_rgba(16,185,129,0.4)]" onClick={(e) => e.stopPropagation()}>
                    <div className="text-emerald-400 font-bold uppercase tracking-widest border-b border-emerald-900/60 pb-2 mb-3">
                      {t.hermesEditDetails}
                    </div>
                    <div className="text-[8px] text-emerald-600 uppercase tracking-widest mb-1.5 font-bold">{t.hermesObjective}</div>
                    <textarea
                      value={editingTask.description}
                      onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                      className="w-full bg-[#020d06] border border-emerald-800 p-2 text-[10px] text-emerald-300 focus:outline-none focus:border-emerald-500 font-mono h-20 mb-4 uppercase rounded-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingTask(null)}
                        className="px-3 py-1.5 border border-emerald-800 text-[9px] hover:bg-emerald-950 hover:text-emerald-400 text-emerald-600 transition-all uppercase font-bold rounded-xs"
                      >
                        {t.hermesCancel}
                      </button>
                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/tasks/${editingTask.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ description: editingTask.description })
                          });
                          if (res.ok) {
                            setEditingTask(null);
                            loadDataFromBackend();
                          }
                        }}
                        className="px-3 py-1.5 border border-emerald-500 bg-emerald-500/20 text-[9px] hover:bg-emerald-500/35 text-white shadow-[0_0_8px_rgba(16,185,129,0.2)] transition-all uppercase font-bold rounded-xs"
                      >
                        {t.hermesCommit}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Custom confirmation deletion modal overlay */}
              {deletingTaskId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4" onClick={() => setDeletingTaskId(null)}>
                  <div className="bg-[#0c0202] border border-red-500 p-4 max-w-sm w-full font-mono text-[10px] text-red-400 shadow-[0_0_32px_rgba(239,68,68,0.5)]" onClick={(e) => e.stopPropagation()}>
                    <div className="text-red-500 font-bold uppercase tracking-widest border-b border-red-950 pb-2 mb-3 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
                      {t.hermesConfirmObliteration}
                    </div>
                    <p className="text-red-300/80 leading-relaxed mb-4 uppercase text-[9px] tracking-wider">
                      {t.hermesWarningCancel} (ID: {deletingTaskId.substring(0, 8)})
                    </p>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setDeletingTaskId(null)}
                        className="px-3 py-1.5 border border-emerald-900 text-[9px] hover:bg-emerald-950 text-emerald-600 transition-all uppercase font-bold rounded-xs"
                      >
                        {t.hermesAbort}
                      </button>
                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/tasks/${deletingTaskId}`, {
                            method: 'DELETE'
                          });
                          if (res.ok) {
                            setDeletingTaskId(null);
                            loadDataFromBackend();
                          }
                        }}
                        className="px-3 py-1.5 border border-red-500 bg-red-500/20 text-[9px] hover:bg-red-500/35 text-white transition-all uppercase font-bold rounded-xs"
                      >
                        {t.hermesObliterate}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
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
                    <g className="cursor-pointer group" onClick={() => setSelectedLoopNode('experience')}>
                      <circle cx="60" cy="80" r="26" fill={selectedLoopNode === 'experience' ? "rgba(16,185,129,0.25)" : "rgba(6,78,59,0.15)"} stroke={selectedLoopNode === 'experience' ? "#10b981" : activeColor} strokeWidth={selectedLoopNode === 'experience' ? "1.5" : "1"} strokeDasharray="3,3" className="transition-all duration-300" />
                      <text x="60" y="77" fill={selectedLoopNode === 'experience' ? "#6ee7b7" : "#34d399"} fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace" className="transition-colors">EXPERIENCE</text>
                      <text x="60" y="88" fill={selectedLoopNode === 'experience' ? "#34d399" : "#10b981"} fontSize="7.5" textAnchor="middle" fontFamily="monospace" opacity="0.9" className="transition-colors">{cognitiveMemoriesCount} MEMS</text>
                    </g>
                    
                    {/* Skill Curation Node */}
                    <g className="cursor-pointer group" onClick={() => setSelectedLoopNode('curation')}>
                      <circle cx="200" cy="40" r="26" fill={selectedLoopNode === 'curation' ? "rgba(16,185,129,0.25)" : "rgba(6,78,59,0.15)"} stroke={selectedLoopNode === 'curation' ? "#10b981" : activeColor} strokeWidth={selectedLoopNode === 'curation' ? "1.5" : "1"} className="transition-all duration-300" />
                      <text x="200" y="37" fill={selectedLoopNode === 'curation' ? "#6ee7b7" : "#34d399"} fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace" className="transition-colors">CURATION</text>
                      <text x="200" y="48" fill={selectedLoopNode === 'curation' ? "#34d399" : "#10b981"} fontSize="7.5" textAnchor="middle" fontFamily="monospace" opacity="0.9" className="transition-colors">{tasks.length} TASKS</text>
                    </g>
                    
                    {/* Active Skills Repository */}
                    <g className="cursor-pointer group" onClick={() => setSelectedLoopNode('skills')}>
                      <circle cx="340" cy="80" r="26" fill={selectedLoopNode === 'skills' ? "rgba(16,185,129,0.25)" : "rgba(6,78,59,0.15)"} stroke={selectedLoopNode === 'skills' ? "#10b981" : activeColor} strokeWidth={selectedLoopNode === 'skills' ? "1.5" : "1"} strokeDasharray="3,3" className="transition-all duration-300" />
                      <text x="340" y="77" fill={selectedLoopNode === 'skills' ? "#6ee7b7" : "#34d399"} fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace" className="transition-colors">SKILLS</text>
                      <text x="340" y="88" fill={selectedLoopNode === 'skills' ? "#34d399" : "#10b981"} fontSize="7.5" textAnchor="middle" fontFamily="monospace" opacity="0.9" className="transition-colors">{skills.length} ACTIVE</text>
                    </g>
                    
                    {/* DSPy/GEPA Genetic Optimizer */}
                    <g className="cursor-pointer group" onClick={() => setSelectedLoopNode('gepa')}>
                      <circle cx="200" cy="120" r="26" fill={selectedLoopNode === 'gepa' ? "rgba(16,185,129,0.25)" : "rgba(6,78,59,0.15)"} stroke={selectedLoopNode === 'gepa' ? "#10b981" : activeColor} strokeWidth={isEvolving ? "2" : (selectedLoopNode === 'gepa' ? "1.5" : "1")} className="transition-all duration-300" />
                      <text x="200" y="117" fill={selectedLoopNode === 'gepa' ? "#6ee7b7" : "#34d399"} fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace" className="transition-colors">{isEvolving ? "EVOLVING" : "GEPA EVOLVE"}</text>
                      <text x="200" y="128" fill={selectedLoopNode === 'gepa' ? "#34d399" : "#10b981"} fontSize="7.5" textAnchor="middle" fontFamily="monospace" opacity="0.9" className="transition-colors">{isEvolving ? "MUTATING..." : `v${(1 + (skills.length - 3) * 0.1).toFixed(1)} GEN`}</text>
                    </g>
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
                    r="3.5"
                    fill={activeColor}
                    animate={{
                      cx: [80, 130, 176],
                      cy: [65, 40, 40],
                      opacity: [0, 0.9, 0.9, 0],
                      scale: [0.8, 1.1, 0.9, 0.8]
                    }}
                    transition={{ 
                      duration: isEvolving ? 0.6 : (cognitiveState === 'speaking' ? 1.4 : (cognitiveState === 'thinking' ? 0.9 : 4.5)), 
                      repeat: Infinity, 
                      repeatDelay: Math.random() * 0.5,
                      ease: 'easeInOut' 
                    }}
                  />
                  <motion.circle
                     r="3"
                     fill={activeColor}
                     animate={{
                       cx: [224, 270, 320],
                       cy: [40, 40, 65],
                       opacity: [0, 0.8, 0.8, 0],
                       scale: [0.7, 1.2, 0.8]
                     }}
                     transition={{ 
                       duration: isEvolving ? 0.7 : (cognitiveState === 'speaking' ? 1.6 : (cognitiveState === 'thinking' ? 1.1 : 5.2)), 
                       repeat: Infinity, 
                       repeatDelay: 0.8 + Math.random(),
                       ease: 'linear', 
                       delay: 0.3 
                     }}
                  />
                  <motion.circle
                    r="4"
                    fill={activeColor}
                    animate={{
                      cx: [320, 270, 224],
                      cy: [95, 120, 120],
                      opacity: [0, 1, 1, 0],
                      scale: [0.9, 1.3, 1, 0.9]
                    }}
                    transition={{ 
                      duration: isEvolving ? 0.5 : (cognitiveState === 'speaking' ? 1.1 : (cognitiveState === 'thinking' ? 0.7 : 3.8)), 
                      repeat: Infinity, 
                      repeatDelay: Math.random() * 1.2,
                      ease: 'circOut', 
                      delay: 0.6 
                    }}
                  />
                  {/* Additional stochastic 'noise' packet when evolving */}
                  {isEvolving && (
                    <motion.circle
                      r="2.5"
                      fill="#ef4444"
                      animate={{
                        cx: [176, 130, 80],
                        cy: [120, 120, 95],
                        opacity: [0, 1, 0]
                      }}
                      transition={{ 
                        duration: 0.4, 
                        repeat: Infinity, 
                        ease: 'anticipate' 
                      }}
                    />
                  )}
                </svg>
              </div>

              {/* Selected Node Glossary & Explainer Card */}
              <div className="border border-emerald-900/35 p-3 bg-emerald-950/5 font-mono text-[10px] rounded-xs select-none">
                {selectedLoopNode === 'experience' && (
                  <div>
                    <div className="text-emerald-400 font-bold uppercase tracking-wider mb-1 flex justify-between">
                      <span>Phase I: Dynamic Memory & Trace Extraction</span>
                      <span className="text-emerald-500 text-[8px] bg-emerald-950 px-1.5 border border-emerald-900/40">EXPERIENCE</span>
                    </div>
                    <p className="text-emerald-500/80 leading-relaxed text-[9px]">
                      Automatically parses logs, user triggers, and voice transcripts to form long-term session presets. Persisted physically to <code className="text-emerald-300 font-bold">USER.md</code> & <code className="text-emerald-300 font-bold">MEMORY.md</code> for immediate model ingestion bypass, maintaining alignment without hardcoded constraints.
                    </p>
                  </div>
                )}
                {selectedLoopNode === 'curation' && (
                  <div>
                    <div className="text-emerald-400 font-bold uppercase tracking-wider mb-1 flex justify-between">
                      <span>Phase II: Task Curation & Context Assembly</span>
                      <span className="text-emerald-500 text-[8px] bg-emerald-950 px-1.5 border border-emerald-900/40">CURATION</span>
                    </div>
                    <p className="text-emerald-500/80 leading-relaxed text-[9px]">
                      Ingests active user workflows and tasks. Resolves priorities, checks authorization gates (Auto-Repair vs Manual settings), and configures pricing/token allocation rules to safely schedule targeted prompt executions.
                    </p>
                  </div>
                )}
                {selectedLoopNode === 'skills' && (
                  <div>
                    <div className="text-emerald-400 font-bold uppercase tracking-wider mb-1 flex justify-between">
                      <span>Phase III: Hot-Swappable Skills Registry</span>
                      <span className="text-emerald-500 text-[8px] bg-emerald-950 px-1.5 border border-emerald-900/40">SKILLS</span>
                    </div>
                    <p className="text-emerald-500/80 leading-relaxed text-[9px]">
                      Pre-compiled reusable capabilities designed according to the <code className="text-emerald-300 font-bold">agentskills.io</code> layout standard. Allows JARVIS to hot-inject complex instructions, avoiding heavy prompting context windows while maintaining SQLite speed performance.
                    </p>
                  </div>
                )}
                {selectedLoopNode === 'gepa' && (
                  <div>
                    <div className="text-emerald-400 font-bold uppercase tracking-wider mb-1 flex justify-between">
                      <span>Phase IV: DSPy / Genetic-Pareto Prompt Optimization</span>
                      <span className="text-emerald-500 text-[8px] bg-emerald-950 px-1.5 border border-emerald-900/40">GEPA EVOLVE</span>
                    </div>
                    <p className="text-emerald-500/80 leading-relaxed text-[9px]">
                      Self-mutation system. Runs synthetic evaluations, applies DSPy-guided mutations on core instruction templates, and checks them against Pareto budget limits to upgrade resident skills in the active server database.
                    </p>
                  </div>
                )}
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
                          <span className="flex items-center gap-1.5">
                            <span className="text-[7px] text-emerald-700/80 px-1 border border-emerald-900/40 rounded-sm">KEYWORD_DENSITY</span>
                            Relevance: {result.confidence.toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-emerald-400">{result.excerpt}</p>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-[10px] text-emerald-700/80 italic text-center mt-12">
                      Ready to execute FTS5 keyword recall.<br/>
                      Try typing keywords such as <span className="underline text-emerald-500 cursor-pointer" onClick={() => { setSearchQuery('system'); }}>"system"</span>,{' '}
                      <span className="underline text-emerald-500 cursor-pointer" onClick={() => { setSearchQuery('security'); }}>"security"</span>, or{' '}
                      <span className="underline text-emerald-500 cursor-pointer" onClick={() => { setSearchQuery('protocol'); }}>"protocol"</span>.
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
                
                <div className="grid grid-cols-1 gap-2">
                  {([
                    { mode: 'auto', label: 'Auto Router', desc: 'Hybrid routing' },
                    { mode: 'haiku', label: 'Haiku Only', desc: 'Fast & Cheap' },
                    { mode: 'sonnet', label: 'Sonnet Only', desc: 'Complex Logic' }
                  ] as const).map(({ mode, label, desc }) => (
                    <button
                      key={mode}
                      onClick={() => saveRoutingPolicy(mode)}
                      className={`p-2 border text-left transition-all ${
                        selectedModel === mode 
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' 
                          : 'border-emerald-900/40 text-emerald-600 hover:border-emerald-700'
                      }`}
                    >
                      <div className="text-[10px] font-bold">{label}</div>
                      <div className="text-[8px] opacity-70">{desc}</div>
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
                  <div className="text-[9px] xl:text-[10px] font-bold text-emerald-300 text-center leading-tight">{webrtcStats?.codec || 'OPUS Mono'}</div>
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
                      ? (webrtcStats?.offerSdp || "Awaiting SDP offer generation...")
                      : "Awaiting mic stream capture..."
                    }
                  </div>
                </div>
                <div className="border border-emerald-900/40 bg-black/40 p-2 font-mono flex flex-col">
                  <span className="text-emerald-500 font-bold border-b border-emerald-900/40 pb-1 mb-1 block uppercase">SDP ANSWER MATRIX (RECV)</span>
                  <div className="flex-1 min-h-[60px] max-h-[100px] overflow-y-auto text-emerald-600/90 whitespace-pre leading-relaxed select-text pr-1 select-all scrollbar-cyan font-mono text-[8px]">
                    {isMicActive && webrtcStats?.state === 'connected'
                      ? (webrtcStats?.answerSdp || "Awaiting receiver SDP answer...")
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
      <div className="border-t border-emerald-900/40 pt-2 pb-2 text-[8px] text-emerald-700 font-bold uppercase tracking-widest flex justify-between flex-shrink-0">
        <span className="flex items-center gap-1.5 font-mono">
          <span className="w-1 h-1 bg-emerald-800 rounded-full animate-pulse"></span>
          SYS FREQ: {systemStats.freq}
        </span>
        <span className="font-mono">OS: {systemStats.os}</span>
      </div>
    </div>
  );
}
