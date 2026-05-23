import React, { useState, useEffect } from 'react';

export function Header() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="flex justify-between items-start w-full text-cyan-500 font-mono p-4 pb-0 select-none">
      <div className="text-xl tracking-[0.2em] opacity-70">MARK XXXIX</div>
      <div className="flex flex-col items-center">
        <h1 className="text-4xl tracking-[0.3em] font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
          J.A.R.V.I.S
        </h1>
        <p className="text-xs tracking-[0.1em] opacity-60 mt-1">Just A Rather Very Intelligent System</p>
      </div>
      <div className="text-right">
        <div className="text-3xl tracking-wider text-cyan-200">
          {time.toLocaleTimeString('en-US', { hour12: false })}
        </div>
        <div className="text-[10px] tracking-widest opacity-60 mt-1">
          {time.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(/,/g, '')}
        </div>
      </div>
    </header>
  );
}
