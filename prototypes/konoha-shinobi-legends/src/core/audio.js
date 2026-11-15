/**
 * audio.js — efeitos sonoros sintetizados com WebAudio (sem arquivos externos).
 * O áudio só começa depois de uma interação do usuário (exigência dos navegadores).
 */

let context = null;
let muted = false;

function ctx() {
  if (muted) return null;
  if (!context) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    context = new AudioCtx();
  }
  if (context.state === 'suspended') context.resume().catch(() => {});
  return context;
}

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

/** Tom simples com envelope. */
function tone({ freq = 220, duration = 0.15, type = 'sine', gain = 0.12, slideTo = null, delay = 0 }) {
  const audio = ctx();
  if (!audio) return;
  const start = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), start + duration);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(amp).connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

/** Ruído curto (impacto). */
function noise({ duration = 0.18, gain = 0.16, filterFreq = 900, delay = 0 }) {
  const audio = ctx();
  if (!audio) return;
  const start = audio.currentTime + delay;
  const samples = Math.floor(audio.sampleRate * duration);
  const buffer = audio.createBuffer(1, samples, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < samples; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / samples) ** 2;
  }
  const source = audio.createBufferSource();
  source.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const amp = audio.createGain();
  amp.gain.value = gain;
  source.connect(filter).connect(amp).connect(audio.destination);
  source.start(start);
}

export const sfx = {
  click: () => tone({ freq: 620, duration: 0.06, type: 'triangle', gain: 0.05 }),
  hover: () => tone({ freq: 880, duration: 0.04, type: 'sine', gain: 0.025 }),
  hit: () => {
    noise({ duration: 0.12, gain: 0.12, filterFreq: 1200 });
    tone({ freq: 180, duration: 0.1, type: 'square', gain: 0.05, slideTo: 90 });
  },
  crit: () => {
    noise({ duration: 0.22, gain: 0.2, filterFreq: 2400 });
    tone({ freq: 320, duration: 0.16, type: 'sawtooth', gain: 0.07, slideTo: 110 });
  },
  jutsu: () => {
    tone({ freq: 300, duration: 0.28, type: 'triangle', gain: 0.08, slideTo: 720 });
    noise({ duration: 0.2, gain: 0.06, filterFreq: 1800, delay: 0.05 });
  },
  combo: () => {
    [0, 0.07, 0.14].forEach((delay, index) => {
      tone({ freq: 420 + index * 160, duration: 0.1, type: 'square', gain: 0.05, delay });
    });
  },
  heal: () => {
    tone({ freq: 520, duration: 0.22, type: 'sine', gain: 0.07, slideTo: 780 });
  },
  victory: () => {
    [523, 659, 784, 1046].forEach((freq, index) => {
      tone({ freq, duration: 0.4, type: 'triangle', gain: 0.08, delay: index * 0.13 });
    });
  },
  defeat: () => {
    [392, 330, 262, 196].forEach((freq, index) => {
      tone({ freq, duration: 0.45, type: 'sine', gain: 0.08, delay: index * 0.14 });
    });
  },
  summon: () => {
    [0, 0.1, 0.2, 0.3].forEach((delay, index) => {
      tone({ freq: 260 + index * 140, duration: 0.3, type: 'triangle', gain: 0.06, delay });
    });
    noise({ duration: 0.5, gain: 0.05, filterFreq: 3000, delay: 0.1 });
  },
  levelUp: () => {
    [523, 784, 1046].forEach((freq, index) => {
      tone({ freq, duration: 0.35, type: 'sine', gain: 0.09, delay: index * 0.11 });
    });
  },
};
