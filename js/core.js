// Shared constants and small helpers.
const W = 384, H = 216, T = 16; // widescreen view, 16px tiles
const DEG = Math.PI / 180;

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Deterministic RNG so generated art looks the same on every load.
function rng(seed) {
  return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
}

const mod = (a, n) => ((a % n) + n) % n;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// Pixel drawing primitives.
function px(x, c, a, b, w = 1, h = 1) {
  x.fillStyle = c;
  x.fillRect(Math.round(a), Math.round(b), w, h);
}

function circ(x, c, cx, cy, r) {
  x.fillStyle = c;
  for (let dy = -Math.floor(r); dy <= Math.floor(r); dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy) + 0.3);
    x.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2 + 1, 1);
  }
}
