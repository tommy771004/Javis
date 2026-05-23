import React, { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, PieChart, RefreshCw } from 'lucide-react';

interface Task {
  id: number;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'Completed';
  description: string;
  createdAt: string | Date;
}

interface TaskPriorityDonutProps {
  tasks: Task[];
}

export function TaskPriorityDonut({ tasks }: TaskPriorityDonutProps) {
  const [filterMode, setFilterMode] = useState<'pending' | 'all'>('pending');
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  // Filter tasks based on selected mode
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => filterMode === 'all' || t.status === 'Pending');
  }, [tasks, filterMode]);

  // Priority distribution math
  const distribution = useMemo(() => {
    const total = filteredTasks.length;
    if (total === 0) return [];

    const high = filteredTasks.filter(t => t.priority === 'High').length;
    const medium = filteredTasks.filter(t => t.priority === 'Medium').length;
    const low = filteredTasks.filter(t => t.priority === 'Low').length;

    return [
      { name: 'High', value: high, percentage: total > 0 ? (high / total) * 100 : 0, color: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)' },
      { name: 'Medium', value: medium, percentage: total > 0 ? (medium / total) * 100 : 0, color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)' },
      { name: 'Low', value: low, percentage: total > 0 ? (low / total) * 100 : 0, color: '#10b981', glow: 'rgba(16, 185, 129, 0.5)' }
    ].filter(item => item.value > 0); // only show slice if there are tasks of this priority
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
          color: hoveredSlice === 'High' ? 'text-red-400' : hoveredSlice === 'Medium' ? 'text-amber-400' : 'text-green-400'
        };
      }
    }

    return {
      title: "TOTAL",
      subtitle: `${totalTasksCount} Active`,
      color: "text-emerald-400"
    };
  }, [hoveredSlice, distribution, totalTasksCount]);

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

  return (
    <div className="border border-emerald-900/40 p-4 bg-emerald-950/10 flex flex-col h-full font-mono relative overflow-hidden">
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
              line-width="0.5" 
              strokeDasharray="2 4" 
              strokeOpacity="0.4"
              fill="none" 
            />
            
            <circle 
              cx={width / 2} 
              cy={height / 2} 
              r={innerRadius - 4} 
              stroke="#064e3b" 
              line-width="0.5" 
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
                // Draw arc path slices utilizing D3 calculated attributes
                pieData.map((d, i) => {
                  const isHovered = hoveredSlice === d.data.name;
                  const itemColor = d.data.name === 'High' ? '#ef4444' : d.data.name === 'Medium' ? '#f59e0b' : '#10b981';
                  const itemGlow = d.data.name === 'High' ? 'rgba(239,68,68,0.45)' : d.data.name === 'Medium' ? 'rgba(245,158,11,0.45)' : 'rgba(16,185,129,0.45)';

                  return (
                    <g 
                      key={d.data.name}
                      onMouseEnter={() => setHoveredSlice(d.data.name)}
                      onMouseLeave={() => setHoveredSlice(null)}
                      className="cursor-pointer transition-all duration-300"
                    >
                      {/* Interactive Slice Path */}
                      <motion.path
                        d={(isHovered ? arcHovered(d) : arc(d)) || undefined}
                        fill={itemColor}
                        fillOpacity={isHovered ? 0.95 : 0.7}
                        stroke="#010c06"
                        strokeWidth={1.5}
                        style={{
                          filter: isHovered ? `drop-shadow(0px 0px 8px ${itemGlow})` : 'none',
                        }}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 120, damping: 15 }}
                      />
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

        {/* Legend labels details list */}
        <div className="flex-1 flex flex-col gap-2.5 min-w-[130px] w-full">
          {['High', 'Medium', 'Low'].map(pLevel => {
            const levelColor = pLevel === 'High' ? 'bg-red-500' : pLevel === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500';
            const levelTextColor = pLevel === 'High' ? 'text-red-400' : pLevel === 'Medium' ? 'text-amber-400' : 'text-green-400';
            
            // Calculate specific count
            const levelCount = filteredTasks.filter(t => t.priority === pLevel).length;
            const levelPct = totalTasksCount > 0 ? (levelCount / totalTasksCount) * 100 : 0;
            const isActive = hoveredSlice === pLevel;

            return (
              <div 
                key={pLevel}
                onMouseEnter={() => levelCount > 0 && setHoveredSlice(pLevel)}
                onMouseLeave={() => setHoveredSlice(null)}
                className={`flex items-center justify-between p-1.5 border border-transparent rounded transition-all duration-200 ${
                  levelCount === 0 ? 'opacity-30' : 'hover:bg-emerald-950/20'
                } ${
                  isActive ? 'border-emerald-800/80 bg-emerald-950/30' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${levelColor} ${
                    isActive ? 'animate-pulse shadow-[0_0_8px_currentColor]' : ''
                  }`} />
                  <span className={`text-[10px] font-bold ${levelTextColor}`}>
                    {pLevel}
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
    </div>
  );
}
