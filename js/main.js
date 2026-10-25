// Game state, fixed-timestep loop, camera, HUD and screens.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// Scale the 384x216 screen by the largest whole number that fits the window.
function fit() {
  const s = Math.max(1, Math.floor(Math.min(innerWidth / W, innerHeight / H)));
  canvas.style.width = W * s + 'px';
  canvas.style.height = H * s + 'px';
}
addEventListener('resize', fit);
fit();

const ENTITY_TYPES = { K: Knight, W: Wisp, h: Bloom, S: SpiritStone, G: Gate };

const game = {
  state: 'title', stateT: 0, t: 0, startT: 0,
  level: null, player: new Player(), entities: [], fx: new Effects(),
  cam: { x: 0, y: 0, look: 0 }, checkpoint: null, hitstop: 0, shake: 0,

  setState(s) { this.state = s; this.stateT = 0; },
  freeze(n) { this.hitstop = Math.max(this.hitstop, n); },
  quake(n) { this.shake = Math.max(this.shake, n); },

  spawn(e, x, y) {
    e.x = x;
    e.y = y;
    this.entities.push(e);
    return e;
  },

  // Defeated enemies sometimes leave a healing petal.
  drop(x, y, chance) {
    if (Math.random() < chance) this.spawn(new Petal(), x - 4, y);
  },

  start() {
    this.level = new Level(STAGE_TEST);
    const p = this.level.spawns.find(s => s.type === 'P');
    this.checkpoint = { x: p.tx * T + T / 2, bottom: (p.ty + 1) * T, id: null };
    this.startT = this.t;
    this.respawn();
  },

  // (Re)build the stage's entities and put Rowan at the last checkpoint.
  respawn() {
    this.entities = [];
    this.fx = new Effects();
    for (const s of this.level.spawns) {
      const Type = ENTITY_TYPES[s.type];
      if (!Type) continue;
      const e = new Type(`${s.tx},${s.ty}`);
      this.spawn(e, s.tx * T + T / 2 - e.w / 2, e instanceof Wisp ? s.ty * T + 2 : (s.ty + 1) * T - e.h);
      if (e instanceof SpiritStone && e.id === this.checkpoint.id) e.lit = true;
    }
    const p = this.player;
    p.spawn(this.checkpoint.x - p.w / 2, this.checkpoint.bottom - p.h);
    this.hitstop = 0;
    this.shake = 0;
    this.updateCamera(true);
    this.setState('play');
  },

  hitTest(box, atk, dir) {
    let hit = false;
    for (const e of this.entities) {
      if (!e.hittable || e.dead || atk.hit.has(e) || !overlap(box, e)) continue;
      atk.hit.add(e);
      e.onHit(this, atk.dmg, dir, atk.kb);
      hit = true;
    }
    return hit;
  },

  onPlayerDeath() {
    const p = this.player;
    this.fx.burst(p.cx, p.cy, 30, ['#e03848', '#5ff0e0', '#ffffff', '#3a4680'], { speed: 3, grav: -0.02, life: 60 });
    this.quake(5);
    Sfx.play('die');
    this.setState('dead');
  },

  stageClear() {
    if (this.state !== 'play') return;
    Sfx.play('clear');
    this.setState('clear');
  },

  updateCamera(snap) {
    const p = this.player, c = this.cam;
    c.look = snap ? p.facing * 40 : c.look + (p.facing * 40 - c.look) * 0.04;
    const tx = clamp(p.cx + c.look - W / 2, 0, this.level.pxW - W);
    const ty = clamp(p.cy - H * 0.58, 0, this.level.pxH - H);
    c.x = snap ? tx : c.x + (tx - c.x) * 0.12;
    c.y = snap ? ty : c.y + (ty - c.y) * 0.1;
  },

  stepPlay() {
    if (Input.pressed('start')) {
      Sfx.play('select');
      return this.setState('paused');
    }
    if (this.hitstop > 0) {
      this.hitstop--;
      this.player.bufferInput();
      return;
    }
    const p = this.player, mid = this.cam.x + W / 2;
    p.update(this);
    if (this.state !== 'play') return;
    for (const e of this.entities) {
      if (!e.awake && Math.abs(e.cx - mid) > W / 2 + 40) continue;
      e.awake = true;
      e.update(this);
      if (e.contactDmg && !e.dead && overlap(p.hurtbox, e) && !p.invuln && !p.dashT) {
        p.takeDamage(this, e.contactDmg, e.cx);
        if (e.dieOnContact) e.dead = true;
      }
    }
    this.entities = this.entities.filter(e => !e.dead);
    this.fx.update();
    this.updateCamera(false);
  },

  update() {
    this.t++;
    this.stateT++;
    this.shake = this.shake > 0.5 ? this.shake * 0.85 : 0;
    Background.update(this.t);
    const go = Input.pressed('start'); // only Enter / Esc starts a game, never a click or jump
    switch (this.state) {
      case 'title':
        if (go) {
          Sfx.init();
          Sfx.play('select');
          this.start();
        }
        break;
      case 'play':
        this.stepPlay();
        break;
      case 'paused':
        if (Input.pressed('start')) this.setState('play');
        break;
      case 'dead':
        this.fx.update();
        if (this.stateT > 150) this.respawn();
        break;
      case 'clear':
        this.fx.update();
        if (this.stateT > 60 && go) this.start();
        break;
    }
  },
};

// ---------------------------------------------------------------- rendering
const text = (str, x, y, color, opts = {}) => drawText(ctx, str, x, y, color, { shadow: '#1a1428', ...opts });

function bar(bx, by, w, h, frac, c1, c2, segs) {
  px(ctx, '#1a1428', bx - 1, by - 1, w + 2, h + 2);
  px(ctx, '#3a3050', bx, by, w, h);
  const fw = Math.round(w * clamp(frac, 0, 1));
  px(ctx, c1, bx, by, fw, h);
  px(ctx, c2, bx, by, fw, 1);
  if (segs) for (let i = segs; i < w; i += segs) px(ctx, '#1a1428', bx + i, by, 1, h);
}

const HUD_ICONS = {
  gun: buildImage([
    '....oooooooo......',
    '.ooomMMMMMMMoooooo',
    'obbommmmmmmmssssso',
    'obboooommmmooooooo',
    '.oo...ommmo.......',
    '.......ooo........',
  ], { o: OL, M: '#8a90a4', m: '#4a4e5c', s: '#2e3038', b: '#5a3a24' }),
  sword: buildImage([
    '..o..............',
    'rkokoooooooooo...',
    'kroggWWWWWWWWWWoo',
    'rkoggwwwwwwwwwwwo',
    '..o.oooooooooooo.',
  ], { o: OL, r: '#a02020', k: '#2a1a1a', g: '#3a3a44', W: '#ffffff', w: '#c8ccd6' }),
};

// Compact HUD: portrait, HP bar, and the weapon in hand (switch with Q / right click / wheel).
function drawHUD() {
  const p = game.player;
  ctx.globalAlpha = 0.5;
  px(ctx, '#141024', 3, 3, 128, 18);
  ctx.globalAlpha = 1;
  px(ctx, '#e8b848', 4, 4, 16, 16);
  px(ctx, '#1a1428', 5, 5, 14, 14);
  ctx.drawImage(SKINS.rowan.head, 7, 7, 10, 10);
  const low = p.hp <= 6 && game.t % 20 < 6;
  px(ctx, '#ff4a6a', 23, 9, 2, 2);
  bar(27, 8, 44, 5, low ? 0 : p.hp / p.maxHp, '#ff4a6a', '#ffb0c0', 5);
  // weapon box
  px(ctx, '#e8b848', 76, 4, 54, 16);
  px(ctx, '#1a1428', 77, 5, 52, 14);
  if (p.weapon === 'gun') {
    ctx.drawImage(HUD_ICONS.gun, 79, 7);
    text('INF', 98, 13, '#ffe060');
  } else {
    ctx.drawImage(HUD_ICONS.sword, 79, 8);
    text('BLADE', 97, 13, '#ffb050');
  }
  text('Q', 123, 6, '#8a8aa0', { shadow: null });

  if (game.t - game.startT < 900) {
    text('A D MOVE   SPACE JUMP / DOUBLE JUMP   V JETPACK   SHIFT DASH', W / 2, H - 22, '#ffffff', { align: 'center' });
    text('MOUSE AIM   LEFT CLICK ATTACK   RIGHT CLICK / Q SWITCH WEAPON', W / 2, H - 12, '#ffffff', { align: 'center' });
  }
}

// Aiming reticle that replaces the mouse pointer over the game.
function drawCrosshair() {
  const m = Input.mouse;
  if (!m.active || game.player.dead) return;
  const x = Math.round(m.x), y = Math.round(m.y), c = game.player.weapon === 'gun' ? '#ffffff' : '#ffb050';
  for (const [dx, dy, w, h] of [[-6, 0, 4, 1], [3, 0, 4, 1], [0, -6, 1, 4], [0, 3, 1, 4]]) {
    px(ctx, OL, x + dx - 1, y + dy - 1, w + 2, h + 2);
    px(ctx, c, x + dx, y + dy, w, h);
  }
  px(ctx, '#ff4a6a', x, y, 1, 1);
}

function dim(alpha, color = '#0e0a1c') {
  ctx.globalAlpha = alpha;
  px(ctx, color, 0, 0, W, H);
  ctx.globalAlpha = 1;
}

function drawTitle() {
  const cam = { x: game.t * 0.4, y: 104 };
  Background.draw(ctx, cam, 104, game.t);
  Background.drawFront(ctx, cam, game.t);
  for (let i = 0; i < W; i += 16) ctx.drawImage(TILES.top[(i >> 4) & 3], i, 196);
  drawRig(ctx, SKINS.rowan, { ...POSE.idle(game.t), flow: 0.9 }, W / 2, 196, 1, game.t * 0.15);
  drawLogo(W / 2, 14);
  plate(W / 2 - 42, 144, 84, 15);
  text('PRESS ENTER', W / 2, 149, (game.t >> 5) % 2 ? '#ffe070' : '#8a7a40', { align: 'center' });
}

// Dark plate with cut corners, an olive border and a gold trim line.
function plate(x, y, w, h) {
  for (let r = 0; r < h; r++) {
    const cut = Math.max(0, 3 - Math.min(r, h - 1 - r));
    px(ctx, OL, x + cut, y + r, w - cut * 2, 1);
    if (r > 0 && r < h - 1) px(ctx, '#4a5628', x + cut + 1, y + r, w - cut * 2 - 2, 1);
    if (r > 1 && r < h - 2) px(ctx, r % 2 ? '#262a1e' : '#2c3022', x + cut + 2, y + r, w - cut * 2 - 4, 1);
  }
  px(ctx, '#e8b848', x + 5, y + h - 3, w - 10, 1);
}

// Compact title badge: TRIGGER in hot yellow-to-orange stencil letters, RIDGE beneath between red bars.
function drawLogo(cx, y) {
  plate(cx - 72, y, 144, 50);
  for (const [rx, ry] of [[cx - 67, y + 4], [cx + 65, y + 4], [cx - 67, y + 44], [cx + 65, y + 44]]) {
    px(ctx, '#e8b848', rx, ry, 2, 2);
    px(ctx, '#fff4b0', rx, ry, 1, 1);
  }
  const word = 'TRIGGER', ty = y + 8;
  for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [-1, 1], [0, 2], [1, 2]])
    drawText(ctx, word, cx + a, ty + b, '#140c04', { scale: 3, align: 'center' });
  drawText(ctx, word, cx, ty, '#ff9a30', { scale: 3, align: 'center' });
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, ty, W, 8);
  ctx.clip();
  drawText(ctx, word, cx, ty, '#ffe070', { scale: 3, align: 'center' });
  ctx.restore();
  for (let i = 0; i < 7; i++) px(ctx, '#140c04', cx - 62 + i * 18, ty + 7, 18, 1); // stencil gap through the letters
  drawText(ctx, 'RIDGE', cx, y + 31, '#f4f0e0', { scale: 2, align: 'center', shadow: '#140c04' });
  for (const side of [-1, 1]) {
    px(ctx, '#e03848', cx + side * 46 - 12, y + 35, 24, 2);
    px(ctx, '#ff8a90', cx + side * 46 - 12, y + 35, 24, 1);
  }
}

function render() {
  if (game.state === 'title') return drawTitle();
  const s = Math.round(game.shake);
  const cam = {
    x: Math.round(game.cam.x) + (s ? Math.round((Math.random() * 2 - 1) * s) : 0),
    y: Math.round(game.cam.y) + (s ? Math.round((Math.random() * 2 - 1) * s) : 0),
  };
  const lv = game.level;
  Background.draw(ctx, cam, lv.pxH - H, game.t);
  lv.draw(ctx, cam);
  lv.drawLife(ctx, cam, game.t);
  for (const layer of [0, 1]) for (const e of game.entities) if (e.layer === layer) e.draw(ctx, cam, game);
  game.fx.drawGhosts(ctx, cam);
  game.player.draw(ctx, cam, game);
  for (const e of game.entities) if (e.layer === 2) e.draw(ctx, cam, game);
  game.fx.draw(ctx, cam);
  Background.drawFront(ctx, cam, game.t);
  drawHUD();
  if (game.state === 'play') drawCrosshair();

  if (game.state === 'paused') {
    dim(0.75);
    text('PAUSED', W / 2, 30, '#ffffff', { align: 'center', scale: 2 });
    [
      'A / D            MOVE',
      'SPACE            JUMP, AGAIN IN AIR TO DOUBLE JUMP',
      'V                JETPACK ON / OFF - WASD TO FLY',
      'MOUSE            AIM',
      'LEFT CLICK / X   ATTACK - HOLD TO FIRE THE MACHINE GUN',
      'RIGHT CLICK / Q  SWITCH: MACHINE GUN <> MACHETE',
      'MACHETE          X3 COMBO, AIM UP / DOWN IN AIR FOR SPECIALS',
      'SHIFT            DASH',
      'S + SPACE        DROP THROUGH BRANCHES',
      'ENTER            RESUME',
    ].forEach((l, i) => text(l, 14, 56 + i * 13, i === 9 ? '#e8b848' : '#e8e4f0'));
  } else if (game.state === 'dead') {
    dim(Math.min(0.75, game.stateT / 80));
    if (game.stateT > 40) text('DEFEATED', W / 2, 96, '#ff4a6a', { align: 'center', scale: 3 });
  } else if (game.state === 'clear') {
    dim(Math.min(0.6, game.stateT / 60));
    text('AREA CLEAR', W / 2, 84, '#a8fff4', { align: 'center', scale: 3 });
    if (game.stateT > 60 && (game.t >> 5) % 2) text('PRESS ENTER TO PLAY AGAIN', W / 2, 126, '#ffffff', { align: 'center' });
  }
}

// ---------------------------------------------------------------- loop
const STEP = 1000 / 60;
let acc = 0, last = performance.now();
function frame(now) {
  acc += Math.min(100, now - last);
  last = now;
  while (acc >= STEP) {
    game.update();
    Input.endStep();
    acc -= STEP;
  }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
