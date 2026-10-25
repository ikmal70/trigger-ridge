// Chiptune sound effects synthesized with the Web Audio API (no audio files).
const Sfx = (() => {
  let ctx = null, master = null, noiseBuf = null;

  // Browsers only allow audio after a user gesture, so this runs on the first key press.
  function init() {
    if (ctx) return ctx.resume();
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.25;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function tone(type, f0, f1, dur, vol = 1, delay = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur);
  }

  function noise(dur, vol = 1, f0 = 4000, f1 = 500, delay = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    f.type = 'bandpass';
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(master);
    s.start(t);
    s.stop(t + dur);
  }

  const arp = (type, notes, len, gap, vol) => notes.forEach((f, i) => tone(type, f, f * 0.99, len, vol, i * gap));

  const sounds = {
    jump: () => tone('square', 220, 520, 0.12, 0.4),
    land: () => noise(0.06, 0.35, 800, 200),
    slash: () => noise(0.09, 0.8, 6000, 1500),
    heavy: () => { noise(0.18, 1, 3000, 300); tone('sawtooth', 160, 60, 0.16, 0.35); },
    gun: () => { noise(0.07, 0.9, 3000, 500); tone('square', 220, 60, 0.05, 0.3); },
    step: () => noise(0.04, 0.25, 700, 250),
    switch: () => { tone('square', 400, 900, 0.05, 0.3); noise(0.04, 0.4, 6000, 3000, 0.04); },
    tick: () => tone('square', 900, 600, 0.03, 0.2),
    jet: () => noise(0.14, 0.3, 300, 900),
    jetOn: () => { noise(0.25, 0.6, 200, 2000); tone('sawtooth', 90, 180, 0.2, 0.25); },
    jetOff: () => noise(0.15, 0.4, 1200, 200),
    djump: () => { noise(0.12, 0.6, 400, 2500); tone('square', 300, 700, 0.1, 0.3); },
    hit: () => { tone('square', 180, 50, 0.1, 0.55); noise(0.08, 0.6, 2500, 400); },
    kill: () => { noise(0.3, 0.9, 2000, 100); tone('square', 300, 40, 0.25, 0.45); },
    dash: () => noise(0.14, 0.6, 1000, 5000),
    hurt: () => { tone('sawtooth', 400, 80, 0.25, 0.55); noise(0.15, 0.5, 1500, 300); },
    swing: () => noise(0.25, 0.7, 400, 2500),
    orb: () => tone('sine', 300, 700, 0.2, 0.4),
    bloom: () => { noise(0.15, 0.5, 5000, 2000); tone('triangle', 800, 1200, 0.12, 0.35); },
    heal: () => arp('square', [659, 784, 1047], 0.08, 0.06, 0.35),
    splash: () => noise(0.35, 0.8, 1500, 300),
    pogo: () => { tone('square', 300, 700, 0.1, 0.45); noise(0.05, 0.5, 4000, 2000); },
    checkpoint: () => arp('triangle', [523, 659, 784, 1047], 0.15, 0.08, 0.5),
    die: () => arp('square', [392, 330, 262, 196], 0.25, 0.18, 0.45),
    clear: () => arp('square', [523, 659, 784, 1047, 784, 1047], 0.14, 0.1, 0.4),
    select: () => tone('square', 880, 880, 0.06, 0.35),
  };

  return { init, play: name => sounds[name]() };
})();
