// All art is drawn in code — no image files.
// Characters are jointed rigs: limbs are posed by angle every frame, which gives smooth,
// natural movement (run cycles, lunges, landings) without hand-drawing each frame.
const OL = '#140f1c';

// Pixel strings → image. One char per pixel through a palette, '.' is transparent.
function buildImage(rows, pal) {
  const w = Math.max(...rows.map(r => r.length));
  const c = makeCanvas(w, rows.length), x = c.getContext('2d');
  rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') px(x, pal[ch], i, j); }));
  return c;
}

function flipped(src) {
  const c = makeCanvas(src.width, src.height), x = c.getContext('2d');
  x.translate(src.width, 0);
  x.scale(-1, 1);
  x.drawImage(src, 0, 0);
  return c;
}

function flipV(src) {
  const c = makeCanvas(src.width, src.height), x = c.getContext('2d');
  x.translate(0, src.height);
  x.scale(1, -1);
  x.drawImage(src, 0, 0);
  return c;
}

// ================================================================ CHARACTER RIG
const fwd = (p, ang, len) => [p[0] + Math.sin(ang * DEG) * len, p[1] + Math.cos(ang * DEG) * len];

// A chain of segments: outline pass, fill pass, then a 1px shade on the far side.
function limb(x, pts, w, fill, shade) {
  const dots = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) * 2 + 1;
    for (let k = 0; k < n; k++) dots.push([x0 + (x1 - x0) * k / (n - 1), y0 + (y1 - y0) * k / (n - 1), i]);
  }
  const at = d => [Math.round(d[0] - w / 2), Math.round(d[1] - w / 2)];
  for (const d of dots) { const [a, b] = at(d); px(x, OL, a - 1, b - 1, w + 2, w + 2); }
  for (const d of dots) { const [a, b] = at(d); px(x, fill[d[2]], a, b, w, w); }
  if (shade) for (const d of dots) { const [a, b] = at(d); px(x, shade[d[2]], a + w - 1, b + w - 1); }
}

const SKINS = {
  rowan: {
    head: buildImage([
      '..oooo..',
      '.oNNnno.',
      'oNNnnnno',
      'oNnmssso',
      'onmmsseo',
      'onmrrrro',
      '.omRRRo.',
      '..ooooo.',
    ], { o: OL, n: '#323a6a', N: '#56609a', m: '#1e2448', s: '#f0c8a0', e: '#5ff0e0', r: '#d03040', R: '#901830' }),
    torso: buildImage([
      '..ooooo.',
      '.oknnnAo',
      'oknnnnAo',
      'oknnnnao',
      '.oklllko',
      '.obbgbbo',
      '.onnnnno',
      '.onnmnno',
      '.ooooooo',
    ], { o: OL, n: '#323a6a', m: '#1e2448', k: '#4a5270', a: '#8a96b0', A: '#c8d0e0', l: '#7a5034', b: '#3a2818', g: '#e8b848' }),
    arm: { back: ['#1e2448', '#5a3a24'], front: ['#323a6a', '#7a5034'], shade: ['#1e2448', '#5a3a24'] },
    leg: { back: ['#2a3264', '#2a3264'], front: ['#46528a', '#46528a'], shade: ['#2e3868', '#2e3868'] },
    boot: ['#2e2a3a', '#5a5470'],
    cloak: { base: '#3a4680', light: '#5a68a8', inner: '#b02838' },
    scarf: ['#e03848', '#a02030'],
    pauldron: ['#8a96b0', '#d8e0f0'],
  },
  knight: {
    head: buildImage([
      '..oooo..',
      '.oAAaao.',
      'oAAaaaao',
      'oAakkkeo',
      'oaakkkko',
      'oaaaaako',
      '.okaako.',
      '..oooo..',
    ], { o: OL, a: '#5a4a6a', A: '#8a7aa0', k: '#1a1224', e: '#ff4ad0' }),
    torso: buildImage([
      '..ooooo.',
      '.oaaaaAo',
      'oaAaaaAo',
      'oatttaao',
      '.oaaatao',
      '.okkkkko',
      '.oaaaaao',
      '.oaakaao',
      '.ooooooo',
    ], { o: OL, a: '#5a4a6a', A: '#8a7aa0', k: '#2e2440', t: '#7ab040' }),
    arm: { back: ['#3a2e4a', '#3a2e4a'], front: ['#5a4a6a', '#6a5a7a'], shade: ['#3a2e4a', '#3a2e4a'] },
    leg: { back: ['#2e2440', '#2e2440'], front: ['#4a3a5a', '#4a3a5a'], shade: ['#2e2440', '#2e2440'] },
    boot: ['#1a1224', '#3a2e4a'],
    cloak: { base: '#4a2050', light: '#6a3070', inner: '#2a1030' },
    scarf: null,
    pauldron: ['#7ab040', '#b8e070'],
    horns: true,
  },
};

const WING = buildImage([
  'oo',
  'oWWoo',
  '.oWwWWoo',
  '.oWwwwWWWoo',
  '..oWwwwwwWWWoo',
  '..oWwwccwwwwWWWoo',
  '...oWwwccccwwwwWWWo',
  '....oWwccccccwwwwwWo',
  '.....oowwccccccwwwwWo',
  '.......oowwccccccwwWo',
  '.........ooowwwwwwwo',
  '............ooooooo',
], { o: '#2a9a98', W: '#f0fffa', w: '#a8f4e8', c: '#58d8c8' });
const WING_DOWN = flipV(WING);

function blade(x, hand, deg) {
  const a = deg * DEG, dx = Math.cos(a), dy = Math.sin(a), nx = Math.round(-dy), ny = Math.round(dx);
  const dot = (i, off, col) => px(x, col, Math.round(hand[0] + dx * i) + nx * off, Math.round(hand[1] + dy * i) + ny * off);
  dot(-2, 0, '#3a2818');
  dot(-1, 0, '#5a3a24');
  for (const o of [-2, -1, 0, 1, 2]) dot(0, o, '#e8b848');
  for (let i = 1; i <= 16; i++) {
    dot(i, 0, i === 16 ? '#ffffff' : '#dce4f0');
    if (i < 15) dot(i, 1, '#5ff0e0');
  }
}

function mace(x, hand, deg) {
  const a = deg * DEG, dx = Math.cos(a), dy = Math.sin(a);
  for (let i = -1; i <= 9; i++) px(x, i < 8 ? '#5a3a24' : OL, hand[0] + dx * i, hand[1] + dy * i, 2, 2);
  const hx = hand[0] + dx * 11, hy = hand[1] + dy * 11;
  circ(x, OL, hx, hy, 4);
  circ(x, '#6a5a7a', hx, hy, 3);
  px(x, '#9a8ab0', hx - 2, hy - 2, 2, 1);
  for (const [ox, oy] of [[-5, 0], [5, 0], [0, -5], [0, 5]]) px(x, '#7ab040', hx + ox, hy + oy);
}

// Pose: angles in degrees, 0 = straight down, + = toward facing. legs/arms: [back, front], each [upper, bend].
// Renders into a 72x52 canvas with the hip at (40, 32). Returns the lowest ankle y (to plant the feet).
function renderRig(x, skin, pose, t) {
  const hx = 40 + (pose.hx || 0), hy = 32 + (pose.hy || 0), lean = pose.lean || 0;
  const flow = pose.flow ?? 0.4;

  if (pose.wings) {
    const up = pose.wings === 'up', w = up ? WING : WING_DOWN;
    x.globalAlpha = 0.55;
    x.drawImage(w, hx - 22 + lean, up ? hy - 22 : hy - 8);
    x.globalAlpha = 0.9;
    x.drawImage(w, hx - 19 + lean, up ? hy - 19 : hy - 6);
    x.globalAlpha = 1;
  }
  // Cloak: a tattered sheet hanging from the shoulders, swept back by motion.
  const cy0 = hy - 7, cy1 = hy + 5 + (pose.cloakLen || 0);
  for (let y = cy0; y <= cy1; y++) {
    const k = (y - cy0) / (cy1 - cy0);
    const left = Math.round(hx - 3 + lean - k * (1 + flow * 7) - Math.sin(t * 1.7 + y * 0.35) * k * 1.5);
    const right = Math.round(hx + lean - 1 - k * flow * 4);
    px(x, OL, left - 1, y, right - left + 2, 1);
    px(x, k > 0.15 && k < 0.95 ? skin.cloak.base : skin.cloak.light, left, y, right - left, 1);
    px(x, skin.cloak.inner, right - 1, y);
  }
  for (let i = 0; i < 4; i++) {
    const bx = Math.round(hx - 3 + lean - (1 + flow * 7) - Math.sin(t * 1.7 + cy1 * 0.35) * 1.5) + i * 2;
    px(x, OL, bx, cy1 + 1, 2, 1 + ((i * 7 + Math.round(t)) % 3));
  }

  const arm = (sh, [up, el], back) => {
    const e = fwd(sh, up, 4), hand = fwd(e, up + el, 4);
    limb(x, [sh, e, hand], 2, back ? skin.arm.back : skin.arm.front, back ? null : skin.arm.shade);
    return hand;
  };
  const leg = ([th, kn], hip, back) => {
    const k = fwd(hip, th, 6), a = fwd(k, th - kn, 6);
    limb(x, [hip, k, a], 2, back ? skin.leg.back : skin.leg.front, back ? null : skin.leg.shade);
    px(x, OL, a[0] - 2, a[1] - 1, 6, 3);
    px(x, back ? OL : skin.boot[0], a[0] - 1, a[1] - 1, 4, 2);
    if (!back) px(x, skin.boot[1], a[0] - 1, a[1] - 1, 2, 1);
    return a[1];
  };

  const shoulderB = [hx - 2 + lean, hy - 6], shoulderF = [hx + 2 + lean, hy - 6];
  const backHand = arm(shoulderB, pose.arms[0], true);
  if (pose.sword != null && pose.swordBack) blade(x, backHand, pose.sword);
  const footY = Math.max(leg(pose.legs[0], [hx - 1, hy], true), leg(pose.legs[1], [hx + 1, hy], false));
  x.drawImage(skin.torso, hx - 4 + lean, hy - 8);
  x.drawImage(skin.head, hx - 3 + lean, hy - 15);
  if (skin.horns) {
    const ox = hx - 3 + lean, oy = hy - 15;
    px(x, '#7ab040', ox + 1, oy - 2, 1, 2);
    px(x, '#7ab040', ox, oy - 3);
    px(x, '#7ab040', ox + 5, oy - 2, 1, 2);
    px(x, '#7ab040', ox + 6, oy - 3);
  }
  if (skin.scarf) {
    const pts = [];
    for (let i = 1; i <= 9; i++)
      pts.push([hx + lean - 1 - i * 2.3 * (0.4 + flow), hy - 9 + i * (0.9 - flow * 0.6) + Math.sin(t * 1.3 + i * 0.8) * i * 0.25, i < 6 ? 2 : 1]);
    for (const [sx, sy, s] of pts) px(x, OL, sx - 1, sy - 1, s + 2, s + 2);
    pts.forEach(([sx, sy, s], i) => px(x, skin.scarf[i % 2], sx, sy, s, s));
  }
  const hand = arm(shoulderF, pose.arms[1], false);
  px(x, OL, shoulderF[0] - 2, shoulderF[1] - 2, 5, 4);
  px(x, skin.pauldron[0], shoulderF[0] - 1, shoulderF[1] - 1, 3, 2);
  px(x, skin.pauldron[1], shoulderF[0] - 1, shoulderF[1] - 1, 2, 1);

  if (pose.sword != null && !pose.swordBack) blade(x, hand, pose.sword);
  if (pose.mace != null) mace(x, hand, pose.mace);
  if (pose.bow) { // wrist crossbow
    px(x, OL, hand[0] - 2, hand[1] - 4, 5, 9);
    px(x, '#7a5034', hand[0] - 1, hand[1] - 3, 2, 7);
    px(x, '#e8b848', hand[0], hand[1] - 1, 3, 2);
    if (pose.bow === 'fire') {
      px(x, '#ffffff', hand[0] + 4, hand[1] - 1, 2, 2);
      px(x, '#5ff0e0', hand[0] + 6, hand[1] - 2);
      px(x, '#5ff0e0', hand[0] + 6, hand[1] + 1);
    }
  }
  return footY;
}

const RIG = makeCanvas(72, 52), RX = RIG.getContext('2d');

// tint: { color, alpha } washes the whole figure (hit flash, dash afterimage, attack telegraph).
function rigImage(skin, pose, t, tint) {
  RX.clearRect(0, 0, 72, 52);
  const footY = renderRig(RX, skin, pose, t);
  if (tint) {
    RX.globalCompositeOperation = 'source-atop';
    RX.globalAlpha = tint.alpha ?? 1;
    RX.fillStyle = tint.color;
    RX.fillRect(0, 0, 72, 52);
    RX.globalAlpha = 1;
    RX.globalCompositeOperation = 'source-over';
  }
  return footY;
}

// Screen position of the rig's top-left so the hip sits at cx and the boots rest on feetY.
function rigOrigin(footY, cx, feetY, facing) {
  return [Math.round(cx) - (facing > 0 ? 40 : 32), Math.round(feetY - footY - 2)];
}

function drawRig(ctx, skin, pose, cx, feetY, facing, t, tint) {
  const footY = rigImage(skin, pose, t, tint), [x, y] = rigOrigin(footY, cx, feetY, facing);
  if (facing > 0) ctx.drawImage(RIG, x, y);
  else {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(RIG, -x - 72, y);
    ctx.restore();
  }
}

// A standalone copy (already mirrored) for afterimages.
function snapshotRig(skin, pose, cx, feetY, facing, t, tint) {
  const footY = rigImage(skin, pose, t, tint);
  const img = facing > 0 ? (() => { const c = makeCanvas(72, 52); c.getContext('2d').drawImage(RIG, 0, 0); return c; })() : flipped(RIG);
  const [x, y] = rigOrigin(footY, cx, feetY, facing);
  return { img, x, y };
}

// Pose library. Arrays are [back, front]; each limb is [upper angle, bend].
const POSE = {
  idle: t => ({ hy: (t >> 5) & 1, flow: 0.25, legs: [[-6, 3], [8, 4]], arms: [[-6, 14], [8, 22]], sword: 70 }),
  run: (frame, flow = 0.9) => {
    const p = frame / 8 * Math.PI * 2;
    return {
      hy: Math.abs(Math.sin(p)) > 0.7 ? 0 : -1, lean: 1, flow,
      legs: [[38 * Math.sin(p + Math.PI), 10 + 70 * Math.max(0, Math.cos(p + Math.PI))], [38 * Math.sin(p), 10 + 70 * Math.max(0, Math.cos(p))]],
      arms: [[45 * Math.sin(p), 40], [-40 * Math.sin(p), 75]], sword: 150, swordBack: true,
    };
  },
  walk: frame => {
    const p = frame / 8 * Math.PI * 2;
    return {
      hy: 0, flow: 0.3,
      legs: [[22 * Math.sin(p + Math.PI), 5 + 35 * Math.max(0, Math.cos(p + Math.PI))], [22 * Math.sin(p), 5 + 35 * Math.max(0, Math.cos(p))]],
      arms: [[20 * Math.sin(p), 20], [10, 60]],
    };
  },
  skid: { hy: 2, lean: -2, flow: 1.0, legs: [[-35, 10], [28, 30]], arms: [[-50, 20], [-30, 40]], sword: 150, swordBack: true },
  rise: { hy: -1, flow: 0.2, cloakLen: 2, legs: [[-14, 20], [45, 80]], arms: [[-40, 40], [150, 20]], sword: -60 },
  peak: { hy: 0, flow: 0.6, legs: [[10, 50], [30, 60]], arms: [[-100, 30], [100, 20]], sword: 10 },
  fall: { hy: 0, flow: 0.1, cloakLen: -3, legs: [[-15, 10], [20, 18]], arms: [[-120, 20], [125, 20]], sword: -20 },
  land: { hy: 4, lean: 2, flow: 0.5, legs: [[38, 80], [55, 95]], arms: [[20, 50], [40, 60]], sword: 80 },
  fly: flap => ({ hy: 0, lean: 1, flow: 1.1, legs: [[-30, 40], [-14, 30]], arms: [[-30, 40], [86, 4]], wings: flap ? 'down' : 'up', bow: true }),
  glide: { hy: 0, lean: 1, flow: 0.8, legs: [[-20, 30], [-5, 25]], arms: [[-40, 30], [70, 10]], wings: 'up', bow: true },
  dash: { hy: 1, lean: 3, flow: 1.5, legs: [[-50, 30], [25, 70]], arms: [[-70, 20], [-55, 30]], sword: 165, swordBack: true },
  hurt: { hy: 0, lean: -2, flow: 0.2, legs: [[-20, 20], [10, 30]], arms: [[-140, 20], [-120, 30]], sword: -30 },
  lunge: [{ hy: 1, lean: -1, legs: [[-12, 12], [24, 30]] }, { hy: 2, lean: 2, legs: [[-30, 10], [45, 50]] }, { hy: 2, lean: 2, legs: [[-30, 10], [45, 55]] }],
};

// ================================================================ SLASH ARCS
// A crescent that tapers at both ends; anchored at the canvas centre (cx, cy).
function makeArc(R, r, a0, a1) {
  const size = R * 2 + 2, c = makeCanvas(size, size), x = c.getContext('2d');
  const cx = R + 1, cy = R + 1, A0 = a0 * DEG, A1 = a1 * DEG;
  for (let py = 0; py < size; py++)
    for (let pxl = 0; pxl < size; pxl++) {
      const dx = pxl + 0.5 - cx, dy = py + 0.5 - cy, d = Math.hypot(dx, dy);
      let ang = Math.atan2(dy, dx);
      while (ang < A0) ang += Math.PI * 2;
      const p = (ang - A0) / (A1 - A0);
      if (p > 1) continue;
      const inner = R - (R - r) * Math.sin(p * Math.PI);
      if (d > R || d < inner) continue;
      const k = (R - d) / (R - r);
      if (k > 0.7 && (pxl + py) % 2) continue;
      px(x, k < 0.15 ? '#ffffff' : k < 0.4 ? '#c8fff4' : k < 0.7 ? '#5ff0e0' : '#2a9a98', pxl, py);
    }
  return { r: c, l: flipped(c), cx, cy };
}
const ARCS = {
  slash: makeArc(26, 13, -80, 70),
  heavy: makeArc(34, 16, -110, 95),
  up: makeArc(28, 14, -170, -10),
};

// ================================================================ WORLD ART
const PAL = {
  emerald: { ol: '#14402a', trunk: '#7a4a2c', trunkD: '#4e2e1c', dark: '#1f7a46', base: '#34a85a', light: '#6ad46a', light2: '#b8f080' },
  blossom: { ol: '#7a2850', trunk: '#6a3a3a', trunkD: '#4a2428', dark: '#d8588e', base: '#f08ab4', light: '#ffb8d4', light2: '#fff0f6' },
  autumn: { ol: '#7a2e14', trunk: '#6a3a24', trunkD: '#4a2414', dark: '#d8602a', base: '#f0923a', light: '#ffc060', light2: '#fff0a0' },
  teal: { ol: '#1e5060', trunk: '#4a6a70', trunkD: '#3a5860', dark: '#2e8890', base: '#46a8a8', light: '#6cc8c0', light2: '#9ae0d4' },
  farBlue: { ol: '#5a78b8', trunk: '#6a88c0', trunkD: '#6a88c0', dark: '#6a8cc8', base: '#7ea0d4', light: '#90b4dc', light2: '#90b4dc' },
  farTeal: { ol: '#3e7aa0', trunk: '#4a88a8', trunkD: '#4a88a8', dark: '#4a90b0', base: '#58a4bc', light: '#70bcc8', light2: '#70bcc8' },
};

function tree(x, cx, baseY, s, pal, detail = true, seed = 1) {
  const r = rng(Math.round(cx * 13 + s * 7 + seed));
  const tw = Math.max(2, Math.round(s * 0.22)), top = baseY - Math.round(s * 1.5);
  px(x, pal.ol, cx - tw / 2 - 1, top, tw + 2, baseY - top);
  px(x, pal.trunk, cx - tw / 2, top, tw, baseY - top);
  if (detail) {
    px(x, pal.trunkD, cx + tw / 2 - Math.max(1, tw / 3), top, Math.max(1, tw / 3), baseY - top);
    px(x, pal.ol, cx - tw / 2 - 4, baseY - 4, tw + 8, 4);
    px(x, pal.trunk, cx - tw / 2 - 3, baseY - 3, tw + 6, 3);
    px(x, pal.ol, cx - tw / 2 - 1 - s * 0.35, top + s * 0.4, s * 0.35, 2);
  }
  const ccy = baseY - s * 1.75;
  const blobs = [[-0.7, 0.25, 0.5], [0.7, 0.2, 0.52], [0, -0.38, 0.68], [-0.38, 0.55, 0.48], [0.4, 0.58, 0.46], [0, 0.12, 0.6], [-0.9, 0.6, 0.32], [0.95, 0.62, 0.3]]
    .map(([a, b, c]) => [cx + a * s, ccy + b * s, c * s]);
  for (const [bx, by, br] of blobs) circ(x, pal.ol, bx, by, br + 1);
  for (const [bx, by, br] of blobs) {
    circ(x, pal.dark, bx, by, br);
    circ(x, pal.base, bx - br * 0.14, by - br * 0.2, br * 0.8);
    if (detail) circ(x, pal.light, bx - br * 0.32, by - br * 0.4, br * 0.42);
  }
  if (!detail) return;
  for (let i = 0; i < s * 2.5; i++) {
    const [bx, by, br] = blobs[r() * blobs.length | 0], a = r() * Math.PI * 2, d = r() * br * 0.85;
    const lx = bx + Math.cos(a) * d, ly = by + Math.sin(a) * d, col = ly < by - br * 0.25 ? pal.light2 : pal.dark;
    px(x, col, lx, ly);
    px(x, col, lx + 1, ly + 1);
    px(x, col, lx + 2, ly);
  }
  for (let i = 0; i < s / 5; i++) px(x, pal.ol, cx + (r() - 0.5) * s * 1.6, ccy + s * (0.5 + r() * 0.3), 1, 4 + r() * s * 0.4);
}

function pine(x, cx, baseY, h, col, colD) {
  for (let i = 0; i < h; i++) {
    const tier = (i % (h / 4)) / (h / 4), w = Math.round((i / h) * h * 0.32 * (0.6 + tier * 0.6)) + 1;
    px(x, col, cx - w, baseY - h + i, w * 2 + 1, 1);
    px(x, colD, cx, baseY - h + i, w + 1, 1);
  }
}

// Vertical gradient quantized into bands, with a 2-row checker dither between bands.
function skyGrad(x, stops) {
  const w = x.canvas.width, h = x.canvas.height, N = 18;
  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const lerp = f => {
    const p = f * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(p)), k = p - i;
    const a = hex(stops[i]), b = hex(stops[i + 1]);
    return 'rgb(' + a.map((v, j) => Math.round(v + (b[j] - v) * k)).join(',') + ')';
  };
  const bands = Array.from({ length: N }, (_, i) => lerp(i / (N - 1))), bh = h / N;
  for (let y = 0; y < h; y++) {
    const b = Math.min(N - 1, Math.floor(y / bh)), into = y - b * bh;
    px(x, bands[b], 0, y, w, 1);
    if (b + 1 < N && into >= bh - 2) for (let i = y % 2; i < w; i += 2) px(x, bands[b + 1], i, y);
  }
}




function grassBlades(x, gx, gy, w, seed, cols = ['#14602a', '#2e9a3a', '#58d048']) {
  const r = rng(seed);
  for (let i = 0; i < w; i++) {
    const h = 3 + (r() * 7 | 0);
    px(x, cols[0], gx + i, gy - h, 1, h);
    px(x, cols[1], gx + i, gy - h + 1, 1, h - 2);
    if (r() < 0.3) px(x, cols[2], gx + i, gy - h);
  }
}

const FLOWER_COLS = [['#ff6aa8', '#ffd0e4'], ['#ffd040', '#fff4b0'], ['#6a8cff', '#c8d8ff'], ['#ffffff', '#ffe8f0'], ['#ff7040', '#ffc8a0'], ['#c068f0', '#ecc8ff']];
function flower(x, a, fy, h, [c, c2]) {
  px(x, '#2e9a3a', a, fy - h, 1, h);
  px(x, c, a - 1, fy - h - 1, 3, 3);
  px(x, c2, a, fy - h - 1);
  px(x, '#ffe060', a, fy - h);
}

function mushroom(x, mx, my, s) {
  circ(x, OL, mx, my - s, s + 1);
  circ(x, '#e84860', mx, my - s, s);
  circ(x, '#ff8090', mx - 1, my - s - 1, s * 0.5);
  px(x, OL, mx - 2, my - s, 5, s + 1);
  px(x, '#fff0e0', mx - 1, my - s, 3, s);
  px(x, OL, mx - s - 1, my - s, s * 2 + 3, 1);
  px(x, '#ffffff', mx - 2, my - s - 2);
}

// ---- tiles (16x16)
function grassTop(v) {
  const c = makeCanvas(T, T), x = c.getContext('2d'), r = rng(v * 31 + 7);
  px(x, '#6a3e28', 0, 0, T, T);
  for (let i = 0; i < 9; i++) px(x, r() < 0.5 ? '#4e2c1c' : '#8a5636', r() * 15 | 0, 6 + r() * 9 | 0, r() < 0.3 ? 2 : 1, 1);
  for (let col = 0; col < T; col++) {
    const d = 5 + ((col * 7 + v * 3) % 3 === 0 ? 2 : 0) + ((col + v) % 5 === 0 ? 1 : 0);
    px(x, '#2e9a3a', col, 0, 1, d);
    px(x, '#14602a', col, d);
    px(x, '#58d048', col, 0, 1, 2);
    if ((col + v) % 3 === 0) px(x, '#a8f070', col, 0);
  }
  return c;
}

function soil(v, deep) {
  const c = makeCanvas(T, T), x = c.getContext('2d'), r = rng(v * 17 + (deep ? 50 : 3));
  px(x, deep ? '#4a2a1c' : '#6a3e28', 0, 0, T, T);
  for (let i = 0; i < 10; i++) px(x, r() < 0.5 ? (deep ? '#3a2014' : '#4e2c1c') : (deep ? '#5e3826' : '#8a5636'), r() * 15 | 0, r() * 15 | 0, r() < 0.3 ? 2 : 1, 1);
  if (r() < 0.25) { const a = r() * 10 | 0, b = r() * 10 | 0; px(x, '#3a3448', a, b, 5, 3); px(x, '#8a88a8', a + 1, b, 3, 1); }
  if (r() < 0.3) px(x, '#c89058', r() * 12 | 0, r() * 14 | 0, 1, 2);
  return c;
}

function stoneTile(v) {
  const c = makeCanvas(T, T), x = c.getContext('2d'), r = rng(v * 11 + 5);
  px(x, '#2a2838', 0, 0, T, T);
  for (const [bx, by, bw, bh] of [[1, 1, 9, 6], [11, 1, 4, 6], [1, 9, 5, 6], [7, 9, 8, 6]]) {
    px(x, '#6a7090', bx, by, bw, bh);
    px(x, '#9aa0c0', bx, by, bw, 1);
    px(x, '#4a4e6a', bx, by + bh - 1, bw, 1);
  }
  for (let i = 0; i < 4; i++) px(x, '#3a8a4a', r() * 15 | 0, r() * 15 | 0, 2, 1);
  return c;
}

function branchTile(v) {
  const c = makeCanvas(T, T), x = c.getContext('2d');
  px(x, OL, 0, 0, T, 6);
  px(x, '#8a5a34', 0, 1, T, 3);
  px(x, '#b07a48', 0, 1, T, 1);
  px(x, '#5a3a20', (v * 5) % 12 + 2, 2, 2, 1);
  px(x, '#2e9a3a', 0, 0, T, 1);
  for (let i = v % 3; i < T; i += 5) { px(x, '#2e9a3a', i, 4, 1, 3 + (i % 3)); px(x, '#58d048', i + 1, 0); }
  return c;
}

function brambleTile(v) {
  const c = makeCanvas(T, T), x = c.getContext('2d');
  px(x, '#3a2030', 0, 8, T, 8);
  px(x, '#2a1424', 0, 12, T, 4);
  for (let i = 0; i < T; i += 2) {
    const h = 5 + Math.round(4 * Math.abs(Math.sin((i + v * 5) * 0.7)));
    px(x, '#2a1424', i, 9 - h, 2, h);
    px(x, '#8a3a78', i, 10 - h, 1, h - 1);
    if (i % 4 === v % 2 * 2) { px(x, '#f0d8e8', i - 1, 11 - h); px(x, '#f0d8e8', i + 2, 12 - h); }
  }
  return c;
}

function waterTile(surface) {
  const c = makeCanvas(T, T), x = c.getContext('2d');
  px(x, '#3a90d0', 0, 0, T, T);
  if (surface) {
    px(x, '#d8f8ff', 0, 0, T, 2);
    px(x, '#5ab8e8', 0, 2, T, 6);
  }
  px(x, '#d8f8ff', 3, surface ? 9 : 5, 5, 1);
  px(x, '#7ac8f0', 9, surface ? 12 : 11, 4, 1);
  return c;
}

const TILES = {
  top: [0, 1, 2, 3].map(grassTop),
  soil: [0, 1, 2, 3, 4].map(v => soil(v)),
  deep: [0, 1, 2, 3, 4].map(v => soil(v, true)),
  stone: [0, 1, 2].map(stoneTile),
  branch: [0, 1, 2].map(branchTile),
  bramble: [0, 1].map(brambleTile),
  water: waterTile(false),
  waterTop: waterTile(true),
};

// ================================================================ MORE PLANTS & SCENERY


function willow(x, cx, baseY, s, seed) {
  const r = rng(seed), top = baseY - Math.round(s * 1.3);
  px(x, OL, cx - 3, top, 6, baseY - top);
  px(x, '#6a5040', cx - 2, top, 4, baseY - top);
  const cy = top - s * 0.15;
  circ(x, '#1e5a3a', cx, cy, s * 0.75 + 1);
  circ(x, '#3a8a5a', cx, cy, s * 0.75);
  circ(x, '#5aac6a', cx - s * 0.15, cy - s * 0.2, s * 0.45);
  for (let i = -s * 0.85; i <= s * 0.85; i += 2) {
    const len = s * (0.6 + r() * 0.7), sx = cx + i, sy = cy + Math.sqrt(Math.max(0, (s * 0.75) ** 2 - i * i)) * 0.4;
    px(x, '#1e5a3a', sx, sy, 1, len);
    px(x, r() < 0.5 ? '#6ac078' : '#4a9a5a', sx, sy, 1, len - 2);
  }
}


function bush(x, cx, baseY, s, pal, bloom, seed) {
  const r = rng(seed);
  const B = [[-0.6, -0.4, 0.55], [0.6, -0.4, 0.5], [0, -0.7, 0.62], [-0.2, -0.3, 0.5], [0.3, -0.25, 0.5]];
  for (const [a, b, c] of B) circ(x, pal.ol, cx + a * s, baseY + b * s, c * s + 1);
  for (const [a, b, c] of B) {
    circ(x, pal.dark, cx + a * s, baseY + b * s, c * s);
    circ(x, pal.base, cx + a * s - 1, baseY + b * s - 1, c * s * 0.7);
  }
  if (bloom) for (let i = 0; i < s * 1.2; i++) {
    const a = (r() - 0.5) * s * 1.8, b = -r() * s * 1.1;
    px(x, bloom[0], cx + a, baseY + b - 1, 2, 2);
    px(x, bloom[1], cx + a, baseY + b - 1);
  }
}

function rock(x, cx, baseY, s) {
  for (let i = 0; i < s; i++) {
    const w = Math.round(Math.sqrt(1 - (1 - i / s) ** 2) * s * 1.2);
    px(x, OL, cx - w - 1, baseY - s + i, w * 2 + 3, 1);
    px(x, i < s * 0.35 ? '#a8a8c0' : '#7a7a98', cx - w, baseY - s + i, w * 2 + 1, 1);
    px(x, '#5a5a78', cx + w - 1, baseY - s + i, 2, 1);
  }
  px(x, '#3a9a4a', cx - s * 0.6, baseY - s, s * 0.9, 2);
  px(x, '#68c858', cx - s * 0.5, baseY - s, s * 0.5, 1);
}

// ---- swaying plants (drawn every frame; sway = top offset in px)
function fern(x, fx, fy, s, sway) {
  for (const dir of [-1, -0.45, 0.45, 1]) {
    const len = s * (Math.abs(dir) > 0.5 ? 1 : 1.25);
    for (let i = 0; i < len; i++) {
      const k = i / len, ax = fx + dir * i * 0.9 + sway * k, ay = fy - Math.sin(k * Math.PI * 0.85) * len * 0.7 - (1 - Math.abs(dir)) * i * 0.5;
      px(x, '#1e6a34', ax, ay, 1, 1);
      if (i % 2 === 0 && i > 1) { px(x, '#4ab04a', ax, ay - 1); px(x, '#3a9a40', ax, ay + 1); }
    }
  }
}

function tuft(x, gx, gy, w, sway, seed) {
  const r = rng(seed);
  for (let i = 0; i < w; i++) {
    const h = 3 + (r() * 6 | 0), lean = Math.round(sway * h / 8);
    px(x, '#14602a', gx + i, gy - h + 2, 1, h - 2);
    px(x, '#2e9a3a', gx + i + lean, gy - h, 1, 3);
    if (r() < 0.35) px(x, '#7ae060', gx + i + lean, gy - h);
  }
}

function sunflower(x, fx, fy, h, sway) {
  const tx = fx + sway;
  for (let i = 0; i < h; i++) px(x, '#2e8a3a', fx + sway * i / h, fy - i);
  px(x, '#3aa048', fx - 2, fy - h * 0.45, 2, 1);
  circ(x, OL, tx, fy - h, 4);
  circ(x, '#ffc820', tx, fy - h, 3);
  circ(x, '#7a4a1a', tx, fy - h, 1.5);
}

function lupine(x, fx, fy, h, sway, col) {
  for (let i = 0; i < h; i++) px(x, '#2e8a3a', fx + sway * i / h, fy - i);
  for (let i = Math.floor(h * 0.4); i < h; i += 2) {
    const k = sway * i / h;
    px(x, col[0], fx + k - 1, fy - i, 3, 1);
    px(x, col[1], fx + k, fy - i);
  }
}

function cattail(x, fx, fy, h, sway) {
  for (let i = 0; i < h; i++) px(x, '#4a8a3a', fx + sway * i / h, fy - i);
  px(x, OL, fx + sway - 1, fy - h - 1, 3, 7);
  px(x, '#8a4a24', fx + sway, fy - h, 1, 5);
  px(x, '#6aa848', fx + 2, fy - h * 0.6, 1, h * 0.6);
}

function butterfly(x, bx, by, flap, col) {
  const w = flap ? 1 : 2;
  px(x, OL, bx, by, 1, 3);
  px(x, col, bx - w, by, w, 2);
  px(x, col, bx + 1, by, w, 2);
  px(x, '#ffffff', bx - w, by, 1, 1);
}

function bird(x, bx, by, flap) {
  px(x, '#3a3a5a', bx - 3, by + (flap ? -1 : 1), 3, 1);
  px(x, '#3a3a5a', bx + 1, by + (flap ? -1 : 1), 3, 1);
  px(x, '#3a3a5a', bx, by, 1, 1);
}

// ================================================================ VISTA (mountain chain, valley, pine forests)
// A chain of individual peaks, painted pixel by pixel. Each peak has craggy slopes; where peaks
// overlap the taller wins. Light comes from the upper left: the face left of a wandering ridge
// line is lit, the right face is in shade. Snow is ragged and runs down gullies; the feet fade into haze.
// peaks: [{ x, h, w, snow, l, r }] — l/r stretch the left/right slopes.
function peakRange(x, width, baseY, peaks, c) {
  const C = Object.fromEntries(Object.entries(c).map(([k, v]) => [k, [1, 3, 5].map(n => parseInt(v.slice(n, n + 2), 16))]));
  const img = x.getImageData(0, 0, width, H), d = img.data;
  const put = (i, y, col, hazeK) => {
    const o = (y * width + i) * 4;
    d[o] = col[0] + (C.haze[0] - col[0]) * hazeK;
    d[o + 1] = col[1] + (C.haze[1] - col[1]) * hazeK;
    d[o + 2] = col[2] + (C.haze[2] - col[2]) * hazeK;
    d[o + 3] = 255;
  };
  for (let i = 0; i < width; i++) {
    let best = -1, p = null, bd = 0;
    for (const pk of peaks)
      for (const off of [-width, 0, width]) {
        const dd = i - (pk.x + off), half = pk.w / 2, k = Math.abs(dd) / (half * (dd < 0 ? pk.l : pk.r));
        if (k > 1.6) continue;
        const crag = Math.sin(i * 0.9 + pk.x) * 1.2 + (Math.sin(i * 0.31 + pk.x * 2) * 4 + Math.sin(i * 0.11 + pk.x) * 6) * Math.min(1, k * 1.5);
        const h = pk.h * (1 - Math.pow(k, 0.92)) + crag;
        if (h > best) { best = h; p = pk; bd = dd; }
      }
    if (best <= 0) continue;
    const top = Math.max(0, Math.round(baseY - best));
    for (let y = top; y < H; y++) {
      const rel = y - top, height = baseY - y; // height of this pixel above the range's foot
      const ridge = bd + rel * 0.18 * (p.r - p.l) + Math.sin(y * 0.3 + p.x) * 2 + Math.sin(y * 0.08 + p.x * 3) * 4;
      const lit = ridge < 0;
      let col = lit ? C.lit : C.shade;
      const v = rel * 0.6 + Math.abs(bd) * 0.8 + Math.sin(i * 0.45) * 2;
      if (rel > 2 && mod(Math.round(v), 9) === 0 && ((i * 7 + y * 3) % 5) > 1) col = lit ? C.litStreak : C.streak;
      if (Math.abs(ridge) < 0.8 && rel < best * 0.5) col = C.ridge;
      if (p.snow) {
        const line = p.h - p.snow + Math.sin(i * 0.7 + p.x) * 2 + Math.sin(i * 0.23) * 4
          - (Math.sin(i * 0.35 + p.x) > 0.6 ? 14 : 0) - (Math.sin(i * 0.9 + y * 0.2) > 0.85 ? 6 : 0);
        if (height > line) col = lit ? C.snow : C.snowShade;
      }
      if (y === top) col = lit ? C.ridge : C.shade;
      put(i, y, col, clamp((y - (baseY - 30)) / 40, 0, 0.75));
    }
  }
  x.putImageData(img, 0, 0);
}

// A chain of peaks across a seamless layer; each main peak may carry smaller spires on its shoulders.
function makePeaks(width, n, seed, hMin, hMax, wMin, wMax, snow) {
  const r = rng(seed), out = [];
  for (let k = 0; k < n; k++) {
    const pk = { x: (k + r() * 0.6) * width / n, h: hMin + r() * (hMax - hMin), w: wMin + r() * (wMax - wMin), snow, l: 0.8 + r() * 0.5, r: 0.8 + r() * 0.5 };
    out.push(pk);
    for (let j = 0, m = r() * 3 | 0; j < m; j++) {
      const side = r() < 0.5 ? -1 : 1;
      out.push({ x: pk.x + side * pk.w * (0.22 + r() * 0.2), h: pk.h * (0.55 + r() * 0.25), w: pk.w * (0.25 + r() * 0.15), snow: snow * 0.6, l: 0.8, r: 0.9 });
    }
  }
  return out;
}

// A band of conifers along a rolling ridge line; ridge(i) gives the ground height at column i.
function pineRidge(x, width, ridge, h0, h1, step, seed, cols, wrap) {
  const r = rng(seed);
  for (let i = 0; i < width; i++) px(x, cols.ground, i, ridge(i), 1, H - ridge(i));
  for (let i = 0; i < width; i += step) {
    const cx = i + r() * step, base = ridge(Math.floor(cx) % width) + 3, h = h0 + r() * (h1 - h0);
    wrap(xx => pine(x, xx, base, h, r() < 0.5 ? cols.a : cols.b, cols.dark), cx);
  }
}

// Flat-bottomed cloud bank: bumpy white top, soft blue underside.
function cloudBank(x, cx, cy, w, seed) {
  const r = rng(seed), puffs = [];
  for (let i = 0; i < w / 7; i++) puffs.push([cx - w / 2 + r() * w, cy - r() * w * 0.12, 4 + r() * w * 0.12]);
  for (const [a, b, c] of puffs) circ(x, '#c4d8f0', a + 1, b + 2, c);
  for (const [a, b, c] of puffs) circ(x, '#ffffff', a, b, c);
  for (const [a, b, c] of puffs) circ(x, '#f0f8ff', a + c * 0.25, b + c * 0.3, c * 0.6);
  px(x, '#d4e4f6', cx - w / 2 - 6, cy + 2, w + 12, 3);
  px(x, '#b8cee8', cx - w / 2, cy + 5, w, 1);
}
