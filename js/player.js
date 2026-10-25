// Rowan: movement with momentum, spirit-wing flight, the sword combo, the wrist crossbow, dash and damage.
const PHYS = {
  grav: 0.32, maxFall: 5, run: 1.9, accel: 0.18, decel: 0.28, airAccel: 0.12,
  jump: -6.1, pogo: -5.2, dash: 4.2, dashTime: 11, dashCD: 30,
  flyLift: 0.5, flyRise: -2.3, glideFall: 0.8, flySpeed: 2.1, wingMax: 150,
  boltSpeed: 6.5, shootCD: 16,
};

// wind/active/recover are frame counts. pose = [front upper arm, elbow, sword angle] per phase.
const ATTACKS = {
  slash1: { wind: 3, active: 4, recover: 10, dmg: 2, kb: 2.2, arc: 'slash', pose: [[-165, 10, -115], [92, 0, -5], [50, 10, 45]] },
  slash2: { wind: 3, active: 4, recover: 10, dmg: 2, kb: 2.2, arc: 'slash', pose: [[30, 20, 60], [100, 0, 10], [160, 10, -70]] },
  heavy: { wind: 7, active: 5, recover: 16, dmg: 4, kb: 4, arc: 'heavy', pose: [[180, 0, -95], [80, 5, 30], [30, 10, 80]] },
  up: { wind: 3, active: 5, recover: 10, dmg: 2, kb: 1.5, arc: 'up', pose: [[60, 10, 30], [175, 0, -90], [150, 10, -60]] },
  down: { wind: 2, active: Infinity, recover: 0, dmg: 2, kb: 1, arc: null, pose: [[20, 0, 90], [20, 0, 90], [20, 0, 90]] },
};

class Player {
  constructor() {
    this.w = 10;
    this.h = 28;
    this.maxHp = 20;
  }

  spawn(x, y) {
    Object.assign(this, {
      x, y, vx: 0, vy: 0, facing: 1, onGround: false, hp: this.maxHp, dead: false,
      coyote: 0, jumpBuf: 0, atkBuf: 0, dashBuf: 0, jumpHeld: false, dropT: 0,
      attack: null, combo: 0, comboT: 0, shootCD: 0, shootT: 0,
      dashT: 0, dashCD: 0, airDash: true,
      flying: false, flapping: false, flapT: 0, wing: PHYS.wingMax,
      hurtT: 0, invuln: 0, landT: 0, skidT: 0, anim: 0, safe: { x, y },
    });
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get dropThrough() { return this.dropT > 0; }
  get hurtbox() { return { x: this.x + 2, y: this.y + 4, w: this.w - 4, h: this.h - 4 }; }

  // Called every step, including hit-pause steps, so presses are never lost.
  bufferInput() {
    if (Input.pressed('jump')) this.jumpBuf = 7;
    if (Input.pressed('attack')) this.atkBuf = 10;
    if (Input.pressed('dash')) this.dashBuf = 5;
  }

  phase() {
    const a = this.attack, d = ATTACKS[a.type];
    return a.t < d.wind ? 0 : a.t < d.wind + d.active ? 1 : 2;
  }

  attackBox(type) {
    const cx = this.cx, cy = this.y + 13, f = this.facing;
    switch (type) {
      case 'heavy': return { x: f > 0 ? cx - 2 : cx - 38, y: cy - 22, w: 40, h: 36 };
      case 'up': return { x: cx - 18, y: cy - 40, w: 36, h: 32 };
      case 'down': return { x: cx - 7, y: this.y + this.h - 2, w: 14, h: 18 };
      default: return { x: f > 0 ? cx : cx - 32, y: cy - 16, w: 32, h: 28 };
    }
  }

  update(g) {
    this.bufferInput();
    const dir = (Input.held('right') ? 1 : 0) - (Input.held('left') ? 1 : 0);
    for (const k of ['jumpBuf', 'atkBuf', 'dashBuf', 'dropT', 'comboT', 'dashCD', 'hurtT', 'invuln', 'shootCD', 'shootT', 'landT', 'skidT'])
      if (this[k] > 0) this[k]--;
    if (this.onGround) {
      this.coyote = 6;
      this.airDash = true;
      this.flying = false;
      this.wing = Math.min(PHYS.wingMax, this.wing + 2.5);
    } else if (this.coyote > 0) this.coyote--;

    // --- dash
    if (this.dashBuf && !this.dashCD && !this.hurtT && !this.dashT && (this.onGround || this.airDash)) {
      if (dir) this.facing = dir;
      Object.assign(this, { dashT: PHYS.dashTime, dashCD: PHYS.dashCD, dashBuf: 0, attack: null, flying: false });
      if (!this.onGround) this.airDash = false;
      Sfx.play('dash');
    }

    // --- sword: start an attack, or chain the combo out of a slash's recovery
    if (this.atkBuf && !this.hurtT && !this.dashT) {
      const a = this.attack;
      const chain = a && this.phase() === 2 && (a.type === 'slash1' || a.type === 'slash2');
      if (!a || chain) {
        let type;
        if (Input.held('up')) type = 'up';
        else if (Input.held('down') && !this.onGround) type = 'down';
        else {
          let step = chain || this.comboT ? this.combo + 1 : 1;
          if (step > 3 || (step === 3 && !this.onGround)) step = 1;
          this.combo = step;
          type = ['slash1', 'slash2', 'heavy'][step - 1];
        }
        if (type === 'down') this.flying = false;
        const d = ATTACKS[type];
        this.attack = { type, t: 0, hit: new Set(), dmg: d.dmg, kb: d.kb };
        this.atkBuf = 0;
        this.shootT = 0;
      }
    }

    // --- crossbow: unlimited bolts, short cooldown; works on foot and in flight
    if (Input.pressed('shoot') && !this.shootCD && !this.attack && !this.hurtT && !this.dashT) {
      this.shootCD = PHYS.shootCD;
      this.shootT = 12;
      g.spawn(new Bolt(this.facing * PHYS.boltSpeed), this.cx + this.facing * 10 - 4, this.y + 11);
      Sfx.play('shoot');
    }

    // --- jump / deploy wings / drop through a branch
    if (this.jumpBuf && !this.hurtT && !this.dashT) {
      const locked = this.attack && this.onGround && this.attack.type !== 'down' && this.phase() < 2;
      if (!locked) {
        if (this.onGround && Input.held('down') && this.onBranch(g.level)) {
          this.dropT = 10;
          this.jumpBuf = 0;
        } else if (this.coyote) {
          Object.assign(this, { vy: PHYS.jump, coyote: 0, jumpBuf: 0, jumpHeld: true });
          if (this.onGround) this.attack = null;
          Sfx.play('jump');
          g.fx.dust(this.cx, this.y + this.h);
        } else if (!this.flying && this.wing > 10 && !this.attack) {
          this.flying = true;
          this.jumpBuf = 0;
          this.jumpHeld = false;
          Sfx.play('flap');
          for (let i = 0; i < 6; i++) g.fx.feather(this.cx - this.facing * 6, this.y + 8 + i);
        }
      }
    }

    // --- horizontal: momentum, a skid when reversing at speed
    if (this.dashT) {
      this.vx = this.facing * PHYS.dash;
      this.vy = 0;
      if (this.dashT % 3 === 0) g.fx.ghost(snapshotRig(SKINS.rowan, POSE.dash, this.cx, this.y + this.h, this.facing, g.t * 0.15, { color: '#5ff0e0', alpha: 0.8 }));
      if (--this.dashT === 0) this.vx = this.facing * PHYS.run;
    } else if (this.hurtT) {
      this.vx *= 0.9;
    } else if (this.attack && this.onGround && this.attack.type !== 'down') {
      this.vx *= 0.82;
    } else {
      const top = this.flying ? PHYS.flySpeed : PHYS.run, target = dir * top;
      const rate = !this.onGround ? PHYS.airAccel : dir ? PHYS.accel : PHYS.decel;
      if (this.onGround && dir && Math.sign(this.vx) === -dir && Math.abs(this.vx) > 1.3 && !this.skidT) {
        this.skidT = 8;
        g.fx.dust(this.cx, this.y + this.h, 2);
      }
      this.vx += (target - this.vx) * (this.skidT ? 0.12 : rate * 2);
      if (Math.abs(this.vx) < 0.05) this.vx = 0;
      if (dir && !this.attack && !this.shootT) this.facing = dir;
    }

    // --- vertical: flight, or gravity with variable jump height and a little apex hang
    if (this.flying) {
      this.flapping = Input.held('jump') && this.wing > 0;
      if (this.flapping) {
        this.vy = Math.max(this.vy - PHYS.flyLift, PHYS.flyRise);
        this.wing = Math.max(0, this.wing - 1);
        if (++this.flapT % 14 === 0) { Sfx.play('flap'); g.fx.feather(this.cx - this.facing * 8, this.y + 10); }
      } else this.vy = Math.min(this.vy + PHYS.grav * 0.35, PHYS.glideFall);
      if (Input.held('down')) this.flying = false;
    } else if (!this.dashT) {
      if (this.jumpHeld && !Input.held('jump')) {
        this.jumpHeld = false;
        if (this.vy < -2) this.vy = -2;
      }
      const hang = this.jumpHeld && Math.abs(this.vy) < 1.2 ? 0.55 : 1;
      this.vy = Math.min(this.vy + PHYS.grav * hang, PHYS.maxFall);
    }

    if (this.attack) this.tickAttack(g);

    const wasGround = this.onGround, fallSpeed = this.vy;
    moveBody(this, g.level);
    if (this.y < 0) { // the sky has a ceiling at the top of the stage
      this.y = 0;
      this.vy = Math.max(this.vy, 0);
    }
    if (this.onGround) {
      this.jumpHeld = false;
      if (!wasGround) {
        if (fallSpeed > 2.5) {
          this.landT = 7;
          g.fx.dust(this.cx, this.y + this.h);
          Sfx.play('land');
        }
        if (this.attack && this.attack.type === 'down') this.attack = null;
      }
    }

    this.checkHazards(g);
    if (this.onGround) this.anim += Math.abs(this.vx);
  }

  tickAttack(g) {
    const a = this.attack, d = ATTACKS[a.type];
    if (a.t === d.wind) {
      Sfx.play(a.type === 'heavy' ? 'heavy' : 'slash');
      if (this.onGround && a.type !== 'up') this.vx = this.facing * (a.type === 'heavy' ? 2.8 : 1.6);
      if (a.type === 'heavy') g.quake(2);
    }
    if (this.phase() === 1) {
      const box = this.attackBox(a.type);
      const hit = g.hitTest(box, a, this.facing);
      if (a.type === 'down' && (hit || g.level.touches(box, '^'))) {
        // Pogo: bounce off whatever the downward thrust struck.
        Object.assign(this, { vy: PHYS.pogo, jumpHeld: false, airDash: true, attack: null });
        g.freeze(3);
        g.fx.sparks(this.cx, box.y + 10, 1, SPARK_TEAL, 4);
        g.fx.sparks(this.cx, box.y + 10, -1, SPARK_TEAL, 4);
        Sfx.play('pogo');
        return;
      }
    }
    if (++a.t >= d.wind + d.active + d.recover) {
      if (a.type === 'slash1' || a.type === 'slash2') this.comboT = 14;
      this.attack = null;
    }
  }

  onBranch(level) {
    const fy = this.y + this.h + 1, a = level.tileAt(this.x + 1, fy), b = level.tileAt(this.x + this.w - 2, fy);
    return !isSolid(a) && !isSolid(b) && (a === '=' || b === '=');
  }

  checkHazards(g) {
    const level = g.level, feet = { x: this.x + 1, y: this.y + this.h, w: this.w - 2, h: 1 };
    if (this.y > level.pxH + 8 || level.touches(this.hurtbox, '~')) {
      if (level.touches(this.hurtbox, '~')) {
        g.fx.burst(this.cx, this.y + this.h, 14, ['#ffffff', '#a8e8f8', '#5ab8e8'], { speed: 2.5, up: 2, life: 30 });
        Sfx.play('splash');
      }
      this.takeDamage(g, 4, null, true);
      if (!this.dead) Object.assign(this, this.safe, { vx: 0, vy: 0, hurtT: 0, attack: null, flying: false });
      return;
    }
    if (this.onGround && level.touches(feet, '^')) {
      this.takeDamage(g, 3, null);
      return;
    }
    if (this.onGround && !this.hurtT) {
      const fy = this.y + this.h + 1, a = level.tileAt(this.x, fy), b = level.tileAt(this.x + this.w - 1, fy);
      if (isFloor(a) && isFloor(b) && a !== '^' && b !== '^') this.safe = { x: this.x, y: this.y };
    }
  }

  // srcX: where the hit came from (null = knock backwards). force ignores invulnerability (pits, water).
  takeDamage(g, dmg, srcX, force) {
    if (this.dead || (!force && (this.invuln || this.dashT))) return;
    this.hp = Math.max(0, this.hp - dmg);
    Object.assign(this, { invuln: 70, hurtT: 14, attack: null, dashT: 0, flying: false, shootT: 0 });
    const away = srcX == null ? -this.facing : this.cx < srcX ? -1 : 1;
    this.vx = away * 2.2;
    this.vy = -3.2;
    g.freeze(5);
    g.quake(3);
    Sfx.play('hurt');
    g.fx.burst(this.cx, this.cy, 8, ['#e03848', '#ffb0c0'], { speed: 2, life: 20 });
    if (this.hp <= 0) {
      this.dead = true;
      g.onPlayerDeath();
    }
  }

  // ---------------------------------------------------------------- animation
  // Legs and body come from movement; arms and weapon come from the current action.
  pose(t) {
    let p;
    if (this.hurtT) p = POSE.hurt;
    else if (this.dashT) p = POSE.dash;
    else if (this.flying) p = this.flapping ? POSE.fly((this.flapT >> 2) & 1) : POSE.glide;
    else if (!this.onGround) p = this.vy < -1.5 ? POSE.rise : this.vy < 1.5 ? POSE.peak : POSE.fall;
    else if (this.landT && Math.abs(this.vx) < 1) p = POSE.land;
    else if (this.skidT) p = POSE.skid;
    else if (Math.abs(this.vx) > 0.25) p = POSE.run(Math.floor(this.anim / 3.6) % 8, 0.5 + Math.abs(this.vx) * 0.25);
    else p = POSE.idle(t);
    p = { ...p };

    if (this.attack) {
      const d = ATTACKS[this.attack.type], ph = this.phase(), [ua, el, sw] = d.pose[ph];
      p.arms = [p.arms[0], [ua, el]];
      p.sword = sw;
      p.swordBack = false;
      p.bow = false;
      p.wings = null;
      if (this.onGround && this.attack.type !== 'down') Object.assign(p, POSE.lunge[ph]);
    } else if (this.shootT) {
      p.arms = [[-15, 25], [90, 2]];
      p.bow = this.shootT > 8 ? 'fire' : true;
      p.sword = 160;
      p.swordBack = true;
    }
    if (p.wings && p.sword == null) { p.sword = 160; p.swordBack = true; }
    return p;
  }

  draw(ctx, cam, g) {
    if (this.dead) return;
    if (this.invuln && !this.dashT && g.t % 6 < 3) return;
    const t = g.t * 0.15, f = this.facing;
    drawRig(ctx, SKINS.rowan, this.pose(g.t), this.cx - cam.x, this.y + this.h - cam.y, f, t);

    if (!this.attack) return;
    const at = this.attack, d = ATTACKS[at.type], ph = this.phase();
    if (d.arc && (ph === 1 || (ph === 2 && at.t < d.wind + d.active + 3))) {
      const arc = ARCS[d.arc];
      ctx.globalAlpha = ph === 1 ? 1 : 0.45;
      ctx.drawImage(f > 0 ? arc.r : arc.l, Math.round(this.cx + f * 3 - cam.x - arc.cx), Math.round(this.y + 12 - cam.y - arc.cy));
      ctx.globalAlpha = 1;
    }
    if (at.type === 'down' && ph === 1) {
      const sx = Math.round(this.cx - cam.x), sy = Math.round(this.y + this.h + 6 - cam.y);
      ctx.fillStyle = g.t % 4 < 2 ? '#ffffff' : '#5ff0e0';
      ctx.fillRect(sx - 3, sy, 1, 3);
      ctx.fillRect(sx + 3, sy, 1, 3);
      ctx.fillRect(sx, sy + 2, 1, 4);
    }
  }
}
