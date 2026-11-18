
 // ====================================================================
 // Nivel 1 - Super Mario Bros.: "El reino de las tuberías"
 // Fabiancho (esqueleto).
 //
 // PISTAS: ya NO hay texto servido en el terminal. Las pistas se DESCUBREN
 //   explorando y se guardan en la BITÁCORA (tecla Q). No son obvias: cada
 //   una está atada a un punto concreto del mundo (una moneda escondida, un
 //   ladrillo particular, un koopa concreto y el propio terminal).
 //
 // Las posiciones de bloques, tuberías y escaleras están ALINEADAS al píxel
 // con el fondo mario_1_1_ref.png (detectadas por color), para que todo lo
 // que se ve se pueda tocar y las escaleras se puedan subir.
 //
 // Flujo: pistas -> SQLi (llave) -> 3 power-ups -> META (bandera del fondo).
 // ====================================================================

const cv = document.getElementById('arena');
const ctx = cv.getContext('2d');
cv.width = 720;
cv.height = 480;

function loadImg(src) {
  const i = new Image();
  i.src = src;
  return i;
}

const bg = loadImg('/static/img/mario_1_1_ref.png');

const IMG = {
  used: loadImg('/static/img/mario/qblock_used.png'),
  coin: loadImg('/static/img/mario/coin.png'),
  mush: loadImg('/static/img/mario/mushroom.png'),
  flower: loadImg('/static/img/mario/flower.png'),
  star: loadImg('/static/img/mario/star.png'),
  goomba1: loadImg('/static/img/mario/goomba1.png'),
  goomba2: loadImg('/static/img/mario/goomba2.png'),
  goomba_flat: loadImg('/static/img/mario/goomba_flat.png'),
  piranha1: loadImg('/static/img/mario/piranha1.png'),
  piranha2: loadImg('/static/img/mario/piranha2.png'),
  gameover: loadImg('/static/img/mario/gameover.png'),
};

const sprites = { idle: [], walk: [], jump: [], attack: [] };
for (let i = 1; i <= 4; i++) sprites.idle.push(loadImg(`/static/img/skeli_fixed/idle/idle${i}.png`));
for (let i = 1; i <= 6; i++) sprites.walk.push(loadImg(`/static/img/skeli_fixed/walk/walk${i}.png`));
for (let i = 1; i <= 4; i++) sprites.jump.push(loadImg(`/static/img/skeli_fixed/jump/jump${i}.png`));
for (let i = 1; i <= 4; i++) sprites.attack.push(loadImg(`/static/img/skeli_fixed/attack/attack${i}.png`));

const SRC_W = 256;
const SRC_H = 400;

const GRAV = 0.6;
const GRAVMAX = 14;
const JUMP_V = -9.6;
const MOVE_BASE = 2.4;
const SCALE = 2;
const SKY = '#5c94fc';
const TOTAL_POWERUPS = 3;
const STEP_MAX = 20;   // altura que el jugador sube "caminando" (escaleras)

// ====================================================================
// PISTAS (BITÁCORA) — escondidas y sugerentes, no obvias
// ====================================================================

const PISTAS = [
  {
    id: 'explorar', found: false, icon: '🪙',
    how: 'Hallaste una moneda escondida',
    title: 'Pista · Lo que escribes, se ejecuta',
    body: 'Corre el rumor de que el Guardián no limpia lo que tecleas: tu texto ' +
          'entra directo en su consulta. ¿Y si tu “usuario” llevara una comilla ' +
          "'  dentro?",
  },
  {
    id: 'bloque', found: false, icon: '🧱',
    how: 'Rompiste el ladrillo con la grieta',
    title: 'Pista · Lo que estorba, se comenta',
    body: 'En el lenguaje del Guardián, dos guiones  --  convierten en comentario ' +
          'todo lo que viene después. Útil cuando el final de la línea te molesta.',
  },
  {
    id: 'koopa', found: false, icon: '👟',
    how: 'Venciste al koopa centinela',
    title: 'Pista · Una verdad que siempre vale',
    body: 'El centinela susurra: «una condición que SIEMPRE es cierta abre cualquier ' +
          'puerta… y yo solo respeto a la fila admin».',
  },
  {
    id: 'terminal', found: false, icon: '🔑',
    how: 'Llegaste al Guardián',
    title: 'Pista · Dónde se esconde la flag',
    body: 'Si entras como ADMIN, su NOTA personal guarda la flag. Esa es la llave ' +
          'que envías al final para liberar el Reino.',
  },
];

let notebookOpen = false;
const pistaById = id => PISTAS.find(p => p.id === id);
const foundCount = () => PISTAS.filter(p => p.found).length;

let pistaPopT = null;
function showPistaPop(p) {
  const el = document.getElementById('pista-pop');
  if (!el) return;
  el.innerHTML =
    '<div class="pp-head"><span class="pp-ic">' + p.icon + '</span>' +
    '<span class="pp-tag">¡PISTA DESCUBIERTA!  ' + foundCount() + '/' + PISTAS.length + '</span></div>' +
    '<div class="pp-title">' + p.title + '</div>' +
    '<div class="pp-body">' + p.body + '</div>' +
    '<div class="pp-foot">Guardada en la BITÁCORA · tecla [Q]</div>';
  el.classList.add('show');
  clearTimeout(pistaPopT);
  pistaPopT = setTimeout(() => el.classList.remove('show'), 5200);
}

function unlockPista(id) {
  const p = pistaById(id);
  if (!p || p.found) return;
  p.found = true;
  showPistaPop(p);
  renderPistas();
  flashNotebookBtn();
}

function renderPistas() {
  const n = foundCount();
  document.querySelectorAll('[data-pista-count]').forEach(e => (e.textContent = n + '/' + PISTAS.length));

  const html = PISTAS.map(p => p.found
    ? ('<div class="pista found"><div class="pista-h"><span class="pista-ic">' + p.icon +
       '</span><span class="pista-t">' + p.title + '</span></div><div class="pista-b">' +
       p.body + '</div><div class="pista-src">✔ ' + p.how + '</div></div>')
    : ('<div class="pista locked"><div class="pista-h"><span class="pista-ic">🔒</span>' +
       '<span class="pista-t">Pista por descubrir</span></div><div class="pista-b">' +
       'Explora el Reino con calma: hay secretos escondidos, un centinela y un ladrillo distinto.</div></div>')
  ).join('');

  const list = document.getElementById('notebook-list');
  if (list) list.innerHTML = html;
  const modal = document.getElementById('modal-pistas');
  if (modal) modal.innerHTML = html;
}

function flashNotebookBtn() {
  const b = document.getElementById('notebook-btn');
  if (!b) return;
  b.classList.remove('flash');
  void b.offsetWidth;
  b.classList.add('flash');
}

function toggleNotebook(force) {
  notebookOpen = force === undefined ? !notebookOpen : force;
  const nb = document.getElementById('notebook');
  if (nb) nb.classList.toggle('show', notebookOpen);
}

// ====================================================================
// FACTORÍAS DE BLOQUES
// ====================================================================

function Q(x, y, item) {
  return { x, y, w: 16, h: 16, type: 'q', item, used: false, vanished: false, bumpT: 0, hidden: false, clue: null };
}
function Bk(x, y) {
  return { x, y, w: 16, h: 16, type: 'brick', item: null, used: false, vanished: false, bumpT: 0, hidden: false, clue: null };
}

const OVER = {
  width: 3376,
  floorY: 208,
  scale: SCALE,

  ground: [
    { x: 0, y: 208, w: 1104, h: 272 },
    { x: 1136, y: 208, w: 240, h: 272 },
    { x: 1424, y: 208, w: 1024, h: 272 },
    { x: 2480, y: 208, w: 896, h: 272 },
  ],

  pits: [[1104, 1135], [1376, 1423], [2448, 2479]],

  // Tuberías (alineadas al fondo). Las 3 del centro tienen planta piraña.
  pipes: [
    { x: 448, y: 176, w: 32, h: 64, entry: true },
    { x: 608, y: 160, w: 32, h: 80, piranha: true },
    { x: 736, y: 144, w: 32, h: 96, piranha: true },
    { x: 912, y: 144, w: 32, h: 96, piranha: true },
    { x: 2608, y: 176, w: 32, h: 64 },
    { x: 2864, y: 176, w: 32, h: 64 },
  ],

  // Escaleras SÓLIDAS (columnas de ladrillo del fondo), escalables con step-up.
  terrain: [
    // par de escaleras /\ (antes de las del foso) — ESTAS faltaban
    { x: 2144, y: 196, w: 16, h: 12 },
    { x: 2160, y: 180, w: 16, h: 28 },
    { x: 2176, y: 164, w: 16, h: 44 },
    { x: 2192, y: 148, w: 16, h: 60 },
    { x: 2240, y: 148, w: 16, h: 60 },
    { x: 2256, y: 164, w: 16, h: 44 },
    { x: 2272, y: 180, w: 16, h: 28 },
    { x: 2288, y: 196, w: 16, h: 12 },
    // escalera que sube (antes del foso 2448-2479) — pasos de 16px, escalables
    { x: 2368, y: 196, w: 16, h: 12 },
    { x: 2384, y: 180, w: 16, h: 28 },
    { x: 2400, y: 164, w: 16, h: 44 },
    { x: 2416, y: 148, w: 32, h: 60 },
    // escalera que baja (después del foso)
    { x: 2480, y: 148, w: 16, h: 60 },
    { x: 2496, y: 164, w: 16, h: 44 },
    { x: 2512, y: 180, w: 16, h: 28 },
    { x: 2528, y: 196, w: 16, h: 12 },
    // gran escalera final (pirámide)
    { x: 2896, y: 196, w: 16, h: 12 },
    { x: 2912, y: 180, w: 16, h: 28 },
    { x: 2928, y: 164, w: 16, h: 44 },
    { x: 2944, y: 148, w: 16, h: 60 },
    { x: 2960, y: 132, w: 16, h: 76 },
    { x: 2976, y: 116, w: 16, h: 92 },
    { x: 2992, y: 100, w: 16, h: 108 },
    { x: 3008, y: 84, w: 32, h: 124 },
  ],

  // Bloques interactivos, ALINEADOS a los dibujados en el fondo.
  blocks: [
    // --- antes de la 1ª tubería (x<448): aquí se consigue el power-up 1 y una pista ---
    Q(256, 144, 'mush'),                 // POWER-UP 1
    Bk(320, 144), Q(336, 144, 'coin'), Bk(352, 144), Q(368, 144, 'coin'), Bk(384, 144),
    Q(352, 80, 'coin'),

    // --- tramo medio ---
    Bk(1232, 144), Q(1248, 144, 'flower'), Bk(1264, 144),   // POWER-UP 2
    Bk(1280, 80), Bk(1296, 80), Bk(1312, 80), Bk(1328, 80),
    Bk(1344, 80), Bk(1360, 80), Bk(1376, 80), Bk(1392, 80),
    Bk(1456, 80), Bk(1472, 80), Bk(1488, 80),
    Q(1504, 80, 'coin'), Bk(1504, 144),
    Bk(1600, 144), Bk(1616, 144),
    Q(1696, 144, 'star'),                 // POWER-UP 3
    Q(1744, 80, 'coin'), Q(1744, 144, 'coin'),
    Q(1792, 144, 'coin'),
    Bk(1888, 144),
    Bk(1936, 80), Bk(1952, 80), Bk(1968, 80),
    Q(2064, 80, 'coin'), Q(2080, 80, 'coin'), Bk(2064, 144), Bk(2080, 144),
    Bk(2048, 80), Bk(2096, 80),

    // --- antes de la meta ---
    Bk(2688, 144), Bk(2704, 144), Q(2720, 144, 'coin'), Bk(2736, 144),
  ],

  // monedas de escenario (coin.png). Una está ESCONDIDA y da una pista.
  coins: [
    { x: 300, y: 92, clue: 'explorar' },   // moneda secreta (alto, hay que saltar)
    { x: 520, y: 176 },
    { x: 560, y: 176 },
    { x: 980, y: 150 },
    { x: 1300, y: 60 },
    { x: 1340, y: 60 },
    { x: 1380, y: 60 },
    { x: 1950, y: 60 },
    { x: 2300, y: 176 },
  ],

  goalX: 3150,
  goalFlag: { x: 3160, y: 56 },   // bandera YA dibujada en el fondo (solo referencia)

  // Un koopa CENTINELA antes de la tubería (da la pista 'koopa').
  enemiesInit: [
    { x: 360, vx: -1.0, clue: 'koopa' },
    { x: 980, vx: -1.1 },
    { x: 1600, vx: 1.1 },
    { x: 1980, vx: -1.1 },
    { x: 2600, vx: 1.1 },
  ],
};

// Marca el ladrillo "distinto" que entrega la pista 'bloque'.
(OVER.blocks.find(b => b.x === 384 && b.y === 144) || {}).clue = 'bloque';

const UGY = 416;
// Subterráneo MÁS GRANDE con parkour: plataformas (plat), bloques (brick),
// goombas, el terminal en una alcoba y la tubería de salida al final.
const UNDER = {
  width: 1480, floorY: UGY, scale: 1,
  solids: [
    { x: 0, y: UGY, w: 1480, h: 64, brick: true },     // suelo
    { x: 0, y: 0, w: 24, h: cv.height, brick: true },  // muro izq
    { x: 1456, y: 0, w: 24, h: cv.height, brick: true },// muro der
    // --- parkour: escalera de plataformas (cada salto es alcanzable) ---
    { x: 150, y: 366, w: 120, h: 16, plat: true },
    { x: 300, y: 328, w: 120, h: 16, plat: true },
    { x: 470, y: 296, w: 130, h: 16, plat: true },   // goomba
    { x: 650, y: 330, w: 120, h: 16, plat: true },
    { x: 830, y: 300, w: 170, h: 16, plat: true },   // alcoba del terminal
    { x: 1050, y: 334, w: 120, h: 16, plat: true },  // goomba
    { x: 1250, y: 300, w: 120, h: 116, brick: true },// escalón de salida
  ],
  exitPipe: { x: 1288, y: 236, w: 64, h: 64 },       // sobre el escalón (top 300)
  terminal: { x: 882, y: 252, w: 48, h: 48 },        // sobre la alcoba (top 300)
  coins: [
    { x: 210, y: 338 }, { x: 360, y: 300 }, { x: 535, y: 268 },
    { x: 710, y: 302 }, { x: 915, y: 272 }, { x: 1110, y: 306 },
    { x: 400, y: 388 }, { x: 600, y: 388 }, { x: 980, y: 388 },
  ],
  enemies: [
    { x: 500, y: 272, min: 472, max: 576, dir: 1 },    // sobre plataforma 470
    { x: 1100, y: 310, min: 1052, max: 1146, dir: -1 },// sobre plataforma 1050
    { x: 300, y: 392, min: 160, max: 440, dir: 1 },    // patrulla el suelo
    { x: 760, y: 392, min: 660, max: 1000, dir: -1 },  // patrulla el suelo
  ],
};

const SMALL_H = 46;

const player = {
  x: 48, y: 208 - SMALL_H, w: 22, h: SMALL_H,
  vx: 0, vy: 0, onGround: false, facing: 'right',
  state: 'idle', animFrame: 0, animTimer: 0, attackTimer: 0,
  big: false, hp: 3, invuln: 0, starT: 0,
  safeX: 48, safeY: 208 - SMALL_H,
};

let room = 'over';
let camX = 0;
let challengeOpen = false;
let adminUnlocked = false;
let transition = null;
let won = false;
let gameOverT = 0;

let hasKey = false;
let powerups = 0;
let coinsGot = 0;
let goalDone = false;
let msg = '';
let msgT = 0;

const floatItems = [];
const particles = [];
let enemies = [];
let piranhas = [];
let undEnemies = [];   // goombas del subterráneo

const cur = () => (room === 'over' ? OVER : UNDER);

function toast(t) { msg = t; msgT = 2600; }

function resetEnemies() {
  enemies = OVER.enemiesInit.map(e => ({
    x: e.x, y: OVER.floorY - 24, w: 24, h: 24,
    vx: e.vx, dead: false, deadT: 0, anim: 0, clue: e.clue || null,
  }));
  piranhas = OVER.pipes.filter(p => p.piranha).map((p, i) => ({
    x: p.x + p.w / 2 - 8, top: p.y, t: i * 1250, risen: 0,
  }));
  undEnemies = UNDER.enemies.map(e => ({
    x: e.x, y: e.y, w: 24, h: 24, min: e.min, max: e.max, dir: e.dir,
    dead: false, deadT: 0, anim: 0,
  }));
}
resetEnemies();

const keys = { left: false, right: false, jump: false, down: false };

function typingInField(e) {
  const t = e.target || document.activeElement;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}

window.addEventListener('keydown', e => {
  if (!typingInField(e)) {
    if (e.key === 'q' || e.key === 'Q') { toggleNotebook(); e.preventDefault(); return; }
    if (e.key === 'Escape') toggleNotebook(false);
  }
  if (typingInField(e) || challengeOpen || transition || won || gameOverT > 0 || notebookOpen) return;

  if (['a', 'A', 'ArrowLeft'].includes(e.key)) keys.left = true;
  if (['d', 'D', 'ArrowRight'].includes(e.key)) keys.right = true;
  if (['w', 'W', 'ArrowUp', ' '].includes(e.key)) keys.jump = true;
  if (['s', 'S', 'ArrowDown'].includes(e.key)) keys.down = true;
  if (e.key === 'f' || e.key === 'F') startAttack();
  if (e.key === 'e' || e.key === 'E') tryOpenTerminal();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
});

window.addEventListener('keyup', e => {
  if (typingInField(e)) return;
  if (['a', 'A', 'ArrowLeft'].includes(e.key)) keys.left = false;
  if (['d', 'D', 'ArrowRight'].includes(e.key)) keys.right = false;
  if (['w', 'W', 'ArrowUp', ' '].includes(e.key)) keys.jump = false;
  if (['s', 'S', 'ArrowDown'].includes(e.key)) keys.down = false;
});

window.addEventListener('blur', () => { keys.left = keys.right = keys.jump = keys.down = false; });

function startAttack() {
  if (player.attackTimer <= 0) { player.attackTimer = 300; player.animFrame = 0; }
}

function overlaps(a, s) {
  return a.x < s.x + s.w && a.x + a.w > s.x && a.y < s.y + s.h && a.y + a.h > s.y;
}

function groundAt(x) {
  for (const g of OVER.ground) if (x >= g.x && x < g.x + g.w) return true;
  return false;
}

const entryPipe = () => OVER.pipes.find(p => p.entry);

function onEntryPipe() {
  if (room !== 'over') return false;
  const e = entryPipe();
  const cxp = player.x + player.w / 2;
  const feet = player.y + player.h;
  return player.onGround && Math.abs(feet - e.y) < 6 && cxp > e.x && cxp < e.x + e.w;
}

function onExitPipe() {
  // De pie sobre el escalón, en la base del tubo de salida.
  const p = UNDER.exitPipe;
  const feet = player.y + player.h, cxp = player.x + player.w / 2;
  return room === 'under' && adminUnlocked && player.onGround &&
    cxp > p.x - 4 && cxp < p.x + p.w + 4 && Math.abs(feet - (p.y + p.h)) < 10;
}

function nearTerminal() {
  const t = UNDER.terminal;
  const cxp = player.x + player.w / 2, cxt = t.x + t.w / 2;
  return room === 'under' && Math.abs(cxp - cxt) < 72 && player.y + player.h > t.y - 50;
}

function solidsForCollision() {
  if (room === 'over') {
    return [
      ...OVER.ground, ...OVER.pipes, ...OVER.terrain,
      ...OVER.blocks.filter(b => !b.vanished),
    ];
  }
  const s = UNDER.solids.concat([UNDER.terminal]);
  if (!adminUnlocked) s.push(UNDER.exitPipe);
  return s;
}

// ====================================================================
// BLOQUES Y OBJETOS
// ====================================================================

function hitBlock(b) {
  if (b.used || !b.type) return;
  b.used = true;
  b.bumpT = 180;
  if (b.hidden) b.hidden = false;   // bloque oculto: aparece al golpearlo

  if (b.type === 'brick') {
    b.vanished = true;
    spawnBrickBits(b);
  } else if (b.item === 'coin') {
    coinsGot++;
    spawnItem(b, 'coin');
  } else {
    powerups++;
    spawnItem(b, b.item);
    applyPowerup(b.item);
    toast('¡POWER-UP! ' + powerups + '/' + TOTAL_POWERUPS);
  }
  if (b.clue) unlockPista(b.clue);
}

function spawnBrickBits(b) {
  for (let i = 0; i < 6; i++) {
    particles.push({
      x: b.x + 8, y: b.y + 8,
      vx: (Math.random() - 0.5) * 3, vy: -2 - Math.random() * 2.5,
      t: 0, life: 650, c: '#b5651d',
    });
  }
}

function spawnItem(b, kind) { floatItems.push({ x: b.x, y: b.y - 16, kind, t: 0 }); }

function applyPowerup(kind) {
  if (kind === 'mush' && !player.big) player.big = true;   // solo visual + escudo
  if (kind === 'star') player.starT = 8000;
}

function hurtPlayer() {
  if (player.invuln > 0 || player.starT > 0) return;
  if (player.big) { player.big = false; player.invuln = 1400; toast('¡Golpe! Perdiste el escudo.'); return; }
  player.hp--; player.invuln = 1400;
  if (player.hp <= 0) gameOverT = 2600;
  else toast('¡Golpe! Vidas: ' + player.hp);
}

function fallInPit() {
  player.hp--; player.invuln = 1200;
  if (player.hp <= 0) { gameOverT = 2600; return; }
  player.x = player.safeX; player.y = player.safeY - 4; player.vx = 0; player.vy = 0;
  toast('¡Caíste! Vidas: ' + player.hp);
}

// ====================================================================
// REINICIO COMPLETO
// ====================================================================

function resetLevel() {
  for (const b of OVER.blocks) { b.used = false; b.vanished = false; b.bumpT = 0; }
  // restaura el estado oculto de bloques secretos
  OVER.blocks.forEach(b => { if (b.x === 300) b.hidden = false; });
  for (const c of OVER.coins) c.got = false;
  for (const c of UNDER.coins) c.got = false;
  floatItems.length = 0; particles.length = 0;

  hasKey = false; powerups = 0; coinsGot = 0; goalDone = false; won = false; adminUnlocked = false;
  // las PISTAS se conservan entre reintentos.

  challengeOpen = false; transition = null; gameOverT = 0; msg = ''; msgT = 0; room = 'over'; camX = 0;

  player.x = 48; player.y = OVER.floorY - SMALL_H; player.w = 22; player.h = SMALL_H;
  player.vx = 0; player.vy = 0; player.onGround = false; player.facing = 'right';
  player.state = 'idle'; player.animFrame = 0; player.animTimer = 0; player.attackTimer = 0;
  player.big = false; player.hp = 3; player.invuln = 1400; player.starT = 0;
  player.safeX = 48; player.safeY = OVER.floorY - SMALL_H;

  keys.left = keys.right = keys.jump = keys.down = false;
  resetEnemies();

  const challenge = document.getElementById('challenge'); if (challenge) challenge.classList.remove('show');
  const note = document.getElementById('pipe-open-note'); if (note) note.style.display = 'none';
  const banner = document.getElementById('goalbanner'); if (banner) banner.style.display = 'none';
  const flag = document.getElementById('flagwrap'); if (flag) flag.hidden = true;
  const winScreen = document.getElementById('win'); if (winScreen) winScreen.classList.remove('show');
}

const respawn = () => resetLevel();

// ====================================================================
// ACTUALIZACIÓN DEL JUGADOR
// ====================================================================

function updatePlayer(dt) {
  if (gameOverT > 0) { gameOverT -= dt; if (gameOverT <= 0) respawn(); return; }
  if (challengeOpen || transition || won || notebookOpen) { player.state = 'idle'; return; }

  if (player.invuln > 0) player.invuln -= dt;
  if (player.starT > 0) player.starT -= dt;

  const MOVE = MOVE_BASE * (player.starT > 0 ? 1.7 : 1);
  player.vx = 0;
  if (keys.left) { player.vx = -MOVE; player.facing = 'left'; }
  if (keys.right) { player.vx = MOVE; player.facing = 'right'; }
  if (keys.jump && player.onGround) { player.vy = JUMP_V; player.onGround = false; }
  if (keys.down && onEntryPipe()) { startPipe('down'); return; }
  if (keys.jump && onExitPipe() && adminUnlocked) { startPipe('up'); return; }

  player.vy += GRAV;
  if (player.vy > GRAVMAX) player.vy = GRAVMAX;

  const solids = solidsForCollision();
  const wasGround = player.onGround;

  // Horizontal con STEP-UP (escaleras).
  player.x += player.vx;
  for (const s of solids) {
    if (!overlaps(player, s)) continue;
    const feet = player.y + player.h;
    const rise = feet - s.y;
    if (wasGround && player.vy >= 0 && rise > 0 && rise <= STEP_MAX) {
      player.y = s.y - player.h; player.vy = 0; player.onGround = true;
    } else if (player.vx > 0) player.x = s.x - player.w;
    else if (player.vx < 0) player.x = s.x + s.w;
  }
  if (player.x < 0) player.x = 0;
  if (player.x + player.w > cur().width) player.x = cur().width - player.w;

  // Vertical.
  player.onGround = false;
  player.y += player.vy;
  for (const s of solids) {
    if (overlaps(player, s)) {
      if (player.vy > 0) { player.y = s.y - player.h; player.vy = 0; player.onGround = true; }
      else if (player.vy < 0) { player.y = s.y + s.h; player.vy = 0; if (s.type) hitBlock(s); }
    }
  }

  if (room === 'over' && player.y > 300) fallInPit();

  if (room === 'over' && player.onGround && groundAt(player.x + player.w / 2) &&
      player.y + player.h <= OVER.floorY + 1) {
    player.safeX = player.x; player.safeY = player.y;
  }

  // Monedas (incluida la secreta con pista).
  const coins = room === 'over' ? OVER.coins : UNDER.coins;
  for (const c of coins) {
    if (!c.got && overlaps(player, { x: c.x - 15, y: c.y - 16, w: 30, h: 32 })) {
      c.got = true; coinsGot++;
      if (c.clue) unlockPista(c.clue);
    }
  }

  if (room === 'over') {
    updateEnemies(dt); updatePiranhas(dt);
    if (!goalDone && player.x + player.w / 2 > OVER.goalX) reachGoal();
  }
  if (room === 'under') updateUndEnemies(dt);

  if (player.attackTimer > 0) { player.attackTimer -= dt; player.state = 'attack'; }
  else if (!player.onGround) player.state = 'jump';
  else if (player.vx !== 0) player.state = 'walk';
  else player.state = 'idle';

  player.animTimer += dt;
  const period = player.state === 'walk' ? 90 : player.state === 'attack' ? 75 : 170;
  if (player.animTimer > period) { player.animFrame++; player.animTimer = 0; }

  const sc = cur().scale, viewW = cv.width / sc;
  camX = Math.max(0, Math.min(player.x + player.w / 2 - viewW / 2, cur().width - viewW));

  for (const it of floatItems) { it.t += dt; it.y -= 0.03 * dt; }
  for (let i = floatItems.length - 1; i >= 0; i--) if (floatItems[i].t > 700) floatItems.splice(i, 1);

  for (const pt of particles) { pt.t += dt; pt.vy += GRAV * 0.5; pt.x += pt.vx; pt.y += pt.vy; }
  for (let i = particles.length - 1; i >= 0; i--) if (particles[i].t > particles[i].life) particles.splice(i, 1);

  for (const b of OVER.blocks) if (b.bumpT > 0) b.bumpT -= dt;
  if (msgT > 0) msgT -= dt;
}

// ====================================================================
// ENEMIGOS
// ====================================================================

function updateEnemies(dt) {
  const step = dt / 16;
  for (const e of enemies) {
    if (e.dead) { e.deadT += dt; continue; }
    e.anim += dt; e.x += e.vx * step;
    let turn = false;
    if (e.x < 0) { e.x = 0; turn = true; }
    if (e.x + e.w > OVER.width) { e.x = OVER.width - e.w; turn = true; }
    for (const p of OVER.pipes) if (overlaps(e, p)) { turn = true; e.x -= e.vx * step * 2; }
    for (const t of OVER.terrain) if (overlaps(e, t)) { turn = true; e.x -= e.vx * step * 2; }
    const ahead = e.x + (e.vx > 0 ? e.w + 3 : -3);
    if (!groundAt(ahead)) turn = true;
    if (turn) e.vx = -e.vx;

    if (overlaps(player, e)) {
      const stomp = player.vy > 0 && (player.y + player.h - e.y) < 18;
      if (player.starT > 0 || stomp) {
        e.dead = true; e.deadT = 0;
        if (stomp) player.vy = -6.5;
        if (e.clue) unlockPista(e.clue);
      } else hurtPlayer();
    }
  }
  enemies = enemies.filter(e => !(e.dead && e.deadT > 600));
}

function updateUndEnemies(dt) {
  const step = dt / 16;
  for (const e of undEnemies) {
    if (e.dead) { e.deadT += dt; continue; }
    e.anim += dt; e.x += e.dir * 1.0 * step;
    if (e.x < e.min) { e.x = e.min; e.dir = 1; }
    if (e.x > e.max) { e.x = e.max; e.dir = -1; }
    if (overlaps(player, e)) {
      const stomp = player.vy > 0 && (player.y + player.h - e.y) < 18;
      if (player.starT > 0 || stomp) {
        e.dead = true; e.deadT = 0;
        if (stomp) player.vy = -6.5;
      } else hurtPlayer();
    }
  }
  undEnemies = undEnemies.filter(e => !(e.dead && e.deadT > 600));
}

function updatePiranhas(dt) {
  for (const pl of piranhas) {
    pl.t = (pl.t + dt) % 5000;
    const onThisPipe = Math.abs((player.x + player.w / 2) - (pl.x + 8)) < 26;
    const up = pl.t < 2500 && !onThisPipe;
    const target = up ? 28 : 0;
    pl.risen += (target - pl.risen) * Math.min(1, dt / 160);
    if (pl.risen > 12) {
      const box = { x: pl.x, y: pl.top - pl.risen, w: 16, h: pl.risen };
      if (overlaps(player, box)) hurtPlayer();
    }
  }
}

function reachGoal() {
  if (hasKey && powerups >= TOTAL_POWERUPS) { goalDone = true; window._openGoal(); }
  else {
    const f = [];
    if (!hasKey) f.push('la LLAVE (SQLi)');
    const p = TOTAL_POWERUPS - powerups;
    if (p > 0) f.push(p + ' power-up(s)');
    toast('META bloqueada · faltan: ' + f.join(' y '));
    player.x = OVER.goalX - player.w - 2;
  }
}

function startPipe(dir) { transition = { dir, t: 0, phase: 'in' }; keys.left = keys.right = keys.jump = keys.down = false; }

function updateTransition(dt) {
  if (!transition) return;
  transition.t += dt;
  if (transition.phase === 'in') {
    player.y += transition.dir === 'down' ? 2 : -2;
    if (transition.t > 420) {
      if (transition.dir === 'down') { room = 'under'; player.x = 80; player.y = -player.h; player.vy = 0; camX = 0; }
      else {
        room = 'over';
        const e = entryPipe();
        player.x = e.x + 4; player.y = e.y - player.h; player.vy = 0;
        player.safeX = player.x; player.safeY = player.y;
        toast('¡Llave! Junta los 3 power-ups y ve a la bandera →');
      }
      transition.phase = 'out'; transition.t = 0;
    }
  } else if (transition.t > 300) transition = null;
}

// ====================================================================
// DIBUJO
// ====================================================================

// coin.png es casi cuadrada (439x455): se dibuja CUADRADA para que no se deforme.
function drawCoin(cx, cy) {
  const img = IMG.coin;
  const bob = Math.sin(Date.now() / 180 + cx) * 2.5;
  const s = 15;
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, cx - s / 2, cy - s / 2 + bob, s, s);
    return;
  }
  ctx.save();
  ctx.fillStyle = '#fcc000';
  ctx.beginPath();
  ctx.ellipse(cx, cy + bob, 6, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Moneda nítida y brillante para el subterráneo (se lee bien sobre negro).
function drawCoinBright(cx, cy) {
  const bob = Math.sin(Date.now() / 180 + cx) * 2;
  cy += bob;
  ctx.save();
  ctx.shadowColor = '#ffd84a'; ctx.shadowBlur = 6;
  ctx.fillStyle = '#ffce1f';
  ctx.beginPath(); ctx.ellipse(cx, cy, 5.5, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff0a6'; ctx.fillRect(cx - 1.5, cy - 5, 2, 10);
  ctx.strokeStyle = '#a9730a'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(cx, cy, 5.5, 8, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawPlayer(transformed) {
  const list = sprites[player.state] && sprites[player.state].length ? sprites[player.state] : sprites.idle;
  const img = list[Math.floor(player.animFrame) % list.length] || sprites.idle[0];
  const dh = (player.big ? 150 : 118) / cur().scale;
  const dw = dh * (SRC_W / SRC_H);
  const offX = transformed ? 0 : camX;
  const cx = player.x + player.w / 2 - offX;
  const dx = cx - dw / 2, dy = player.y + player.h - dh;

  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(cx, player.y + player.h - 2, dw * 0.32, dh * 0.045, 0, 0, Math.PI * 2);
  ctx.fill();

  if (!img || !img.complete || !img.naturalWidth) return;
  if (player.invuln > 0 && Math.floor(player.invuln / 80) % 2 === 0) return;

  ctx.save();
  if (player.starT > 0) ctx.globalAlpha = 0.6 + 0.4 * Math.sin(Date.now() / 60);
  if (player.facing === 'left') {
    ctx.translate(dx + dw, dy); ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, SRC_W, SRC_H, 0, 0, dw, dh);
  } else ctx.drawImage(img, 0, 0, SRC_W, SRC_H, dx, dy, dw, dh);
  ctx.restore();
}

function drawItemSprite(it) {
  const img = IMG[it.kind];
  if (it.kind === 'coin') { drawCoin(it.x + 8, it.y + 8); return; }
  if (img && img.complete && img.naturalWidth > 0) { ctx.drawImage(img, it.x, it.y, 16, 16); return; }
  ctx.fillStyle = it.kind === 'mush' ? '#e52521' : it.kind === 'flower' ? '#ff8c00' : '#fcd500';
  ctx.fillRect(it.x + 2, it.y + 2, 12, 12);
}

function drawParticles() {
  for (const pt of particles) {
    ctx.globalAlpha = Math.max(0, 1 - pt.t / pt.life);
    ctx.fillStyle = pt.c;
    ctx.fillRect(pt.x - 3, pt.y - 3, 6, 6);
  }
  ctx.globalAlpha = 1;
}

function drawGoomba(e) {
  const x = e.x, y = e.y;
  if (e.dead) {
    if (IMG.goomba_flat.complete && IMG.goomba_flat.naturalWidth) ctx.drawImage(IMG.goomba_flat, x, y + e.w - 8, e.w, 8);
    return;
  }
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath(); ctx.ellipse(x + e.w / 2, y + e.w - 2, e.w * 0.45, 4, 0, 0, Math.PI * 2); ctx.fill();
  const img = Math.floor(e.anim / 180) % 2 ? IMG.goomba2 : IMG.goomba1;
  if (img.complete && img.naturalWidth) {
    if (e.vx < 0) { ctx.save(); ctx.translate(x + e.w, y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, e.w, e.w); ctx.restore(); }
    else ctx.drawImage(img, x, y, e.w, e.w);
  } else { ctx.fillStyle = '#8b4a1a'; ctx.fillRect(x + 2, y + 4, e.w - 4, e.w - 6); }
}

function drawPiranha(pl) {
  if (pl.risen <= 2) return;
  const x = pl.x;
  const img = Math.floor(Date.now() / 250) % 2 ? IMG.piranha2 : IMG.piranha1;
  const y = pl.top - pl.risen;
  if (img.complete && img.naturalWidth) ctx.drawImage(img, 0, 0, 16, 24, x, y, 16, Math.min(28, pl.risen + 4));
  else { ctx.fillStyle = '#2ea82e'; ctx.fillRect(x, y, 16, pl.risen); }
}

// Dibuja los bloques: SOLO los estados que cambian respecto al fondo.
//   - bloque sin tocar: el fondo ya lo pinta -> no se dibuja nada.
//   - ? usado: se cubre con el icono qblock_used.png (ya en el repo).
//   - ladrillo roto: se tapa con cielo (queda el hueco).
//   - bloque oculto sin tocar: invisible.
function drawBlocks() {
  for (const b of OVER.blocks) {
    if (b.vanished) {
      ctx.fillStyle = SKY;
      ctx.fillRect(b.x, b.y, 16, 16);
    } else if (b.used) {
      const oy = b.bumpT > 0 ? -Math.sin((1 - b.bumpT / 180) * Math.PI) * 3 : 0;
      ctx.fillStyle = SKY; ctx.fillRect(b.x, b.y, 16, 16);   // borra el ? dorado del fondo
      if (IMG.used.complete && IMG.used.naturalWidth) ctx.drawImage(IMG.used, b.x, b.y + oy, 16, 16);
      else { ctx.fillStyle = '#9c5a19'; ctx.fillRect(b.x, b.y + oy, 16, 16); }
    }
    else if (b.clue && b.type === 'brick' && !b.hidden) {
      // ladrillo "con grieta": pista escondida, marca sutil sobre el ladrillo del fondo
      ctx.strokeStyle = 'rgba(30,10,4,.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(b.x + 5, b.y + 2);
      ctx.lineTo(b.x + 8, b.y + 7);
      ctx.lineTo(b.x + 5, b.y + 11);
      ctx.lineTo(b.x + 9, b.y + 15);
      ctx.stroke();
    }
    // (sin tocar y visible) -> lo pinta el fondo; (oculto) -> nada.
  }
}

function drawOverworld() {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(SCALE, 0, 0, SCALE, -camX * SCALE, 0);

  if (bg.complete && bg.naturalWidth) ctx.drawImage(bg, 0, 0);
  else { ctx.fillStyle = SKY; ctx.fillRect(camX, 0, cv.width / SCALE, cv.height / SCALE); }

  drawBlocks();

  for (const c of OVER.coins) if (!c.got && !c.clue) drawCoin(c.x, c.y);     // moneda secreta: no se dibuja (escondida)
  for (const it of floatItems) drawItemSprite(it);
  drawParticles();
  for (const pl of piranhas) drawPiranha(pl);
  for (const e of enemies) drawGoomba(e);

  // La bandera del FONDO es la meta. Destella suave cuando ya puedes terminar.
  if (hasKey && powerups >= TOTAL_POWERUPS) {
    const g = OVER.goalFlag;
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.5 * pulse;
    ctx.fillStyle = '#fff2a0';
    ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('✦ META', g.x, g.y + 2);
    ctx.restore();
  }

  const e = entryPipe();
  const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 240);
  ctx.save();
  ctx.globalAlpha = 0.55 + 0.45 * pulse;
  ctx.fillStyle = '#fff100';
  ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('▼', e.x + e.w / 2, e.y - 20);
  ctx.restore();

  if (onEntryPipe() && !transition) promptW(e.x + e.w / 2, e.y, '[↓] BAJAR');

  drawPlayer(true);
  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function promptW(cx, topY, label) {
  const y = topY - 16;
  ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(label).width + 10;
  ctx.fillStyle = 'rgba(4,14,24,.96)'; ctx.fillRect(cx - w / 2, y - 6, w, 13);
  ctx.strokeStyle = '#ffb454'; ctx.lineWidth = 0.7; ctx.strokeRect(cx - w / 2 + 0.3, y - 5.7, w - 0.6, 12.4);
  ctx.fillStyle = '#ffe0a6'; ctx.fillText(label, cx, y + 0.5);
}

function promptS(cx, topY, label) {
  const y = topY - 30;
  ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(label).width + 18;
  ctx.fillStyle = 'rgba(4,14,24,.96)'; ctx.fillRect(cx - w / 2, y - 9, w, 19);
  ctx.strokeStyle = '#ffb454'; ctx.lineWidth = 1; ctx.strokeRect(cx - w / 2 + 0.5, y - 8.5, w - 1, 18);
  ctx.fillStyle = '#ffe0a6'; ctx.fillText(label, cx, y + 1);
}

// Ladrillo azul clásico (suelo, muros, escalón) con juntas trabadas y bisel.
function drawBrick(x, y, w, h) {
  ctx.fillStyle = '#18287e'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#0b1356';
  for (let gy = 0; gy < h; gy += 16) ctx.fillRect(x, y + gy + 14, w, 2);
  for (let gy = 0; gy < h; gy += 16) {
    const off = (Math.floor(gy / 16) % 2) ? 8 : 0;
    for (let gx = off; gx <= w; gx += 16) ctx.fillRect(x + gx, y + gy, 2, 16);
  }
  ctx.fillStyle = 'rgba(96,126,255,.38)'; ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(x, y + h - 2, w, 2);
}
// Cornisa metálica para el parkour (se distingue del ladrillo).
function drawLedge(x, y, w, h) {
  ctx.fillStyle = '#2b3550'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#56688f'; ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = '#8fa6d8'; ctx.fillRect(x, y, w, 1);
  ctx.fillStyle = '#141b2d'; ctx.fillRect(x, y + h - 3, w, 3);
  ctx.fillStyle = '#7f94c6';
  for (let i = 6; i < w - 4; i += 22) ctx.fillRect(x + i, y + h - 7, 2, 2);
  ctx.fillStyle = 'rgba(88,225,255,.55)'; ctx.fillRect(x, y - 1, w, 1);
}
// Tubería verde clásica (salida).
function drawPipe(px, y, w, h, lit) {
  const dark = lit ? '#1f7a1f' : '#167e16', mid = lit ? '#2ea82e' : '#34bd34', lite = lit ? '#7bd858' : '#9bf06a';
  ctx.fillStyle = mid; ctx.fillRect(px + 5, y + 16, w - 10, h - 16);
  ctx.fillStyle = lite; ctx.fillRect(px + 9, y + 16, 7, h - 16);
  ctx.fillStyle = dark; ctx.fillRect(px + w - 13, y + 16, 8, h - 16);
  ctx.fillStyle = mid; ctx.fillRect(px - 6, y, w + 12, 18);
  ctx.fillStyle = lite; ctx.fillRect(px - 6, y, w + 12, 5);
  ctx.fillStyle = dark; ctx.fillRect(px - 6, y + 13, w + 12, 5);
  ctx.strokeStyle = '#07340f'; ctx.lineWidth = 2;
  ctx.strokeRect(px - 6, y, w + 12, 18); ctx.strokeRect(px + 5, y + 16, w - 10, h - 16);
}

// ---- Subterráneo ----
function drawUnderground() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // Fondo de caverna con viñeta y polvo.
  const bgg = ctx.createLinearGradient(0, 0, 0, cv.height);
  bgg.addColorStop(0, '#060814'); bgg.addColorStop(.55, '#0a1024'); bgg.addColorStop(1, '#05070f');
  ctx.fillStyle = bgg; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = 'rgba(88,166,255,.10)';
  for (let i = 0; i < 40; i++) {
    const dx = (i * 137 - camX * 0.3) % (cv.width + 40);
    ctx.fillRect((dx + cv.width) % cv.width, (i * 53) % 360 + 10, 2, 2);
  }

  for (const s of UNDER.solids) {
    const x = s.x - camX;
    if (x > cv.width || x + s.w < 0) continue;
    if (s.plat) drawLedge(x, s.y, s.w, s.h);
    else drawBrick(x, s.y, s.w, s.h);
  }

  for (const c of UNDER.coins) if (!c.got) drawCoinBright(c.x - camX, c.y);

  // goombas del subterráneo
  for (const e of undEnemies) {
    const ex = e.x - camX; if (ex < -30 || ex > cv.width + 30) continue;
    if (e.dead) {
      if (IMG.goomba_flat.complete && IMG.goomba_flat.naturalWidth) ctx.drawImage(IMG.goomba_flat, ex, e.y + 16, 24, 8);
      continue;
    }
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(ex + 12, e.y + e.h - 1, 10, 3, 0, 0, Math.PI * 2); ctx.fill();
    const img = Math.floor(e.anim / 180) % 2 ? IMG.goomba2 : IMG.goomba1;
    if (img.complete && img.naturalWidth) {
      if (e.dir < 0) { ctx.save(); ctx.translate(ex + 24, e.y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, 24, 24); ctx.restore(); }
      else ctx.drawImage(img, ex, e.y, 24, 24);
    } else { ctx.fillStyle = '#8b4a1a'; ctx.fillRect(ex + 2, e.y + 4, 20, 18); }
  }

  // ---- Terminal del Guardián: pequeño COMPUTADOR retro ----
  const tm = UNDER.terminal, tx = tm.x - camX, pulse = 0.5 + 0.5 * Math.sin(Date.now() / 260);
  const on = adminUnlocked, scr = on ? '#43ff9e' : '#38c6ff';
  ctx.save();
  ctx.shadowColor = scr; ctx.shadowBlur = 8 + 12 * pulse;
  ctx.fillStyle = '#242a38'; ctx.fillRect(tx, tm.y, tm.w, tm.h - 11);            // carcasa monitor
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#12151f'; ctx.fillRect(tx + 4, tm.y + 4, tm.w - 8, tm.h - 20); // marco pantalla
  ctx.fillStyle = on ? '#06301d' : '#06263c'; ctx.fillRect(tx + 6, tm.y + 6, tm.w - 12, tm.h - 24); // pantalla
  // líneas de escaneo
  ctx.globalAlpha = 0.18; ctx.fillStyle = scr;
  for (let ly = tm.y + 8; ly < tm.y + tm.h - 20; ly += 3) ctx.fillRect(tx + 6, ly, tm.w - 12, 1);
  ctx.globalAlpha = 1;
  // texto de pantalla
  ctx.fillStyle = scr; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(on ? 'ADMIN OK' : 'sql>', tx + 8, tm.y + 9);
  if (!on && Math.floor(Date.now() / 450) % 2) ctx.fillRect(tx + 30, tm.y + 9, 5, 8); // cursor
  // icono de base de datos
  ctx.strokeStyle = scr; ctx.lineWidth = 1.2;
  const dbx = tx + 11, dby = tm.y + 23;
  ctx.beginPath(); ctx.ellipse(dbx, dby, 7, 2.4, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(dbx - 7, dby); ctx.lineTo(dbx - 7, dby + 8); ctx.moveTo(dbx + 7, dby); ctx.lineTo(dbx + 7, dby + 8); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(dbx, dby + 8, 7, 2.4, 0, 0, Math.PI); ctx.stroke();
  // base / peana del monitor
  ctx.fillStyle = '#242a38';
  ctx.fillRect(tx + tm.w / 2 - 5, tm.y + tm.h - 11, 10, 5);
  ctx.fillRect(tx + tm.w / 2 - 12, tm.y + tm.h - 6, 24, 5);
  ctx.restore();

  if (nearTerminal() && !challengeOpen && !adminUnlocked) promptS(tx + tm.w / 2, tm.y, '[ E ] ACCESO');

  const p = UNDER.exitPipe, px = p.x - camX;
  drawPipe(px, p.y, p.w, p.h, adminUnlocked);
  if (adminUnlocked) {
    const bob = Math.sin(Date.now() / 200) * 3;
    ctx.save();
    ctx.globalAlpha = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(Date.now() / 160));
    ctx.fillStyle = '#8fe39b'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('▲', px + p.w / 2, p.y - 15 + bob);
    ctx.restore();
    if (onExitPipe() && !transition) promptS(px + p.w / 2, p.y, '[ ↑ ] SUBIR');
  } else {
    ctx.fillStyle = '#cfd4da'; ctx.fillRect(px + p.w / 2 - 8, p.y - 15, 16, 12);
    ctx.strokeStyle = '#cfd4da'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px + p.w / 2, p.y - 15, 6, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(px + p.w / 2 - 2, p.y - 11, 4, 6);
  }

  drawPlayer(false);
}

// ---- HUD ----
function drawHUD() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.textBaseline = 'middle';

  // --- Barra central: título + objetivo (centrada, SIN pisar los paneles laterales) ---
  const hw = 366, hh = 46, hx = cv.width / 2 - hw / 2, hy = 6;
  ctx.fillStyle = 'rgba(6,12,22,.96)'; ctx.fillRect(hx, hy, hw, hh);
  ctx.fillStyle = '#ffb454'; ctx.fillRect(hx, hy, hw, 3);
  ctx.strokeStyle = 'rgba(89,208,221,.85)'; ctx.lineWidth = 2; ctx.strokeRect(hx + 1, hy + 1, hw - 2, hh - 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 14px monospace';
  ctx.fillText('MUNDO 1-1 · SUPER MARIO', cv.width / 2, hy + 16);
  ctx.fillStyle = '#9fe0ff'; ctx.font = 'bold 10px monospace';
  const sub = room === 'under' ? '▸ ACCESO ADMIN (SQLi) — consigue la LLAVE'
    : hasKey ? '▸ JUNTA LOS 3 POWER-UPS Y LLEGA A LA BANDERA →' : '▸ BAJA POR LA PRIMERA TUBERÍA ↓';
  ctx.fillText(sub, cv.width / 2, hy + 34);

  // --- Panel izquierdo: vidas + llave + power-ups ---
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(6,12,22,.9)'; ctx.fillRect(8, 6, 156, 24);
  ctx.strokeStyle = 'rgba(255,120,130,.55)'; ctx.lineWidth = 1; ctx.strokeRect(8.5, 6.5, 155, 23);
  for (let i = 0; i < 3; i++) { ctx.fillStyle = i < player.hp ? '#ff4d6d' : '#3a2030'; heart(15 + i * 17, 12, 1.2); }
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = hasKey ? '#ffd24a' : '#49515f'; ctx.fillText('🔑', 72, 19);
  ctx.fillStyle = '#ff9a3c'; ctx.fillText('★' + powerups + '/' + TOTAL_POWERUPS, 98, 19);
  if (player.starT > 0) { ctx.fillStyle = '#fcd500'; ctx.font = 'bold 9px monospace'; ctx.fillText('INV', 140, 19); }

  // --- Pistas (debajo) ---
  const n = foundCount();
  ctx.fillStyle = 'rgba(6,16,10,.92)'; ctx.fillRect(8, 34, 164, 22);
  ctx.strokeStyle = n === PISTAS.length ? '#8fe39b' : 'rgba(143,227,151,.7)'; ctx.lineWidth = 1; ctx.strokeRect(8.5, 34.5, 163, 21);
  ctx.fillStyle = n === PISTAS.length ? '#8fe39b' : '#cfe8d3'; ctx.font = 'bold 12px monospace';
  ctx.fillText('📓 PISTAS ' + n + '/' + PISTAS.length, 16, 45);
  ctx.fillStyle = '#8fb0ff'; ctx.font = 'bold 10px monospace'; ctx.fillText('[ Q ]', 140, 45);

  // --- Monedas (derecha) ---
  ctx.fillStyle = 'rgba(6,12,22,.9)'; ctx.fillRect(cv.width - 112, 6, 104, 26);
  ctx.strokeStyle = 'rgba(252,192,0,.8)'; ctx.lineWidth = 1; ctx.strokeRect(cv.width - 111.5, 6.5, 103, 25);
  if (IMG.coin.complete && IMG.coin.naturalWidth > 0) ctx.drawImage(IMG.coin, cv.width - 102, 10, 18, 18);
  ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 15px monospace'; ctx.fillText('× ' + coinsGot, cv.width - 78, 19);

  if (msgT > 0 && msg) {
    ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
    const w = ctx.measureText(msg).width + 26;
    ctx.fillStyle = 'rgba(8,16,30,.96)'; ctx.fillRect(cv.width / 2 - w / 2, 62, w, 26);
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 1.5; ctx.strokeRect(cv.width / 2 - w / 2 + 0.75, 62.75, w - 1.5, 24.5);
    ctx.fillStyle = '#ffe98a'; ctx.textBaseline = 'middle'; ctx.fillText(msg, cv.width / 2, 75);
  }
}

function heart(x, y, s) {
  s = s || 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(5, 9); ctx.bezierCurveTo(-2, 3, 1, -2, 5, 2); ctx.bezierCurveTo(9, -2, 12, 3, 5, 9); ctx.fill();
  ctx.restore();
}

// ---- Bucle ----
function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  if (room === 'over') drawOverworld(); else drawUnderground();
  drawHUD();

  if (transition) {
    const a = transition.phase === 'in' ? Math.min(1, transition.t / 420) : Math.max(0, 1 - transition.t / 300);
    ctx.fillStyle = `rgba(0,0,0,${0.85 * a})`; ctx.fillRect(0, 0, cv.width, cv.height);
  }

  if (gameOverT > 0) {
    if (IMG.gameover.complete && IMG.gameover.naturalWidth) ctx.drawImage(IMG.gameover, 0, 0, cv.width, cv.height);
    else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.fillStyle = '#fff'; ctx.font = 'bold 30px monospace'; ctx.textAlign = 'center'; ctx.fillText('GAME OVER', cv.width / 2, cv.height / 2); }
  }

  ctx.strokeStyle = 'rgba(118,220,218,.7)'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, cv.width - 2, cv.height - 2);
}

let last = performance.now();
function loop(t) {
  const dt = Math.min(t - last, 50); last = t;
  updatePlayer(dt); updateTransition(dt); draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ====================================================================
// RETO SQLi
// ====================================================================

function tryOpenTerminal() { if (nearTerminal() && !adminUnlocked) openChallenge(); }

function openChallenge() {
  challengeOpen = true;
  unlockPista('terminal'); renderPistas();
  keys.left = keys.right = keys.jump = keys.down = false;
  document.getElementById('challenge').classList.add('show');
}

function closeChallenge() { challengeOpen = false; document.getElementById('challenge').classList.remove('show'); }
window._closeChallenge = closeChallenge;

window._setAdminUnlocked = function () {
  adminUnlocked = true; hasKey = true;
  const n = document.getElementById('pipe-open-note'); if (n) n.style.display = 'block';
};

window._openGoal = function () {
  challengeOpen = true;
  keys.left = keys.right = keys.jump = keys.down = false;
  document.getElementById('challenge').classList.add('show');
  const fw = document.getElementById('flagwrap'); if (fw) fw.hidden = false;
  const gb = document.getElementById('goalbanner'); if (gb) gb.style.display = 'block';
};

window._showWin = function () { won = true; const w = document.getElementById('win'); if (w) w.classList.add('show'); };
window._toggleNotebook = toggleNotebook;

renderPistas();
