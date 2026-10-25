// Particles, dash afterimages and floating text.
const SPARK_TEAL = ['#ffffff', '#c8fff4', '#5ff0e0'];
const SPARK_BLIGHT = ['#ffffff', '#ff8ae0', '#ff4ad0'];
const SPARK_GUN = ['#ffffff', '#ffe060', '#ff9030'];

class Effects {
  constructor() {
    this.parts = [];
    this.ghosts = [];
    this.texts = [];
  }

  burst(x, y, n, colors, o = {}) {
    const speed = o.speed ?? 2, life = o.life ?? 24;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
      this.parts.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (o.up ?? 0), grav: o.grav ?? 0.12,
        life: life * (0.6 + Math.random() * 0.4) | 0, color: colors[Math.random() * colors.length | 0], size: o.size ?? 1,
      });
    }
  }

  sparks(x, y, dir, colors = SPARK_TEAL, n = 7) {
    for (let i = 0; i < n; i++)
      this.parts.push({
        x, y, vx: dir * (1 + Math.random() * 3), vy: (Math.random() - 0.6) * 3, grav: 0.16,
        life: 10 + Math.random() * 10 | 0, color: colors[i % colors.length], size: 1,
      });
  }

  dust(x, y, n = 3) {
    for (const d of [-1, 1])
      for (let i = 0; i < n; i++)
        this.parts.push({ x: x + d * 3, y: y - 1, vx: d * (0.3 + Math.random() * 0.8), vy: -Math.random() * 0.4, grav: 0, life: 12 + i * 3, color: '#c8b090', size: 1 });
  }

  // Jetpack exhaust: fire sparks and a little smoke.
  thrust(x, y, n, drift = 0) {
    for (let i = 0; i < n; i++)
      this.parts.push({ x: x + Math.random() * 4 - 2, y, vx: drift + (Math.random() - 0.5) * 0.8, vy: 1 + Math.random() * 1.5, grav: 0.02, life: 8 + Math.random() * 8 | 0, color: ['#ffffff', '#ffe060', '#ff9030', '#e04020'][Math.random() * 4 | 0], size: 1 });
    if (Math.random() < 0.5) this.parts.push({ x, y: y + 6, vx: drift + (Math.random() - 0.5) * 0.4, vy: 0.4, grav: -0.02, life: 24, color: Math.random() < 0.5 ? '#c8c8d4' : '#9a9aa8', size: 2 });
  }

  // Brass shell casing ejected when the gun fires.
  casing(x, y, dir) {
    this.parts.push({ x, y, vx: dir * (0.6 + Math.random()), vy: -1.6 - Math.random(), grav: 0.2, life: 30, color: '#e8b848', size: 1 });
  }

  ghost(g) { this.ghosts.push({ ...g, life: 12 }); }

  text(str, x, y, color) { this.texts.push({ str, x, y, color, life: 90 }); }

  update() {
    for (const p of this.parts) {
      p.vy += p.grav;
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
    }
    for (const g of this.ghosts) g.life--;
    for (const t of this.texts) {
      t.life--;
      if (t.life > 60) t.y -= 0.3;
    }
    this.parts = this.parts.filter(p => p.life > 0);
    this.ghosts = this.ghosts.filter(g => g.life > 0);
    this.texts = this.texts.filter(t => t.life > 0);
  }

  drawGhosts(ctx, cam) {
    for (const g of this.ghosts) {
      ctx.globalAlpha = g.life / 12 * 0.5;
      ctx.drawImage(g.img, Math.round(g.x - cam.x), Math.round(g.y - cam.y));
    }
    ctx.globalAlpha = 1;
  }

  draw(ctx, cam) {
    for (const p of this.parts) px(ctx, p.color, p.x - cam.x, p.y - cam.y, p.size, p.size);
    for (const t of this.texts)
      if (t.life > 20 || t.life % 4 < 2)
        drawText(ctx, t.str, Math.round(t.x - cam.x), Math.round(t.y - cam.y), t.color, { align: 'center', shadow: '#1a1428' });
  }
}
