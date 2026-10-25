// Enemies, projectiles, pickups and stage props.
class Entity {
  constructor(w, h) {
    Object.assign(this, { x: 0, y: 0, w, h, vx: 0, vy: 0, dead: false, flash: 0, awake: false, t: 0, layer: 1 });
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  update() {}
  draw() {}
}

// Corrupted armored warrior. Telegraphs a mace swing (raises it, eye flashes), then smashes forward.
class Knight extends Entity {
  constructor() {
    super(10, 28);
    Object.assign(this, { hp: 8, hittable: true, contactDmg: 2, facing: -1, state: 'walk', st: 0, stun: 0, anim: 0 });
  }

  update(g) {
    this.t++;
    if (this.flash) this.flash--;
    const p = g.player, dx = p.cx - this.cx;
    const near = !p.dead && Math.abs(dx) < 120 && Math.abs(p.cy - this.cy) < 40;
    this.st++;
    if (this.stun > 0) {
      this.stun--;
      this.vx *= 0.85;
    } else if (this.state === 'walk') {
      if (near && Math.abs(dx) > 4) this.facing = Math.sign(dx);
      this.vx = this.facing * (near ? 0.7 : 0.35);
      if (near && Math.abs(dx) < 34) this.setState('windup');
      else if (this.onGround && !isFloor(g.level.tileAt(this.facing > 0 ? this.x + this.w + 1 : this.x - 1, this.y + this.h + 1))) {
        this.vx = 0;
        if (!near) this.facing *= -1;
      }
    } else if (this.state === 'windup') {
      this.vx = 0;
      if (this.st >= 26) {
        this.setState('strike');
        Sfx.play('swing');
      }
    } else if (this.state === 'strike') {
      if (this.st === 2) g.quake(2);
      const box = { x: this.facing > 0 ? this.cx : this.cx - 32, y: this.y - 4, w: 32, h: 32 };
      if (overlap(box, p.hurtbox)) p.takeDamage(g, 4, this.cx);
      if (this.st >= 8) this.setState('recover');
    } else if (this.state === 'recover' && this.st >= 30) this.setState('walk');

    this.vy = Math.min(this.vy + PHYS.grav, PHYS.maxFall);
    moveBody(this, g.level);
    if (this.hitWall && this.state === 'walk' && !this.stun) this.facing *= -1;
    this.anim += Math.abs(this.vx);
    if (this.y > g.level.pxH) this.dead = true;
  }

  setState(s) {
    this.state = s;
    this.st = 0;
  }

  onHit(g, dmg, dir, kb) {
    this.hp -= dmg;
    this.flash = 10;
    g.fx.sparks(this.cx, this.y + 12, dir, SPARK_BLIGHT);
    if (this.hp <= 0) {
      this.dead = true;
      g.fx.burst(this.cx, this.y + 12, 22, ['#5a4a6a', '#8a7aa0', '#7ab040', '#ff4ad0'], { speed: 3, grav: 0.15, life: 40, size: 2, up: 1 });
      g.drop(this.cx, this.y + 10, 0.4);
      g.freeze(6);
      g.quake(3);
      Sfx.play('kill');
      return;
    }
    g.freeze(4);
    Sfx.play('hit');
    // Light hits don't interrupt a swing that's already coming; a heavy hit does.
    if (this.state === 'windup' || this.state === 'strike') {
      if (dmg < 4) return;
      this.setState('recover');
    }
    this.vx = dir * kb * 0.7;
    this.vy = -1.2;
    this.stun = 12;
  }

  draw(ctx, cam, g) {
    let pose;
    if (this.state === 'windup') pose = { hy: 1, lean: -1, flow: 0.3, legs: [[-14, 10], [16, 20]], arms: [[-10, 20], [-165, 10]], mace: -100 };
    else if (this.state === 'strike') pose = { hy: 2, lean: 2, flow: 0.7, legs: [[-28, 10], [40, 50]], arms: [[-40, 20], [95, 0]], mace: 10 };
    else if (this.state === 'recover') pose = { hy: 2, lean: 1, flow: 0.3, legs: [[-24, 10], [36, 45]], arms: [[-20, 20], [40, 10]], mace: 75 };
    else pose = { ...POSE.walk(Math.floor(this.anim / 3) % 8), mace: 70 };
    let tint;
    if (this.flash % 4 >= 2) tint = { color: '#ffffff' };
    else if (this.state === 'windup' && (this.st >> 2) % 2) tint = { color: '#ff4ad0', alpha: 0.4 };
    drawRig(ctx, SKINS.knight, pose, this.cx - cam.x, this.y + this.h - cam.y, this.facing, g.t * 0.12, tint);
  }
}

// Floating blight spirit: hovers toward Rowan and spits slow orbs that can be slashed or shot.
class Wisp extends Entity {
  constructor() {
    super(12, 12);
    Object.assign(this, { hp: 2, hittable: true, contactDmg: 3, home: null, shotT: 90 + (Math.random() * 60 | 0) });
  }

  update(g) {
    this.t++;
    if (this.flash) this.flash--;
    if (!this.home) this.home = { x: this.x, y: this.y };
    const p = g.player, dx = p.cx - this.cx, dy = p.cy - this.cy, d = Math.hypot(dx, dy);
    let tx = this.home.x, ty = this.home.y;
    if (!p.dead && d < 180) {
      tx = p.cx - 6 - Math.sign(dx) * 50;
      ty = p.y - 34;
      if (--this.shotT <= 0) {
        this.shotT = 150;
        const s = 1.5 / (d || 1);
        g.spawn(new Orb(dx * s, dy * s), this.cx - 3, this.cy - 3);
        Sfx.play('orb');
      }
    }
    this.vx = clamp(this.vx + Math.sign(tx - this.x) * 0.03, -0.8, 0.8);
    this.vy = clamp(this.vy + Math.sign(ty - this.y) * 0.02, -0.6, 0.6);
    this.x += this.vx;
    this.y += this.vy + Math.sin(this.t * 0.08) * 0.3;
  }

  onHit(g, dmg, dir) {
    this.hp -= dmg;
    this.flash = 8;
    this.vx = dir * 2;
    g.fx.sparks(this.cx, this.cy, dir, SPARK_BLIGHT);
    if (this.hp > 0) {
      g.freeze(3);
      Sfx.play('hit');
      return;
    }
    this.dead = true;
    g.fx.burst(this.cx, this.cy, 16, ['#a050e0', '#6a20a0', '#ff4ad0', '#ffffff'], { speed: 2.5, grav: 0.02, life: 32 });
    g.drop(this.cx, this.cy, 0.25);
    g.freeze(4);
    Sfx.play('kill');
  }

  draw(ctx, cam) {
    const x = Math.round(this.cx - cam.x), y = Math.round(this.cy - cam.y), fl = this.flash % 4 >= 2;
    ctx.globalAlpha = 0.3;
    circ(ctx, '#c040ff', x, y, 9 + ((this.t >> 3) & 1));
    ctx.globalAlpha = 1;
    for (let i = 0; i < 4; i++) px(ctx, '#7a2ab0', x - 3 + i * 2, y + 4 + (((this.t >> 3) + i) % 2) * 2, 1, 3 + (i % 2));
    circ(ctx, OL, x, y, 6);
    circ(ctx, fl ? '#ffffff' : '#6a20a0', x, y, 5);
    if (!fl) circ(ctx, '#a050e0', x - 1, y - 1, 3);
    px(ctx, '#ff4ad0', x - 3, y - 1, 2, 2);
    px(ctx, '#ff4ad0', x + 1, y - 1, 2, 2);
    px(ctx, '#ffffff', x - 3, y - 1);
    px(ctx, '#ffffff', x + 1, y - 1);
  }
}

class Orb extends Entity {
  constructor(vx, vy) {
    super(6, 6);
    Object.assign(this, { vx, vy, hp: 1, hittable: true, contactDmg: 3, dieOnContact: true, life: 300, layer: 2 });
  }

  update(g) {
    this.t++;
    this.x += this.vx;
    this.y += this.vy;
    if (--this.life <= 0 || isSolid(g.level.tileAt(this.cx, this.cy))) this.dead = true;
  }

  onHit(g) {
    this.dead = true;
    g.fx.burst(this.cx, this.cy, 6, ['#ff4ad0', '#ffffff'], { speed: 1.5, life: 14 });
  }

  draw(ctx, cam) {
    const x = Math.round(this.cx - cam.x), y = Math.round(this.cy - cam.y);
    ctx.globalAlpha = 0.35;
    circ(ctx, '#ff4ad0', x, y, 5);
    ctx.globalAlpha = 1;
    circ(ctx, '#ff4ad0', x, y, 3);
    px(ctx, (this.t >> 2) & 1 ? '#ffffff' : '#ffc0f0', x - 1, y - 1, 2, 2);
  }
}

// Crossbow bolt fired by Rowan.
class Bolt extends Entity {
  constructor(vx) {
    super(8, 3);
    Object.assign(this, { vx, life: 50, layer: 2 });
  }

  update(g) {
    this.x += this.vx;
    const tipX = this.vx > 0 ? this.x + this.w : this.x;
    if (--this.life <= 0 || isSolid(g.level.tileAt(tipX, this.cy))) {
      this.dead = true;
      g.fx.sparks(tipX, this.cy, -Math.sign(this.vx), SPARK_TEAL, 4);
      return;
    }
    for (const e of g.entities) {
      if (!e.hittable || e.dead || !overlap(this, e)) continue;
      e.onHit(g, 1, Math.sign(this.vx), 1.2);
      this.dead = true;
      return;
    }
  }

  draw(ctx, cam) {
    const f = Math.sign(this.vx), x = Math.round((f > 0 ? this.x + this.w : this.x) - cam.x), y = Math.round(this.cy - cam.y);
    ctx.globalAlpha = 0.4;
    px(ctx, '#5ff0e0', f > 0 ? x - 16 : x + 2, y, 14, 1);
    ctx.globalAlpha = 1;
    px(ctx, '#5ff0e0', f > 0 ? x - 8 : x + 1, y, 7, 1);
    px(ctx, '#ffffff', f > 0 ? x - 3 : x, y - 1, 3, 3);
  }
}

// Glowing flower bud; slash or shoot it to release a healing petal.
class Bloom extends Entity {
  constructor() {
    super(10, 14);
    Object.assign(this, { hittable: true, layer: 0 });
  }

  update() { this.t++; }

  onHit(g) {
    this.dead = true;
    g.fx.burst(this.cx, this.y + 4, 14, ['#ff8ab4', '#ffd0e4', '#ffffff', '#58d048'], { speed: 2, life: 26 });
    g.spawn(new Petal(), this.cx - 4, this.y);
    g.freeze(2);
    Sfx.play('bloom');
  }

  draw(ctx, cam) {
    const x = Math.round(this.cx - cam.x), y = Math.round(this.y - cam.y), pulse = (this.t >> 4) & 1;
    ctx.globalAlpha = 0.25;
    circ(ctx, '#ff8ab4', x, y + 4, 7 + pulse);
    ctx.globalAlpha = 1;
    px(ctx, '#2e8a3a', x, y + 7, 1, 7);
    px(ctx, '#3aa048', x - 3, y + 10, 3, 2);
    px(ctx, '#3aa048', x + 1, y + 9, 3, 2);
    circ(ctx, OL, x, y + 4, 4);
    circ(ctx, '#f06aa0', x, y + 4, 3);
    px(ctx, '#ffd0e4', x - 1, y + 2, 2, 2);
    px(ctx, '#ffffff', x - 1, y + 2);
  }
}

class Petal extends Entity {
  constructor() {
    super(8, 8);
    Object.assign(this, { vy: -2.2, life: 600, layer: 2 });
  }

  update(g) {
    this.t++;
    if (--this.life <= 0 || this.y > g.level.pxH) {
      this.dead = true;
      return;
    }
    this.vy = Math.min(this.vy + 0.12, 1.2);
    this.vx = Math.sin(this.t * 0.1) * 0.4;
    moveBody(this, g.level);
    const p = g.player;
    if (p.dead || !overlap(this, p)) return;
    this.dead = true;
    p.hp = Math.min(p.maxHp, p.hp + 6);
    g.fx.text('+HP', this.cx, this.y - 6, '#ffb0c0');
    Sfx.play('heal');
  }

  draw(ctx, cam) {
    if (this.life < 120 && (this.life >> 2) % 2) return;
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    ctx.globalAlpha = 0.3;
    circ(ctx, '#ff8ab4', x + 4, y + 4, 5);
    ctx.globalAlpha = 1;
    for (const [a, b] of [[1, 3], [5, 3], [3, 1], [3, 5]]) circ(ctx, '#ff8ab4', x + a, y + b, 1.5);
    px(ctx, '#ffe060', x + 3, y + 3, 2, 2);
  }
}

// Checkpoint. Touching it restores HP and wings and moves the respawn point here.
class SpiritStone extends Entity {
  constructor(id) {
    super(14, 26);
    Object.assign(this, { id, lit: false, layer: 0 });
  }

  update(g) {
    this.t++;
    const p = g.player;
    if (!this.lit && !p.dead && overlap(this, p)) {
      this.lit = true;
      g.checkpoint = { x: this.cx, bottom: this.y + this.h, id: this.id };
      p.hp = p.maxHp;
      p.wing = PHYS.wingMax;
      g.fx.text('CHECKPOINT', this.cx, this.y - 10, '#a8fff4');
      g.fx.burst(this.cx, this.y + 8, 24, ['#5ff0e0', '#ffffff', '#a8fff4'], { speed: 2.5, grav: -0.03, life: 40 });
      Sfx.play('checkpoint');
    }
    if (this.lit && this.t % 8 === 0) g.fx.parts.push({ x: this.cx + (Math.random() * 10 - 5), y: this.y + 6, vx: 0, vy: -0.4, grav: 0, life: 30, color: '#a8fff4', size: 1 });
  }

  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    if (this.lit) {
      ctx.globalAlpha = 0.25;
      circ(ctx, '#5ff0e0', x + 7, y + 10, 12 + ((this.t >> 4) & 1));
      ctx.globalAlpha = 1;
    }
    px(ctx, OL, x + 1, y, 12, 26);
    px(ctx, OL, x, y + 3, 14, 23);
    px(ctx, '#7a80a0', x + 2, y + 1, 10, 25);
    px(ctx, '#7a80a0', x + 1, y + 4, 12, 22);
    px(ctx, '#a8b0c8', x + 2, y + 1, 3, 25);
    px(ctx, '#565a78', x + 10, y + 3, 2, 23);
    px(ctx, '#3a8a4a', x + 1, y + 20, 12, 3);
    px(ctx, '#58d048', x + 2, y + 20, 4, 1);
    const rune = this.lit ? ((this.t >> 3) & 1 ? '#ffffff' : '#5ff0e0') : '#4a4e6a';
    px(ctx, rune, x + 6, y + 6, 2, 9);
    px(ctx, rune, x + 4, y + 8, 6, 2);
    px(ctx, rune, x + 4, y + 13, 2, 2);
    px(ctx, rune, x + 8, y + 13, 2, 2);
  }
}

// The exit: an archway of vines around a swirling spirit portal.
class Gate extends Entity {
  constructor() {
    super(32, 48);
    this.layer = 0;
  }

  update(g) {
    this.t++;
    if (this.t % 5 === 0) g.fx.parts.push({ x: this.cx + (Math.random() * 16 - 8), y: this.y + 40, vx: 0, vy: -0.5, grav: 0, life: 40, color: Math.random() < 0.5 ? '#5ff0e0' : '#ffffff', size: 1 });
    if (!g.player.dead && overlap({ x: this.x + 8, y: this.y, w: 16, h: this.h }, g.player)) g.stageClear();
  }

  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    for (let r = 0; r < 48; r++) {
      const ow = r < 16 ? Math.round(Math.sqrt(256 - (16 - r - 0.5) ** 2)) : 16;
      px(ctx, OL, x + 16 - ow, y + r, ow * 2, 1);
      if (ow > 1) px(ctx, '#6a7090', x + 17 - ow, y + r, ow * 2 - 2, 1);
      const ir = r - 5;
      if (ir < 0) continue;
      const iw = ir < 11 ? Math.round(Math.sqrt(121 - (11 - ir - 0.5) ** 2)) : 11;
      for (let i = -iw; i < iw; i++) {
        const swirl = Math.sin((i * 0.4 + ir * 0.3) + this.t * 0.08) + Math.sin(Math.hypot(i, ir - 20) * 0.5 - this.t * 0.1);
        px(ctx, swirl > 0.8 ? '#ffffff' : swirl > 0 ? '#5ff0e0' : swirl > -0.8 ? '#2a9a98' : '#1e6a78', x + 16 + i, y + r);
      }
    }
    for (let r = 2; r < 48; r += 3) { // vines
      px(ctx, '#2e9a3a', x + 2 + (r % 2), y + r, 2, 2);
      px(ctx, '#2e9a3a', x + 28 - (r % 2), y + r, 2, 2);
      if (r % 9 === 2) { px(ctx, '#ff8ab4', x + 1, y + r, 2, 2); px(ctx, '#ffd040', x + 29, y + r + 3, 2, 2); }
    }
  }
}
