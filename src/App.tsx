import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SysMonitor } from './components/SysMonitor';
import { CenterVisualizer } from './components/CenterVisualizer';
import { HermesDashboard } from './components/HermesDashboard';
import { ActivityLog } from './components/ActivityLog';
import { FileUpload } from './components/FileUpload';
import { CommandInput } from './components/CommandInput';
import { Footer } from './components/Footer';
import { hermesDB } from './services/db';

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

  // Initialize DB and load historical messages from IndexedDB on start
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        await hermesDB.init();
        const savedMsgs = await hermesDB.getSessionMessages("default-session");
        
        if (savedMsgs.length > 0) {
          const logStrings = savedMsgs.map(msg => {
            const role = msg.role === 'user' ? 'USER' : msg.role === 'system' ? 'SYS' : isHermesActive ? 'HERMES' : 'JARVIS';
            return `${role}: ${msg.content}`;
          });
          setLogs([
            "SYS: Historical database logs restored.",
            ...logStrings
          ]);
        }
      } catch (err) {
        console.error("Failed to load historical logs from IndexedDB", err);
      }
    };
    
    initializeDatabase();
  }, [isHermesActive]);

  // Initialize speech voices
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
    utterance.pitch = isHermesActive ? 0.95 : 0.8; 
    
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
    // 1. Enforce Cost-Aware Budget Caps prior to API calls
    let totalSpent = 0;
    try {
      const dbCostLogs = await hermesDB.getCostLogs();
      totalSpent = dbCostLogs.reduce((sum, item) => sum + item.costUsd, 0);
    } catch (e) {
      console.error(e);
    }

    const BUDGET_LIMIT = 2.00; // $2 limit cap
    if (totalSpent >= BUDGET_LIMIT) {
      const budgetErrMsg = `SYS ERROR: API Budget Limit Exceeded ($${totalSpent.toFixed(6)} / $${BUDGET_LIMIT.toFixed(2)}). Core pipeline locked. Please reset database config.`;
      setLogs(prev => [...prev, budgetErrMsg]);
      speakText("Warning, Tommy. System API budget limit has been exceeded. Communications are locked.");
      return;
    }

    // 2. Add user message to UI and IndexedDB
    setLogs(prev => [...prev, `USER: ${text}`]);
    setIsThinking(true);

    const userMsgId = Math.random().toString(36).substring(7);
    const timestamp = Date.now();

    try {
      await hermesDB.addMessage({
        id: userMsgId,
        sessionId: "default-session",
        role: "user",
        content: text,
        timestamp
      });
    } catch (e) {
      console.error("Failed to persist user message in IndexedDB", e);
    }

    // 3. Dynamic Cost-Aware Routing Matrices (Sonnet vs Haiku/Free tier fallbacks)
    let requestedModel = "auto";
    let taskType = "general";
    
    if (isHermesActive) {
      const queryLower = text.toLowerCase();
      // Complex prompt AST scans, AST refactor updates or skill curations require Sonnet
      const requiresSonnet = text.length > 8000 || 
                            queryLower.includes("ast") || 
                            queryLower.includes("refactor") || 
                            queryLower.includes("curate") ||
                            queryLower.includes("evolve");
      if (requiresSonnet) {
        requestedModel = "claude-3-5-sonnet-latest";
        taskType = "prompt_evolution";
      } else {
        requestedModel = "claude-3-5-haiku-latest";
        taskType = "fts_query";
      }
    }

    try {
      // 4. Dispatch actual request to backend API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text,
          model: requestedModel === "auto" ? undefined : requestedModel,
          history: [] // Stateless model session fallback
        })
      });

      if (!response.ok) throw new Error('API server returned error');
      
      const data = await response.json();
      
      // 5. Calculate costs from real API tokens returned
      const modelUsed = data.model || "meta-llama/llama-3.2-3b-instruct:free";
      const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0 };
      const calculatedCost = hermesDB.calculateAPICost(modelUsed, usage.prompt_tokens, usage.completion_tokens);

      // 6. Save assistant message to IndexedDB
      const assistantMsgId = Math.random().toString(36).substring(7);
      await hermesDB.addMessage({
        id: assistantMsgId,
        sessionId: "default-session",
        role: "assistant",
        content: data.text,
        timestamp: Date.now(),
        model: modelUsed,
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        costUsd: calculatedCost
      });

      // Save to transaction cost logs if Hermes active or calculated cost > 0
      if (calculatedCost > 0 || isHermesActive) {
        await hermesDB.addCostLog({
          id: Math.random().toString(36).substring(7),
          timestamp: Date.now(),
          model: modelUsed,
          taskType,
          costUsd: calculatedCost,
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens
        });
      }

      // 7. Dynamic Skill Curation check
      // If the user asks the agent to create/curate a skill and it is successful, dynamically codify it!
      const queryLower = text.toLowerCase();
      if (isHermesActive && (queryLower.includes("curate") || queryLower.includes("create skill") || queryLower.includes("add skill"))) {
        // Parse name from prompt or generate a default one
        const words = queryLower.split(' ');
        const nameIdx = words.findIndex(w => w.includes("skill")) + 1;
        const skillName = (words[nameIdx] && words[nameIdx].replace(/[^\w-]/g, '')) || `custom-skill-${Math.floor(Math.random() * 100)}`;
        
        await hermesDB.addOrUpdateSkill({
          id: skillName,
          name: skillName,
          version: 'v1.0',
          status: 'active',
          description: `User-curated skill: ${text.substring(0, 50)}...`,
          yamlContent: `---\nname: ${skillName}\ndescription: ${text}\nversion: 1.0\n---`
        });

        const curationSuccessMsg = `[CURATOR] Automatically curated and saved new skill '${skillName}' (v1.0) into the SQLite skills directory.`;
        setLogs(prev => [...prev, curationSuccessMsg]);
      }

      const roleLabel = isHermesActive ? 'HERMES' : 'JARVIS';
      setLogs(prev => [...prev, `${roleLabel}: ${data.text}`]);
      speakText(data.text);
    } catch (e) {
      console.error(e);
      // Fail back gracefully for offline usage
      setTimeout(() => {
        setIsThinking(false);
        const fallbackText = isHermesActive
          ? "Local FTS5 state engine is operational. Local skills repository loaded. To establish API lines, configure OPENROUTER_API_KEY."
          : "Satellite connection offline, Tommy. Verify your OpenRouter credentials inside your local .env configuration.";
        
        setLogs(prev => [...prev, `${isHermesActive ? 'HERMES' : 'JARVIS'}: ${fallbackText}`]);
        speakText(fallbackText);
      }, 800);
    } finally {
      setIsThinking(false);
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
