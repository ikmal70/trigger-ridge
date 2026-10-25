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
  // A Metal Slug–style commando: spiky hair, olive vest with pouches, cargo pants, red scarf, jetpack.
  rowan: {
    head: buildImage([
      '...o.o.o...',
      '..oHoHoHo..',
      '.oHHhHhhHo.',
      'ohhhhhhhhho',
      'ohhhhhsssso',
      'ohhhssswEso',
      'ohhssssssSo',
      '.ohssssmsSo',
      '..osssssSo.',
      '...oooooo..',
    ], { o: OL, h: '#6a3a1e', H: '#a0602e', s: '#f4c8a0', S: '#d0966c', w: '#ffffff', E: '#1a1420', m: '#a05040' }),
    // Chunky and hunched: wide shoulders sit ahead of the hips.
    torso: buildImage([
      '....ootttoo.',
      '..ooVVtttvvo',
      '.oVVvvtvvvdo',
      'oVVppvvvppdo',
      'oVPPpvvPPpdo',
      'oVvvvvvvvvdo',
      'odvvvvvvvdo.',
      'obbbbgbbbbo.',
      '.ovvvvvvvo..',
      '.ooooooooo..',
    ], { o: OL, v: '#6a7a3a', V: '#8a9a4a', d: '#4a5628', p: '#7a6a3a', P: '#a08a4a', t: '#ece4cc', b: '#3a2818', g: '#e8b848' }),
    shoulder: [-1, 4],
    hips: [-2, 2],
    limbs: { upper: 4, fore: 4, armW: 3, thigh: 5, shin: 6 },
    arm: { back: ['#c08860', '#c08860'], front: ['#f4c8a0', '#f4c8a0'], shade: ['#d0966c', '#d0966c'], glove: '#3a3028' },
    leg: { back: ['#8a7448', '#8a7448'], front: ['#b89a64', '#b89a64'], shade: ['#8a7044', '#8a7044'], w: 4 },
    boot: ['#4a3020', '#6a4a2a'],
    cloak: null,
    scarf: ['#e03848', '#a02030'],
    pauldron: null,
    jetpack: true,
    sheath: true,
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
    leg: { back: ['#2e2440', '#2e2440'], front: ['#4a3a5a', '#4a3a5a'], shade: ['#2e2440', '#2e2440'], w: 2 },
    boot: ['#1a1224', '#3a2e4a'],
    cloak: { base: '#4a2050', light: '#6a3070', inner: '#2a1030' },
    scarf: null,
    pauldron: ['#7ab040', '#b8e070'],
    horns: true,
  },
};

// Combat machete: red-wrapped grip, broad blade curving back toward a bright edge.
function blade(x, hand, deg) {
  const a = deg * DEG, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
  const at = (i, off) => [Math.round(hand[0] + dx * i + nx * off), Math.round(hand[1] + dy * i + ny * off)];
  const dot = (i, off, col) => { const [p, q] = at(i, off); px(x, col, p, q); };
  for (let i = -4; i <= 0; i++) dot(i, 0, i % 2 ? '#a02020' : '#2a1a1a');
  for (const o of [-1, 0, 1]) dot(1, o, '#3a3a44');
  const LEN = 15;
  for (let i = 2; i <= LEN; i++) {
    const k = (i - 2) / (LEN - 2), curve = k * k * 2.2, wide = i < LEN - 1 ? 2 : 1;
    for (let o = -1; o <= wide; o++) dot(i, o - curve, OL);
    dot(i, -curve, '#7a7e8c');
    if (wide > 1) dot(i, 1 - curve, '#c8ccd6');
    dot(i, wide - curve, i === LEN ? '#ffffff' : '#f4f6fa');
  }
}

// Heavy machine gun at any angle (0 = forward, -90 = up, 90 = down). kick pushes it back
// along the barrel for recoil; flash draws a big muzzle flash that changes shape every shot.
function gun(x, hand, deg, flash, kick = 0) {
  const a = deg * DEG, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
  const at = (i, off) => [Math.round(hand[0] + dx * (i - kick) + nx * off), Math.round(hand[1] + dy * (i - kick) + ny * off)];
  // parts: [from, to, offsets across the gun, color]; "+" offsets are below the gun when it points forward
  const parts = [
    [-6, -3, [0, 1], '#5a3a24'],          // stock
    [-3, 5, [-1, 0, 1], '#4a4e5c'],       // receiver
    [-3, 5, [-1], '#8a90a4'],             // receiver highlight
    [1, 3, [2, 3, 4], '#3a3e4a'],         // magazine
    [6, 10, [-1, 0], '#5a5e6c'],          // barrel shroud
    [11, 15, [0], '#2e3038'],             // barrel
  ];
  for (const [i0, i1, offs] of parts)
    for (let i = i0 - 1; i <= i1 + 1; i++)
      for (const o of [Math.min(...offs) - 1, ...offs, Math.max(...offs) + 1]) { const [p, q] = at(i, o); px(x, OL, p, q); }
  for (const [i0, i1, offs, col] of parts)
    for (let i = i0; i <= i1; i++) for (const o of offs) { const [p, q] = at(i, o); px(x, col, p, q); }
  for (const i of [7, 9]) { const [p, q] = at(i, -1); px(x, '#1a1c24', p, q); } // shroud holes
  if (!flash) return;
  const [fx, fy] = at(18, 0), big = flash === 2;
  x.globalAlpha = 0.5;
  circ(x, '#ffe060', fx + dx * 2, fy + dy * 2, big ? 5 : 4);
  x.globalAlpha = 1;
  px(x, '#ffffff', fx - 1, fy - 1, 3, 3);
  for (const [ox, oy, r] of [[dx * 4, dy * 4, 2], [dx * 7, dy * 7, 1], [nx * 3, ny * 3, 1], [-nx * 3, -ny * 3, 1]]) px(x, '#ffe060', fx + ox - r / 2, fy + oy - r / 2, r + 1, r + 1);
  px(x, '#ff9030', fx + dx * (big ? 9 : 8), fy + dy * (big ? 9 : 8), 2, 2);
}

// Jetpack worn on the back. thrust 0..1 shoots fire out of both nozzles.
function jetpack(x, x0, y0, thrust, t, tilt = 0) {
  px(x, OL, x0, y0, 6, 11);
  px(x, '#6a7088', x0 + 1, y0 + 1, 4, 9);
  px(x, '#9aa2b8', x0 + 1, y0 + 1, 1, 9);
  px(x, '#e03848', x0 + 1, y0 + 3, 4, 1);
  for (const nx of [x0, x0 + 3]) { px(x, OL, nx, y0 + 10, 3, 3); px(x, '#3a3e50', nx + 1, y0 + 10, 1, 2); }
  if (!thrust) return;
  for (const nx of [x0 + 1, x0 + 4]) {
    const len = Math.round(thrust * (5 + ((Math.floor(t * 9) + nx) % 4)));
    for (let i = 0; i < len; i++) {
      const k = i / len, wob = k > 0.4 && (i + Math.floor(t * 9)) % 2 ? 1 : 0;
      px(x, k < 0.2 ? '#ffffff' : k < 0.45 ? '#ffe060' : k < 0.75 ? '#ff9030' : '#e04020', nx - wob - tilt * i * 0.35, y0 + 13 + i, k < 0.55 ? 2 : 1, 1);
    }
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

  if (skin.cloak) { // a tattered sheet hanging from the shoulders, swept back by motion
    const cy0 = hy - 7, cy1 = hy + 5;
    for (let y = cy0; y <= cy1; y++) {
      const k = (y - cy0) / (cy1 - cy0);
      const left = Math.round(hx - 3 + lean - k * (1 + flow * 7) - Math.sin(t * 1.7 + y * 0.35) * k * 1.5);
      const right = Math.round(hx + lean - 1 - k * flow * 4);
      px(x, OL, left - 1, y, right - left + 2, 1);
      px(x, k > 0.15 && k < 0.95 ? skin.cloak.base : skin.cloak.light, left, y, right - left, 1);
      px(x, skin.cloak.inner, right - 1, y);
    }
  }

  const L = skin.limbs || { upper: 4, fore: 4, armW: 2, thigh: 6, shin: 6 };
  const arm = (sh, [up, el], back) => {
    const e = fwd(sh, up, L.upper), hand = fwd(e, up + el, L.fore);
    limb(x, [sh, e, hand], L.armW, back ? skin.arm.back : skin.arm.front, back ? null : skin.arm.shade);
    if (skin.arm.glove) px(x, skin.arm.glove, hand[0] - 1, hand[1] - 1, 2, 2);
    return hand;
  };
  const leg = ([th, kn], hip, back) => {
    const k = fwd(hip, th, L.thigh), a = fwd(k, th - kn, L.shin);
    limb(x, [hip, k, a], skin.leg.w, back ? skin.leg.back : skin.leg.front, back ? null : skin.leg.shade);
    px(x, OL, a[0] - 2, a[1] - 1, 7, 3);
    px(x, back ? OL : skin.boot[0], a[0] - 1, a[1] - 1, 5, 2);
    if (!back) px(x, skin.boot[1], a[0] - 1, a[1] - 1, 2, 1);
    return a[1];
  };

  const th = skin.torso.height, tw = skin.torso.width, top = hy + 1 - th; // torso top
  const [sb, sf] = skin.shoulder || [-2, 2], [hb, hf] = skin.hips || [-1, 1];
  const shoulderB = [hx + sb + lean, top + 3], shoulderF = [hx + sf + lean, top + 3];
  arm(shoulderB, pose.arms[0], true);
  const footY = Math.max(leg(pose.legs[0], [hx + hb, hy], true), leg(pose.legs[1], [hx + hf, hy], false));
  if (skin.sheath && pose.sword == null) { // sword sheathed across the back, hilt over the shoulder
    for (let i = 0; i < 13; i++) px(x, i < 3 ? '#5a3a24' : '#3a2818', hx - 9 + lean + i * 0.7, top - 3 + i, 2, 1);
    px(x, '#e8b848', hx - 8 + lean, top - 1, 3, 1);
  }
  if (skin.jetpack && pose.gun == null) gun(x, [hx - 8 + lean, top - 2], 70); // machine gun slung on the back
  if (skin.jetpack) jetpack(x, hx - 11 + lean, top, pose.jet || 0, t, pose.jetTilt || 0);
  x.drawImage(skin.torso, hx - Math.floor(tw / 2) + lean, top);
  const hw = skin.head.width;
  x.drawImage(skin.head, hx - Math.floor(hw / 2) + 1 + lean + (pose.hunch || 0), top + 2 - skin.head.height + (pose.hunch || 0));
  if (skin.horns) {
    const ox = hx - 3 + lean, oy = top + 2 - skin.head.height;
    px(x, '#7ab040', ox + 1, oy - 2, 1, 2);
    px(x, '#7ab040', ox, oy - 3);
    px(x, '#7ab040', ox + 5, oy - 2, 1, 2);
    px(x, '#7ab040', ox + 6, oy - 3);
  }
  if (skin.scarf) {
    const pts = [];
    for (let i = 1; i <= 9; i++)
      pts.push([hx + lean - 2 - i * 2.3 * (0.4 + flow), top + i * (0.9 - flow * 0.6) + Math.sin(t * 1.3 + i * 0.8) * i * 0.25, i < 6 ? 2 : 1]);
    for (const [sx, sy, s] of pts) px(x, OL, sx - 1, sy - 1, s + 2, s + 2);
    pts.forEach(([sx, sy, s], i) => px(x, skin.scarf[i % 2], sx, sy, s, s));
    px(x, OL, hx + lean - 3, top - 1, 9, 3); // knot at the neck
    px(x, skin.scarf[0], hx + lean - 2, top, 7, 1);
  }
  const hand = arm(shoulderF, pose.arms[1], false);
  if (skin.pauldron) {
    px(x, OL, shoulderF[0] - 2, shoulderF[1] - 2, 5, 4);
    px(x, skin.pauldron[0], shoulderF[0] - 1, shoulderF[1] - 1, 3, 2);
    px(x, skin.pauldron[1], shoulderF[0] - 1, shoulderF[1] - 1, 2, 1);
  }
  if (pose.sword != null) blade(x, hand, pose.sword);
  if (pose.gun != null) gun(x, hand, pose.gun, pose.flash, pose.kick);
  if (pose.mace != null) mace(x, hand, pose.mace);
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

// Pose library. Arrays are [back, front]; each limb is [upper angle, bend]. gun = screen angle of the handgun.
const CARRY = { arms: [[78, 18], [88, 6]], gun: 0 }; // machine gun held level at the chest, both hands
const BOB = [0, 1, 2, 1]; // idle breathing: knees bend in a 4-step rhythm, so the whole body rises and falls

const POSE = {
  idle: t => {
    const s = BOB[(t >> 3) & 3];
    return { hy: 0, lean: 2, hunch: 1, flow: 0.25, legs: [[-30 - s * 2, 48 + s * 9], [34 + s * 2, 62 + s * 9]], ...CARRY };
  },
  run: (frame, flow = 0.9) => {
    const p = frame / 8 * Math.PI * 2;
    return {
      hy: Math.abs(Math.sin(p)) > 0.7 ? 0 : -1, lean: 3, hunch: 1, flow,
      legs: [[6 + 38 * Math.sin(p + Math.PI), 42 + 60 * Math.max(0, Math.cos(p + Math.PI))], [6 + 38 * Math.sin(p), 42 + 60 * Math.max(0, Math.cos(p))]],
      ...CARRY,
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
  skid: { hy: 4, lean: -1, hunch: 1, flow: 1.0, legs: [[-40, 20], [30, 50]], arms: [[-40, 20], [40, 40]], gun: 30 },
  rise: { hy: 1, lean: 1, hunch: 1, flow: 0.2, legs: [[-12, 40], [40, 85]], ...CARRY },
  peak: { hy: 1, lean: 2, hunch: 1, flow: 0.6, legs: [[10, 60], [35, 75]], ...CARRY },
  fall: { hy: 1, lean: 1, hunch: 1, flow: 0.1, legs: [[-22, 30], [25, 45]], ...CARRY },
  flip: { hy: -1, lean: 2, hunch: 1, flow: 0.9, legs: [[50, 100], [70, 110]], ...CARRY, jet: 0.6 },
  land: { hy: 6, lean: 3, hunch: 2, flow: 0.5, legs: [[40, 95], [55, 105]], ...CARRY },
  jet: { hy: 2, lean: 2, hunch: 1, flow: 1.0, legs: [[-25, 50], [-5, 45]], ...CARRY, jet: 1 },
  dash: { hy: 3, lean: 4, hunch: 2, flow: 1.5, legs: [[-50, 30], [30, 75]], arms: [[-60, 20], [-40, 30]], gun: 150, jet: 0.7 },
  hurt: { hy: 1, lean: -2, flow: 0.2, legs: [[-20, 30], [10, 40]], arms: [[-140, 20], [-120, 30]], gun: -40 },
  lunge: [{ hy: 3, lean: 0, hunch: 1, legs: [[-18, 30], [26, 50]] }, { hy: 4, lean: 3, hunch: 1, legs: [[-32, 20], [48, 70]] }, { hy: 4, lean: 3, hunch: 1, legs: [[-32, 20], [48, 75]] }],
};

// Both hands on the gun pointing at aimDeg (0 = forward, -90 = up, 90 = down, any angle between).
function aimArms(aimDeg) {
  const up = 90 - aimDeg;
  return { arms: [[up - 10, 22], [up, 2]], gun: aimDeg };
}


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
      px(x, k < 0.15 ? '#ffffff' : k < 0.4 ? '#ffeccc' : k < 0.7 ? '#ffb050' : '#c05028', pxl, py);
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
    const half = p.w / 2, inv = half / Math.max(1, p.h); // horizontal run per pixel of drop along the outline
    for (let y = top; y < H; y++) {
      const rel = y - top, height = baseY - y; // height of this pixel above the range's foot
      const ridge = bd + rel * 0.18 * (p.r - p.l) + Math.sin(y * 0.3 + p.x) * 2 + Math.sin(y * 0.08 + p.x * 3) * 4;
      const lit = ridge < 0;
      // Rock facets: angled planes fanning down from the summit, each a slightly different tone,
      // separated by thin dark cracks — like chiselled rock faces.
      const fw = Math.max(6, half * 0.28);
      const u = (Math.abs(ridge) - rel * inv * 0.38 + Math.sin(rel * 0.13 + i * 0.04 + p.x) * fw * 0.35) / fw;
      const facet = Math.floor(u), frac = u - facet;
      const tone = mod(facet * 7 + Math.round(p.x), 3);
      let col = lit ? [C.lit, C.litMid, C.litHi][tone] : [C.shade, C.shadeMid, C.shade][tone];
      if (frac < 0.07 && rel > 3 && rel < best * 0.8) col = lit ? C.litCrack : C.crack;
      if (Math.abs(ridge) < 0.8 && rel < best * 0.5) col = C.ridge;
      if (p.snow) { // snow sits near the top and streaks down the gullies
        const gully = frac < 0.35 && tone !== 1 ? 10 : 0;
        const line = p.h - p.snow + Math.sin(i * 0.7 + p.x) * 2 + Math.sin(i * 0.23) * 3 - gully;
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
