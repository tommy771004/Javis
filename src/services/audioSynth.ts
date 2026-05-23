/**
 * J.A.R.V.I.S / HERMES High-Fidelity Tactical Audio Synthesis Engine
 * Powered by HTML5 Web Audio API.
 * Provides custom DSP effects, sci-fi chime sweeps, bandpass-filtered noise matrices,
 * dynamic delay lines, and cockpit radio transmitters to simulate tech-suit resonance.
 */

let audioCtx: AudioContext | null = null;
let masterAnalyser: AnalyserNode | null = null;

// Audio parameters caching for voice/bridge settings
let lowpassFilter: BiquadFilterNode | null = null;
let delayNode: DelayNode | null = null;
let delayFeedback: GainNode | null = null;
let humNode: OscillatorNode | null = null;
let noiseNode: AudioWorkletNode | ScriptProcessorNode | null = null;
let carrierGain: GainNode | null = null;

function isMutedLocally(): boolean {
  try {
    return localStorage.getItem('jarvis_is_muted') === 'true';
  } catch (e) {
    return false;
  }
}

export function getMasterAnalyser(): AnalyserNode | null {
  if (!audioCtx) {
    try {
      getAudioContext();
    } catch (e) {
      return null;
    }
  }
  return masterAnalyser;
}

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (!masterAnalyser) {
    masterAnalyser = audioCtx.createAnalyser();
    masterAnalyser.fftSize = 128; // standard FFT size for fast voice/hologram wave mapping
    masterAnalyser.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a high-tech holographic calibration sound.
 * Features: dual sine sweeps, dynamic bandpass filter sweep, echo/delay, and a sub-drop resonance frequency.
 */
export function playCalibrationSynth() {
  if (isMutedLocally()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Output node with master volume limit
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.22, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    masterGain.connect(masterAnalyser || ctx.destination);

    // Biquad Bandpass Filter with narrow resonance
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(8, now);
    filter.frequency.setValueAtTime(100, now);
    // Dynamic sweep up and back down
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.3);
    filter.frequency.exponentialRampToValueAtTime(250, now + 1.2);
    filter.connect(masterGain);

    // Feedback Delay Line
    const delay = ctx.createDelay();
    delay.delayTime.setValueAtTime(0.18, now);
    const feedback = ctx.createGain();
    feedback.gain.setValueAtTime(0.45, now);

    // Connect delay ring
    filter.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(masterGain);

    // Primary Oscillator (Swept Frequency Saws/Sine combo)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(80, now);
    osc1.frequency.exponentialRampToValueAtTime(1800, now + 0.35);
    osc1.frequency.exponentialRampToValueAtTime(50, now + 1.2);

    // Sub-harmonic Oscillator for deep reactor thrum
    const oscSub = ctx.createOscillator();
    oscSub.type = 'sine';
    oscSub.frequency.setValueAtTime(40, now);
    oscSub.frequency.exponentialRampToValueAtTime(90, now + 0.4);
    oscSub.frequency.exponentialRampToValueAtTime(30, now + 1.5);

    const synthGain = ctx.createGain();
    synthGain.gain.setValueAtTime(0.2, now);
    synthGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

    osc1.connect(synthGain);
    oscSub.connect(synthGain);
    synthGain.connect(filter);

    osc1.start(now);
    oscSub.start(now);
    osc1.stop(now + 1.8);
    oscSub.stop(now + 1.8);
  } catch (err) {
    console.warn("Audio synthesis engine failover omitted: ", err);
  }
}

/**
 * Starts a background high-tech "suit transmitter carrier channel"
 * simulating pilot radio link, military-grade intercom and low frequency electromagnetic pilot tones.
 */
export function startCommsChannel() {
  if (isMutedLocally()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Clean up existing if lingering
    stopCommsChannel();

    // Sound alert beep (Start-of-comms mic snap and chirp)
    playChime('start');

    // Establish carrier gain
    carrierGain = ctx.createGain();
    // Low baseline audio gain to avoid excessive distraction
    carrierGain.gain.setValueAtTime(0.06, now);
    carrierGain.connect(masterAnalyser || ctx.destination);

    // Lowpass filter configuration matching armored communication DSP specs (cockpit voice spectrum)
    lowpassFilter = ctx.createBiquadFilter();
    lowpassFilter.type = 'bandpass';
    lowpassFilter.frequency.setValueAtTime(1200, now); // mid-range focus
    lowpassFilter.Q.setValueAtTime(1.5, now);
    lowpassFilter.connect(carrierGain);

    // Create a 50Hz sub-carrier hum for continuous reactor presence
    humNode = ctx.createOscillator();
    humNode.type = 'sine';
    humNode.frequency.setValueAtTime(55, now);
    
    // Add subtle LFO frequency mod to cockpit hum node (shimmer)
    const humLFO = ctx.createOscillator();
    humLFO.type = 'sine';
    humLFO.frequency.setValueAtTime(3.5, now);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(2.0, now);
    humLFO.connect(lfoGain);
    lfoGain.connect(humNode.frequency);
    
    const humGain = ctx.createGain();
    humGain.gain.setValueAtTime(0.2, now);
    
    humNode.connect(humGain);
    humGain.connect(lowpassFilter);

    // Create cockpit white noise floor static
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoiseSource = ctx.createBufferSource();
    whiteNoiseSource.buffer = noiseBuffer;
    whiteNoiseSource.loop = true;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.005, now); // extreme low rumble background static

    whiteNoiseSource.connect(noiseGain);
    noiseGain.connect(lowpassFilter);

    // Spark delay feedback line
    delayNode = ctx.createDelay(1.0);
    delayNode.delayTime.setValueAtTime(0.12, now);
    delayFeedback = ctx.createGain();
    delayFeedback.gain.setValueAtTime(0.15, now); // echo level
    
    lowpassFilter.connect(delayNode);
    delayNode.connect(delayFeedback);
    delayFeedback.connect(carrierGain); // feedback feeds master and wraps delay

    // Activate oscillators and noise nodes
    humLFO.start(now);
    humNode.start(now);
    whiteNoiseSource.start(now);

    // Cache nodes for termination
    (humNode as any).lfo = humLFO;
    (humNode as any).noise = whiteNoiseSource;
  } catch (err) {
    console.warn("Comms channel creation failover ignored", err);
  }
}

/**
 * Terminates the background radio sub-channel and emits an intercom squelch cut-off click.
 */
export function stopCommsChannel() {
  try {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    // Play walkie talkie cut click sound (Squelch)
    if (carrierGain) {
      playChime('stop');
    }

    // Stop active carrier hum and noise loop source
    if (humNode) {
      try {
        humNode.stop(now);
        if ((humNode as any).lfo) (humNode as any).lfo.stop(now);
        if ((humNode as any).noise) (humNode as any).noise.stop(now);
      } catch (e) {}
      humNode = null;
    }

    if (carrierGain) {
      // Fade out cleanly
      carrierGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      setTimeout(() => {
        try {
          if (carrierGain) carrierGain.disconnect();
          carrierGain = null;
        } catch (e) {}
      }, 300);
    }
  } catch (err) {
    console.warn("Failed stopping voice channel correctly", err);
  }
}

/**
 * Dynamic chimes synthesizer utilizing clean double sine wave ringing
 */
function playChime(type: 'start' | 'stop') {
  if (isMutedLocally()) return;
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(type === 'start' ? 0.08 : 0.04, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + (type === 'start' ? 0.35 : 0.2));
  gain.connect(masterAnalyser || audioCtx.destination);

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(type === 'start' ? 1800 : 800, now);
  filter.Q.setValueAtTime(5, now);
  filter.connect(gain);

  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();

  if (type === 'start') {
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.setValueAtTime(1760, now + 0.06); // A6 Double beep
    osc2.frequency.setValueAtTime(1320, now); // E6
    osc2.frequency.setValueAtTime(2640, now + 0.06);
    osc1.type = 'triangle';
    osc2.type = 'sine';
  } else {
    // Squelch static crunch + tone drop
    osc1.frequency.setValueAtTime(440, now);
    osc1.frequency.exponentialRampToValueAtTime(220, now + 0.15);
    osc2.frequency.setValueAtTime(320, now);
    osc2.frequency.exponentialRampToValueAtTime(110, now + 0.1);
    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
  }

  osc1.connect(filter);
  osc2.connect(filter);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.4);
  osc2.stop(now + 0.4);
}

/**
 * Play a high tech tactile button click chime.
 */
export function playTactileClick() {
  if (isMutedLocally()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.05, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    clickGain.connect(masterAnalyser || ctx.destination);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(3200, now);
    bp.Q.setValueAtTime(10, now);
    bp.connect(clickGain);

    const pulse = ctx.createOscillator();
    pulse.type = 'triangle';
    pulse.frequency.setValueAtTime(800, now);
    pulse.frequency.exponentialRampToValueAtTime(4000, now + 0.03);

    pulse.connect(bp);
    pulse.start(now);
    pulse.stop(now + 0.08);
  } catch (e) {}
}

/**
 * Modulate carrier synthesizer properties when speech boundaries are passed.
 * Captures real physical peaks/valleys inside Web Audio Analyser node.
 */
export function modulateSynthVolumeForSpeech() {
  if (!audioCtx || !carrierGain) return;
  const now = audioCtx.currentTime;
  try {
    carrierGain.gain.cancelScheduledValues(now);
    carrierGain.gain.setValueAtTime(0.06, now);
    carrierGain.gain.exponentialRampToValueAtTime(0.24, now + 0.04); // vocal burst spike
    carrierGain.gain.exponentialRampToValueAtTime(0.06, now + 0.25); // fade back
    
    if (humNode) {
      humNode.frequency.cancelScheduledValues(now);
      humNode.frequency.setValueAtTime(55, now);
      humNode.frequency.linearRampToValueAtTime(70 + Math.random() * 110, now + 0.04); // high pitch formant accentuation
      humNode.frequency.exponentialRampToValueAtTime(55, now + 0.25);
    }
  } catch (e) {}
}
