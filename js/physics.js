/* physics.js — animaciones basadas en física, sin dependencias.

   1. Campo gravitatorio en el héroe: partículas con atractor suavizado (potencial de Plummer),
      amortiguamiento viscoso y enlaces de proximidad (red de un sistema complejo).
      El atractor sigue el cursor; sin cursor describe una órbita de Lissajous.
   2. Interferencia de doble rendija en "Filosofía": suma de dos ondas circulares coherentes;
      la separación de rendijas responde a la posición vertical del cursor.
   3. Resortes amortiguados (oscilador armónico, zeta ≈ 0.5) en botones y foto de perfil.

   Rendimiento: cada animación solo corre mientras es visible (IntersectionObserver) y la pestaña
   está activa; paso de tiempo acotado; DPR limitado a 2; menos partículas/resolución en modo "lite".
   Accesibilidad: respeta prefers-reduced-motion y ofrece un botón para pausar (WCAG 2.2.2). */
(function () {
   'use strict';

   var doc = document, root = doc.documentElement, win = window;
   var mqReduce = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
   var lite = /(^|\s)lite(\s|$)/.test(root.className);
   var isEN = /^en/i.test(root.lang || '');
   var coarse = win.matchMedia && win.matchMedia('(hover: none)').matches;

   var enabled = !mqReduce.matches;
   try { if (localStorage.getItem('physics-anim') === 'off') enabled = false; } catch (e) { /* sin storage */ }

   var TAU = Math.PI * 2;
   function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

   /* ---------- Planificador: corre solo si visible + pestaña activa + habilitado ---------- */
   function makeTask(el, o) {
      var inView = !('IntersectionObserver' in win), raf = 0, last = 0, t = 0, gap = 1000 / (o.fps || 60);
      function loop(now) {
         raf = win.requestAnimationFrame(loop);
         var elapsed = now - last;
         if (elapsed < gap - 1) return;                 // limita fps
         last = now;
         var dt = Math.min(elapsed / 1000, 1 / 20);     // acota el paso: evita saltos tras pestañas inactivas
         t += dt;
         o.step(dt, t);
      }
      function update() {
         var run = enabled && inView && !doc.hidden;
         if (run && !raf) { last = win.performance.now(); raf = win.requestAnimationFrame(loop); }
         else if (!run && raf) { win.cancelAnimationFrame(raf); raf = 0; }
         if (!enabled && o.still) o.still();
      }
      if ('IntersectionObserver' in win) {
         new IntersectionObserver(function (es) { inView = es[0].isIntersecting; update(); }, { rootMargin: '80px' }).observe(el);
      }
      doc.addEventListener('visibilitychange', update);
      win.addEventListener('physics:toggle', update);
      update();
   }

   function addCanvas(parent, cls, first) {
      var c = doc.createElement('canvas');
      c.className = 'phys-canvas ' + cls;
      c.setAttribute('aria-hidden', 'true');
      if (first && parent.firstChild) parent.insertBefore(c, parent.firstChild); else parent.appendChild(c);
      return c;
   }

   function onResize(el, fn) {
      if ('ResizeObserver' in win) { new ResizeObserver(fn).observe(el); }
      else { var tm; win.addEventListener('resize', function () { win.clearTimeout(tm); tm = win.setTimeout(fn, 150); }); }
   }

   /* ======================= 1. Campo gravitatorio (héroe) ======================= */
   function heroField() {
      var header = doc.getElementById('home');
      if (!header) return;
      var cv = addCanvas(header, 'hero-field', true), ctx = cv.getContext('2d');
      if (!ctx) return;
      var W = 0, H = 0, P = [], LINK = 118;
      var GM = 1.25e6, EPS = 46, DRAG = 0.42, VMAX = 240;       // GM [px^3/s^2], softening [px], drag [1/s]
      var att = { x: 0, y: 0 }, ptr = null, ptrAge = 0, relaxed = false;

      function seed() {
         var dpr = Math.min(win.devicePixelRatio || 1, 2);
         W = header.clientWidth; H = header.clientHeight;
         cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
         ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
         var n = Math.round(clamp(W * H / 15000, 22, 90) * (lite ? 0.5 : 1) * (coarse ? 0.7 : 1));
         P.length = 0;
         for (var i = 0; i < n; i++) {
            var a = Math.random() * TAU, v = 10 + Math.random() * 35;
            P.push({ x: Math.random() * W, y: Math.random() * H, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 0.8 + Math.random() * 1.6 });
         }
         att.x = W / 2; att.y = H / 2;
      }

      function advance(dt, t) {
         // blanco del atractor: cursor (si es reciente) o órbita de Lissajous
         ptrAge += dt;
         var tx, ty;
         if (ptr && ptrAge < 2.5) { tx = ptr.x; ty = ptr.y; }
         else { tx = W * (0.5 + 0.30 * Math.sin(0.21 * t)); ty = H * (0.5 + 0.24 * Math.sin(0.33 * t + 1.1)); }
         var k = 1 - Math.exp(-6 * dt);                           // seguimiento exponencial, independiente de fps
         att.x += (tx - att.x) * k; att.y += (ty - att.y) * k;

         var damp = Math.exp(-DRAG * dt);
         for (var i = 0; i < P.length; i++) {
            var p = P[i], dx = att.x - p.x, dy = att.y - p.y;
            var d2 = dx * dx + dy * dy + EPS * EPS, inv = GM / (d2 * Math.sqrt(d2));  // |a| = GM r / (r^2+eps^2)^{3/2}
            p.vx = (p.vx + dx * inv * dt) * damp; p.vy = (p.vy + dy * inv * dt) * damp;
            var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (sp > VMAX) { p.vx *= VMAX / sp; p.vy *= VMAX / sp; }
            p.x += p.vx * dt; p.y += p.vy * dt;
            if (p.x < -10) p.x += W + 20; else if (p.x > W + 10) p.x -= W + 20;   // contorno periódico
            if (p.y < -10) p.y += H + 20; else if (p.y > H + 10) p.y -= H + 20;
         }
      }
      function step(dt, t) { advance(dt, t); draw(); }

      function draw() {
         ctx.clearRect(0, 0, W, H);
         var i, j, a, b, dx, dy, d2, L2 = LINK * LINK;
         ctx.lineWidth = 1;
         for (i = 0; i < P.length; i++) {
            a = P[i];
            for (j = i + 1; j < P.length; j++) {
               b = P[j]; dx = a.x - b.x; dy = a.y - b.y; d2 = dx * dx + dy * dy;
               if (d2 < L2) {
                  ctx.strokeStyle = 'rgba(120,225,230,' + (0.30 * (1 - d2 / L2)).toFixed(3) + ')';
                  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
               }
            }
         }
         for (i = 0; i < P.length; i++) {
            a = P[i];
            var s = clamp(Math.sqrt(a.vx * a.vx + a.vy * a.vy) / 120, 0, 1);     // más rápida = más brillante
            ctx.fillStyle = 'rgba(' + (150 + 105 * s | 0) + ',' + (225 + 30 * s | 0) + ',235,' + (0.45 + 0.5 * s).toFixed(2) + ')';
            ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, TAU); ctx.fill();
         }
         var g = ctx.createRadialGradient(att.x, att.y, 0, att.x, att.y, 70);      // pozo de potencial
         g.addColorStop(0, 'rgba(17,171,176,.22)'); g.addColorStop(1, 'rgba(17,171,176,0)');
         ctx.fillStyle = g; ctx.fillRect(att.x - 70, att.y - 70, 140, 140);
      }

      function still() {                                          // cuadro estático (reduced motion / pausa)
         if (!relaxed) { for (var k = 0; k < 160; k++) advance(1 / 30, k / 30); relaxed = true; }
         draw();
      }

      seed();
      onResize(header, function () { if (header.clientWidth !== W || header.clientHeight !== H) { seed(); relaxed = false; if (!enabled) still(); } });
      if (!coarse) {
         header.addEventListener('pointermove', function (e) {
            var r = header.getBoundingClientRect();
            ptr = { x: e.clientX - r.left, y: e.clientY - r.top }; ptrAge = 0;
         }, { passive: true });
         header.addEventListener('pointerleave', function () { ptrAge = 99; }, { passive: true });
      }
      makeTask(header, { step: step, still: still, fps: lite ? 30 : 60 });
   }

   /* ======================= 2. Interferencia de doble rendija ======================= */
   function waveField() {
      var sec = doc.getElementById('testimonials');
      if (!sec) return;
      var cv = addCanvas(sec, 'wave-field', true), ctx = cv.getContext('2d');
      if (!ctx) return;
      var SCALE = lite ? 6 : 4, w = 0, h = 0, img = null, W = 0, H = 0;
      var LAMBDA = 36, K = TAU / LAMBDA, OMEGA = TAU * 0.55;        // longitud de onda [px], frecuencia 0.55 Hz
      var sep = 70, sepTarget = 70;

      function size() {
         W = sec.clientWidth; H = sec.clientHeight;
         w = Math.max(8, Math.ceil(W / SCALE)); h = Math.max(8, Math.ceil(H / SCALE));
         cv.width = w; cv.height = h;                                // lienzo de baja resolución, escalado por CSS
         img = ctx.createImageData(w, h);
      }

      function render(t) {
         var d = img.data, s1y = H / 2 - sep / 2, s2y = H / 2 + sep / 2, ph = OMEGA * t, idx = 0;
         for (var j = 0; j < h; j++) {
            var y = j * SCALE;
            for (var i = 0; i < w; i++) {
               var x = i * SCALE;
               var r1 = Math.sqrt(x * x + (y - s1y) * (y - s1y)), r2 = Math.sqrt(x * x + (y - s2y) * (y - s2y));
               // superposición de dos ondas circulares coherentes, con atenuación geométrica 1/sqrt(r)
               var A = (Math.cos(K * r1 - ph) / Math.sqrt(r1 + 140) + Math.cos(K * r2 - ph) / Math.sqrt(r2 + 140)) * 6.8;
               var v = A > 0 ? A : 0; v = v * v;                      // intensidad de la cresta
               d[idx] = 17; d[idx + 1] = 171; d[idx + 2] = 176; d[idx + 3] = clamp(v * 255, 0, 255);
               idx += 4;
            }
         }
         ctx.putImageData(img, 0, 0);
      }

      function step(dt, t) {
         sep += (sepTarget - sep) * (1 - Math.exp(-4 * dt));
         render(t);
      }
      function still() { if (!img) size(); render(1.7); }

      size();
      onResize(sec, function () { if (sec.clientWidth !== W || sec.clientHeight !== H) { size(); if (!enabled) still(); } });
      if (!coarse) {
         sec.addEventListener('pointermove', function (e) {
            var r = sec.getBoundingClientRect();
            sepTarget = 24 + clamp((e.clientY - r.top) / Math.max(r.height, 1), 0, 1) * 110;
         }, { passive: true });
      }
      makeTask(sec, { step: step, still: still, fps: lite ? 20 : 30 });
   }

   /* ======================= 3. Resortes amortiguados ======================= */
   function springs() {
      if (coarse) return;
      var K = 190, C = 15;                                            // zeta = C / (2 sqrt(K)) ≈ 0.54 (subamortiguado)
      var items = [], raf = 0, last = 0;

      function add(el) {
         var s = { el: el, x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
         items.push(s);
         return s;
      }
      function tick(now) {
         var dt = Math.min((now - last) / 1000, 1 / 30); last = now;
         var moving = false;
         for (var i = 0; i < items.length; i++) {
            var s = items[i];
            s.vx += (-K * (s.x - s.tx) - C * s.vx) * dt; s.vy += (-K * (s.y - s.ty) - C * s.vy) * dt;
            s.x += s.vx * dt; s.y += s.vy * dt;
            var rest = Math.abs(s.x - s.tx) < 0.02 && Math.abs(s.y - s.ty) < 0.02 && Math.abs(s.vx) < 0.05 && Math.abs(s.vy) < 0.05;
            if (rest) { s.x = s.tx; s.y = s.ty; s.vx = s.vy = 0; } else { moving = true; }
            s.el.style.translate = s.x.toFixed(2) + 'px ' + s.y.toFixed(2) + 'px';   // no pisa el transform de :hover
         }
         raf = moving && enabled ? win.requestAnimationFrame(tick) : 0;
      }
      function kick() { if (!raf && enabled) { last = win.performance.now(); raf = win.requestAnimationFrame(tick); } }
      win.addEventListener('physics:toggle', function () { if (!enabled) { items.forEach(function (s) { s.tx = s.ty = s.x = s.y = s.vx = s.vy = 0; s.el.style.translate = ''; }); } });

      // Botones: atracción "magnética" hacia el cursor
      Array.prototype.forEach.call(doc.querySelectorAll('.hero-cta a, #about .download .button'), function (el) {
         var s = add(el);
         el.addEventListener('pointermove', function (e) {
            if (!enabled) return;
            var r = el.getBoundingClientRect();
            s.tx = clamp((e.clientX - (r.left + r.width / 2)) * 0.28, -9, 9);
            s.ty = clamp((e.clientY - (r.top + r.height / 2)) * 0.34, -7, 7);
            kick();
         }, { passive: true });
         el.addEventListener('pointerleave', function () { s.tx = s.ty = 0; kick(); }, { passive: true });
      });

      // Foto de perfil: paralaje suave respecto del cursor dentro de #about
      var pic = doc.querySelector('#about .profile-pic'), about = doc.getElementById('about');
      if (pic && about) {
         var sp = add(pic);
         about.addEventListener('pointermove', function (e) {
            if (!enabled) return;
            var r = about.getBoundingClientRect();
            sp.tx = ((e.clientX - r.left) / r.width - 0.25) * -14;
            sp.ty = ((e.clientY - r.top) / r.height - 0.5) * -10;
            kick();
         }, { passive: true });
         about.addEventListener('pointerleave', function () { sp.tx = sp.ty = 0; kick(); }, { passive: true });
      }
   }

   /* ======================= Botón de pausa (WCAG 2.2.2) ======================= */
   function toggle() {
      if (mqReduce.matches) return;                                   // ya sin movimiento: nada que controlar
      var b = doc.createElement('button');
      b.type = 'button'; b.className = 'phys-toggle';
      function label() {
         b.textContent = enabled ? (isEN ? 'Pause animations' : 'Pausar animaciones') : (isEN ? 'Play animations' : 'Reanudar animaciones');
         b.setAttribute('aria-pressed', enabled ? 'false' : 'true');
      }
      b.addEventListener('click', function () {
         enabled = !enabled;
         try { localStorage.setItem('physics-anim', enabled ? 'on' : 'off'); } catch (e) { /* sin storage */ }
         label();
         win.dispatchEvent(new Event('physics:toggle'));
      });
      label();
      doc.body.appendChild(b);
   }

   function init() {
      try { heroField(); } catch (e) { if (win.console) console.warn('heroField', e); }
      try { waveField(); } catch (e) { if (win.console) console.warn('waveField', e); }
      try { springs(); } catch (e) { if (win.console) console.warn('springs', e); }
      toggle();
   }
   if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();
