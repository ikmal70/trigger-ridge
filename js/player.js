// Rowan: movement with momentum, double jump, jetpack flight, two switchable weapons
// (heavy machine gun / machete), mouse or keyboard aiming, dash, damage and footsteps.
const PHYS = {
  grav: 0.32, maxFall: 5, run: 1.9, accel: 0.18, decel: 0.28, airAccel: 0.12,
  jump: -6.1, doubleJump: -5.4, pogo: -5.2, dash: 4.2, dashTime: 11, dashCD: 30,
  jetSpeed: 2.4, jetClimb: 2, jetAccel: 0.07,
  bulletSpeed: 8, fireRate: 4,
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
    this.weapon = 'gun'; // 'gun' | 'sword' — kept across respawns
  }

  spawn(x, y) {
    Object.assign(this, {
      x, y, vx: 0, vy: 0, facing: 1, onGround: false, hp: this.maxHp, dead: false,
      coyote: 0, jumpBuf: 0, atkBuf: 0, dashBuf: 0, jumpHeld: false, dropT: 0, jumps: 1, flipT: 0,
      attack: null, combo: 0, comboT: 0, swapT: 0, swapBuf: 0,
      fireCD: 0, firing: 0, shots: 0, kickT: 0, aimDeg: 0,
      dashT: 0, dashCD: 0, airDash: true, jet: false,
      hurtT: 0, invuln: 0, landT: 0, skidT: 0, anim: 0, stepFrame: -1, safe: { x, y },
    });
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get dropThrough() { return this.dropT > 0; }
  get hurtbox() { return { x: this.x + 2, y: this.y + 4, w: this.w - 4, h: this.h - 4 }; }

  // Called every step, including hit-pause steps, so presses are never lost.
  bufferInput() {
    if (Input.pressed('jump')) this.jumpBuf = 7;
    if (Input.pressed('attack') && this.weapon === 'sword') this.atkBuf = 10;
    if (Input.pressed('dash')) this.dashBuf = 5;
    if (Input.pressed('switch')) this.swapBuf = 20;
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

  // Aim from the mouse when it's in use, otherwise from the arrow keys. Also turns Rowan toward the cursor.
  updateAim(g) {
    const m = Input.mouse;
    if (m.active) {
      const dx = m.x + g.cam.x - this.cx, dy = m.y + g.cam.y - (this.y + 10);
      if (!this.attack && !this.dashT && !this.hurtT && Math.abs(dx) > 2) this.facing = dx > 0 ? 1 : -1;
      this.aimDeg = Math.atan2(dy, Math.abs(dx)) / DEG;
    } else {
      this.aimDeg = Input.held('up') ? -90 : Input.held('down') && !this.onGround ? 90 : 0;
    }
  }

  update(g) {
    this.bufferInput();
    const dir = (Input.held('right') ? 1 : 0) - (Input.held('left') ? 1 : 0);
    for (const k of ['jumpBuf', 'atkBuf', 'dashBuf', 'swapBuf', 'dropT', 'comboT', 'dashCD', 'hurtT', 'invuln', 'fireCD', 'firing', 'kickT', 'landT', 'skidT', 'flipT', 'swapT'])
      if (this[k] > 0) this[k]--;
    if (this.onGround) {
      this.coyote = 6;
      this.airDash = true;
      this.jumps = 1;
    } else if (this.coyote > 0) this.coyote--;

    // --- switch weapon (one in hand at a time); a press during a swing waits for it to finish
    if (this.swapBuf && (!this.attack || this.phase() === 2)) {
      this.swapBuf = 0;
      this.attack = null;
      this.weapon = this.weapon === 'gun' ? 'sword' : 'gun';
      this.swapT = 10;
      Sfx.play('switch');
    }

    // --- jetpack toggle (unlimited flight)
    if (Input.pressed('jet') && !this.hurtT) {
      this.jet = !this.jet;
      if (this.jet) {
        if (this.attack && this.attack.type === 'down') this.attack = null;
        if (this.onGround) this.vy = -2.2;
        Sfx.play('jetOn');
      } else Sfx.play('jetOff');
    }

    // --- dash
    if (this.dashBuf && !this.dashCD && !this.hurtT && !this.dashT && (this.onGround || this.airDash)) {
      if (dir) this.facing = dir;
      Object.assign(this, { dashT: PHYS.dashTime, dashCD: PHYS.dashCD, dashBuf: 0, attack: null });
      if (!this.onGround) this.airDash = false;
      Sfx.play('dash');
    }

    this.updateAim(g);

    // --- machete: start an attack, or chain the combo out of a slash's recovery
    if (this.weapon === 'sword' && this.atkBuf && !this.hurtT && !this.dashT && !this.swapT) {
      const a = this.attack;
      const chain = a && this.phase() === 2 && (a.type === 'slash1' || a.type === 'slash2');
      if (!a || chain) {
        const aimUp = Input.mouse.active ? this.aimDeg < -55 : Input.held('up');
        const aimDown = Input.mouse.active ? this.aimDeg > 55 : Input.held('down');
        let type;
        if (aimUp && !this.jet) type = 'up';
        else if (aimDown && !this.onGround && !this.jet) type = 'down';
        else {
          let step = chain || this.comboT ? this.combo + 1 : 1;
          if (step > 3 || (step === 3 && !this.onGround)) step = 1;
          this.combo = step;
          type = ['slash1', 'slash2', 'heavy'][step - 1];
        }
        const d = ATTACKS[type];
        this.attack = { type, t: 0, hit: new Set(), dmg: d.dmg, kb: d.kb };
        this.atkBuf = 0;
      }
    }

    // --- heavy machine gun: hold to keep firing
    if (this.weapon === 'gun' && Input.held('attack') && !this.hurtT && !this.dashT && !this.swapT) {
      this.firing = 8;
      if (!this.fireCD) this.fire(g);
    }

    // --- jump / double jump / drop through a branch
    if (this.jumpBuf && !this.hurtT && !this.dashT && !this.jet) {
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
        } else if (this.jumps > 0 && !this.attack) {
          // Double jump: a burst from the jetpack.
          Object.assign(this, { vy: PHYS.doubleJump, jumps: 0, jumpBuf: 0, jumpHeld: true, flipT: 14 });
          Sfx.play('djump');
          g.fx.thrust(this.cx - this.facing * 6, this.y + this.h - 4, 10);
        }
      }
    }

    // --- horizontal: momentum, a skid when reversing at speed
    if (this.dashT) {
      this.vx = this.facing * PHYS.dash;
      this.vy = 0;
      if (this.dashT % 3 === 0) g.fx.ghost(snapshotRig(SKINS.rowan, this.pose(g.t), this.cx, this.y + this.h, this.facing, g.t * 0.15, { color: '#ffb050', alpha: 0.7 }));
      if (--this.dashT === 0) this.vx = this.facing * PHYS.run;
    } else if (this.hurtT) {
      this.vx *= 0.9;
    } else if (this.attack && this.onGround && this.attack.type !== 'down') {
      this.vx *= 0.82;
    } else if (this.jet) {
      this.vx += (dir * PHYS.jetSpeed - this.vx) * PHYS.jetAccel; // flight has weight: slow to start and stop
      if (dir && !Input.mouse.active && !this.firing) this.facing = dir;
    } else {
      const firingSlow = this.firing && this.onGround ? 0.6 : 1; // heavy gun: you walk while you spray
      const target = dir * PHYS.run * firingSlow;
      const rate = !this.onGround ? PHYS.airAccel : dir ? PHYS.accel : PHYS.decel;
      if (this.onGround && dir && Math.sign(this.vx) === -dir && Math.abs(this.vx) > 1.3 && !this.skidT && !Input.mouse.active) {
        this.skidT = 8;
        g.fx.dust(this.cx, this.y + this.h, 2);
      }
      this.vx += (target - this.vx) * (this.skidT ? 0.12 : rate * 2);
      if (Math.abs(this.vx) < 0.05) this.vx = 0;
      if (dir && !this.attack && !Input.mouse.active && !this.firing) this.facing = dir;
    }

    // --- vertical: jetpack hover, or gravity with variable jump height and a little apex hang
    if (this.jet) {
      const climb = (Input.held('up') ? -1 : 0) + (Input.held('down') ? 1 : 0);
      const target = climb * PHYS.jetClimb + Math.sin(g.t * 0.08) * 0.25;
      this.vy += (target - this.vy) * 0.1;
      if (g.t % 3 === 0) g.fx.thrust(this.cx - this.facing * 7, this.y + this.h - 3, 1 + (climb < 0 ? 2 : 0), -this.vx * 0.4);
      if (g.t % 8 === 0) Sfx.play('jet');
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
      if (this.jet && !Input.held('up')) { this.jet = false; Sfx.play('jetOff'); } // touching down shuts it off
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
    if (this.onGround) {
      this.anim += Math.abs(this.vx);
      // footsteps on each foot contact of the run cycle
      const frame = Math.floor(this.anim / 3.6) % 8;
      if (Math.abs(this.vx) > 0.5 && frame !== this.stepFrame && (frame === 1 || frame === 5)) {
        Sfx.play('step');
        if (Math.abs(this.vx) > 1.5) g.fx.dust(this.cx - this.facing * 3, this.y + this.h, 1);
      }
      this.stepFrame = frame;
    }
  }

  // One machine-gun round: bullet along the aim with a little wavering spread, recoil, flash and casing.
  fire(g) {
    const f = this.facing, a = (this.aimDeg + Math.sin(this.shots * 1.9) * 3.5) * DEG;
    const dx = Math.cos(a) * f, dy = Math.sin(a);
    g.spawn(new Bullet(dx * PHYS.bulletSpeed, dy * PHYS.bulletSpeed), this.cx + dx * 18 - 2, this.y + 11 + dy * 18 - 1);
    this.shots++;
    this.fireCD = PHYS.fireRate;
    this.kickT = 3;
    g.shake = Math.max(g.shake, 0.6);
    g.fx.casing(this.cx + f * 2, this.y + 10, -f);
    Sfx.play('gun');
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
        Object.assign(this, { vy: PHYS.pogo, jumpHeld: false, airDash: true, jumps: 1, attack: null });
        g.freeze(3);
        g.fx.sparks(this.cx, box.y + 10, 1, SPARK_GUN, 4);
        g.fx.sparks(this.cx, box.y + 10, -1, SPARK_GUN, 4);
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
      if (!this.dead) Object.assign(this, this.safe, { vx: 0, vy: 0, hurtT: 0, attack: null, jet: false });
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
    Object.assign(this, { invuln: 70, hurtT: 14, attack: null, dashT: 0, jet: false, firing: 0 });
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
  // Jetpack flight pose: the body tilts with speed, legs trail and swing with momentum,
  // and the flames grow when climbing and lean away from the direction of travel.
  jetPose() {
    const tilt = clamp(this.vx * this.facing / PHYS.jetSpeed, -1, 1), rise = clamp(-this.vy / PHYS.jetClimb, -1, 1);
    return {
      hy: 2, lean: Math.round(1 + tilt * 3), hunch: 1, flow: 0.6 + Math.abs(tilt) * 0.6,
      legs: [[-18 - tilt * 22 + rise * 8, 40 + Math.max(0, -rise) * 30], [-2 - tilt * 22 + rise * 10, 30 + Math.max(0, -rise) * 35]],
      ...CARRY, jet: clamp(0.75 + rise * 0.45 + Math.abs(tilt) * 0.2, 0.4, 1.4), jetTilt: tilt * 3,
    };
  }

  // Legs and body come from movement; arms and weapon come from the weapon in hand.
  pose(t) {
    let p;
    if (this.hurtT) p = POSE.hurt;
    else if (this.dashT) p = POSE.dash;
    else if (this.jet) p = this.jetPose();
    else if (!this.onGround) p = this.flipT ? POSE.flip : this.vy < -1.5 ? POSE.rise : this.vy < 1.5 ? POSE.peak : POSE.fall;
    else if (this.landT && Math.abs(this.vx) < 1) p = POSE.land;
    else if (this.skidT) p = POSE.skid;
    else if (Math.abs(this.vx) > 0.25) p = POSE.run(Math.floor(this.anim / 3.6) % 8, 0.5 + Math.abs(this.vx) * 0.25);
    else p = POSE.idle(t);
    p = { ...p };

    if (this.weapon === 'sword') {
      p.gun = null;
      if (this.attack) {
        const d = ATTACKS[this.attack.type], ph = this.phase(), [ua, el, sw] = d.pose[ph];
        p.arms = [p.arms[0], [ua, el]];
        p.sword = sw;
        if (this.onGround && this.attack.type !== 'down') Object.assign(p, POSE.lunge[ph]);
      } else if (!this.hurtT && !this.dashT) { // machete held ready, blade up and forward
        p.arms = [[40, 40], [55, 60]];
        p.sword = this.swapT ? 60 : -35;
      }
    } else if (!this.hurtT && !this.dashT && (this.firing || Input.mouse.active)) {
      Object.assign(p, aimArms(this.aimDeg));
      if (this.kickT) {
        p.kick = this.kickT > 1 ? 2 : 1;
        p.flash = this.kickT > 1 ? 1 + (this.shots & 1) : 0;
      }
    }
    return p;
  }

  draw(ctx, cam, g) {
    if (this.dead) return;
    if (this.invuln && !this.dashT && g.t % 6 < 3) return;
    const t = g.t * 0.15, f = this.facing;
    // Recoil: the whole body shudders while the machine gun is firing.
    const shake = this.kickT ? [-f * (this.kickT > 1 ? 1 : 0), (this.shots & 1) && this.kickT > 1 ? 1 : 0] : [0, 0];
    drawRig(ctx, SKINS.rowan, this.pose(g.t), this.cx - cam.x + shake[0], this.y + this.h - cam.y + shake[1], f, t);

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
      ctx.fillStyle = g.t % 4 < 2 ? '#ffffff' : '#ffb050';
      ctx.fillRect(sx - 3, sy, 1, 3);
      ctx.fillRect(sx + 3, sy, 1, 3);
      ctx.fillRect(sx, sy + 2, 1, 4);
    }
  }
}
