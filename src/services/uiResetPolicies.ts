import type { CognitiveState } from '../components/CenterVisualizer';

export const CACHE_PURGE_RESET_EVENT = 'jarvis-cache-purged';

export interface WebRtcStatsSnapshot {
  state: string;
  codec: string;
  rtt: number | null;
  jitter: number | null;
  packetsSent: number;
  packetsReceived: number;
  bytesSent: number;
  bytesReceived: number;
  bitrate: number | null;
  offerSdp: string;
  answerSdp: string;
}

export interface UiResetSnapshot {
  logs: string[];
  cognitiveState: CognitiveState;
  voiceAmplitude: number;
  isThinking: boolean;
  isMicActive: boolean;
  pendingAction: null;
  actionQueue: [];
  isExecutingAction: boolean;
  webrtcLogs: string[];
  webrtcStats: WebRtcStatsSnapshot;
}

export function createInitialWebRtcStats(): WebRtcStatsSnapshot {
  return {
    state: 'idle',
    codec: '',
    rtt: null,
    jitter: null,
    packetsSent: 0,
    packetsReceived: 0,
    bytesSent: 0,
    bytesReceived: 0,
    bitrate: null,
    offerSdp: '',
    answerSdp: '',
  };
}

export function createUiResetSnapshot(): UiResetSnapshot {
  return {
    logs: [],
    cognitiveState: 'idle',
    voiceAmplitude: 0,
    isThinking: false,
    isMicActive: false,
    pendingAction: null,
    actionQueue: [],
    isExecutingAction: false,
    webrtcLogs: [],
    webrtcStats: createInitialWebRtcStats(),
  };
}
