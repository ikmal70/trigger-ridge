// Daytime mountain vista, far to near: sky with cloud banks and birds, three layers of a mountain
// chain fading into haze (the middle one holds a giant craggy peak), a forested valley with a
// winding river, and a dense pine ridge. Petals and fireflies drift in front of everything.
const Background = (() => {
  const LW = 768; // layer width; every layer tiles seamlessly at this width
  const R = rng(2024);
  const layer = () => { const c = makeCanvas(LW, H); return [c, c.getContext('2d')]; };
  // Draw at x, repeated across the seam so the layer tiles.
  const wrap = (fn, x) => { fn(x); if (x < 90) fn(x + LW); if (x > LW - 90) fn(x - LW); };
  const veil = (x, col, a, y0, y1 = H) => { x.globalAlpha = a; px(x, col, 0, y0, LW, y1 - y0); x.globalAlpha = 1; };
  const wave = (i, ...terms) => terms.reduce((s, [amp, per, ph]) => s + amp * Math.sin(i / LW * Math.PI * 2 * per + ph), 0);

  // ---- sky (fixed): bright toward the horizon, soft sun glow upper left
  const sky = makeCanvas(W, H), s = sky.getContext('2d');
  skyGrad(s, ['#3a78d6', '#5294e2', '#78b4ee', '#a2d0f4', '#cce6f8', '#eef8fc']);
  for (const [r, a] of [[60, 0.12], [40, 0.18], [24, 0.3]]) { s.globalAlpha = a; circ(s, '#fffbe6', 64, 34, r); }
  s.globalAlpha = 1;
  circ(s, '#fffef4', 64, 34, 11);

  // ---- cloud banks (drift on their own)
  const [clouds, cl] = layer();
  for (const [cx, cy, w, seed] of [[80, 40, 90, 1], [300, 22, 60, 2], [470, 54, 110, 3], [650, 30, 70, 4], [210, 70, 50, 5], [720, 76, 40, 6]])
    wrap(x => cloudBank(cl, x, cy, w, seed), cx);

  // ---- far chain: palest, snowy, low contrast
  const [far1, f1] = layer();
  peakRange(f1, LW, 132, makePeaks(LW, 8, 11, 44, 74, 90, 140, 22),
    { haze: '#d4e8f8', lit: '#c0d6f0', litMid: '#b4cceb', litHi: '#ccdff4', shade: '#a2bce2', shadeMid: '#96b2dc', litCrack: '#a8c2e6', crack: '#8aa8d4', ridge: '#e6f2fc', snow: '#ffffff', snowShade: '#dce8f8' });

  // ---- middle chain with the giant peak and its spires
  const [far2, f2] = layer();
  peakRange(f2, LW, 142, makePeaks(LW, 7, 23, 38, 64, 80, 130, 14),
    { haze: '#c0d8f0', lit: '#9ebee6', litMid: '#8eb0de', litHi: '#b0ceee', shade: '#7898cc', shadeMid: '#6a8cc2', litCrack: '#7c9ed2', crack: '#5a7cb4', ridge: '#d6e8f8', snow: '#ffffff', snowShade: '#ccdcf2' });
  peakRange(f2, LW, 150, [
    { x: 250, h: 122, w: 170, snow: 40, l: 1.0, r: 1.25 },
    { x: 200, h: 80, w: 44, snow: 12, l: 0.8, r: 1 }, { x: 178, h: 64, w: 34, snow: 0, l: 0.8, r: 1 },
    { x: 312, h: 92, w: 58, snow: 20, l: 1, r: 1.1 }, { x: 345, h: 70, w: 46, snow: 8, l: 1, r: 1 },
    { x: 560, h: 104, w: 150, snow: 28, l: 1.1, r: 1 }, { x: 610, h: 74, w: 50, snow: 10, l: 0.9, r: 1 }, { x: 60, h: 70, w: 120, snow: 12, l: 1, r: 1.2 },
  ], { haze: '#a8c4e4', lit: '#86a6d0', litMid: '#7696c4', litHi: '#9ab8dc', shade: '#5a76a2', shadeMid: '#4e6a96', litCrack: '#5e7eae', crack: '#3e5682', ridge: '#d0e0f4', snow: '#f8fbff', snowShade: '#c0d0ea' });
  // forest creeping up the mountains' feet
  pineRidge(f2, LW, i => Math.round(144 + wave(i, [4, 3, 1], [2, 7, 2])), 7, 14, 4, 31,
    { ground: '#6a98b4', a: '#6292b0', b: '#5a88a8', dark: '#5280a0' }, wrap);

  // ---- valley: rolling forested hills with a winding river between them
  const [valley, v] = layer();
  const RIVER_COL = '#7cc4ea', river = [];
  px(v, '#6aa894', 0, 146, LW, H - 146);
  for (let i = 0; i < LW; i++) {
    const y = Math.round(152 + wave(i, [3, 2, 0.4], [2, 5, 1.1])), w = 3 + Math.round(1.5 + wave(i, [1.5, 3, 2]));
    px(v, RIVER_COL, i, y, 1, w);
    px(v, '#4e8fb8', i, y + w, 1, 1);
    river.push(y);
  }
  // hill mounds covered in pines; gaps between them let the river show through
  for (const [cx, hw, top] of [[40, 60, 138], [190, 50, 142], [330, 70, 136], [470, 45, 143], [600, 72, 138], [740, 42, 141]]) {
    const r = rng(cx);
    wrap(xx => {
      for (let i = -hw; i <= hw; i++) {
        const y = Math.round(top + (i / hw) ** 2 * 26);
        px(v, '#4a8c7a', xx + i, y, 1, H - y);
      }
      for (let i = -hw + 4; i < hw - 4; i += 4) {
        const y = Math.round(top + (i / hw) ** 2 * 26) + 3;
        pine(v, xx + i + r() * 3, y, 8 + r() * 9, r() < 0.5 ? '#40806e' : '#3a7666', '#346c5e');
      }
    }, cx);
  }
  veil(v, '#e8f4fa', 0.1, 120);
  // Only the stretches of river left uncovered by hills get animated glints.
  const glints = [];
  const vd = v.getImageData(0, 0, LW, H).data, [rr, rg, rb] = [0x7c, 0xc4, 0xea];
  for (let i = 0; i < LW; i++) {
    const o = ((river[i] + 1) * LW + i) * 4;
    if (Math.abs(vd[o] - rr) < 24 && Math.abs(vd[o + 1] - rg) < 24 && Math.abs(vd[o + 2] - rb) < 24) glints.push(i);
  }

  // ---- near pine ridge, tips peeking over the stage's ground
  const [near, n] = layer();
  pineRidge(n, LW, i => Math.round(178 + wave(i, [5, 2, 0.3], [3, 5, 1.7], [1.5, 13, 0.4])), 12, 26, 9, 57,
    { ground: '#2e6450', a: '#2e6a52', b: '#357658', dark: '#28584a' }, wrap);

  // Layers are authored for the camera at the bottom of the stage; flying higher reveals more sky.
  const LAYERS = [[far1, 0.03, 0.03], [far2, 0.07, 0.06], [valley, 0.18, 0.14], [near, 0.38, 0.32]];

  // ---- birds crossing the sky
  const birds = Array.from({ length: 7 }, (_, i) => ({ x: i < 4 ? 40 + i * 7 : 300 + i * 9, y: i < 4 ? 50 + Math.abs(i - 1.5) * 4 : 80 + (i % 2) * 5, ph: i }));

  // ---- petals and fireflies in front
  const motes = Array.from({ length: 44 }, (_, i) => {
    const petal = i % 3 !== 0;
    return {
      petal, x: R() * W, y: R() * H, z: 0.5 + R() * 0.7, ph: R() * 6.28,
      vx: petal ? -0.25 - R() * 0.3 : (R() - 0.5) * 0.1, vy: petal ? 0.2 + R() * 0.25 : -0.05 - R() * 0.1,
      color: petal ? (R() < 0.5 ? '#ffb8d4' : '#ff8ab4') : (R() < 0.5 ? '#fff8a0' : '#ffffff'),
    };
  });

  const strip = (ctx, img, fx, fy, cam, up, dx = 0) => {
    const x = -mod(Math.round(cam.x * fx + dx), LW), y = Math.round(up * fy);
    ctx.drawImage(img, x, y);
    ctx.drawImage(img, x + LW, y);
    return [x, y];
  };

  return {
    draw(ctx, cam, bottomY, t) {
      ctx.drawImage(sky, 0, 0);
      const up = bottomY - cam.y;
      strip(ctx, clouds, 0.02, 0.02, cam, up, t * 0.04);
      for (const b of birds) {
        const bx = mod(b.x + t * 0.25 - cam.x * 0.04, W + 40) - 20, by = b.y + Math.sin(t * 0.03 + b.ph) * 2 + up * 0.03;
        bird(ctx, bx, by, ((t >> 3) + b.ph) & 1);
      }
      for (const [img, fx, fy] of LAYERS) {
        const [x, y] = strip(ctx, img, fx, fy, cam, up);
        if (img !== valley) continue;
        const phase = Math.round(t * 0.4);
        for (const i of glints) {
          if ((i + phase) % 9) continue;
          for (const ox of [x, x + LW]) if (ox + i >= 0 && ox + i < W) px(ctx, '#ffffff', ox + i, y + river[i] + 1, 2, 1);
        }
      }
    },
    update(t) {
      for (const p of motes) {
        p.x = mod(p.x + p.vx + (p.petal ? Math.sin(t * 0.03 + p.ph) * 0.2 : 0), W);
        p.y = mod(p.y + p.vy, H);
      }
    },
    drawFront(ctx, cam, t) {
      for (const p of motes) {
        const x = Math.round(mod(p.x - cam.x * p.z, W)), y = Math.round(mod(p.y - cam.y * p.z, H));
        if (p.petal) {
          px(ctx, p.color, x, y, 2, 1);
          px(ctx, p.color, x + 1, y + 1);
        } else if (Math.sin(t * 0.08 + p.ph) > -0.2) {
          ctx.globalAlpha = 0.35;
          px(ctx, p.color, x - 1, y - 1, 3, 3);
          ctx.globalAlpha = 1;
          px(ctx, p.color, x, y);
        }
      }
    },
  };
})();
