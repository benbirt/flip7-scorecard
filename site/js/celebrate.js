// The winner's celebrations: champagne, fireworks, confetti and a trophy.
// Each one is a scene on top of a shared canvas particle system.

import * as sound from "./sound.js";

const GOLDS = ["#ffcf3f", "#ffe58a", "#fff3c4", "#ffb52e"];
const PARTY = ["#ffcf3f", "#ff4f8b", "#33d6c3", "#8f7bff", "#ff8a3d", "#ffffff"];

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (xs) => xs[Math.floor(Math.random() * xs.length)];

class Particles {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext("2d");
    this.list = [];
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // p: x, y, vx, vy (px/s), life (s); optional kind, color, size, gravity
  // (px/s²), drag (per second), rot, vr, wobble.
  add(p) {
    if (this.list.length > 2500) return;
    this.list.push({
      kind: "dot", size: 3, gravity: 300, drag: 0.5, rot: 0, vr: 0, wobble: 0,
      color: "#fff", age: 0, ...p,
    });
  }

  step(dt) {
    const next = [];
    for (const p of this.list) {
      p.age += dt;
      if (p.age >= p.life) continue;
      const k = Math.max(0, 1 - p.drag * dt);
      p.vx *= k;
      p.vy = p.vy * k + p.gravity * dt;
      p.x += p.vx * dt + Math.sin((p.age + p.size) * 6) * p.wobble * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.y > this.h + 40 || p.y < -400 || p.x < -100 || p.x > this.w + 100) continue;
      next.push(p);
    }
    this.list = next;
  }

  draw() {
    const g = this.g;
    g.clearRect(0, 0, this.w, this.h);
    for (const p of this.list) {
      const fade = Math.min(1, (p.life - p.age) / Math.min(0.6, p.life));
      g.globalAlpha = fade;
      switch (p.kind) {
        case "rect": {
          g.save();
          g.translate(p.x, p.y);
          g.rotate(p.rot);
          g.scale(1, Math.cos(p.rot * 1.7));
          g.fillStyle = p.color;
          g.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
          g.restore();
          break;
        }
        case "bubble": {
          g.strokeStyle = p.color;
          g.lineWidth = 1.2;
          g.beginPath();
          g.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          g.stroke();
          g.fillStyle = "#ffffffaa";
          g.beginPath();
          g.arc(p.x - p.size * 0.35, p.y - p.size * 0.35, p.size * 0.25, 0, Math.PI * 2);
          g.fill();
          break;
        }
        case "spark": {
          g.strokeStyle = p.color;
          g.lineWidth = p.size;
          g.lineCap = "round";
          g.beginPath();
          g.moveTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
          g.lineTo(p.x, p.y);
          g.stroke();
          break;
        }
        case "star": {
          const s = p.size * (0.6 + 0.4 * Math.sin(p.age * 14));
          g.fillStyle = p.color;
          g.beginPath();
          for (let i = 0; i < 8; i++) {
            const r = i % 2 === 0 ? s * 2 : s * 0.45;
            const a = (i * Math.PI) / 4 + p.rot;
            g.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
          }
          g.closePath();
          g.fill();
          break;
        }
        default: {
          g.fillStyle = p.color;
          g.beginPath();
          g.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    g.globalAlpha = 1;
  }
}

const BOTTLE_SVG = `
<svg viewBox="0 0 120 380" aria-hidden="true">
  <defs>
    <linearGradient id="glass" x1="0" x2="1">
      <stop offset="0" stop-color="#0d3b22"/><stop offset="0.35" stop-color="#1f7a45"/>
      <stop offset="0.6" stop-color="#145a33"/><stop offset="1" stop-color="#082916"/>
    </linearGradient>
    <linearGradient id="foil" x1="0" x2="1">
      <stop offset="0" stop-color="#b8860b"/><stop offset="0.4" stop-color="#ffe27a"/><stop offset="1" stop-color="#a87400"/>
    </linearGradient>
  </defs>
  <g class="cork" id="cork">
    <rect x="51" y="12" width="18" height="26" rx="3" fill="#d9b47c"/>
    <ellipse cx="60" cy="12" rx="13" ry="7" fill="#e8c992"/>
    <rect x="49" y="30" width="22" height="6" rx="2" fill="#c0c0c0"/>
  </g>
  <path d="M48 40 L72 40 L72 120 C72 150 102 160 102 200 L102 360 Q102 376 86 376 L34 376 Q18 376 18 360 L18 200 C18 160 48 150 48 120 Z" fill="url(#glass)"/>
  <path d="M46 36 L74 36 L76 112 C76 120 44 120 44 112 Z" fill="url(#foil)"/>
  <rect x="24" y="228" width="72" height="86" rx="8" fill="#fff5dc"/>
  <rect x="28" y="232" width="64" height="78" rx="6" fill="none" stroke="#c99a2e" stroke-width="2"/>
  <text x="60" y="290" text-anchor="middle" font-size="52" font-weight="900" fill="#b11e4a" font-family="system-ui, sans-serif">7</text>
  <path d="M30 196 C30 175 44 168 52 150 L52 135 C46 160 26 168 26 200 L26 350 L30 350 Z" fill="#ffffff33"/>
</svg>`;

const TROPHY_SVG = `
<svg viewBox="0 0 200 220" class="trophy" aria-hidden="true">
  <defs>
    <linearGradient id="gold" x1="0" x2="1">
      <stop offset="0" stop-color="#b8860b"/><stop offset="0.45" stop-color="#ffe27a"/><stop offset="1" stop-color="#c48a00"/>
    </linearGradient>
  </defs>
  <path d="M50 30 C10 30 10 95 62 100" fill="none" stroke="url(#gold)" stroke-width="12" stroke-linecap="round"/>
  <path d="M150 30 C190 30 190 95 138 100" fill="none" stroke="url(#gold)" stroke-width="12" stroke-linecap="round"/>
  <path d="M45 15 L155 15 C155 90 130 125 100 130 C70 125 45 90 45 15 Z" fill="url(#gold)"/>
  <rect x="88" y="128" width="24" height="40" fill="url(#gold)"/>
  <path d="M60 168 L140 168 L148 196 L52 196 Z" fill="url(#gold)"/>
  <rect x="44" y="196" width="112" height="18" rx="4" fill="#5a3a00"/>
  <text x="100" y="92" text-anchor="middle" font-size="64" font-weight="900" fill="#8a5a00" font-family="system-ui, sans-serif">7</text>
  <path d="M60 25 C62 70 72 100 90 115" fill="none" stroke="#fff8" stroke-width="5" stroke-linecap="round"/>
</svg>`;

// A scene sets up the stage and returns a function called every frame with
// the elapsed time in seconds.
const scenes = {
  champagne(ctx) {
    ctx.stage.innerHTML = `<div class="bottle-wrap">${BOTTLE_SVG}</div>`;
    const wrap = ctx.stage.querySelector(".bottle-wrap");
    const cork = ctx.stage.querySelector("#cork");
    const popAt = ctx.reduced ? 0.1 : 1.9;
    let popped = false;
    let mouth = null;
    const angle = (-14 * Math.PI) / 180;
    const dir = { x: Math.sin(angle), y: -Math.cos(angle) };
    if (ctx.sound) sound.fizz(0, 1.8);

    return (t, dt) => {
      if (!popped && t >= popAt) {
        popped = true;
        const r = cork.getBoundingClientRect();
        mouth = { x: r.left + r.width / 2, y: r.top + r.height };
        cork.classList.add("fly");
        wrap.classList.add("popped");
        if (ctx.sound) {
          sound.pop();
          sound.fizz(0.05, 3);
        }
        navigator.vibrate?.(60);
      }
      if (!popped) return;
      const since = t - popAt;
      // The spray: heavy at first, then a trickle.
      const rate = since < 0.6 ? 900 : since < 2.4 ? 350 : since < 4 ? 60 : 0;
      for (let i = 0; i < rate * dt * ctx.amount; i++) {
        const speed = rand(500, 1200) * (since < 0.6 ? 1.1 : 0.8);
        const spread = rand(-0.28, 0.28);
        const c = Math.cos(spread), s = Math.sin(spread);
        ctx.fx.add({
          x: mouth.x, y: mouth.y,
          vx: (dir.x * c - dir.y * s) * speed,
          vy: (dir.x * s + dir.y * c) * speed,
          life: rand(1, 2.2),
          gravity: 900,
          drag: 0.6,
          size: rand(1.5, 4.5),
          color: Math.random() < 0.6 ? pick(GOLDS) : "#ffffff",
        });
      }
      // Bubbles keep rising for as long as the overlay is open.
      for (let i = 0; i < 25 * dt * ctx.amount; i++) {
        ctx.fx.add({
          kind: "bubble",
          x: rand(0, ctx.fx.w), y: ctx.fx.h + 10,
          vx: 0, vy: rand(-160, -70),
          gravity: -20, drag: 0, wobble: rand(10, 40),
          life: 12, size: rand(3, 9),
          color: pick(["#ffe58acc", "#ffffffaa", "#ffcf3faa"]),
        });
      }
    };
  },

  fireworks(ctx) {
    ctx.stage.innerHTML = "";
    let nextLaunch = 0;
    let booms = 0;
    const rockets = [];
    return (t, dt) => {
      if (t >= nextLaunch) {
        nextLaunch = t + (t < 2 ? rand(0.2, 0.45) : rand(0.4, 0.9)) / Math.max(ctx.amount, 0.3);
        rockets.push({
          x: rand(0.15, 0.85) * ctx.fx.w, y: ctx.fx.h,
          vy: -rand(0.9, 1.25) * Math.sqrt(2 * 600 * ctx.fx.h * rand(0.5, 0.8)),
          vx: rand(-60, 60),
          hue: pick([0, 45, 160, 200, 280, 320]),
        });
      }
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.vy += 600 * dt;
        r.x += r.vx * dt;
        r.y += r.vy * dt;
        ctx.fx.add({ x: r.x, y: r.y, vx: rand(-20, 20), vy: rand(20, 60), life: 0.4, gravity: 0, size: 2, color: "#ffd9a0" });
        if (r.vy >= -40) {
          rockets.splice(i, 1);
          const n = Math.round(rand(60, 110) * ctx.amount);
          const power = rand(220, 380);
          for (let k = 0; k < n; k++) {
            const a = (k / n) * Math.PI * 2 + rand(-0.05, 0.05);
            const sp = power * rand(0.85, 1.05);
            ctx.fx.add({
              kind: Math.random() < 0.25 ? "star" : "spark",
              x: r.x, y: r.y,
              vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
              life: rand(1.1, 1.9), gravity: 120, drag: 1.4,
              size: rand(1.5, 2.8),
              color: `hsl(${r.hue + rand(-20, 20)} 100% ${rand(60, 80)}%)`,
            });
          }
          if (ctx.sound && booms < 12) {
            booms += 1;
            sound.boom();
          }
        }
      }
    };
  },

  confetti(ctx) {
    ctx.stage.innerHTML = "";
    let fired = false;
    if (ctx.sound) sound.fanfare(0.1);
    return (t, dt) => {
      const { w, h } = ctx.fx;
      if (!fired) {
        fired = true;
        if (ctx.sound) { sound.pop(); sound.pop(0.08); }
        for (const side of [-1, 1]) {
          for (let i = 0; i < 160 * ctx.amount; i++) {
            const a = (side < 0 ? -Math.PI / 3 : (-2 * Math.PI) / 3) + rand(-0.35, 0.35);
            const sp = rand(600, 1300) * Math.min(1.3, h / 700);
            ctx.fx.add({
              kind: "rect",
              x: side < 0 ? 0 : w, y: h,
              vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
              life: rand(3, 5), gravity: 500, drag: 2.2,
              size: rand(4, 8), rot: rand(0, 6), vr: rand(-12, 12),
              wobble: rand(20, 60), color: pick(PARTY),
            });
          }
        }
      }
      const rate = t < 6 ? 70 : 25;
      for (let i = 0; i < rate * dt * ctx.amount; i++) {
        ctx.fx.add({
          kind: "rect",
          x: rand(0, w), y: -10,
          vx: rand(-40, 40), vy: rand(60, 160),
          life: 9, gravity: 40, drag: 0.3,
          size: rand(4, 7), rot: rand(0, 6), vr: rand(-8, 8),
          wobble: rand(30, 90), color: pick(PARTY),
        });
      }
    };
  },

  trophy(ctx) {
    ctx.stage.innerHTML = `<div class="rays"></div>${TROPHY_SVG}`;
    const trophy = ctx.stage.querySelector(".trophy");
    if (ctx.sound) sound.fanfare(0.6);
    let shone = false;
    return (t, dt) => {
      const r = trophy.getBoundingClientRect();
      if (!shone && t > 0.8) {
        shone = true;
        for (let i = 0; i < 120 * ctx.amount; i++) {
          const a = rand(0, Math.PI * 2);
          const sp = rand(150, 600);
          ctx.fx.add({
            kind: "star", x: r.left + r.width / 2, y: r.top + r.height * 0.35,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            life: rand(1, 2), gravity: 200, drag: 1.5, size: rand(2, 4),
            rot: rand(0, 1), color: pick(GOLDS),
          });
        }
      }
      for (let i = 0; i < 18 * dt * ctx.amount; i++) {
        ctx.fx.add({
          kind: "star",
          x: r.left + rand(0, r.width), y: r.top + rand(0, r.height * 0.7),
          vx: 0, vy: 0, gravity: 0, life: rand(0.5, 1.2),
          size: rand(2, 4.5), rot: rand(0, 1), color: pick(GOLDS),
        });
      }
    };
  },
};

let running = null;

// Shows the overlay. Returns a promise that resolves when it is closed.
export function celebrate(kind, { name, detail, withSound }) {
  stop();
  const overlay = document.getElementById("celebration");
  const canvas = document.getElementById("fx");
  const stage = document.getElementById("stage");
  document.getElementById("banner-name").textContent = name;
  document.getElementById("banner-score").textContent = detail;
  overlay.hidden = false;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fx = new Particles(canvas);
  const ctx = { fx, stage, sound: withSound, reduced, amount: reduced ? 0.15 : 1 };
  const frame = (scenes[kind] ?? scenes.confetti)(ctx);
  const onResize = () => fx.resize();
  window.addEventListener("resize", onResize);

  let last = performance.now();
  const start = last;
  let raf = 0;
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    frame((now - start) / 1000, dt);
    fx.step(dt);
    fx.draw();
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return new Promise((resolve) => {
    const close = document.getElementById("close-celebration");
    const onKey = (e) => { if (e.key === "Escape") stop(); };
    running = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("keydown", onKey);
      close.removeEventListener("click", stop);
      overlay.hidden = true;
      stage.innerHTML = "";
      fx.g.clearRect(0, 0, fx.w, fx.h);
      running = null;
      resolve();
    };
    close.addEventListener("click", stop);
    document.addEventListener("keydown", onKey);
    close.focus();
  });
}

export function stop() {
  if (running) running();
}
