import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart } from 'lucide-react';
import {
  TASK_PRIORITY_ORDER,
  buildTaskPriorityDistribution,
  getTaskPriorityVisual,
  type TaskPriorityLevel,
} from '../services/taskPriorityConfig';

interface Task {
  id: number | string;
  priority: TaskPriorityLevel;
  status: 'Pending' | 'Completed';
  description: string;
  createdAt: string | Date;
  progress?: number;
}

interface TaskPriorityDonutProps {
  tasks: Task[];
}

interface DonutSliceProps {
  d: d3.PieArcDatum<{ name: string; value: number }>;
  isHovered: boolean;
  isClicked: boolean;
  arc: d3.Arc<any, d3.PieArcDatum<{ name: string; value: number }>>;
  arcHovered: d3.Arc<any, d3.PieArcDatum<{ name: string; value: number }>>;
  itemColor: string;
  itemGlow: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onMouseMove?: (e: React.MouseEvent<SVGPathElement>) => void;
}

function DonutSlice({
  d,
  isHovered,
  isClicked,
  arc,
  arcHovered,
  itemColor,
  itemGlow,
  onMouseEnter,
  onMouseLeave,
  onMouseMove
}: DonutSliceProps) {
  const pathRef = useRef<SVGPathElement>(null);

  // Smooth outward / inward expansion transition powered directly by D3 selection transitions
  useEffect(() => {
    if (!pathRef.current) return;
    const targetArc = isHovered ? arcHovered : arc;
    const dPath = targetArc(d) || '';

    d3.select(pathRef.current)
      .transition()
      .duration(280)
      .ease(d3.easeElasticOut.amplitude(1).period(0.6))
      .attr('d', dPath);
  }, [isHovered, d, arc, arcHovered]);

  const customStyle = {
    '--glow-color': itemGlow,
    filter: isHovered ? `drop-shadow(0px 0px 8px ${itemGlow})` : undefined,
  } as React.CSSProperties;

  return (
    <path
      ref={pathRef}
      d={(isHovered ? arcHovered(d) : arc(d)) || undefined}
      fill={itemColor}
      fillOpacity={isHovered ? 0.95 : 0.75}
      stroke="#010c06"
      strokeWidth={isClicked ? 2.5 : 1.5}
      style={customStyle}
      className={`cursor-pointer transition-colors duration-200 ${
        isClicked ? 'stark-highlight-pulse' : ''
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
    />
  );
}

export function TaskPriorityDonut({ tasks }: TaskPriorityDonutProps) {
  const [filterMode, setFilterMode] = useState<'pending' | 'all'>('pending');
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const [clickedPriority, setClickedPriority] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<{
    priority: string;
    x: number;
    y: number;
  } | null>(null);

  // Filter tasks based on selected mode
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => filterMode === 'all' || t.status === 'Pending');
  }, [tasks, filterMode]);

  // Compute breakdown, progress counts, and averages per priority
  const priorityStats = useMemo(() => {
    return TASK_PRIORITY_ORDER.reduce((acc, p) => {
      const list = filteredTasks.filter(t => t.priority === p);
      const count = list.length;
      const completed = list.filter(t => t.status === 'Completed').length;
      const pending = list.filter(t => t.status === 'Pending').length;
      const avgProgress = count > 0 
        ? Math.round(list.reduce((sum, t) => sum + (t.progress !== undefined ? t.progress : (t.status === 'Completed' ? 100 : 0)), 0) / count)
        : 0;

      acc[p] = { count, completed, pending, avgProgress };
      return acc;
    }, {} as Record<string, { count: number; completed: number; pending: number; avgProgress: number }>);
  }, [filteredTasks]);

  // Priority distribution math
  const distribution = useMemo(() => {
    return buildTaskPriorityDistribution(filteredTasks);
  }, [filteredTasks]);

  const totalTasksCount = filteredTasks.length;

  // Render centered display details (interactive)
  const centerDisplay = useMemo(() => {
    if (totalTasksCount === 0) {
      return {
        title: "VACANT",
        subtitle: "0 TASKS",
        color: "text-emerald-500/50"
      };
    }

    if (hoveredSlice) {
      const sliceData = distribution.find(d => d.name === hoveredSlice);
      if (sliceData) {
        return {
          title: sliceData.name.toUpperCase(),
          subtitle: `${sliceData.value} (${sliceData.percentage.toFixed(0)}%)`,
          color: getTaskPriorityVisual(hoveredSlice as TaskPriorityLevel).textClass
        };
      }
    }

    if (clickedPriority) {
      const sliceData = distribution.find(d => d.name === clickedPriority);
      if (sliceData) {
        return {
          title: sliceData.name.toUpperCase(),
          subtitle: `${sliceData.value} (${sliceData.percentage.toFixed(0)}%) [SEL]`,
          color: `${getTaskPriorityVisual(clickedPriority as TaskPriorityLevel).textClass} animate-pulse`
        };
      }
    }

    return {
      title: "TOTAL",
      subtitle: `${totalTasksCount} Active`,
      color: "text-emerald-400"
    };
  }, [hoveredSlice, clickedPriority, distribution, totalTasksCount]);

  // Donut chart dimensions
  const width = 200;
  const height = 200;
  const radius = Math.min(width, height) / 2;
  const innerRadius = radius * 0.65; // thickness of donut
  const outerRadius = radius * 0.9;

  // D3 Pie generators
  const pie = useMemo(() => {
    return d3.pie<{ name: string; value: number }>()
      .value(d => d.value)
      .sort(null); // keep priority order (High, Medium, Low)
  }, []);

  const arc = useMemo(() => {
    return d3.arc<d3.PieArcDatum<{ name: string; value: number }>>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .cornerRadius(3);
  }, [innerRadius, outerRadius]);

  const arcHovered = useMemo(() => {
    return d3.arc<d3.PieArcDatum<{ name: string; value: number }>>()
      .innerRadius(innerRadius - 2)
      .outerRadius(outerRadius + 6)
      .cornerRadius(4);
  }, [innerRadius, outerRadius]);

  const pieData = useMemo(() => pie(distribution), [pie, distribution]);

  const handleMouseMove = (e: React.MouseEvent<SVGPathElement, MouseEvent>, priorityName: string) => {
    const target = e.currentTarget as SVGElement;
    const ownerSVG = target.ownerSVGElement;
    const rect = ownerSVG ? ownerSVG.getBoundingClientRect() : target.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left + 15;
      const y = e.clientY - rect.top - 15;
      setActiveTooltip({
        priority: priorityName,
        x: Math.max(10, Math.min(width * 1.5, x)),
        y: Math.max(10, Math.min(height * 1.5, y))
      });
    }
  };

  const handleProgressChange = async (taskId: string | number, newProgress: number) => {
    try {
      // Direct POST/PUT API fetch call syncing progress directly to the database
      const res = await fetch(`/api/tasks/${String(taskId)}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: newProgress })
      });
      if (res.ok) {
        // Broadcast custom event that HermesDashboard listens to, which triggers complete reactive sync automatically!
        window.dispatchEvent(new CustomEvent('task-list-updated'));
      }
    } catch (err) {
      console.error("Failed to sync progress to database", err);
    }
  };

  const selectedPriorityTasks = useMemo(() => {
    if (!clickedPriority) return [];
    return tasks.filter(t => t.priority === clickedPriority && (filterMode === 'all' || t.status === 'Pending'));
  }, [tasks, clickedPriority, filterMode]);

  return (
    <div className="border border-emerald-900/40 p-4 bg-emerald-950/10 flex flex-col h-full font-mono relative overflow-hidden">
      {/* Dynamic Keyframes for CSS Pulse Matrix */}
      <style>{`
        @keyframes starkHighlightPulse {
          0% {
            stroke-width: 1.5px;
            filter: drop-shadow(0px 0px 4px var(--glow-color));
          }
          50% {
            stroke-width: 3.5px;
            filter: drop-shadow(0px 0px 18px var(--glow-color));
          }
          100% {
            stroke-width: 1.5px;
            filter: drop-shadow(0px 0px 4px var(--glow-color));
          }
        }
        .stark-highlight-pulse {
          animation: starkHighlightPulse 1.5s infinite ease-in-out;
        }
      `}</style>

      {/* Mini technical aesthetic corners */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-emerald-500/30"></div>
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-emerald-500/30"></div>
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-emerald-500/30"></div>
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-emerald-500/30"></div>

      {/* Header controls select of filter status */}
      <div className="flex justify-between items-center mb-3 pb-1.5 border-b border-emerald-900/30">
        <div className="flex items-center gap-1.5">
          <PieChart className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Priority Distribution</span>
        </div>
        
        {/* Toggle Mode */}
        <div className="flex gap-1.5 bg-black/40 border border-emerald-900/50 p-0.5 rounded text-[8px]">
          <button
            onClick={() => setFilterMode('pending')}
            className={`px-1.5 py-0.5 rounded uppercase font-semibold transition-all ${
              filterMode === 'pending'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-emerald-600 hover:text-emerald-400'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-1.5 py-0.5 rounded uppercase font-semibold transition-all ${
              filterMode === 'all'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-emerald-600 hover:text-emerald-400'
            }`}
          >
            All Logs
          </button>
        </div>
      </div>

      {/* Dynamic Main Body */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
        {/* Donut SVG Render Target */}
        <div className="relative w-[200px] h-[200px] flex items-center justify-center">
          <svg width={width} height={height} className="overflow-visible select-none">
            {/* Ambient Background Grid Circle */}
            <circle 
              cx={width / 2} 
              cy={height / 2} 
              r={radius * 0.95} 
              stroke="#064e3b" 
              fontSize="0" 
              strokeDasharray="2 4" 
              strokeOpacity="0.4"
              fill="none" 
            />
            
            <circle 
              cx={width / 2} 
              cy={height / 2} 
              r={innerRadius - 4} 
              stroke="#064e3b" 
              fontSize="0" 
              strokeOpacity="0.3"
              fill="none" 
            />

            <g transform={`translate(${width / 2}, ${height / 2})`}>
              {totalTasksCount === 0 ? (
                // Hollow Placeholder when empty
                <circle
                  cx={0}
                  cy={0}
                  r={(outerRadius + innerRadius) / 2}
                  fill="none"
                  stroke="#022c22"
                  strokeWidth={outerRadius - innerRadius}
                  strokeDasharray="4 6"
                />
              ) : (
                // Draw arc path slices utilizing D3 calculated attributes & transitions
                pieData.map((d) => {
                  const isHovered = hoveredSlice === d.data.name;
                  const isClicked = clickedPriority === d.data.name;
                  const visual = getTaskPriorityVisual(d.data.name as TaskPriorityLevel);
                  const itemColor = visual.color;
                  const itemGlow = visual.glow;

                  const activeArc = isHovered ? arcHovered : arc;
                  const [centroidX, centroidY] = activeArc.centroid(d);

                  return (
                    <g key={d.data.name}>
                      <DonutSlice
                        d={d}
                        isHovered={isHovered}
                        isClicked={isClicked}
                        arc={arc}
                        arcHovered={arcHovered}
                        itemColor={itemColor}
                        itemGlow={itemGlow}
                        onMouseEnter={() => {
                          setHoveredSlice(d.data.name);
                        }}
                        onMouseLeave={() => {
                          setHoveredSlice(null);
                          setActiveTooltip(null);
                        }}
                        onMouseMove={(e) => handleMouseMove(e, d.data.name)}
                      />

                      {/* Small floating labels overlay direct on centroid displaying active counts on hover */}
                      <AnimatePresence>
                        {isHovered && (
                          <motion.g
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{ duration: 0.16 }}
                            transform={`translate(${centroidX}, ${centroidY})`}
                            style={{ pointerEvents: 'none' }}
                          >
                            <rect
                              x={-13}
                              y={-9}
                              width={26}
                              height={18}
                              rx={4}
                              fill="#010c06"
                              stroke={itemColor}
                              strokeWidth={1}
                              style={{
                                filter: `drop-shadow(0px 0px 4px ${itemGlow})`
                              }}
                            />
                            <text
                              textAnchor="middle"
                              dominantBaseline="central"
                              fill={itemColor}
                              fontSize="10px"
                              fontWeight="extrabold"
                            >
                              {d.data.value}
                            </text>
                          </motion.g>
                        )}
                      </AnimatePresence>
                    </g>
                  );
                })
              )}
            </g>
          </svg>

          {/* Holographic Center HUD Text Details (Inside Donut Hole) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-[8px] tracking-[0.2em] font-extrabold text-emerald-500/60 uppercase">
              Priority
            </span>
            <span className={`text-[12px] font-extrabold tracking-widest leading-none my-1 uppercase transition-colors duration-200 ${centerDisplay.color}`}>
              {centerDisplay.title}
            </span>
            <span className="text-[10px] text-emerald-300 font-bold tracking-tight">
              {centerDisplay.subtitle}
            </span>
          </div>
        </div>

        {/* Legend labels details list - FULLY CLICKABLE & HIGH LIGHT ACTIVE CHANNELS */}
        <div className="flex-1 flex flex-col gap-2.5 min-w-[130px] w-full">
          {TASK_PRIORITY_ORDER.map(pLevel => {
            const visual = getTaskPriorityVisual(pLevel);
            
            // Calculate specific count
            const levelCount = filteredTasks.filter(t => t.priority === pLevel).length;
            const levelPct = totalTasksCount > 0 ? (levelCount / totalTasksCount) * 100 : 0;
            const isActive = hoveredSlice === pLevel;
            const isSelected = clickedPriority === pLevel;

            return (
              <div 
                key={pLevel}
                onMouseEnter={(e) => {
                  if (levelCount > 0) {
                    setHoveredSlice(pLevel);
                    const rect = e.currentTarget.getBoundingClientRect();
                    const parentRect = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                    if (rect && parentRect) {
                      setActiveTooltip({
                        priority: pLevel,
                        x: rect.left - parentRect.left - 160,
                        y: rect.top - parentRect.top + 10
                      });
                    }
                  }
                }}
                onMouseLeave={() => {
                  setHoveredSlice(null);
                  setActiveTooltip(null);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (levelCount > 0) {
                    setClickedPriority(prev => prev === pLevel ? null : pLevel);
                  }
                }}
                className={`flex items-center justify-between p-1.5 border rounded cursor-pointer transition-all duration-200 ${
                  levelCount === 0 
                    ? 'opacity-30 cursor-not-allowed' 
                    : 'hover:bg-emerald-950/25'
                } ${
                  isActive ? 'border-emerald-800 bg-emerald-950/30' : 'border-transparent'
                } ${
                  isSelected ? 'border-emerald-500 bg-emerald-900/40 ring-1 ring-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]' : ''
                }`}
                title={levelCount > 0 ? "Click to lock visual highlight on this category" : "No active items in sequence"}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${visual.dotClass} ${
                    isActive || isSelected ? 'animate-pulse shadow-[0_0_8px_currentColor]' : ''
                  }`} />
                  <span className={`text-[10px] font-bold ${visual.textClass}`}>
                    {pLevel} {isSelected && <span className="text-[8px] ml-1 text-emerald-400/80">[LOCK]</span>}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-emerald-300/90 text-right">
                  <span className="font-extrabold">{levelCount}</span>
                  <span className="text-[8px] text-emerald-600/75 ml-1">
                    ({levelPct.toFixed(0)}%)
                  </span>
                </div>
              </div>
            );
          })}

          {/* Small informative ledger tag */}
          <div className="pt-2 border-t border-emerald-900/30 text-center text-[7.5px] text-emerald-600/75 uppercase tracking-wide">
            {filterMode === 'pending' ? 'Active Backlog Queue' : 'Historical Task Load'}
          </div>
        </div>
      </div>

      {/* Interactive Sync Panel: Active Tasks of Selected Priority (only visible when user clicked custom priority) */}
      <AnimatePresence>
        {clickedPriority && selectedPriorityTasks.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-4 pt-3 border-t border-emerald-900/40 w-full overflow-hidden flex flex-col gap-2"
          >
            <div className="flex justify-between items-center">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${getTaskPriorityVisual(clickedPriority as TaskPriorityLevel).textClass}`}>
                [SYNC GATEWAY: {clickedPriority} Priority Queue]
              </span>
              <button 
                onClick={() => setClickedPriority(null)}
                className="text-[8px] border border-emerald-500/20 px-1 py-0.5 rounded hover:bg-emerald-500/10 text-emerald-500"
              >
                DISENGAGE LOCK
              </button>
            </div>

            <div className="max-h-[140px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
              {selectedPriorityTasks.map(t => {
                const currentProgress = t.progress !== undefined ? t.progress : (t.status === 'Completed' ? 100 : 0);
                return (
                  <div key={t.id} className="p-2 bg-emerald-950/20 border border-emerald-950/45 rounded flex flex-col gap-1.5 hover:border-emerald-800/80 transition-colors">
                    <div className="flex justify-between items-start gap-1.5">
                      <span className="text-[10px] text-white/90 line-clamp-1">{t.description}</span>
                      <span className={`text-[8.5px] px-1 py-0.2 rounded font-bold uppercase ${
                        t.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {t.status}
                      </span>
                    </div>

                    {/* Progress Slider Controller */}
                    <div className="flex items-center gap-3">
                      <input 
                        type="range"
                        min="0"
                        max="100"
                        value={currentProgress}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          handleProgressChange(t.id, val);
                        }}
                        className="flex-1 h-1 bg-emerald-955 accent-emerald-400 border border-emerald-900/60 rounded-sm cursor-pointer"
                      />
                      <span className="text-[9.5px] font-black min-w-[34px] text-right text-emerald-400">
                        {currentProgress}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* High-tech Interactive Floating Tooltip displaying Average Progress Breakdown per Priority */}
      <AnimatePresence>
        {activeTooltip && priorityStats[activeTooltip.priority] && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 p-3 rounded bg-[#010a04]/95 border shadow-2xl pointer-events-none text-left"
            style={{
              left: activeTooltip.x,
              top: activeTooltip.y,
              borderColor: getTaskPriorityVisual(activeTooltip.priority as TaskPriorityLevel).tooltipBorder,
              boxShadow: getTaskPriorityVisual(activeTooltip.priority as TaskPriorityLevel).tooltipShadow,
              minWidth: '180px'
            }}
          >
            <div className="flex justify-between items-center pb-1.5 border-b border-white/10 mb-2">
              <span className={`text-[9px] font-extrabold uppercase tracking-wide ${getTaskPriorityVisual(activeTooltip.priority as TaskPriorityLevel).textClass}`}>
                {activeTooltip.priority} Priority Metrics
              </span>
              <span className="text-[7.5px] text-white/50 bg-white/5 px-1 py-0.5 rounded font-mono font-bold">
                BREAKDOWN
              </span>
            </div>

            {/* Average completion bar */}
            <div className="space-y-1.5 font-mono">
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-white/70">Average Progress:</span>
                <span className={`font-black text-[10px] ${
                  getTaskPriorityVisual(activeTooltip.priority as TaskPriorityLevel).textClass
                }`}>
                  {priorityStats[activeTooltip.priority].avgProgress}%
                </span>
              </div>
              
              {/* Sleek digital percentage bar */}
              <div className="h-1.5 w-full bg-emerald-950/80 rounded overflow-hidden flex border border-emerald-900/30">
                <div 
                  className={`h-full transition-all duration-300 ${getTaskPriorityVisual(activeTooltip.priority as TaskPriorityLevel).barClass}`}
                  style={{ width: `${priorityStats[activeTooltip.priority].avgProgress}%` }}
                />
              </div>

              {/* Status Breakdown Indicators */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="flex flex-col border-r border-[#064e3b]/30 pr-1">
                  <span className="text-[7px] text-white/40 uppercase">Total Items</span>
                  <span className="text-[10.5px] font-bold text-white/95">
                    {priorityStats[activeTooltip.priority].count}
                  </span>
                </div>
                <div className="flex flex-col pl-1">
                  <span className="text-[7px] text-white/40 uppercase">Completed</span>
                  <span className="text-[10.5px] font-bold text-emerald-400">
                    {priorityStats[activeTooltip.priority].completed}
                  </span>
                </div>
              </div>

              {/* Secondary Breakdown */}
              <div className="flex justify-between items-center pt-1 border-t border-[#064e3b]/30 text-[7.5px] text-white/45 uppercase tracking-wide">
                <span>Active Backlog:</span>
                <span className="font-bold text-amber-500">
                  {priorityStats[activeTooltip.priority].pending} Tasks
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
