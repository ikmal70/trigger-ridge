// Levels are drawn as text. Each section is 20 rows; shorter rows are padded with '.'.
//   #  earth       R  ruin stone       =  branch (one-way)      ^  bramble (hurts)     ~  water (hurts)
//   P  player      K  thorn knight     W  blight wisp           h  heal bloom          S  spirit stone (checkpoint)
//   G  exit gate   t  big tree (scenery)
const ROWS = 20;
const G3 = '#'.repeat(30);

const STAGE_TEST = {
  sections: [
    [ // meadow: run and jump
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      '..............h',
      '............=====',
      '',
      '...P..t...............t',
      G3, G3, G3,
    ],
    [ // ruins, brambles and the first knight
      '', '', '', '', '', '', '', '',
      '..................W',
      '',
      '.................h',
      '................RRR',
      '', '',
      '.........RRRR',
      '',
      '..t...................K....t',
      '#'.repeat(14) + '^^^^' + '#'.repeat(12),
      G3, G3,
    ],
    [ // a chasm only flight can cross, with a pillar to rest on
      '', '', '', '', '', '', '',
      '...................W',
      '',
      '..........W',
      '', '', '', '',
      '..............RR',
      '..............RR',
      '..S...........RR',
      '######........RR........######',
      '######~~~~~~~~RR~~~~~~~~######',
      '######~~~~~~~~RR~~~~~~~~######',
    ],
    [ // climb to the plateau: step, branch, then up
      '', '', '', '', '',
      '................W',
      '', '', '',
      '..............t.....K.....h',
      '............' + '#'.repeat(18),
      '............' + '#'.repeat(18),
      '........===.' + '#'.repeat(18),
      '............' + '#'.repeat(18),
      '........' + '#'.repeat(22),
      '........' + '#'.repeat(22),
      '..t.....' + '#'.repeat(22),
      G3, G3, G3,
    ],
    [ // down to the gate past two knights
      '', '', '', '', '', '', '', '', '', '',
      '######',
      '######............W',
      '######', '######', '######', '######',
      '######....K....t....K.....G',
      G3, G3, G3,
    ],
  ],
};

const isSolid = ch => ch === '#' || ch === 'R' || ch === '^';
const isFloor = ch => isSolid(ch) || ch === '=';
const EPS = 0.01; // box edges are exclusive; fractional positions need a tiny margin, not 1px

const BUTTERFLY_COLS = ['#ff9a30', '#6ab4ff', '#ffe040', '#ffffff', '#ff7ab8'];
const LUPINE_COLS = [['#8a6aff', '#d0c0ff'], ['#ff6aa8', '#ffd0e4'], ['#5a9aff', '#c8e0ff']];

class Level {
  constructor(def) {
    const rows = Array.from({ length: ROWS }, (_, r) => def.sections.map(sec => {
      const width = Math.max(...sec.map(s => s.length));
      return (sec[r] || '').padEnd(width, '.');
    }).join(''));
    this.w = rows[0].length;
    this.h = ROWS;
    this.pxW = this.w * T;
    this.pxH = this.h * T;
    this.spawns = [];
    this.trees = [];
    this.grid = rows.map((row, ty) => [...row].map((ch, tx) => {
      if (ch === 't') this.trees.push({ tx, ty });
      else if ('PKWhSG'.includes(ch)) this.spawns.push({ type: ch, tx, ty });
      return '#R=^~'.includes(ch) ? ch : '.';
    }));
    this.plants = [];
    this.butterflies = [];
    this.canvas = this.render();
  }

  // Off the left/right edge is wall; above and below is open air (below = a pit).
  tile(tx, ty) {
    if (tx < 0 || tx >= this.w) return '#';
    if (ty < 0 || ty >= this.h) return '.';
    return this.grid[ty][tx];
  }

  tileAt(px, py) {
    return this.tile(Math.floor(px / T), Math.floor(py / T));
  }

  touches(box, ch) {
    for (let ty = Math.floor(box.y / T); ty <= Math.floor((box.y + box.h - EPS) / T); ty++)
      for (let tx = Math.floor(box.x / T); tx <= Math.floor((box.x + box.w - EPS) / T); tx++)
        if (this.tile(tx, ty) === ch) return true;
    return false;
  }

  // Bakes trees, tiles and still scenery into one canvas; collects swaying plants and butterflies.
  render() {
    const c = makeCanvas(this.pxW, this.pxH), x = c.getContext('2d'), R = rng(77);
    const KINDS = [PAL.emerald, PAL.blossom, PAL.autumn, PAL.teal];
    this.trees.forEach(({ tx, ty }, i) => {
      const cx = tx * T + 8, base = (ty + 1) * T + 3;
      if (i % 4 === 3) willow(x, cx, base, 24, i);
      else tree(x, cx, base, 26 + (R() * 10 | 0), KINDS[i % KINDS.length], true, i);
    });

    for (let ty = 0; ty < this.h; ty++)
      for (let tx = 0; tx < this.w; tx++) {
        const ch = this.grid[ty][tx], px0 = tx * T, py = ty * T, v = (tx * 7 + ty * 3) % 5, open = !isSolid(this.tile(tx, ty - 1));
        if (ch === '#') {
          const depth = open ? 0 : !isSolid(this.tile(tx, ty - 2)) ? 1 : 2;
          x.drawImage(depth === 0 ? TILES.top[v % 4] : depth === 1 ? TILES.soil[v] : TILES.deep[v], px0, py);
          if (!isSolid(this.tile(tx - 1, ty))) px(x, '#2a1810', px0, py + (open ? 6 : 0), 1, open ? 10 : 16);
          if (!isSolid(this.tile(tx + 1, ty))) px(x, '#2a1810', px0 + 15, py + (open ? 6 : 0), 1, open ? 10 : 16);
        } else if (ch === 'R') {
          x.drawImage(TILES.stone[v % 3], px0, py);
          if (open) for (let i = 0; i < T; i++) {
            px(x, '#2e9a3a', px0 + i, py - 1, 1, 3);
            px(x, '#58d048', px0 + i, py - 1);
            if ((tx * 16 + i) % 5 === 2) px(x, '#2e9a3a', px0 + i, py + 2, 1, 2 + (i % 3));
          }
        } else if (ch === '=') x.drawImage(TILES.branch[v % 3], px0, py);
        else if (ch === '^') x.drawImage(TILES.bramble[v % 2], px0, py);
        else if (ch === '~') x.drawImage(this.tile(tx, ty - 1) === '~' ? TILES.water : TILES.waterTop, px0, py);

        // scenery on open grass tops
        if (ch !== '#' || !open || this.tile(tx, ty - 1) !== '.') continue;
        const r = R(), gx = px0 + (R() * 12 | 0) + 2, nearWater = this.tile(tx - 1, ty + 1) === '~' || this.tile(tx + 1, ty + 1) === '~';
        if (r < 0.06) rock(x, gx, py + 1, 4 + (R() * 3 | 0));
        else if (r < 0.12) mushroom(x, gx, py, 2 + (R() * 2 | 0));
        else if (r < 0.2) bush(x, gx, py + 2, 6 + (R() * 3 | 0), PAL.emerald, R() < 0.5 ? FLOWER_COLS[R() * 6 | 0] : null, tx);
        for (let i = 0; i < 3; i++) {
          const k = R(), at = px0 + R() * 16;
          const type = nearWater && k < 0.5 ? 'cattail' : k < 0.45 ? 'tuft' : k < 0.75 ? 'flower' : k < 0.85 ? 'lupine' : k < 0.92 ? 'fern' : 'sunflower';
          this.plants.push({ type, x: at, y: py, h: 6 + (R() * 8 | 0), seed: tx * 9 + i, col: type === 'lupine' ? LUPINE_COLS[R() * 3 | 0] : FLOWER_COLS[R() * 6 | 0] });
        }
        if (R() < 0.08) this.butterflies.push({ hx: px0 + 8, hy: py - 18, x: px0 + 8, y: py - 18, ph: R() * 6.28, col: BUTTERFLY_COLS[R() * 5 | 0] });
      }
    return c;
  }

  draw(ctx, cam) {
    ctx.drawImage(this.canvas, -cam.x, -cam.y);
  }

  // Plants sway in the breeze and butterflies flutter; only what's on screen is drawn.
  drawLife(ctx, cam, t) {
    for (const p of this.plants) {
      const sx = p.x - cam.x;
      if (sx < -10 || sx > W + 10) continue;
      const sy = p.y - cam.y, sway = Math.round(Math.sin(t * 0.04 + p.x * 0.05) * 1.5 + Math.sin(t * 0.11 + p.x) * 0.4);
      if (p.type === 'tuft') tuft(ctx, sx, sy, 4, sway, p.seed);
      else if (p.type === 'flower') flower(ctx, Math.round(sx + sway * 0.5), sy, Math.round(p.h * 0.6), p.col);
      else if (p.type === 'lupine') lupine(ctx, sx, sy, p.h + 4, sway, p.col);
      else if (p.type === 'fern') fern(ctx, sx, sy, 6, sway);
      else if (p.type === 'sunflower') sunflower(ctx, sx, sy, p.h + 8, sway);
      else cattail(ctx, sx, sy, p.h + 6, sway);
    }
    for (const b of this.butterflies) {
      b.x = b.hx + Math.sin(t * 0.021 + b.ph) * 30 + Math.sin(t * 0.07 + b.ph * 2) * 6;
      b.y = b.hy + Math.sin(t * 0.033 + b.ph) * 10 + Math.sin(t * 0.13 + b.ph) * 3;
      const sx = b.x - cam.x;
      if (sx > -4 && sx < W + 4) butterfly(ctx, Math.round(sx), Math.round(b.y - cam.y), (t >> 2) & 1, b.col);
    }
  }
}

// Axis-separated movement against the tile grid. Sets b.onGround and b.hitWall.
function moveBody(b, level) {
  b.onGround = false;
  b.hitWall = false;
  if (b.vx) {
    b.x += b.vx;
    const top = Math.floor(b.y / T), bot = Math.floor((b.y + b.h - EPS) / T);
    const tx = Math.floor((b.vx > 0 ? b.x + b.w - EPS : b.x) / T);
    for (let ty = top; ty <= bot; ty++)
      if (isSolid(level.tile(tx, ty))) {
        b.x = b.vx > 0 ? tx * T - b.w : (tx + 1) * T;
        b.vx = 0;
        b.hitWall = true;
        break;
      }
  }
  const prevBottom = b.y + b.h;
  b.y += b.vy;
  const l = Math.floor(b.x / T), r = Math.floor((b.x + b.w - EPS) / T);
  if (b.vy > 0) {
    const ty = Math.floor((b.y + b.h - EPS) / T);
    for (let tx = l; tx <= r; tx++) {
      const ch = level.tile(tx, ty);
      if (isSolid(ch) || (ch === '=' && prevBottom <= ty * T && !b.dropThrough)) {
        b.y = ty * T - b.h;
        b.vy = 0;
        b.onGround = true;
        break;
      }
    }
  } else if (b.vy < 0) {
    const ty = Math.floor(b.y / T);
    for (let tx = l; tx <= r; tx++)
      if (isSolid(level.tile(tx, ty))) {
        b.y = (ty + 1) * T;
        b.vy = 0;
        break;
      }
  }
}
