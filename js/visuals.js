(function () {
  const canvas = document.getElementById('geo-bg');
  if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  const mq = window.matchMedia('(max-width: 720px)');
  let width = 0;
  let height = 0;
  let dpr = 1;
  let points = [];
  let raf = 0;
  let last = 0;
  let pointer = { x: -9999, y: -9999, active: false };

  function cssVar(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, mq.matches ? 1.35 : 1.75);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = mq.matches ? 16 : 34;
    points = Array.from({ length: count }, (_, i) => ({
      x: (i * 163) % width,
      y: ((i * 97) % height) * 0.92 + height * 0.04,
      vx: (Math.sin(i * 2.17) * 0.18) + 0.05,
      vy: Math.cos(i * 1.83) * 0.12,
      r: 1 + (i % 4) * 0.35,
      phase: i * 0.23
    }));
  }

  function drawContours(t, color) {
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    const gap = mq.matches ? 70 : 92;
    for (let row = -1; row < height / gap + 2; row++) {
      ctx.beginPath();
      for (let x = -40; x <= width + 40; x += 18) {
        const y = row * gap
          + Math.sin((x * 0.011) + t * 0.00045 + row) * 12
          + Math.cos((x * 0.019) - t * 0.00034) * 7;
        if (x === -40) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRoutes(t, accent, secondary) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const routes = mq.matches ? 3 : 5;
    for (let i = 0; i < routes; i++) {
      const yBase = height * (0.18 + i * 0.105);
      const drift = (t * (0.018 + i * 0.003)) % (width + 240);
      const startX = -220 + drift;
      const grad = ctx.createLinearGradient(startX - 180, yBase, startX + 280, yBase + 60);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.42, i % 2 ? secondary : accent);
      grad.addColorStop(1, 'transparent');
      ctx.strokeStyle = grad;
      ctx.globalAlpha = 0.10;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let s = 0; s <= 18; s++) {
        const x = startX + s * 28;
        const y = yBase
          + Math.sin((s + i) * 0.72 + t * 0.001) * 22
          + Math.cos((x + i * 100) * 0.008) * 10;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawGrid(t, color) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    const step = mq.matches ? 58 : 74;
    const offset = (t * 0.012) % step;
    for (let x = -step; x < width + step; x += step) {
      ctx.beginPath();
      ctx.moveTo(x + offset, 0);
      ctx.lineTo(x + offset - height * 0.18, height);
      ctx.stroke();
    }
    for (let y = -step; y < height + step; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y + offset);
      ctx.lineTo(width, y + offset + width * 0.08);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawNetwork(dt, t, accent, secondary, text) {
    for (const p of points) {
      if (pointer.active) {
        const dxp = pointer.x - p.x;
        const dyp = pointer.y - p.y;
        const distp = Math.hypot(dxp, dyp);
        if (distp < 220 && distp > 1) {
          const force = (1 - distp / 220) * 0.025;
          p.vx += (dxp / distp) * force;
          p.vy += (dyp / distp) * force;
        }
      }
      p.vx *= 0.996;
      p.vy *= 0.996;
      p.x += p.vx * dt * 0.055;
      p.y += p.vy * dt * 0.055;
      if (p.x > width + 24) p.x = -24;
      if (p.x < -24) p.x = width + 24;
      if (p.y > height + 24) p.y = -24;
      if (p.y < -24) p.y = height + 24;
    }

    ctx.save();
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i];
        const b = points[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 168) continue;
        const alpha = (1 - dist / 168) * 0.14;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = i % 3 === 0 ? accent : secondary;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        const pulse = ((t * 0.00018 + a.phase + b.phase) % 1);
        if (pulse < 0.18) {
          ctx.globalAlpha = (0.18 - pulse) * 1.25;
          ctx.fillStyle = accent;
          ctx.beginPath();
          ctx.arc(a.x + (b.x - a.x) * pulse * 5.55, a.y + (b.y - a.y) * pulse * 5.55, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    for (const p of points) {
      ctx.globalAlpha = 0.34 + Math.sin(t * 0.002 + p.phase) * 0.08;
      ctx.fillStyle = text;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (pointer.active) {
      const ring = 28 + Math.sin(t * 0.006) * 4;
      ctx.globalAlpha = 0.10;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, ring, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function frame(now) {
    const dt = last ? Math.min(now - last, 34) : 16;
    last = now;
    ctx.clearRect(0, 0, width, height);

    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    const accent = cssVar('--accent', dark ? '#7fb069' : '#416f32');
    const secondary = cssVar('--accent2', dark ? '#78a6d1' : '#0b365d');
    const text = cssVar('--text', dark ? '#edf4f8' : '#13212f');

    drawGrid(now, secondary);
    drawContours(now, accent);
    drawRoutes(now, accent, secondary);
    drawNetwork(dt, now, accent, secondary, text);

    raf = requestAnimationFrame(frame);
  }

  function start() {
    cancelAnimationFrame(raf);
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  resize();
  start();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', function (event) {
    pointer = { x: event.clientX, y: event.clientY, active: true };
  }, { passive: true });
  window.addEventListener('pointerleave', function () {
    pointer.active = false;
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else start();
  });
})();
