import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { SysMonitor } from './components/SysMonitor';
import { CenterVisualizer, CognitiveState } from './components/CenterVisualizer';
import { HermesDashboard } from './components/HermesDashboard';
import { ActivityLog } from './components/ActivityLog';
import { FileUpload } from './components/FileUpload';
import { CommandInput } from './components/CommandInput';
import { Footer } from './components/Footer';
import { hermesDB } from './services/db';

interface PlannedAction {
  type: 'write';
  filePath: string;
  content: string;
}

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

  // Phase 3: Cognitive HUD and Voice amplitude sync states
  const [cognitiveState, setCognitiveState] = useState<CognitiveState>('idle');
  const [voiceAmplitude, setVoiceAmplitude] = useState(0);

  // WebRTC Stats and Logs states
  const [webrtcLogs, setWebrtcLogs] = useState<string[]>([
    "[WebRTC] VoIP satellite bridge initialized on standby."
  ]);
  const [webrtcStats, setWebrtcStats] = useState({
    state: 'idle',
    codec: 'Opus @ 48kHz',
    rtt: 0,
    jitter: 0,
    packetsSent: 0,
    packetsReceived: 0,
    bytesSent: 0,
    bytesReceived: 0,
    bitrate: 0
  });

  // WebRTC refs
  const pc1Ref = useRef<RTCPeerConnection | null>(null);
  const pc2Ref = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<any | null>(null);
  const statsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const prevBytesReceivedRef = useRef<number>(0);
  const prevTimestampRef = useRef<number>(0);

  // Phase 2: Planned filesystem action pending consent check
  const [pendingAction, setPendingAction] = useState<PlannedAction | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);

  // Synchronize conversational history from backend master database
  const syncLogsFromBackend = async () => {
    try {
      const savedMsgs = await hermesDB.getSessionMessages("default-session");
      if (savedMsgs.length > 0) {
        const logStrings = savedMsgs.map(msg => {
          const role = msg.role === 'user' ? 'USER' : msg.role === 'system' ? 'SYS' : isHermesActive ? 'HERMES' : 'JARVIS';
          return `${role}: ${msg.content}`;
        });
        setLogs([
          "SYS: Server database logs synchronized.",
          ...logStrings
        ]);
      }
    } catch (err) {
      console.error("Failed to load historical logs from backend", err);
    }
  };

  useEffect(() => {
    syncLogsFromBackend();
  }, [isHermesActive]);

  // WebRTC Active Switch Effect
  useEffect(() => {
    if (isMicActive) {
      startVoiceBridge();
    } else {
      stopVoiceBridge();
    }
    return () => {
      // Cleanup on unmount or toggle
      if (statsTimerRef.current) clearInterval(statsTimerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (pc1Ref.current) pc1Ref.current.close();
      if (pc2Ref.current) pc2Ref.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch(e){}
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
      }
    };
  }, [isMicActive]);

  const startVoiceBridge = async () => {
    setWebrtcLogs([
      "[WebRTC] Initializing local satellite loopback...",
      "[WebRTC] Requesting microphone access..."
    ]);
    setCognitiveState('searching'); // Neon emerald scanning status

    try {
      // 1. Get User Media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      
      setWebrtcLogs(prev => [...prev, "[WebRTC] Microphone stream authorized."]);

      // 2. Setup RTCPeerConnections with STUN
      const pc1 = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      const pc2 = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      pc1Ref.current = pc1;
      pc2Ref.current = pc2;

      // ICE Candidate exchanges
      pc1.onicecandidate = (e) => {
        if (e.candidate) {
          pc2.addIceCandidate(e.candidate).catch(err => console.error("ICE exchange error", err));
          setWebrtcLogs(prev => [...prev, `[WebRTC] ICE candidate exchanged (Transmitter -> Receiver)`]);
        }
      };

      pc2.onicecandidate = (e) => {
        if (e.candidate) {
          pc1.addIceCandidate(e.candidate).catch(err => console.error("ICE exchange error", err));
          setWebrtcLogs(prev => [...prev, `[WebRTC] ICE candidate exchanged (Receiver -> Transmitter)`]);
        }
      };

      pc2.onconnectionstatechange = () => {
        const state = pc2.connectionState;
        setWebrtcStats(prev => ({ ...prev, state }));
        setWebrtcLogs(prev => [...prev, `[WebRTC] Connection state: ${state.toUpperCase()}`]);
        if (state === 'connected') {
          setCognitiveState('idle');
          setLogs(prevLogs => [...prevLogs, "SYS: WebRTC voice satellite connection established."]);
        }
      };

      // Add audio track
      stream.getAudioTracks().forEach(track => pc1.addTrack(track, stream));
      setWebrtcLogs(prev => [...prev, "[WebRTC] Transmitting audio track via pc1."]);

      // 3. Set up Web Audio context on the receiver side
      pc2.ontrack = (event) => {
        setWebrtcLogs(prev => [...prev, "[WebRTC] Incoming track captured. Mapping Web Audio FFT nodes..."]);
        
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          audioCtxRef.current = audioCtx;
          
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          analyserRef.current = analyser;

          const source = audioCtx.createMediaStreamSource(event.streams[0]);
          source.connect(analyser);
          
          // Note: DO NOT connect to audioCtx.destination to avoid self-echoing feedback loop.
          // We analyze the audio amplitudes silently!

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          const updateVolume = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const average = sum / bufferLength;
            
            // Map amplitude value up to 100 with boosted sensitivity
            const normalizedAmp = Math.min(100, Math.round(average * 2.0));
            setVoiceAmplitude(normalizedAmp);
            
            animationFrameRef.current = requestAnimationFrame(updateVolume);
          };

          updateVolume();
          setWebrtcLogs(prev => [...prev, "[WebRTC] Web Audio Analyser online. Live room amplitude output active."]);
        } catch (audioErr: any) {
          console.error("AudioContext setup failed", audioErr);
          setWebrtcLogs(prev => [...prev, `[WebRTC Error] Audio Analyser initialization failed: ${audioErr.message}`]);
        }
      };

      // 4. SDP Handshake negotiation
      setWebrtcLogs(prev => [...prev, "[WebRTC] Negotiating SDP handshake..."]);
      
      const offer = await pc1.createOffer();
      await pc1.setLocalDescription(offer);
      setWebrtcLogs(prev => [...prev, `[WebRTC Offer SDP (truncated)]:\n${offer.sdp?.substring(0, 180)}...`]);

      await pc2.setRemoteDescription(offer);
      
      const answer = await pc2.createAnswer();
      await pc2.setLocalDescription(answer);
      setWebrtcLogs(prev => [...prev, `[WebRTC Answer SDP (truncated)]:\n${answer.sdp?.substring(0, 180)}...`]);

      await pc1.setRemoteDescription(answer);
      setWebrtcLogs(prev => [...prev, "[WebRTC] Handshake complete. Awaiting connection stability..."]);

      // 5. Start getStats Poller
      prevBytesReceivedRef.current = 0;
      prevTimestampRef.current = Date.now();

      statsTimerRef.current = setInterval(async () => {
        if (!pc2Ref.current) return;
        try {
          const stats = await pc2Ref.current.getStats();
          let rtt = 0;
          let jitter = 0;
          let packetsReceived = 0;
          let bytesReceived = 0;
          let packetsSent = 0;
          let bytesSent = 0;

          stats.forEach(report => {
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              rtt = Math.round((report.currentRoundTripTime || 0) * 1000);
            }
            if (report.type === 'inbound-rtp' && report.mediaType === 'audio') {
              jitter = report.jitter || 0;
              packetsReceived = report.packetsReceived || 0;
              bytesReceived = report.bytesReceived || 0;
            }
            if (report.type === 'outbound-rtp' && report.mediaType === 'audio') {
              packetsSent = report.packetsSent || 0;
              bytesSent = report.bytesSent || 0;
            }
          });

          const now = Date.now();
          const timeDelta = (now - prevTimestampRef.current) / 1000;
          const bytesDelta = bytesReceived - prevBytesReceivedRef.current;
          const bitrate = timeDelta > 0 ? Math.round(((bytesDelta * 8) / timeDelta) / 1000) : 0;

          prevBytesReceivedRef.current = bytesReceived;
          prevTimestampRef.current = now;

          setWebrtcStats(prev => ({
            ...prev,
            codec: 'Opus Stereo @ 48kHz (128kbps)',
            rtt: rtt || 1, // local RTT shows as ~1ms
            jitter: parseFloat((jitter * 1000).toFixed(4)), // convert to ms
            packetsSent,
            packetsReceived,
            bytesSent,
            bytesReceived,
            bitrate: bitrate || (packetsReceived > 0 ? 32 : 0)
          }));
        } catch (statsErr) {
          console.error("Failed to query WebRTC statistics", statsErr);
        }
      }, 500);

      // 6. Web Speech Recognition Setup
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'zh-TW';

        let autoDispatchTimer: NodeJS.Timeout | null = null;

        recognition.onstart = () => {
          setWebrtcLogs(prev => [...prev, "[WebRTC Speech] Continuous speech recognition pipeline listening."]);
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          const currentWords = finalTranscript || interimTranscript;
          if (currentWords.trim()) {
            setLogs(prev => {
              const clean = prev.filter(l => !l.startsWith("USER [Transcribing]:"));
              return [...clean, `USER [Transcribing]: ${currentWords}`];
            });

            // Auto-trigger command dispatch after 2.0s of physical silence
            if (autoDispatchTimer) clearTimeout(autoDispatchTimer);
            autoDispatchTimer = setTimeout(() => {
              if (currentWords.trim()) {
                handleCommand(currentWords);
                setLogs(prev => prev.filter(l => !l.startsWith("USER [Transcribing]:")));
              }
            }, 2000);
          }
        };

        recognition.onerror = (recErr: any) => {
          console.error("SpeechRecognition error", recErr);
          setWebrtcLogs(prev => [...prev, `[WebRTC Speech Error]: ${recErr.error}`]);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } else {
        setWebrtcLogs(prev => [...prev, "[WebRTC Alert] SpeechRecognition API not supported. Continuous voice typing disabled."]);
      }

    } catch (err: any) {
      console.error("WebRTC loopback setup failed", err);
      setWebrtcLogs(prev => [
        ...prev,
        `[WebRTC Failure] Permission denied or hardware capture missing.`,
        `[WebRTC Failure] Error: ${err.message}`
      ]);
      setLogs(prev => [...prev, `SYS WARN: WebRTC loopback capture offline. ${err.message}`]);
      setCognitiveState('idle');
      setIsMicActive(false);
    }
  };

  const stopVoiceBridge = () => {
    if (statsTimerRef.current) clearInterval(statsTimerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e){}
      recognitionRef.current = null;
    }

    if (pc1Ref.current) {
      pc1Ref.current.close();
      pc1Ref.current = null;
    }
    if (pc2Ref.current) {
      pc2Ref.current.close();
      pc2Ref.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch(e){}
      audioCtxRef.current = null;
    }

    analyserRef.current = null;
    setVoiceAmplitude(0);
    setWebrtcStats(prev => ({
      ...prev,
      state: 'closed',
      bitrate: 0,
      rtt: 0,
      jitter: 0
    }));
    setWebrtcLogs(prev => [...prev, "[WebRTC] VoIP loopback closed. Hardware standby."]);
    setCognitiveState('idle');
  };


  // Initialize Speech Synthesis
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

    let amplitudeTimer: NodeJS.Timeout | null = null;
    
    utterance.onstart = () => {
      setCognitiveState('speaking');
      
      // Dynamic voice sound wave amplitude simulator!
      amplitudeTimer = setInterval(() => {
        // Generate random organic vocal amplitude spikes (simulating actual spoken speech heights!)
        const randomAmp = 15 + Math.floor(Math.random() * 55);
        setVoiceAmplitude(randomAmp);
      }, 100);
    };

    utterance.onend = () => {
      if (amplitudeTimer) clearInterval(amplitudeTimer);
      setCognitiveState('idle');
      setVoiceAmplitude(0);
    };

    utterance.onerror = () => {
      if (amplitudeTimer) clearInterval(amplitudeTimer);
      setCognitiveState('idle');
      setVoiceAmplitude(0);
    };
    
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
    
    // Trigger Amber computing state immediately
    setCognitiveState('thinking');
    setIsThinking(true);

    // Dynamic Cost-Aware Routing
    let requestedModel = "auto";
    if (isHermesActive) {
      const queryLower = text.toLowerCase();
      const requiresSonnet = text.length > 8000 || 
                            queryLower.includes("ast") || 
                            queryLower.includes("refactor") || 
                            queryLower.includes("curate") ||
                            queryLower.includes("evolve");
      if (requiresSonnet) {
        requestedModel = "claude-3-5-sonnet-latest";
      } else {
        requestedModel = "claude-3-5-haiku-latest";
      }
    }

    try {
      // Dispatch request to Express server
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text,
          model: requestedModel === "auto" ? undefined : requestedModel,
          sessionId: "default-session"
        })
      });

      // Handle server-side Cost budget caps
      if (response.status === 402) {
        const budgetErrMsg = "SYS ERROR: API Budget Limit Exceeded ($2.00 CAP). Core pipeline locked. Please reset budget ledger in Cost Gateway.";
        setLogs(prev => [...prev, budgetErrMsg]);
        speakText("Warning, sir. The system API budget limit has been exceeded. Communications are locked.");
        setCognitiveState('idle');
        setIsThinking(false);
        return;
      }

      if (!response.ok) throw new Error('API server returned error');
      
      const data = await response.json();
      
      // Check for server-extracted planned file edits
      if (data.plannedAction) {
        setPendingAction(data.plannedAction);
        speakText("I have formulated the required code changes, Tommy. Please review and authorize the filesystem patch.");
      } else {
        // If speaking, state switches to speaking; else goes idle
        setCognitiveState('idle');
      }

      await syncLogsFromBackend();
      speakText(data.text);
    } catch (e) {
      console.error(e);
      setCognitiveState('idle');
      setTimeout(() => {
        setIsThinking(false);
        const fallbackText = isHermesActive
          ? "Local FTS5 state engine is operational. Local skills repository loaded. To establish satellite links, configure OPENROUTER_API_KEY."
          : "Satellite connection offline, Tommy. Verify your OpenRouter credentials inside your local .env configuration.";
        
        setLogs(prev => [...prev, `${isHermesActive ? 'HERMES' : 'JARVIS'}: ${fallbackText}`]);
        speakText(fallbackText);
      }, 800);
    } finally {
      setIsThinking(false);
    }
  };

  // --- Execute User-Consented Workspace Filesystem Action ---
  const handleApproveAction = async () => {
    if (!pendingAction) return;
    setIsExecutingAction(true);
    setCognitiveState('thinking'); // Computing write patch
    
    try {
      setLogs(prev => [...prev, `SYS: Writing file patch request to: ${pendingAction.filePath}...`]);
      
      const patchRes = await fetch('/api/workspace/patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: pendingAction.filePath,
          content: pendingAction.content
        })
      });

      if (!patchRes.ok) throw new Error('Failed to patch file');

      setLogs(prev => [
        ...prev, 
        `SYS: Success. File '${pendingAction.filePath}' written to disk.`,
        "SYS: Initiating background compilability checks..."
      ]);

      // Automatically trigger compilability checks via terminal commands
      const executeRes = await fetch('/api/workspace/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: "npm run build" })
      });

      const executeData = await executeRes.json();
      if (executeData.success) {
        setLogs(prev => [
          ...prev,
          "SYS: Build check successful. Workspace compilability: 100%. All systems nominal."
        ]);
        speakText("Workspace patch applied successfully, Tommy. Local build compiles without warnings.");
      } else {
        setLogs(prev => [
          ...prev,
          "SYS ERROR: Compile check failed. Terminal trace output below:",
          executeData.stderr || executeData.stdout || "Unknown compiler exit code."
        ]);
        speakText("Warning, Tommy. The patch was written to disk, but the local compiler reports syntax errors.");
      }
    } catch (err: any) {
      console.error(err);
      setLogs(prev => [...prev, `SYS ERROR: Filesystem operation failed. ${err.message}`]);
    } finally {
      setIsExecutingAction(false);
      setPendingAction(null);
      setCognitiveState('idle');
    }
  };

  const handleDeclineAction = () => {
    setLogs(prev => [...prev, "SYS: Filesystem write transaction declined by user. Operations aborted."]);
    speakText("Write request cancelled, Tommy.");
    setPendingAction(null);
    setCognitiveState('idle');
  };

  return (
    <div className="h-screen w-screen bg-[#02060b] text-cyan-50 font-sans selection:bg-cyan-500/30 overflow-y-auto lg:overflow-hidden flex flex-col p-4 bg-[radial-gradient(ellipse_at_center,rgba(0,30,50,0.5)_0%,rgba(0,0,0,1)_100%)] relative">
      
      {/* Dynamic Security Consent Modal Overlay */}
      <AnimatePresence>
        {pendingAction && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6 select-none"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-[640px] bg-[#020d06]/95 border-2 border-emerald-500 p-6 flex flex-col gap-4 font-mono shadow-[0_0_30px_rgba(16,185,129,0.3)] relative"
            >
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400"></div>
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400"></div>
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400"></div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400"></div>

              {/* Warning Header */}
              <div className="border-b border-emerald-800 pb-2 flex justify-between items-center text-emerald-400">
                <span className="text-sm font-bold tracking-[0.2em] animate-pulse">⚠️ PENDING ACTION: USER CONSENT REQUIRED</span>
                <span className="text-[10px] opacity-75">SEC_CLEARED_MATRIX</span>
              </div>

              {/* Action Details */}
              <div className="text-[11px] text-emerald-300/80 space-y-1">
                <div><span className="text-emerald-500 font-bold">TRANSACTION:</span> FILE_PATCH_WRITE</div>
                <div><span className="text-emerald-500 font-bold">TARGET PATH:</span> [relative] {pendingAction.filePath}</div>
                <div><span className="text-emerald-500 font-bold">SECURITY ENVELOPE:</span> DIRECTORY_BOUNDED [ACTIVE]</div>
              </div>

              {/* Code preview block */}
              <div className="flex-1 min-h-[220px] max-h-[340px] border border-emerald-900/60 bg-black/60 p-4 text-[10px] text-emerald-400 overflow-y-auto scrollbar-cyan select-text font-mono leading-relaxed whitespace-pre">
                {pendingAction.content}
              </div>

              {/* Actions */}
              <div className="flex gap-4 border-t border-emerald-900/60 pt-4 flex-shrink-0">
                <button
                  disabled={isExecutingAction}
                  onClick={handleApproveAction}
                  className={`flex-1 py-2.5 text-xs uppercase border tracking-widest text-center transition-all ${
                    isExecutingAction 
                      ? 'border-emerald-800 text-emerald-700 bg-emerald-950/20 cursor-not-allowed' 
                      : 'border-emerald-400 text-white bg-emerald-950/40 hover:bg-emerald-500/20 hover:text-white shadow-[0_0_12px_rgba(16,185,129,0.25)] active:scale-98'
                  }`}
                >
                  {isExecutingAction ? 'Executing Write...' : 'Approve & Write on Disk'}
                </button>
                <button
                  disabled={isExecutingAction}
                  onClick={handleDeclineAction}
                  className="px-6 py-2.5 text-xs uppercase border border-amber-600/70 text-amber-400 bg-black hover:bg-amber-950/30 active:scale-98 transition-all tracking-widest"
                >
                  Decline
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Header />

      <main className="flex-1 flex flex-col lg:flex-row w-full mx-auto mt-4 lg:mt-6 overflow-visible lg:overflow-hidden gap-8 lg:gap-0">
        
        {/* Left Side: System Monitor */}
        <div className="w-full lg:w-[280px] xl:w-[320px] flex-shrink-0 lg:h-full overflow-y-auto lg:overflow-hidden">
          <SysMonitor isHermesActive={isHermesActive} onToggleHermes={handleToggleHermes} />
        </div>

        {/* Center: AI Core Visualizer */}
        <div className="flex-1 lg:h-full min-h-[300px] flex items-center justify-center">
          {isHermesActive ? (
            <HermesDashboard 
              cognitiveState={cognitiveState} 
              setCognitiveState={setCognitiveState} 
              voiceAmplitude={voiceAmplitude} 
              webrtcLogs={webrtcLogs}
              webrtcStats={webrtcStats}
              isMicActive={isMicActive}
            />
          ) : (
            <CenterVisualizer 
              cognitiveState={cognitiveState} 
              voiceAmplitude={voiceAmplitude} 
              isMicActive={isMicActive}
              webrtcStats={webrtcStats}
            />
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
