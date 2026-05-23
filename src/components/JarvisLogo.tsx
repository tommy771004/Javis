import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface JarvisLogoProps {
  size?: number;
  glow?: boolean;
  pulse?: boolean;
}

export function JarvisLogo({ size = 48, glow = true, pulse = true }: JarvisLogoProps) {
  const [activeSkin, setActiveSkin] = useState(() => localStorage.getItem('jarvis_active_skin') || 'cyan');

  useEffect(() => {
    const handleSkinUpdated = () => {
      setActiveSkin(localStorage.getItem('jarvis_active_skin') || 'cyan');
    };
    window.addEventListener('skin-updated', handleSkinUpdated);
    return () => window.removeEventListener('skin-updated', handleSkinUpdated);
  }, []);

  const getSkinColors = () => {
    switch (activeSkin) {
      case 'emerald':
        return {
          stroke: "#34d399",
          glow: "rgba(52, 211, 153, 0.85)",
          bgStroke: "#047857"
        };
      case 'amber':
        return {
          stroke: "#fbbf24",
          glow: "rgba(251, 191, 36, 0.85)",
          bgStroke: "#b45309"
        };
      case 'red':
        return {
          stroke: "#f87171",
          glow: "rgba(248, 113, 113, 0.85)",
          bgStroke: "#b91c1c"
        };
      case 'cyan':
      default:
        return {
          stroke: "#22d3ee",
          glow: "rgba(34, 211, 238, 0.85)",
          bgStroke: "#083344"
        };
    }
  };

  const colors = getSkinColors();
  const strokeCyan = colors.stroke;
  const fillMidMidnight = "#020617";
  const glowCyan = colors.glow;

  const glowStyle = glow
    ? {
        filter: `drop-shadow(0px 0px ${size * 0.12}px ${glowCyan})`,
      }
    : {};

  return (
    <div 
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      <motion.svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        style={glowStyle}
        animate={pulse ? {
          scale: [1, 1.02, 1],
        } : undefined}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Deep background shield */}
        <circle cx="50" cy="50" r="46" fill={fillMidMidnight} fillOpacity="0.45" stroke={colors.bgStroke} strokeWidth="1" />
        
        {/* Outer dotted tracking ring */}
        <motion.circle 
          cx="50" 
          cy="50" 
          r="43" 
          stroke={strokeCyan} 
          strokeWidth="0.75" 
          strokeDasharray="1.5 3.5" 
          strokeOpacity="0.55"
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "50px 50px" }}
        />

        {/* Tactical Crosshair Guidelines */}
        <line x1="50" y1="4" x2="50" y2="12" stroke={strokeCyan} strokeWidth="1" strokeOpacity="0.8" />
        <line x1="50" y1="88" x2="50" y2="96" stroke={strokeCyan} strokeWidth="1" strokeOpacity="0.8" />
        <line x1="4" y1="50" x2="12" y2="50" stroke={strokeCyan} strokeWidth="1" strokeOpacity="0.8" />
        <line x1="88" y1="50" x2="96" y2="50" stroke={strokeCyan} strokeWidth="1" strokeOpacity="0.8" />

        {/* Sharp corner brackets (Outer alignment notches) */}
        <path d="M 12 36 A 39 39 0 0 1 36 12" stroke={strokeCyan} strokeWidth="1" strokeOpacity="0.4" />
        <path d="M 64 12 A 39 39 0 0 1 88 36" stroke={strokeCyan} strokeWidth="1" strokeOpacity="0.4" />
        <path d="M 88 64 A 39 39 0 0 1 64 88" stroke={strokeCyan} strokeWidth="1" strokeOpacity="0.4" />
        <path d="M 36 88 A 39 39 0 0 1 12 64" stroke={strokeCyan} strokeWidth="1" strokeOpacity="0.4" />

        {/* Intermediate solid/cut tech ring */}
        <motion.circle 
          cx="50" 
          cy="50" 
          r="30" 
          stroke={strokeCyan} 
          strokeWidth="1.2" 
          strokeDasharray="40 10 15 10 30 10" 
          strokeOpacity="0.8"
          animate={{ rotate: -360 }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "50px 50px" }}
        />

        {/* Tech ticks pointing inwards */}
        <circle cx="50" cy="50" r="32" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
        
        {/* Core Arc Reactor Emblem (Shining Triangular/Hex Core Layout) */}
        <g stroke={strokeCyan} strokeWidth="0.8">
          {/* Inner Central Ring */}
          <circle cx="50" cy="50" r="16" stroke={strokeCyan} strokeWidth="1" strokeOpacity="0.9" fill="rgba(8, 47, 73, 0.4)" />
          
          {/* Glowing central core triangle (arc reactor vibe) */}
          <polygon 
            points="50,40 59,55 41,55" 
            fill={strokeCyan} 
            fillOpacity="0.25" 
            stroke={strokeCyan} 
            strokeWidth="1.2" 
          />
          
          {/* Glowing beams emitting outwards to join ring */}
          <line x1="50" y1="40" x2="50" y2="34" stroke={strokeCyan} strokeWidth="1.2" strokeOpacity="0.9" />
          <line x1="59" y1="55" x2="64" y2="58" stroke={strokeCyan} strokeWidth="1.2" strokeOpacity="0.9" />
          <line x1="41" y1="55" x2="36" y2="58" stroke={strokeCyan} strokeWidth="1.2" strokeOpacity="0.9" />
          
          {/* Tiny details around the core */}
          <circle cx="50" cy="34" r="1" fill={strokeCyan} />
          <circle cx="64" cy="58" r="1" fill={strokeCyan} />
          <circle cx="36" cy="58" r="1" fill={strokeCyan} />
        </g>

        {/* Central glowing reactor center */}
        <circle cx="50" cy="50" r="4" fill="#ffffff" />
        <circle cx="50" cy="50" r="6" stroke={strokeCyan} strokeWidth="0.5" />
      </motion.svg>
    </div>
  );
}
