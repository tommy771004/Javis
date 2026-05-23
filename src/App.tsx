import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SysMonitor } from './components/SysMonitor';
import { CenterVisualizer } from './components/CenterVisualizer';
import { HermesDashboard } from './components/HermesDashboard';
import { ActivityLog } from './components/ActivityLog';
import { FileUpload } from './components/FileUpload';
import { CommandInput } from './components/CommandInput';
import { Footer } from './components/Footer';

export default function App() {
  const [logs, setLogs] = useState<string[]>([
    "SYS: JARVIS online.",
    "SYS: System diagnostics initialized.",
    "SYS: Initializing core protocols...",
    "SYS: All systems nominal."
  ]);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isHermesActive, setIsHermesActive] = useState(false);

  // Initialize voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = voices.find(voice => voice.name.includes('Google UK English Male'));
    
    if (!selectedVoice) {
      selectedVoice = voices.find(voice => voice.lang === 'en-GB' && voice.name.includes('Male')) || 
                      voices.find(voice => voice.lang === 'en-GB') || 
                      voices.find(voice => voice.lang.startsWith('en')) || 
                      voices[0];
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.rate = 1.0; 
    utterance.pitch = isHermesActive ? 0.95 : 0.8; // Change pitch slightly for Hermes
    
    window.speechSynthesis.speak(utterance);
  };

  const handleToggleHermes = () => {
    setIsHermesActive(prev => {
      const next = !prev;
      if (next) {
        const startupMsg = "Switching AI Core to HERMES AGENT intelligence matrix. Closed learning loop active. SQLite state.db mapped via FTS5 indexers. Dynamic cost-aware gateway online.";
        setLogs(prevLogs => [
          ...prevLogs,
          "SYS: Initiating core protocol swap...",
          "SYS: HERMES MATRIX active.",
          `HERMES: ${startupMsg}`
        ]);
        speakText("Hermes online. Closed learning loop initialized. How can I assist you, Tommy?");
      } else {
        setLogs(prevLogs => [
          ...prevLogs,
          "SYS: Deactivating Hermes matrix...",
          "SYS: JARVIS core online. All systems nominal."
        ]);
        speakText("Jarvis protocols fully restored, sir.");
      }
      return next;
    });
  };

  const handleCommand = async (text: string) => {
    setLogs(prev => [...prev, `USER: ${text}`]);
    setIsThinking(true);

    if (isHermesActive) {
      // High-fidelity Hermes simulation with cost-aware feedback and keyword processing
      setTimeout(() => {
        setIsThinking(false);
        const queryLower = text.toLowerCase();
        let responseText = "";

        if (queryLower.includes('skills') || queryLower.includes('curation')) {
          responseText = "I evaluated the execution logs. One skill candidate found for this workflow. I successfully codified, tested, and stored 'github-pr-reviewer' (v2.5) to state.db.";
        } else if (queryLower.includes('cost') || queryLower.includes('budget') || queryLower.includes('router')) {
          responseText = "Evaluating task signature. Routed to Claude 3.5 Haiku to optimize API budget. Spent is $0.4216 out of a $2.00 session limit. Cache hit ratio remains at 84 percent.";
        } else if (queryLower.includes('sqlite') || queryLower.includes('fts5') || queryLower.includes('memory')) {
          responseText = "Queried SQLite state.db using keyword FTS5 virtual indexing. Context successfully recovered in 6 milliseconds. Re-injected relevant memories into active context.";
        } else if (queryLower.includes('hello') || queryLower.includes('jarvis')) {
          responseText = "Hello, Tommy. Hermes Core is active. I am actively analyzing our development workspace, cataloging skills, and optimizing token spend. State database is stable.";
        } else {
          responseText = `Request received. Task evaluated. Cost-aware pipeline routed to Haiku. Dynamic prompt cache hit confirmed. Current token cost: $0.0016. Execution success: 100 percent.`;
        }

        setLogs(prev => [...prev, `HERMES: ${responseText}`]);
        speakText(responseText);
      }, 1000);
      return;
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }) 
      });

      if (!response.ok) throw new Error('Network error');
      
      const data = await response.json();
      setLogs(prev => [...prev, `JARVIS: ${data.text}`]);
      speakText(data.text);
    } catch (e) {
      console.error(e);
      // Fail back gracefully for JARVIS offline mode so the dashboard works offline!
      setTimeout(() => {
        setIsThinking(false);
        const responseText = "Sir, the chat API is offline, but my local protocols are maintaining systems normal. Select AI Core Active to load the Hermes matrix.";
        setLogs(prev => [...prev, `JARVIS: ${responseText}`]);
        speakText(responseText);
      }, 1000);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#02060b] text-cyan-50 font-sans selection:bg-cyan-500/30 overflow-y-auto lg:overflow-hidden flex flex-col p-4 bg-[radial-gradient(ellipse_at_center,rgba(0,30,50,0.5)_0%,rgba(0,0,0,1)_100%)]">
      
      <Header />

      <main className="flex-1 flex flex-col lg:flex-row w-full mx-auto mt-4 lg:mt-6 overflow-visible lg:overflow-hidden gap-8 lg:gap-0">
        
        {/* Left Side: System Monitor */}
        <div className="w-full lg:w-[280px] xl:w-[320px] flex-shrink-0 lg:h-full overflow-y-auto lg:overflow-hidden">
          <SysMonitor isHermesActive={isHermesActive} onToggleHermes={handleToggleHermes} />
        </div>

        {/* Center: AI Core Visualizer */}
        <div className="flex-1 lg:h-full min-h-[300px] flex items-center justify-center">
          {isHermesActive ? (
            <HermesDashboard />
          ) : (
            <CenterVisualizer isListening={isMicActive || isThinking} />
          )}
        </div>

        {/* Right Side: Comms & Controls */}
        <div className="w-full lg:w-[320px] xl:w-[380px] flex-shrink-0 flex flex-col lg:h-full pl-0 lg:pl-2">
            <ActivityLog logs={logs} />
            <FileUpload />
            <CommandInput 
                onCommand={handleCommand} 
                isMicActive={isMicActive} 
                setIsMicActive={setIsMicActive} 
            />
        </div>

      </main>

      <Footer />
    </div>
  );
}
