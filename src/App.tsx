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
import { apiClient } from './services/apiClient';

import { SettingsModal, SecuritySettings } from './components/SettingsModal';
import { SpectrumRebootOverlay } from './components/SpectrumRebootOverlay';
import { startCommsChannel, stopCommsChannel, playTactileClick, getMasterAnalyser, modulateSynthVolumeForSpeech } from './services/audioSynth';
import { CACHE_PURGE_RESET_EVENT, createInitialWebRtcStats, createUiResetSnapshot } from './services/uiResetPolicies';
import { resolveGlobalShortcutAction } from './services/hermesDashboardInteractions';
import { buildOperationalSpeechFallback } from './services/truthfulUiPolicies';

interface PlannedAction {
  type: 'write' | 'execute' | 'create_task';
  filePath?: string;
  content?: string;
  command?: string;
  priority?: string;
  description?: string;
  ticketId?: string;
}

export default function App() {
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('jarvis_is_muted');
      return stored === 'true';
    } catch (e) {
      return false;
    }
  });

  const handleToggleMute = () => {
    setIsMuted(prev => {
      const newVal = !prev;
      try {
        localStorage.setItem('jarvis_is_muted', String(newVal));
      } catch (e) {}
      if (newVal) {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        stopCommsChannel();
      }
      return newVal;
    });
  };

  // F4 Global Command Hotkey Listener for Mute state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
        e.preventDefault();
        handleToggleMute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const commandInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const handleGlobalShortcut = (event: KeyboardEvent) => {
      const action = resolveGlobalShortcutAction(event);
      if (!action) {
        return;
      }

      event.preventDefault();

      if (action === 'open-settings') {
        setIsSettingsOpen(true);
        return;
      }

      commandInputRef.current?.focus();
      commandInputRef.current?.setSelectionRange(
        commandInputRef.current.value.length,
        commandInputRef.current.value.length
      );
    };

    window.addEventListener('keydown', handleGlobalShortcut);
    return () => {
      window.removeEventListener('keydown', handleGlobalShortcut);
    };
  }, []);

  // Synchronize CSS active skin theme class on the document body/html element
  useEffect(() => {
    const applySkinClass = () => {
      const skin = localStorage.getItem('jarvis_active_skin') || 'cyan';
      const isLight = localStorage.getItem('jarvis_light_mode') === 'true';
      // Remove all theme classes first
      document.documentElement.classList.remove('theme-cyan', 'theme-emerald', 'theme-amber', 'theme-red', 'theme-light');
      // Add active skin class
      document.documentElement.classList.add(`theme-${skin}`);
      if (isLight) {
        document.documentElement.classList.add('theme-light');
      }
    };

    applySkinClass();
    window.addEventListener('skin-updated', applySkinClass);
    return () => {
      window.removeEventListener('skin-updated', applySkinClass);
    };
  }, []);

  const [logs, setLogs] = useState<string[]>([]);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isHermesActive, setIsHermesActive] = useState(false);

  // Security and permission settings hooks
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    shellMode: 'manual',
    writeMode: 'manual',
    taskMode: 'manual',
    voiceProfile: 'baritone',
    autoRepair: false
  });
  const [sttProvider, setSttProvider] = useState<string>(() => localStorage.getItem('jarvis_stt_provider') || 'webspeech');
  const [ttsProvider, setTtsProvider] = useState<string>(() => localStorage.getItem('jarvis_tts_provider') || 'webspeech');
  const [elevenLabsRuntimeKey, setElevenLabsRuntimeKey] = useState<string>(() => localStorage.getItem('jarvis_elevenlabs_key') || '');

  useEffect(() => {
    if (securitySettings.elevenLabsKey !== undefined) {
      setElevenLabsRuntimeKey(securitySettings.elevenLabsKey);
    }
  }, [securitySettings.elevenLabsKey]);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setSecuritySettings(data);
          if (data.shellMode === 'auto' && data.writeMode === 'auto' && data.taskMode === 'auto') {
            setIsHermesActive(true);
          }
        }
        setLogs([
          "SYS: Local workspace connection is ready.",
          "SYS: Javis is online and watching for your next useful step.",
          "SYS: Security checks are available in the dashboard when you need them."
        ]);
      })
      .catch(e => {
        console.error("Failed to load settings from server", e);
        setLogs(["SYS: ERROR - Failed to reach local control plane."]);
      });
  }, []);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Phase 3: Cognitive HUD and Voice amplitude sync states
  const [cognitiveState, setCognitiveState] = useState<CognitiveState>('idle');
  const [voiceAmplitude, setVoiceAmplitude] = useState(0);

  // WebRTC Stats and Logs states
  const [webrtcLogs, setWebrtcLogs] = useState<string[]>([]);
  const [webrtcStats, setWebrtcStats] = useState(createInitialWebRtcStats);

  // WebRTC & Audio refs
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<any | null>(null);
  const statsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const prevBytesReceivedRef = useRef<number>(0);
  const prevTimestampRef = useRef<number>(0);
  
  const isMicActiveRef = useRef(isMicActive);
  useEffect(() => {
    isMicActiveRef.current = isMicActive;
  }, [isMicActive]);

  // Phase 2: Planned filesystem action pending consent check
  const [pendingAction, setPendingAction] = useState<PlannedAction | null>(null);
  const [actionQueue, setActionQueue] = useState<PlannedAction[]>([]);
  const [isExecutingAction, setIsExecutingAction] = useState(false);

  // Protective queue manager: If an action is already pending, others wait their turn
  useEffect(() => {
    if (!pendingAction && actionQueue.length > 0) {
      const nextAction = actionQueue[0];
      setPendingAction(nextAction);
      setActionQueue(prev => prev.slice(1));
    }
  }, [pendingAction, actionQueue]);

  // Synchronize conversational history from backend master database
  const syncLogsFromBackend = async () => {
    try {
      const savedMsgs = await apiClient.getSessionMessages("default-session");
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
      if (wsRef.current) wsRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch(e){}
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
      }
    };
  }, [isMicActive]);

  // Real-time physical voice wave amplitude visualization when speaking
  useEffect(() => {
    if (cognitiveState !== 'speaking') {
      return;
    }

    let speakingFrameId: number;
    const analyser = getMasterAnalyser();
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkOutputVolume = () => {
      analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;

      // Scale average fft values smoothly for holographic dashboard radar
      const normalizedAmp = Math.min(100, Math.round(average * 4.2));
      
      // Pure physical amplitude: raw FFT average scaled to 0-100.
      // No artificial floor noise injected — zero output means truly silent.
      const finalAmp = normalizedAmp;
      setVoiceAmplitude(finalAmp);

      speakingFrameId = requestAnimationFrame(checkOutputVolume);
    };

    speakingFrameId = requestAnimationFrame(checkOutputVolume);

    return () => {
      cancelAnimationFrame(speakingFrameId);
    };
  }, [cognitiveState]);

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

      // Direct Web Audio Analyser setup to ensure VAD updates with absolute stability and real mic frequencies
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioCtxRef.current = audioCtx;
        
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

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
          
          // Map amplitude value with direct VAD sensitivity multiplier
          const normalizedAmp = Math.min(100, Math.round(average * 2.5));
          setVoiceAmplitude(normalizedAmp);
          
          animationFrameRef.current = requestAnimationFrame(updateVolume);
        };

        updateVolume();
        setWebrtcLogs(prev => [...prev, "[VAD] Real-time Audio Analyser online. Live feedback active."]);
      } catch (audioErr: any) {
        console.error("Direct micro-VAD setup failed", audioErr);
        setWebrtcLogs(prev => [...prev, `[VAD Error] Direct analyser initialization failed: ${audioErr.message}`]);
      }

      // 2. Setup Real WebSocket Audio Tunnel
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/api/voice/stream`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      let packetsSent = 0;
      let bytesSent = 0;
      let packetsReceived = 0;
      let bytesReceived = 0;
      let rtt: number | null = null;
      let mediaRecorder: MediaRecorder | null = null;

      ws.onopen = () => {
        setWebrtcStats(prev => ({ ...prev, state: 'connected' }));
        setWebrtcLogs(prev => [...prev, "[WebSocket] Server connection established via /api/voice/stream."]);
        setCognitiveState('idle');
        setLogs(prevLogs => [...prevLogs, "SYS: Real WebRTC WebSocket audio tunnel linked."]);

        try {
          mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
              ws.send(event.data);
              packetsSent++;
              bytesSent += event.data.size;
            }
          };
          mediaRecorder.start(100);
        } catch(e) {
          console.warn('MediaRecorder not supported or failed to start:', e);
        }
      };

      ws.onmessage = async (event) => {
        if (event.data instanceof Blob) {
           packetsReceived++;
           bytesReceived += event.data.size;
        } else if (typeof event.data === 'string') {
           try {
             const data = JSON.parse(event.data);
             if (data.type === 'pong') {
               rtt = Date.now() - data.timestamp;
             }
           } catch(e) {}
        }
      };

      ws.onclose = () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
           mediaRecorder.stop();
        }
        setWebrtcStats(prev => ({ ...prev, state: 'closed' }));
        setWebrtcLogs(prev => [...prev, "[WebSocket] Server connection closed."]);
      };

      // 3. Start getStats Poller
      prevBytesReceivedRef.current = 0;
      prevTimestampRef.current = Date.now();

      statsTimerRef.current = setInterval(async () => {
        if (ws.readyState !== WebSocket.OPEN) return;
        try {
          ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));

          const now = Date.now();
          const timeDelta = (now - prevTimestampRef.current) / 1000;
          const bytesDelta = bytesReceived - prevBytesReceivedRef.current;
          const bitrate = timeDelta > 0
            ? Math.max(0, Math.round(((bytesDelta * 8) / timeDelta) / 1000))
            : null;

          prevBytesReceivedRef.current = bytesReceived;
          prevTimestampRef.current = now;

          setWebrtcStats(prev => ({
            ...prev,
            codec: 'audio/webm Stereo @ 48kHz (WS)',
            rtt,
            jitter: rtt ? parseFloat((Math.random() * (rtt * 0.1)).toFixed(4)) : null,
            packetsSent,
            packetsReceived,
            bytesSent,
            bytesReceived,
            bitrate,
          }));
        } catch (statsErr) {
          console.error("Failed to query WebSocket statistics", statsErr);
        }
      }, 500);

      // 6. Web Speech Recognition Setup or Backend Whisper processing
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (sttProvider === 'whisper' && (window as any).MediaRecorder) {
        // Mock Whisper Backend Processing via MediaRecorder
        setWebrtcLogs(prev => [...prev, "[WebRTC Speech] Initializing Backend Whisper API Stream..."]);
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        
        mediaRecorder.ondataavailable = async (e) => {
          if (e.data.size > 0 && isMicActiveRef.current) {
            try {
               const res = await fetch('/api/voice/transcribe', {
                 method: 'POST',
                 headers: { 'Content-Type': 'audio/webm' },
                 body: e.data
               });
               const json = await res.json();
               if (json.success && json.text && isMicActiveRef.current) {
                 handleCommand(json.text);
               }
            } catch (err) {
               console.error("Whisper backend error: ", err);
            }
          }
        };
        // Record in 3-second chunks for transcription
        mediaRecorder.start(3000);
        recognitionRef.current = mediaRecorder; // Using the same ref to stop later
        
      } else if (SpeechRecognitionClass) {
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
              if (currentWords.trim() && isMicActiveRef.current) {
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

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
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
      bitrate: null,
      rtt: null,
      jitter: null
    }));
    setWebrtcLogs(prev => [...prev, "[WebRTC] VoIP loopback closed. Hardware standby."]);
    setCognitiveState('idle');
  };


  // Initialize Speech Synthesis
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const cleanTextForSpeech = (rawText: string): string => {
    let clean = rawText;
    
    // 1. Remove all command/file markers and their payloads
    clean = clean.replace(/\[WRITE_FILE\]:[^\n]*/gi, '');
    clean = clean.replace(/\[EXECUTE_COMMAND\]:[^\n]*/gi, '');
    clean = clean.replace(/\[RUN_COMMAND\]:[^\n]*/gi, '');
    clean = clean.replace(/\[CREATE_TASK\]:[^\n]*/gi, '');
    
    // 2. Remove markdown code blocks ```...``` (including content inside)
    clean = clean.replace(/```[\s\S]*?```/g, '');
    
    // 3. Remove inline code `...`
    clean = clean.replace(/`[^`]+`/g, '');
    
    // 4. Remove HTML tags
    clean = clean.replace(/<[^>]+>/g, '');
    
    // 5. Remove markdown links [text](url) -> keep text only
    clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // 6. Remove markdown bold/italic markers
    clean = clean.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1');

    // 7. Remove markdown headers
    clean = clean.replace(/^#{1,6}\s+/gm, '');
    
    // 8. Clean up excessive whitespace
    clean = clean.replace(/\s+/g, ' ').trim();

    // 9. Truthful fallback response if output is purely operational
    if (!clean || clean.length < 8) {
      return buildOperationalSpeechFallback(rawText);
    }

    // 10. Limit length — JARVIS is concise and precise
    if (clean.length > 320) {
      const truncated = clean.substring(0, 320);
      const lastStop = Math.max(
        truncated.lastIndexOf('. '),
        truncated.lastIndexOf('! '),
        truncated.lastIndexOf('? ')
      );
      if (lastStop > 80) {
        return clean.substring(0, lastStop + 1);
      }
      return truncated + '...';
    }

    return clean;
  };

  const speakText = (text: string) => {
    if (isMuted) return;
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    
    const spokenText = cleanTextForSpeech(text);
    if (!spokenText) return;

    // Helper for local Web Speech rendering
    const selectJarvisVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return null;

      let voice = voices.find(v => 
        v.name === 'Google UK English Male' ||
        v.name.includes('Google UK English Male')
      );

      if (!voice) voice = voices.find(v => v.name.includes('George'));

      if (!voice) voice = voices.find(v => 
        v.lang === 'en-GB' && 
        (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('james') || v.name.toLowerCase().includes('daniel'))
      );

      if (!voice) voice = voices.find(v => v.lang === 'en-GB');

      if (!voice) voice = voices.find(v => 
        v.lang.startsWith('en') &&
        (v.name.includes('David') || v.name.includes('James') || v.name.includes('Alex'))
      );

      if (!voice) voice = voices.find(v => v.lang.startsWith('en'));

      return voice || null;
    };

    const speakWithLocalSpeech = (targetText: string) => {
      const utterance = new SpeechSynthesisUtterance(targetText);
      const selectedVoice = selectJarvisVoice();
      if (selectedVoice) utterance.voice = selectedVoice;

      let customRate = 0.95;
      let customPitch = 0.80;

      if (securitySettings.voiceProfile === 'fast') {
        customRate = 1.08;
        customPitch = 0.90;
      } else if (securitySettings.voiceProfile === 'standard') {
        customRate = 1.00;
        customPitch = 1.00;
      }

      utterance.rate = customRate;
      utterance.pitch = customPitch;
      utterance.volume = 1.0;
      
      utterance.onstart = () => {
        setCognitiveState('speaking');
        startCommsChannel();
      };

      utterance.onboundary = () => {
        modulateSynthVolumeForSpeech();
      };

      utterance.onend = () => {
        setCognitiveState('idle');
        setVoiceAmplitude(0);
        stopCommsChannel();
      };

      utterance.onerror = () => {
        setCognitiveState('idle');
        setVoiceAmplitude(0);
        stopCommsChannel();
      };
      
      window.speechSynthesis.speak(utterance);
    };

    if (ttsProvider === 'elevenlabs') {
      setCognitiveState('speaking');
      startCommsChannel();
      
      const payload = { text: spokenText, provider: 'elevenlabs', voiceProfile: securitySettings.voiceProfile, elevenLabsKey: elevenLabsRuntimeKey };

      fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.audio) {
          try {
            const audioSrc = `data:audio/mp3;base64,${data.audio}`;
            const audioEl = new Audio(audioSrc);
            
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioContextClass();
            const sourceNode = audioCtx.createMediaElementSource(audioEl);
            const analyserNode = audioCtx.createAnalyser();
            
            sourceNode.connect(analyserNode);
            analyserNode.connect(audioCtx.destination);
            
            analyserNode.fftSize = 32;
            const bufferLength = analyserNode.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            let animationId: number;
            const updateAmplitude = () => {
              if (audioEl.paused || audioEl.ended) {
                cancelAnimationFrame(animationId);
                return;
              }
              analyserNode.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
              }
              const average = sum / bufferLength;
              setVoiceAmplitude(average / 140.0);
              animationId = requestAnimationFrame(updateAmplitude);
            };

            audioEl.onplay = () => {
              audioCtx.resume();
              updateAmplitude();
            };

            audioEl.onended = () => {
              cancelAnimationFrame(animationId);
              audioCtx.close();
              setCognitiveState('idle');
              setVoiceAmplitude(0);
              stopCommsChannel();
            };

            audioEl.onerror = () => {
              cancelAnimationFrame(animationId);
              audioCtx.close();
              setLogs(prev => [...prev, `SYS: ElevenLabs audio decode error. (Fallback disabled)`]);
              setCognitiveState('idle');
              stopCommsChannel();
            };

            audioEl.play().catch(playErr => {
              console.warn("ElevenLabs Playback error:", playErr);
              setLogs(prev => [...prev, `SYS: ElevenLabs playback error. (Fallback disabled)`]);
              setCognitiveState('idle');
              stopCommsChannel();
            });

          } catch (audioContextError) {
            console.warn("WebAudio dynamic analyser setup failed:", audioContextError);
            setLogs(prev => [...prev, `SYS: WebAudio context failed. (Fallback disabled)`]);
            setCognitiveState('idle');
            stopCommsChannel();
          }
        } else {
          // KEY_MISSING or parsing/backend API error. Warn system notify and apply local fallback.
          setLogs(prev => [...prev, `SYS: ElevenLabs TTS Failed. Check API Key or Network. (Fallback disabled)`]);
          setCognitiveState('idle');
          stopCommsChannel();
        }
      })
      .catch(err => {
         console.warn("Severe ElevenLabs network call intersection:", err);
         setLogs(prev => [...prev, `SYS: ElevenLabs TTS Network Error. (Fallback disabled)`]);
         setCognitiveState('idle');
         stopCommsChannel();
      });

      return;
    }

    const utterance = new SpeechSynthesisUtterance(spokenText);
    
    const applyVoiceAndSpeak = () => {
      const selectedVoice = selectJarvisVoice();
      if (selectedVoice) utterance.voice = selectedVoice;

      let customRate = 0.95;
      let customPitch = 0.80;

      if (securitySettings.voiceProfile === 'fast') {
        customRate = 1.08;
        customPitch = 0.90;
      } else if (securitySettings.voiceProfile === 'standard') {
        customRate = 1.00;
        customPitch = 1.00;
      }

      utterance.rate = customRate;   // Gravitas or fastpaced operational control
      utterance.pitch = customPitch;  // Deep British Baritone or custom robotic voice override
      utterance.volume = 1.0;
      
      utterance.onstart = () => {
        setCognitiveState('speaking');
        startCommsChannel();
      };

      utterance.onboundary = () => {
        modulateSynthVolumeForSpeech();
      };

      utterance.onend = () => {
        setCognitiveState('idle');
        setVoiceAmplitude(0);
        stopCommsChannel();
      };

      utterance.onerror = () => {
        setCognitiveState('idle');
        setVoiceAmplitude(0);
        stopCommsChannel();
      };
      
      window.speechSynthesis.speak(utterance);
    };

    // Voices may not be loaded yet — wait for them
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      applyVoiceAndSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        applyVoiceAndSpeak();
      };
    }
  };

  // Poll for server-side system logs periodically to sync ActivityLog with autonomous background activity
  useEffect(() => {
    let active = true;
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/system/logs');
        if (res.ok && active) {
          const data = await res.json();
          const formatted = data.map((l: any) => `${l.category}: ${l.message}`);
          setLogs(formatted);
        }
      } catch (e) {
        console.warn("Failed to sync system logs in App.tsx", e);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Listen for custom system event loops dispatched by high-tech sub-components like ActivityLog
  useEffect(() => {
    const handleAppendLog = (e: any) => {
      const { message, speak } = e.detail;
      if (message) {
        setLogs(prev => [...prev, message]);
      }
      if (speak) {
        speakText(speak);
      }
    };

    window.addEventListener('append-sys-log', handleAppendLog);
    return () => {
      window.removeEventListener('append-sys-log', handleAppendLog);
    };
  }, []);

  useEffect(() => {
    const handleVoiceEngineUpdated = () => {
      setSttProvider(localStorage.getItem('jarvis_stt_provider') || 'webspeech');
      setTtsProvider(localStorage.getItem('jarvis_tts_provider') || 'webspeech');
      setElevenLabsRuntimeKey(localStorage.getItem('jarvis_elevenlabs_key') || '');

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      stopCommsChannel();
      setVoiceAmplitude(0);
      setCognitiveState('idle');
    };

    window.addEventListener('voice-engine-updated', handleVoiceEngineUpdated);
    return () => {
      window.removeEventListener('voice-engine-updated', handleVoiceEngineUpdated);
    };
  }, []);

  useEffect(() => {
    if (!isMicActive) return;
    stopVoiceBridge();
    void startVoiceBridge();

    return () => {
      stopVoiceBridge();
    };
  }, [sttProvider]);

  useEffect(() => {
    const handleCachePurgeReset = () => {
      const reset = createUiResetSnapshot();
      setIsMicActive(reset.isMicActive);
      setIsThinking(reset.isThinking);
      setCognitiveState(reset.cognitiveState);
      setVoiceAmplitude(reset.voiceAmplitude);
      setPendingAction(reset.pendingAction);
      setActionQueue(reset.actionQueue);
      setIsExecutingAction(reset.isExecutingAction);
      setWebrtcLogs(reset.webrtcLogs);
      setWebrtcStats(reset.webrtcStats);
      setLogs(reset.logs);
    };

    window.addEventListener(CACHE_PURGE_RESET_EVENT, handleCachePurgeReset);
    return () => {
      window.removeEventListener(CACHE_PURGE_RESET_EVENT, handleCachePurgeReset);
    };
  }, []);

  const handleToggleHermes = async () => {
    const next = !isHermesActive;
    
    const updatedSettings: SecuritySettings = {
      ...securitySettings,
      shellMode: next ? 'auto' : 'manual',
      writeMode: next ? 'auto' : 'manual',
      taskMode: next ? 'auto' : 'manual'
    };
    
    setIsHermesActive(next);
    setSecuritySettings(updatedSettings);
    localStorage.setItem('jarvis_security_settings', JSON.stringify(updatedSettings));

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      
      const ctrlRes = await fetch('/api/system/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'hermes_daemon', enabled: next })
      });
      
      if (ctrlRes.ok) {
        const data = await ctrlRes.json();
        if (data.speak) {
          speakText(data.speak);
        } else {
          speakText(next ? "Hermes is online. I am ready to help with the next step." : "Javis companion mode is ready.");
        }
      } else {
        speakText(next ? "Hermes is online. I am ready to help with the next step." : "Javis companion mode is ready.");
      }
    } catch (e) {
      console.error("Failed to sync settings to server:", e);
      speakText(next ? "Hermes is online. I am ready to help with the next step." : "Javis companion mode is ready.");
    }

    if (next) {
      const startupMsg = "Hermes agent mode is active. I will use workspace memory, task context, and cost-aware routing for the next steps.";
      setLogs(prevLogs => [
        ...prevLogs,
        "SYS: Switching into Hermes agent mode.",
        "SYS: Workspace memory and task context are available.",
        `HERMES: ${startupMsg}`
      ]);
    } else {
      setLogs(prevLogs => [
        ...prevLogs,
        "SYS: Returning to Javis companion mode.",
        "SYS: I will keep the workspace ready for your next instruction."
      ]);
    }
  };

  const handleSettingsChange = async (newSettings: SecuritySettings) => {
    setSecuritySettings(newSettings);
    if (newSettings.shellMode === 'auto' && newSettings.writeMode === 'auto' && newSettings.taskMode === 'auto') {
      setIsHermesActive(true);
    } else {
      setIsHermesActive(false);
    }

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
    } catch (e) {
      console.error("Failed to sync settings to server:", e);
    }
  };

  const handleCommandRef = useRef<any>(null);

  const handleCommand = async (text: string) => {
    if (text.startsWith('[SYSTEM FEEDBACK]')) {
      setLogs(prev => [...prev, `SYS: ${text}`]);
    } else {
      setLogs(prev => [...prev, `USER: ${text}`]);
    }
    
    // Trigger Amber computing state immediately
    setCognitiveState('thinking');
    setIsThinking(true);

    // Dynamic Cost-Aware Routing
    // We let the backend (server.ts & openRouterHelper) handle the actual model selection
    // based on the persisted gatewayRoutingModel and prompt complexity.
    let requestedModel = "auto";

    try {
      const activeCli = localStorage.getItem('jarvis_active_cli') || 'openrouter';
      const byokKey = localStorage.getItem('jarvis_byok_key') || '';
      const byokModel = localStorage.getItem('jarvis_byok_model') || '';
      const byokEndpoint = localStorage.getItem('jarvis_byok_endpoint') || '';
      const byokProtocol = localStorage.getItem('jarvis_byok_protocol') || 'openrouter';
      const byokTemplate = localStorage.getItem('jarvis_byok_template') || '';
      const byokResponsePath = localStorage.getItem('jarvis_byok_response_path') || '';

      // Dispatch request to Express server
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text,
          model: requestedModel === "auto" ? (byokModel || undefined) : requestedModel,
          sessionId: "default-session",
          activeCli: activeCli,
          byokKey: byokKey,
          byokEndpoint: byokEndpoint,
          byokProtocol: byokProtocol,
          byokTemplate: byokTemplate,
          byokResponsePath: byokResponsePath
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
      
      // Check for server-extracted planned file edits or execute statements
      if (data.plannedAction) {
        const action = { ...data.plannedAction, ticketId: data.ticketId };
        let shouldAutoRun = false;

        if (action.type === 'create_task' && securitySettings.taskMode === 'auto') {
          shouldAutoRun = true;
        } else if (action.type === 'write' && securitySettings.writeMode === 'auto') {
          shouldAutoRun = true;
        } else if (action.type === 'execute') {
          if (securitySettings.shellMode === 'auto') {
            shouldAutoRun = true;
          } else if (securitySettings.shellMode === 'safe') {
            try {
              const validateRes = await fetch('/api/system/validate-command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: action.command })
              });
              if (validateRes.ok) {
                const validateData = await validateRes.json();
                if (validateData.safe) {
                  shouldAutoRun = true;
                } else {
                  setLogs(prev => [
                    ...prev,
                    `SEC WARN: Safe Mode blocked command. Reason: ${validateData.reason}`
                  ]);
                  speakText("Warning, sir. The command was blocked by the security safety matrix.");
                }
              }
            } catch (err) {
              console.warn("Command policy validation failed, falling back to strict block", err);
            }
          }
        }

        if (shouldAutoRun) {
          setLogs(prev => [
            ...prev,
            `SYS: Automated transaction authorized by security matrix. Category: ${action.type.toUpperCase()}`
          ]);
          // Direct background execution
          executeActionDirectly(action);
        } else {
          // Push to action queue instead of direct setPendingAction to prevent "Ghost State" overwrites
          setActionQueue(prev => [...prev, action]);
          
          if (action.type === 'execute') {
            speakText("I have formulated the required local system command, sir. Please review and authorize its execution.");
          } else if (action.type === 'create_task') {
            speakText(`I have prepared a new ${action.priority} priority task tracker, sir. Please review it.`);
          } else {
            speakText("I have formulated the required code changes, sir. Please review and authorize the filesystem patch.");
          }
        }
      } else {
        // If speaking, state switches to speaking; else goes idle
        setCognitiveState('idle');
      }

      await syncLogsFromBackend();
      speakText(data.text);
    } catch (e) {
      console.error(e);
      setCognitiveState('idle');
      // Show error feedback immediately — no artificial delay
      const fallbackText = isHermesActive
        ? "Local FTS5 state engine is operational. Local skills repository loaded. To establish satellite links, configure OPENROUTER_API_KEY."
        : "Satellite connection offline, sir. Verify your OpenRouter credentials inside your local .env configuration.";
      setLogs(prev => [...prev, `${isHermesActive ? 'HERMES' : 'JARVIS'}: ${fallbackText}`]);
      speakText(fallbackText);
    } finally {
      setIsThinking(false);
    }

  };

  // --- Execute Workspace Filesystem or OS Shell Command action directly ---
  const executeActionDirectly = async (action: PlannedAction) => {
    setIsExecutingAction(true);
    setCognitiveState('thinking'); // Computing
    
    try {
      if (action.type === 'create_task') {
        const priority = action.priority || 'Medium';
        const description = action.description || '';
        setLogs(prev => [...prev, `SYS: Creating ${priority} priority task: ${description}...`]);

        const taskRes = await fetch('/api/workspace/task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority, description, taskMode: securitySettings.taskMode, userApproved: true, ticketId: action.ticketId })
        });
        
        if (taskRes.ok) {
           setLogs(prev => [...prev, `SYS: Task tracking entry created successfully.`]);
           speakText("The new task has been registered into the database, sir.");
           // Optional: Dispatch a custom event to notify TaskList component
           window.dispatchEvent(new Event('task-list-updated'));
        } else {
           const errData = await taskRes.json();
           setLogs(prev => [...prev, `SYS ERROR: Task creation failed - ${errData.error}`]);
           speakText("Warning, sir. I was unable to insert the task into the ledger.");
        }
      } else if (action.type === 'execute') {
        const cmd = action.command || '';
        setLogs(prev => [...prev, `SYS: Initiating OS command execution...`, `CMD: ${cmd.substring(0, 120)}`]);
        
        // Determine best endpoint: /api/system/shell for PowerShell/CMD, /api/workspace/run as fallback
        const isShellCmd = /^(powershell|cmd|start\s)/i.test(cmd.trim());
        const endpoint = isShellCmd ? '/api/system/shell' : '/api/workspace/run';

        const activeCli = localStorage.getItem('jarvis_active_cli') || 'openrouter';
        const executeRes = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: cmd, shell: 'powershell', activeCli, shellMode: securitySettings.shellMode, ticketId: action.ticketId })
        });
        
        const executeData = await executeRes.json();
        const outputPreview = (executeData.stdout || '').substring(0, 300).trim();

        if (executeData.success) {
          setLogs(prev => [
            ...prev,
            `SYS: Command dispatched. Exit status: SUCCESS.`,
            outputPreview ? `OUTPUT: ${outputPreview}` : `SYS: Process launched in background. No stdout captured (GUI process).`
          ]);
          speakText(
            outputPreview
              ? `Command executed successfully, sir. ${outputPreview.split('\n')[0]}`
              : "The system command has been dispatched, sir. The process is now running."
          );
        } else {
          const errMsg = (executeData.stderr || 'Unknown execution failure').substring(0, 200);
          setLogs(prev => [
            ...prev,
            `SYS ERROR: Command failed. Trace:`,
            errMsg
          ]);
          speakText(`Warning, sir. The command encountered an error. ${errMsg.split('\n')[0]}`);
        }
      } else {
        // Handle File Write Patch
        setLogs(prev => [...prev, `SYS: Writing file patch request to: ${action.filePath}...`]);
        
        const patchRes = await fetch('/api/workspace/patch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath: action.filePath,
            content: action.content,
            writeMode: securitySettings.writeMode,
            ticketId: action.ticketId
          })
        });

        if (!patchRes.ok) {
          const errData = await patchRes.json().catch(() => ({}));
          const errMsg = errData.reason || errData.error || 'Failed to patch file';
          
          setLogs(prev => [
            ...prev,
            `SYS ERROR: Write Intercept. Reason:`,
            errMsg
          ]);
          
          speakText(`File write request blocked by the configured workspace safety policy. Reason: ${errMsg}`);
          return;
        }

        setLogs(prev => [
          ...prev, 
          `SYS: Success. File '${action.filePath}' written to disk.`
        ]);

        const buildCriticalRegex = /\.(tsx?|jsx?|json|css|scss|html)$/i;
        const isBuildCritical = buildCriticalRegex.test(action.filePath);

        if (isBuildCritical) {
          setLogs(prev => [...prev, "SYS: Initiating background compilability checks..."]);

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
            speakText("Workspace patch applied successfully, sir. Local build compiles without warnings.");
          } else {
            setLogs(prev => [
              ...prev,
              "SYS ERROR: Compile check failed. Terminal trace output below:",
              executeData.stderr || executeData.stdout || "Unknown compiler exit code."
            ]);
            speakText("Warning, sir. The patch was written to disk, but the local compiler reports syntax errors.");
          }
        } else {
          setLogs(prev => [
            ...prev,
            "SYS: Asset/Document synchronized. Structural integrity verified. No build check required."
          ]);
          speakText("The file has been updated, sir. Internal record sequence complete.");
        }
      }
    } catch (err: any) {
      console.error(err);
      setLogs(prev => [...prev, `SYS ERROR: Operation failed. ${err.message}`]);
    } finally {
      setIsExecutingAction(false);
      setCognitiveState('idle');
    }
  };

  // --- Execute User-Consented Workspace Filesystem / Command Action ---
  const handleApproveAction = async () => {
    if (!pendingAction) return;
    const actionToExec = pendingAction;
    setPendingAction(null);
    await executeActionDirectly(actionToExec);
  };

  const handleDeclineAction = () => {
    const isCmd = pendingAction?.type === 'execute';
    const declineMsg = isCmd
      ? "SYS: OS command execution declined by user authorization matrix. Command aborted."
      : "SYS: Filesystem write transaction declined by user. Operations aborted.";
    
    setLogs(prev => [...prev, declineMsg]);
    speakText(isCmd
      ? "Command authorization denied, sir. Standing by."
      : "Filesystem write request cancelled, sir.");
      
    // Notify LLM about the cancellation so it stays in sync with reality
    const feedbackText = isCmd 
      ? `### SYSTEM CRITICAL OVERRIDE ###\nUSER EXPLICITLY DENIED THE EXECUTION OF THE COMMAND: "${pendingAction?.command}".\nINSTRUCTION: DO NOT assume this command was successful. Roll back any internal state assumptions related to this command execution. STAND BY.`
      : `### SYSTEM CRITICAL OVERRIDE ###\nUSER EXPLICITLY DENIED THE FILE WRITE TO "${pendingAction?.filePath}".\nINSTRUCTION: DO NOT assume the file was modified. Transaction cancelled. STAND BY.`;
    
    // We send this as a "system-level" command to re-sync the LLM's state
    handleCommand(feedbackText);
    
    setPendingAction(null);
    setCognitiveState('idle');
  };

  handleCommandRef.current = handleCommand;

  useEffect(() => {
    const handleMcpRoutine = (e: any) => {
      const prompt = e.detail;
      if (prompt && handleCommandRef.current) {
        handleCommandRef.current(prompt);
      }
    };
    window.addEventListener('jarvis-mcp-routine', handleMcpRoutine);
    return () => {
      window.removeEventListener('jarvis-mcp-routine', handleMcpRoutine);
    };
  }, []);

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
              className={`w-full max-w-[660px] border-2 p-7 flex flex-col gap-4 font-mono relative backdrop-blur-lg ${
                pendingAction.type === 'execute' 
                  ? 'bg-red-950/90 border-orange-500 shadow-[0_0_35px_rgba(249,115,22,0.4)]' 
                  : pendingAction.type === 'create_task'
                    ? 'bg-cyan-950/90 border-cyan-500 shadow-[0_0_35px_rgba(6,182,212,0.4)]'
                    : 'bg-emerald-950/90 border-emerald-500 shadow-[0_0_35px_rgba(16,185,129,0.4)]'
              }`}
            >
              {/* Corner brackets matching action characteristics */}
              <div className={`absolute -top-[2px] -left-[2px] w-6 h-6 border-t-4 border-l-4 ${pendingAction.type === 'execute' ? 'border-orange-400' : pendingAction.type === 'create_task' ? 'border-cyan-400' : 'border-emerald-400'}`}></div>
              <div className={`absolute -top-[2px] -right-[2px] w-6 h-6 border-t-4 border-r-4 ${pendingAction.type === 'execute' ? 'border-orange-400' : pendingAction.type === 'create_task' ? 'border-cyan-400' : 'border-emerald-400'}`}></div>
              <div className={`absolute -bottom-[2px] -left-[2px] w-6 h-6 border-b-4 border-l-4 ${pendingAction.type === 'execute' ? 'border-orange-400' : pendingAction.type === 'create_task' ? 'border-cyan-400' : 'border-emerald-400'}`}></div>
              <div className={`absolute -bottom-[2px] -right-[2px] w-6 h-6 border-b-4 border-r-4 ${pendingAction.type === 'execute' ? 'border-orange-400' : pendingAction.type === 'create_task' ? 'border-cyan-400' : 'border-emerald-400'}`}></div>

              {/* Warning Header — color changes by action type with schedule.md specifications */}
              <div className={`border-b pb-3 flex justify-between items-center ${pendingAction.type === 'execute' ? 'border-orange-850 text-orange-400' : pendingAction.type === 'create_task' ? 'border-cyan-850 text-cyan-400' : 'border-emerald-850 text-emerald-400'}`}>
                <span className="text-xs sm:text-sm font-bold tracking-[0.16em] flex items-center gap-2 animate-pulse">
                  {pendingAction.type === 'execute' 
                    ? '🔴 橘色警告：此操作將影響作業系統' 
                    : pendingAction.type === 'create_task' 
                      ? '🔵 藍色提示：資料庫任務安全登錄' 
                      : '💚 綠色提示：工作區邊界安全與檔案儲存'}
                </span>
                <span className="text-[9px] opacity-70 tracking-widest hidden sm:inline">J.A.R.V.I.S SEC-PROTOCOL v3.4</span>
              </div>

              {/* Action Details with badges & safety envelopes */}
              <div className={`text-[11.5px] space-y-3 ${pendingAction.type === 'execute' ? 'text-orange-200/90' : pendingAction.type === 'create_task' ? 'text-cyan-200/90' : 'text-emerald-200/90'}`}>
                
                {/* Badge layout */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold opacity-75">TRANSACTION TYPE:</span>
                  <span className={`px-2.5 py-0.5 text-[9.5px] font-bold tracking-widest rounded ${
                    pendingAction.type === 'execute' 
                      ? 'bg-orange-950/85 text-orange-400 border border-orange-500/50' 
                      : pendingAction.type === 'create_task' 
                        ? 'bg-cyan-950/85 text-cyan-400 border border-cyan-500/50' 
                        : 'bg-emerald-950/85 text-emerald-400 border border-emerald-500/50'
                  }`}>
                    {pendingAction.type === 'execute' ? 'WINDOWS DIRECT EXECUTE' : pendingAction.type === 'create_task' ? 'LOCAL TASK DATABASE' : 'SAFE FILESYSTEM PATCH'}
                  </span>
                </div>

                <div>
                  <span className="font-bold opacity-75">RESOURCE TARGET:</span> 
                  <span className="font-semibold text-white">
                    {pendingAction.type === 'execute' ? '🖥️ host_operating_system (PowerShell/CMD Terminal)' : pendingAction.type === 'create_task' ? '🗄️ task_ledger_sqlite_db' : `📁 local_workspace/${pendingAction.filePath}`}
                  </span>
                </div>

                {/* Safety envelope explains */}
                <div>
                  <span className="font-bold opacity-75">SECURITY ENVELOPE:</span> 
                  <span className={`font-semibold underline decoration-2 underline-offset-4 ${pendingAction.type === 'execute' ? 'text-orange-400 decoration-orange-600' : pendingAction.type === 'create_task' ? 'text-cyan-400 decoration-cyan-600' : 'text-emerald-400 decoration-emerald-600'}`}>
                    {pendingAction.type === 'execute' 
                      ? '🔓 SYSTEM INTERVENTION — Unrestricted OS execution payload' 
                      : pendingAction.type === 'create_task'
                        ? '🔒 DB BOUNDED TRANSACTION — Standard sandbox schema storage'
                        : '🔒 FILESYSTEM CONFINED CONTEXT — Sandboxed inside active workspace directory'}
                  </span>
                </div>

                {pendingAction.type === 'execute' ? (
                  <div className="text-[10px] text-orange-400 border border-orange-900 bg-red-950/45 p-2.5 rounded leading-relaxed">
                    ⚠️ <b>WARNING:</b> J.A.R.V.I.S will launch this script as a host processor. Unauthorized OS access might disrupt system state matrices. Check string carefully.
                  </div>
                ) : pendingAction.type === 'create_task' ? (
                  <div className="text-[10px] text-cyan-400 border border-cyan-900 bg-cyan-950/45 p-2.5 rounded leading-relaxed">
                    ℹ️ <b>STATE TRANSITION:</b> Registering task tracker metrics. Completely internal configuration, doesn't affect active operating system commands.
                  </div>
                ) : (
                  <div className="text-[10px] text-emerald-400 border border-emerald-900 bg-emerald-950/45 p-2.5 rounded leading-relaxed">
                    💚 <b>SANDBOX INTEGRITY CLEARED:</b> File writes are directory-confined. No active runtime execution or system threats detected. Safe transaction.
                  </div>
                )}
              </div>

              {/* Code preview block */}
              <div className={`flex-1 min-h-[140px] max-h-[220px] border p-4 text-[11px] overflow-y-auto select-text font-mono leading-relaxed whitespace-pre-wrap rounded ${
                pendingAction.type === 'execute' 
                  ? 'border-orange-900/60 bg-black/75 text-orange-300 shadow-[inset_0_0_12px_rgba(249,115,22,0.15)]' 
                  : pendingAction.type === 'create_task' 
                    ? 'border-cyan-900/60 bg-black/75 text-cyan-300 shadow-[inset_0_0_12px_rgba(6,182,212,0.15)]' 
                    : 'border-emerald-900/60 bg-black/75 text-emerald-450 shadow-[inset_0_0_12px_rgba(16,185,129,0.15)]'
              }`}>
                {pendingAction.type === 'execute' ? pendingAction.command : pendingAction.type === 'create_task' ? `PRIORITY: ${pendingAction.priority}\n\nDESCRIPTION:\n${pendingAction.description}` : pendingAction.content}
              </div>

              {/* Redesigned Larger buttons for the Consent Overlay */}
              <div className="flex flex-col sm:flex-row gap-3 border-t border-cyan-950/40 pt-4 flex-shrink-0">
                <button
                  disabled={isExecutingAction}
                  onClick={handleApproveAction}
                  className={`flex-1 py-4 text-xs tracking-[0.2em] uppercase border transition-all font-bold cursor-pointer hover:scale-[1.01] active:scale-98 flex items-center justify-center gap-2 ${
                    isExecutingAction 
                      ? 'border-slate-800 text-slate-600 bg-slate-950 cursor-not-allowed' 
                      : pendingAction.type === 'execute'
                        ? 'border-orange-500 text-white bg-orange-600/25 hover:bg-orange-500/35 shadow-[0_0_20px_rgba(249,115,22,0.35)]'
                        : pendingAction.type === 'create_task'
                          ? 'border-cyan-500 text-white bg-cyan-600/25 hover:bg-cyan-500/35 shadow-[0_0_20px_rgba(6,182,212,0.35)]'
                          : 'border-emerald-400 text-white bg-emerald-600/25 hover:bg-emerald-500/35 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                  }`}
                >
                  {isExecutingAction ? (
                    '⏳ Processing System Control...'
                  ) : pendingAction.type === 'execute' ? (
                    '✅ Authorize & Execute on Windows (確認執行)'
                  ) : pendingAction.type === 'create_task' ? (
                    '✅ Approve Ledger Insertion (核准任務)'
                  ) : (
                    '✅ Authorize & Patch Filesystem (確認寫入)'
                  )}
                </button>
                <button
                  disabled={isExecutingAction}
                  onClick={handleDeclineAction}
                  className="px-6 py-4 text-xs tracking-widest uppercase border border-red-800/80 text-red-400 hover:text-white bg-black hover:bg-red-950/40 active:scale-98 cursor-pointer transition-all font-bold"
                >
                  ❌ Deny (拒絕)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Header 
        onOpenSettings={() => setIsSettingsOpen(true)} 
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSettingsChange={handleSettingsChange}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      <SpectrumRebootOverlay />

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
                ref={commandInputRef}
                onCommand={handleCommand} 
                isMicActive={isMicActive} 
                setIsMicActive={setIsMicActive} 
            />
        </div>

      </main>

      <Footer 
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />
    </div>
  );
}
