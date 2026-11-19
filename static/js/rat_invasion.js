// ============================================================
//  INVASIÓN DE RATAS
//  Cada cierto tiempo llegan ratas en sus propios OVNIs y persiguen
//  a Fabiancho. Él huye cruzando la pantalla de lado a lado (tapando
//  el juego) y su letrero desaparece mientras escapa. El jugador debe
//  hacer CLIC sobre cada rata para eliminarla. Cuando no queda
//  ninguna, Fabiancho vuelve a su sitio junto al arcade y su letrero
//  reaparece.
//
//  Pruebas rápidas desde la consola del navegador:
//      ratInvasion.start()   -> lanza una invasión ya
//      ratInvasion.stop()    -> la cancela y devuelve a Fabiancho
//  o abrir cualquier página con  #ratas  al final de la URL.
// ============================================================
(() => {
  'use strict';

  const CFG = {
    firstDelay: [20000, 40000],   // ms hasta la primera invasión
    nextDelay:  [45000, 90000],   // ms entre invasiones
    ratCount:   [2, 4],           // ratas CON letrero por invasión (mín, máx)
    muteCount:  [2, 4],           // ratas extra SIN letrero (más difícil)
    fabSpeed:   430,              // px/s de Fabiancho huyendo
    ratSpeed:   490,              // px/s máximos de las ratas
    returnSpeed: 520,             // px/s al volver a su sitio
    msgEvery:   [7000, 9500],     // ms que dura cada mensaje antes de cambiar (tiempo para leerlo)
    bubbleFollow: 7,              // suavizado del globo (quita el temblor de la rata al volar)
    bubbleMaxLag: 36,             // px máximos que un globo puede quedarse atrás de su rata
  };

  const MESSAGES = [
    'Profe no me enciende la maquina',
    'Por donde va la USB?',
    'Cual version toca instalar de Kali?',
    'Profe vas a enviar la guia?',
    'Profe esto entra en el parcial?',
    'Cual era la clave del WiFi?',
    'Profe se me borro todo',
    'El Kali es el del dragon?',
    'Toca traer el portatil?',
    'Profe la VirtualBox me sale en negro',
    'Donde descargo el Ubuntu?',
    'La guia es para hoy?',
    'Profe me repite lo ultimo?',
    'Es sudo o pseudo?',
    'Profe no me llego el correo',
    'Se puede hacer en parejas?',
    'Profe me dice permiso denegado',
    'Cual IP pongo, la mia o la de el?',
    'Profe el nmap es un virus?',
    'Hay que instalar Windows primero?',
    'Profe se me congelo la maquina',
    'Por que mi Kali esta en ingles?',
    'Profe cual es la contraseña de root?',
    'Eso lo explico la clase pasada?',
    'Profe puedo entregar mañana?',
    'Profe el antivirus me borro el Kali',
  ];

  // Hojas de la rata: frames de 64 px, 4 columnas. La rata mira a la IZQUIERDA.
  const RAT_SHEETS = {
    run:   { src: '/static/img/rats/rat_run.png',   frames: 6, w: 256, h: 128, ms: 80 },
    death: { src: '/static/img/rats/rat_death.png', frames: 5, w: 256, h: 128, ms: 110 },
  };
  const RAT_CROP = { x: 22, y: 32, w: 24, h: 16 };   // zona útil de cada frame
  const RAT_PX = 5;                                  // aumento del pixel-art

  const FAB_WALK = [1, 2, 3, 4, 5, 6].map(i => `/static/img/skeli_fixed/walk/walk${i}.png`);
  FAB_WALK.forEach(src => { const im = new Image(); im.src = src; });   // precarga

  const rider = document.querySelector('.ufo-rider');
  if (!rider) return;
  const bubble = rider.querySelector('.side-bubble');

  let state = null;     // null = sin invasión
  let timer = null;

  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const cabScale = () => Math.max(0.55, Math.min(1, window._cabScale || 1));

  function schedule(range) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (document.hidden) { schedule([5000, 8000]); return; }
      start();
    }, rand(range[0], range[1]));
  }

  // Centro (en pantalla) de Fabiancho + su platillo en el costado del arcade.
  function homeCenter() {
    const skeli = rider.querySelector('.side-skeli');
    const ufo = rider.querySelector('.ufo');
    const a = (skeli || rider).getBoundingClientRect();
    const b = (ufo || rider).getBoundingClientRect();
    const L = Math.min(a.left, b.left), R = Math.max(a.right, b.right);
    const T = Math.min(a.top, b.top), B = Math.max(a.bottom, b.bottom);
    return { x: (L + R) / 2, y: (T + B) / 2, visible: R - L > 0 && B - T > 0 };
  }

  // ---------- Construcción de elementos ----------
  function buildFab() {
    const el = document.createElement('div');
    el.className = 'ri-fab';
    const img = document.createElement('img');
    img.className = 'ri-fab-skeli';
    img.src = FAB_WALK[0];
    img.alt = '';
    el.appendChild(img);
    const ufo = rider.querySelector('.ufo');
    if (ufo) el.appendChild(ufo.cloneNode(true));
    return { el, img };
  }

  function buildRat(i, talks) {
    const el = document.createElement('div');
    el.className = 'ri-rat';
    el.title = '¡Clic para eliminar la rata!';
    el.innerHTML =
      '<div class="ri-ship">' +
        '<div class="ri-sprite"></div>' +
        '<span class="ri-dome"></span>' +
        '<span class="ri-rim"><i></i><i></i><i></i><i></i></span>' +
        '<span class="ri-belly"></span>' +
      '</div>';
    const sprite = el.querySelector('.ri-sprite');
    sprite.style.width = RAT_CROP.w * RAT_PX + 'px';
    sprite.style.height = RAT_CROP.h * RAT_PX + 'px';
    // El globo vive en una capa propia (encima de todo) para poder
    // reacomodarlo y que nunca se encime con otro globo.
    let bub = null;
    if (talks) {
      bub = document.createElement('p');
      bub.className = 'ri-bubble';
    }
    return {
      el, sprite,
      bubble: bub, bw: 0, bh: 0, bx: null, by: null,
      x: 0, y: 0, vx: 0, vy: 0,
      frame: 0, frameT: 0, anim: 'run',
      msgIdx: i % MESSAGES.length,
      msgT: rand(CFG.msgEvery[0], CFG.msgEvery[1]) + i * 900,
      lag: 110 + i * 85,                       // distancia a la que lo persigue
      wobble: rand(0, Math.PI * 2),
      dead: false, deadT: 0, spin: 0,
    };
  }

  function setRatFrame(rat) {
    const sh = RAT_SHEETS[rat.anim];
    const col = rat.frame % 4, row = Math.floor(rat.frame / 4);
    rat.sprite.style.backgroundImage = `url(${sh.src})`;
    rat.sprite.style.backgroundSize = `${sh.w * RAT_PX}px ${sh.h * RAT_PX}px`;
    rat.sprite.style.backgroundPosition =
      `${-(col * 64 + RAT_CROP.x) * RAT_PX}px ${-(row * 64 + RAT_CROP.y) * RAT_PX}px`;
  }

  function say(rat) {
    if (!rat.bubble) return;
    rat.bubble.textContent = MESSAGES[rat.msgIdx];
    rat.bw = rat.bubble.offsetWidth; rat.bh = rat.bubble.offsetHeight;
    rat.bubble.classList.remove('pop');
    void rat.bubble.offsetWidth;            // reinicia la animación
    rat.bubble.classList.add('pop');
  }

  // ---------- Inicio / fin ----------
  function start() {
    if (state) return;
    const home = homeCenter();
    if (!home.visible) { schedule(CFG.nextDelay); return; }

    const layer = document.createElement('div');
    layer.id = 'rat-invasion';
    document.body.appendChild(layer);

    const fab = buildFab();
    layer.appendChild(fab.el);
    const tailLayer = document.createElement('div');      // colitas: DEBAJO de todos los globos
    tailLayer.className = 'ri-tails';
    const bubbleLayer = document.createElement('div');
    bubbleLayer.className = 'ri-bubbles';

    const W = window.innerWidth, H = window.innerHeight;
    const talkers = randInt(CFG.ratCount[0], CFG.ratCount[1]);
    const count = talkers + randInt(CFG.muteCount[0], CFG.muteCount[1]);
    const rats = [];
    // Mensajes al azar y sin repetir entre ratas
    const pool = MESSAGES.map((_, k) => k).sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
      const rat = buildRat(i, i < talkers);
      rat.msgIdx = pool[i % pool.length];
      const side = i % 2 === 0 ? -1 : 1;     // entran por la izquierda y la derecha
      rat.x = side < 0 ? -140 - i * 60 : W + 140 + i * 60;
      rat.y = rand(H * 0.15, H * 0.75);
      rat.el.addEventListener('pointerdown', e => {
        e.preventDefault(); e.stopPropagation();
        killRat(rat);
      });
      rat.el.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
      setRatFrame(rat);
      layer.appendChild(rat.el);
      if (rat.bubble) {
        bubbleLayer.appendChild(rat.bubble);
        rat.tail = document.createElement('i');
        rat.tail.className = 'ri-tail';
        tailLayer.appendChild(rat.tail);
      }
      rats.push(rat);
    }
    layer.appendChild(tailLayer);
    layer.appendChild(bubbleLayer);         // los globos, siempre por encima
    rats.forEach(say);                      // medir ya montados en la página

    // Fabiancho se "suelta" de su sitio: el original queda invisible
    // (conserva su hueco para no mover el arcade) y su letrero desaparece.
    rider.classList.add('ri-away');

    state = {
      layer, fab, rats,
      phase: 'flee',
      x: home.x, y: home.y,
      dir: home.x < W / 2 ? 1 : -1,        // huye hacia el centro de la pantalla
      t: 0, frameT: 0, frame: 0, last: performance.now(),
      raf: 0,
    };
    state.raf = requestAnimationFrame(tick);
  }

  function finish() {
    if (!state) return;
    cancelAnimationFrame(state.raf);
    state.layer.remove();
    state = null;
    rider.classList.remove('ri-away');
    if (bubble) {                           // el letrero vuelve con su "pop"
      bubble.style.animation = 'none';
      void bubble.offsetWidth;
      bubble.style.animation = '';
    }
    schedule(CFG.nextDelay);
  }

  function killRat(rat) {
    if (rat.dead || !state) return;
    rat.dead = true;
    rat.anim = 'death'; rat.frame = 0; rat.frameT = 0;
    rat.vx *= 0.2; rat.vy = -260;
    rat.el.classList.add('dead');
    if (rat.bubble) rat.bubble.remove();
    if (rat.tail) rat.tail.remove();
    setRatFrame(rat);
    const boom = document.createElement('span');
    boom.className = 'ri-boom';
    boom.textContent = '¡ZAS!';
    rat.el.appendChild(boom);
    if (state.rats.every(r => r.dead)) state.phase = 'return';
  }

  // ---------- Bucle de animación ----------
  function tick(now) {
    if (!state) return;
    const s = state;
    const dt = Math.max(0, Math.min(0.05, (now - s.last) / 1000));
    s.last = now;
    s.t += dt;
    const W = window.innerWidth, H = window.innerHeight;
    const sc = cabScale();
    const margin = 130 * sc;

    // --- Fabiancho ---
    let movingLeft;
    if (s.phase === 'flee') {
      s.x += s.dir * CFG.fabSpeed * dt;
      if (s.x > W - margin) { s.x = W - margin; s.dir = -1; }
      if (s.x < margin)     { s.x = margin;     s.dir = 1; }
      const targetY = H * 0.45 + Math.sin(s.t * 1.8) * H * 0.22;
      s.y += (targetY - s.y) * Math.min(1, dt * 2.5);
      movingLeft = s.dir < 0;
    } else {
      const home = homeCenter();
      const dx = home.x - s.x, dy = home.y - s.y;
      const d = Math.hypot(dx, dy);
      const step = CFG.returnSpeed * dt;
      if (d <= step || !home.visible) {
        const deadAnimsDone = s.rats.every(r => r.deadT > 0.9);
        if (deadAnimsDone || !home.visible) { finish(); return; }
        s.x = home.x; s.y = home.y;
      } else {
        s.x += dx / d * step; s.y += dy / d * step;
      }
      movingLeft = dx < 0;
    }

    // Fabiancho "corre" en su platillo mientras huye
    s.frameT += dt;
    if (s.frameT > 0.09) { s.frameT = 0; s.frame = (s.frame + 1) % FAB_WALK.length; s.fab.img.src = FAB_WALK[s.frame]; }
    s.fab.img.style.transform = movingLeft ? 'scaleX(-1)' : 'none';
    const fw = s.fab.el.offsetWidth, fh = s.fab.el.offsetHeight;
    s.fab.el.style.transform =
      `translate(${s.x - fw / 2}px, ${s.y - fh / 2}px) scale(${sc}) rotate(${Math.sin(s.t * 9) * 4}deg)`;

    // --- Ratas ---
    // Se empujan entre sí para que sus globos no queden encimados
    const live = s.rats.filter(r => !r.dead);
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const A = live[i], B = live[j];
        const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1;
        const min = 170;
        if (d < min) {
          const push = (min - d) * 0.5 * Math.min(1, dt * 6);
          A.x -= dx / d * push; A.y -= dy / d * push;
          B.x += dx / d * push; B.y += dy / d * push;
        }
      }
    }
    for (const rat of s.rats) {
      if (rat.dead) {
        rat.deadT += dt;
        rat.vy += 900 * dt;
        rat.x += rat.vx * dt; rat.y += rat.vy * dt;
        rat.spin += 420 * dt;
        rat.frameT += dt * 1000;
        if (rat.frameT > RAT_SHEETS.death.ms && rat.frame < RAT_SHEETS.death.frames - 1) {
          rat.frameT = 0; rat.frame++; setRatFrame(rat);
        }
        rat.el.style.opacity = String(Math.max(0, 1 - rat.deadT / 0.9));
      } else {
        // Persigue a Fabiancho, un poco por detrás de él
        rat.wobble += dt * 3;
        const tx = s.x - s.dir * rat.lag * sc;
        const ty = s.y + Math.sin(rat.wobble) * 40 * sc - 20 * sc;
        const dx = tx - rat.x, dy = ty - rat.y;
        const d = Math.hypot(dx, dy) || 1;
        const sp = Math.min(CFG.ratSpeed, d * 3);
        rat.vx += (dx / d * sp - rat.vx) * Math.min(1, dt * 4);
        rat.vy += (dy / d * sp - rat.vy) * Math.min(1, dt * 4);
        rat.x += rat.vx * dt; rat.y += rat.vy * dt;

        rat.frameT += dt * 1000;
        if (rat.frameT > RAT_SHEETS.run.ms) {
          rat.frameT = 0; rat.frame = (rat.frame + 1) % RAT_SHEETS.run.frames; setRatFrame(rat);
        }
        rat.msgT -= dt * 1000;
        if (rat.bubble && rat.msgT <= 0) {
          rat.msgT = rand(CFG.msgEvery[0], CFG.msgEvery[1]);
          // Nuevo mensaje distinto al actual y al de las demás ratas (si se puede)
          const busy = new Set(s.rats.filter(r => !r.dead && r !== rat).map(r => r.msgIdx));
          let opts = MESSAGES.map((_, k) => k).filter(k => k !== rat.msgIdx && !busy.has(k));
          if (!opts.length) opts = MESSAGES.map((_, k) => k).filter(k => k !== rat.msgIdx);
          rat.msgIdx = opts[randInt(0, opts.length - 1)];
          say(rat);
        }
      }
      // La hoja mira a la izquierda: se voltea solo el sprite (el globo no)
      rat.sprite.style.transform = rat.vx > 15 ? 'scaleX(-1)' : 'none';
      const rw = rat.el.offsetWidth, rh = rat.el.offsetHeight;
      const rs = Math.max(0.8, sc);          // nunca demasiado pequeñas para el clic
      rat.el.style.transform =
        `translate(${rat.x - rw / 2}px, ${rat.y - rh / 2}px) scale(${rs}) rotate(${rat.dead ? rat.spin : Math.sin(rat.wobble * 1.3) * 6}deg)`;
    }

    layoutBubbles(s.rats, W, dt);
    s.raf = requestAnimationFrame(tick);
  }

  // ---------- Anti-solapamiento de letreros ----------
  // Cada globo quiere ir justo encima de su rata. Si choca con otro, se
  // corre lo MÍNIMO necesario (a un lado o hacia arriba) para quedar libre,
  // así sigue cerca de su rata. Nunca se sale de la pantalla. Las colitas
  // van en una capa por debajo de los globos: nunca tapan un texto.
  function layoutBubbles(rats, W, dt) {
    const GAP = 8, TAIL = 14, EDGE = 6;
    const H = window.innerHeight;
    const clampX = (x, w) => Math.max(EDGE, Math.min(W - EDGE - w, x));
    const clampY = (y, h) => Math.max(EDGE, Math.min(H - EDGE - h, y));
    const hit = (a, b) => a.x < b.x + b.w + GAP && a.x + a.w > b.x - GAP &&
                          a.y < b.y + b.h + GAP && a.y + a.h > b.y - GAP;

    const list = rats.filter(r => r.bubble && !r.dead);
    for (const r of list) {
      const rs = Math.max(0.8, cabScale());
      r._anchorY = r.y - (r.el.offsetHeight * rs) / 2 + 6;   // borde superior de la nave
    }
    // Primero los de más abajo: los de arriba se acomodan alrededor
    list.sort((a, b) => b._anchorY - a._anchorY);

    const placed = [];
    for (const r of list) {
      const want = {
        x: clampX(r.x - r.bw / 2, r.bw),
        y: clampY(r._anchorY - TAIL - r.bh, r.bh),
        w: r.bw, h: r.bh,
      };
      let box = { ...want };
      for (let guard = 0; guard < 12; guard++) {
        const p = placed.find(q => hit(box, q));
        if (!p) break;
        // tres salidas posibles; se elige la que menos lo aleja de su rata
        const opts = [
          { x: box.x, y: p.y - GAP - box.h },              // arriba
          { x: p.x - GAP - box.w, y: box.y },              // izquierda
          { x: p.x + p.w + GAP, y: box.y },                // derecha
        ].map(o => ({ x: clampX(o.x, box.w), y: clampY(o.y, box.h), w: box.w, h: box.h }))
         .filter(o => !hit(o, p));
        if (!opts.length) { box.y = clampY(p.y - GAP - box.h, box.h); continue; }
        opts.sort((m, n) => Math.hypot(m.x - want.x, m.y - want.y) - Math.hypot(n.x - want.x, n.y - want.y));
        box = opts[0];
      }

      // Si aún choca (pantalla pequeña), se busca el hueco libre más cercano
      if (placed.some(q => hit(box, q))) {
        let best = null, bestD = Infinity;
        for (let yy = EDGE; yy <= H - EDGE - box.h; yy += 8) {
          for (const xx of [want.x, EDGE, W - EDGE - box.w, want.x - box.w / 2, want.x + box.w / 2]) {
            const c = { x: clampX(xx, box.w), y: yy, w: box.w, h: box.h };
            if (placed.some(q => hit(c, q))) continue;
            const dd = Math.hypot(c.x - want.x, c.y - want.y);
            if (dd < bestD) { bestD = dd; best = c; }
          }
        }
        if (best) box = best;
      }

      // Suavizado corto: quita el temblor, pero el globo no se despega
      if (r.bx == null) { r.bx = box.x; r.by = box.y; }
      const k = Math.min(1, dt * CFG.bubbleFollow);
      r.bx += (box.x - r.bx) * k;
      r.by += (box.y - r.by) * k;
      const dx = r.bx - box.x, dy = r.by - box.y, d = Math.hypot(dx, dy);
      if (d > CFG.bubbleMaxLag) { r.bx = box.x + dx / d * CFG.bubbleMaxLag; r.by = box.y + dy / d * CFG.bubbleMaxLag; }
      r.bx = clampX(r.bx, r.bw); r.by = clampY(r.by, r.bh);
      // el suavizado nunca puede meterlo encima de otro globo
      if (placed.some(q => hit({ x: r.bx, y: r.by, w: r.bw, h: r.bh }, q))) { r.bx = box.x; r.by = box.y; }

      placed.push({ x: r.bx, y: r.by, w: r.bw, h: r.bh });

      // Píxeles enteros = texto nítido
      const left = Math.round(r.bx), top = Math.round(r.by);
      r.bubble.style.transform = `translate3d(${left}px, ${top}px, 0)`;

      // Colita: del borde inferior del globo (lo más cerca posible de la
      // rata) hasta la cúpula de la nave, como una línea en ángulo.
      const fromX = Math.max(left + 14, Math.min(left + r.bw - 14, r.x));
      const fromY = top + r.bh - 2;
      const toX = r.x, toY = r._anchorY;
      const len = Math.hypot(toX - fromX, toY - fromY);
      const ang = Math.atan2(toY - fromY, toX - fromX) - Math.PI / 2;
      r.bubble.style.setProperty('--tail-x', Math.round(fromX - left) + 'px');
      if (toY > fromY + 4 && len < 260) {
        r.tail.style.display = '';
        r.tail.style.height = Math.round(len) + 'px';
        r.tail.style.transform = `translate3d(${Math.round(fromX)}px, ${Math.round(fromY)}px, 0) rotate(${ang}rad)`;
      } else {
        r.tail.style.display = 'none';      // rata por encima del globo: sin línea
      }
    }
  }

  window.ratInvasion = {
    start: () => { clearTimeout(timer); start(); },
    stop: () => { if (state) { state.rats.forEach(r => { r.dead = true; r.deadT = 1; }); state.phase = 'return'; } },
  };

  if (location.hash === '#ratas') setTimeout(start, 1500);
  else schedule(CFG.firstDelay);
})();
