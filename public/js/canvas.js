// Abstract smooth organic breathing aurora animation on HTML5 Canvas

export class MeditationCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.rafId = null;
    this.running = false;
    this.paused = false;
    this.time = 0;
    this.breathScale = 0.72;
    this.targetBreathScale = 0.72;

    this.particles = Array.from({ length: 42 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 1.1 + Math.random() * 2.4,
      speedY: 0.00009 + Math.random() * 0.00018,
      drift: Math.random() * Math.PI * 2,
      alpha: 0.15 + Math.random() * 0.45,
    }));

    this.handleResize = () => this.resize();
    window.addEventListener("resize", this.handleResize);
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = w;
    this.height = h;
  }

  setBreathTarget(scale) {
    this.targetBreathScale = scale;
  }

  setPaused(paused) {
    this.paused = paused;
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this.handleResize);
  }

  render() {
    const { ctx, width: w, height: h } = this;
    if (!this.paused) {
      this.time += 0.008;
      this.breathScale += (this.targetBreathScale - this.breathScale) * 0.025;
    }

    // Deep calm twilight sky-blue base
    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.42, 40, w * 0.5, h * 0.5, Math.max(w, h) * 0.8);
    bg.addColorStop(0, "#293a52");
    bg.addColorStop(0.55, "#192436");
    bg.addColorStop(1, "#101724");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.48;
    const baseRadius = Math.min(w, h) * 0.34 * (0.72 + this.breathScale * 0.42);

    // 4 layered translucent liquid-aurora blobs (sheep sky-blue & lotus dusty-pink)
    const blobs = [
      { ox: Math.cos(this.time * 0.7) * 58, oy: Math.sin(this.time * 0.5) * 44, r: baseRadius * 1.15, color: "rgba(148, 175, 200, 0.28)" },
      { ox: Math.sin(this.time * 0.6) * 72, oy: Math.cos(this.time * 0.8) * 52, r: baseRadius * 0.96, color: "rgba(197, 140, 148, 0.24)" },
      { ox: Math.cos(this.time * 0.9 + 2) * 46, oy: Math.sin(this.time * 0.65 + 1) * 60, r: baseRadius * 0.9, color: "rgba(138, 152, 196, 0.20)" },
      { ox: 0, oy: 0, r: baseRadius * 0.78, color: "rgba(195, 216, 236, 0.22)" },
    ];

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    blobs.forEach((b) => {
      const grad = ctx.createRadialGradient(cx + b.ox, cy + b.oy, 10, cx + b.ox, cy + b.oy, b.r);
      grad.addColorStop(0, b.color);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx + b.ox, cy + b.oy, b.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // Soft organic undulating petal-wave ring
    ctx.save();
    ctx.translate(cx, cy);
    for (let ring = 0; ring < 3; ring++) {
      ctx.beginPath();
      const ringRadius = baseRadius * (0.68 + ring * 0.18);
      const pts = 96;
      for (let i = 0; i <= pts; i++) {
        const angle = (i / pts) * Math.PI * 2;
        const wobble =
          Math.sin(angle * 3 + this.time * (1.2 + ring * 0.3)) * 10 +
          Math.cos(angle * 5 - this.time * 0.9) * 6;
        const r = ringRadius + wobble;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(229, 238, 232, ${0.14 - ring * 0.035})`;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.restore();

    // Floating serene light dust
    this.particles.forEach((p) => {
      if (!this.paused) {
        p.y -= p.speedY;
        if (p.y < -0.05) {
          p.y = 1.05;
          p.x = Math.random();
        }
      }
      const x = (p.x + Math.sin(this.time + p.drift) * 0.012) * w;
      const y = p.y * h;
      ctx.fillStyle = `rgba(243, 241, 235, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}
