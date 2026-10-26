const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const VIEW_WIDTH = 1080;
const VIEW_HEIGHT = 540;
canvas.width = VIEW_WIDTH;
canvas.height = VIEW_HEIGHT;

const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 1600;

// --- TAMAÑOS ---
const PLAYER_SIZE = 182; 
const HITBOX_RADIUS_X = 46; 
const HITBOX_RADIUS_Y = 19; 
const HITBOX_OFFSET_X = (PLAYER_SIZE / 2) - HITBOX_RADIUS_X;
const HITBOX_OFFSET_Y = (PLAYER_SIZE - 10) - HITBOX_RADIUS_Y; 

const PLAYER_SPEED = 11; 
const JUMP_FORCE = -16;
const GRAVITY = 1.6; 

const ENEMY_SIZE = 218; 
const ENEMY_SPEED = 3.1; 
const ENEMY_PUSH_FORCE = 42;
const ENEMY_HITBOX = 73; 
const ENEMY_SIGHT_RANGE = 900; 
const ENEMY_SHADOW_OFFSET_Y = -55;

// --- RATAS (segundo enemigo) ---
const RAT_SIZE = 120;          // tamaño en pantalla (más pequeñas que el esqueleto)
const RAT_SPEED = 4.2;         // son más rápidas y escurridizas
const RAT_HITBOX = 46;
const RAT_PUSH_FORCE = 34;     // cuánto empujan a Fabiancho al tocarlo

// --- CONTROL DEL EMPUJE (para poder golpear sin salir volando) ---
const MAX_BOUNCE = 19;         // tope del empuje acumulado: evita salir disparado
const ATTACK_PUSH_DAMP = 0.18; // mientras Fabiancho golpea, el empuje casi no le afecta
const RAT_SIGHT_RANGE = 750;
const RAT_SHADOW_OFFSET_Y = -26;
const RAT_SHEET_FACES_LEFT = true; // si la rata sale espejada, cambia esto a false

const sprites = { idle: [], walk: [], attack: [], jump: [] };
function loadImg(src) { const img = new Image(); img.src = src; return img; }

// --- VELOCIDAD DE ANIMACIÓN POR ESTADO ---
// dur = milisegundos por frame (más bajo = más rápido/fluido)
// loop = si la animación se repite (idle/walk) o se queda en el último frame (golpe/salto)
const ANIM = {
    idle:   { frames: 4, dur: 170, loop: true  },
    walk:   { frames: 6, dur: 85,  loop: true  },
    attack: { frames: 4, dur: 65,  loop: false },
    jump:   { frames: 4, dur: 110, loop: false }
};

for(let i=1; i<=4; i++) sprites.idle.push(loadImg(`/static/img/skeli_fixed/idle/idle${i}.png`));
for(let i=1; i<=6; i++) sprites.walk.push(loadImg(`/static/img/skeli_fixed/walk/walk${i}.png`));
for(let i=1; i<=4; i++) sprites.attack.push(loadImg(`/static/img/skeli_fixed/attack/attack${i}.png`));
for(let i=1; i<=4; i++) sprites.jump.push(loadImg(`/static/img/skeli_fixed/jump/jump${i}.png`));

const enemySheets = {
    idle: loadImg('/static/img/enemies/enemy_idle.png'),
    walk: loadImg('/static/img/enemies/enemy_walk.png'),
    death: loadImg('/static/img/enemies/enemy_death.png')
};

// Hojas de la rata (frames de 64px, 4 columnas por fila)
const ratSheets = {
    idle:  loadImg('/static/img/rats/rat_idle.png'),
    run:   loadImg('/static/img/rats/rat_run.png'),
    death: loadImg('/static/img/rats/rat_death.png')
};
const RAT_FRAME = 64;
const RAT_CFG = {
    idle:  { cols: 4, frames: 4 },
    run:   { cols: 4, frames: 6 },
    death: { cols: 4, frames: 5 }
};

const backgroundImg = loadImg('/static/img/background.png');

const SHEET_WIDTH = 2000;
const SHEET_HEIGHT = 400;
const SHEET_COLS = 20;
const SHEET_ROWS = 4;
const FRAME_W = SHEET_WIDTH / SHEET_COLS;
const FRAME_H = SHEET_HEIGHT / SHEET_ROWS;

const SHEET_CONFIG = {
    idle: { cols: 19, rows: { up: 0, right: 1, down: 2, left: 3 } },
    walk: { cols: 12, rows: { up: 0, right: 1, down: 2, left: 3 } },
    death: { cols: 10, rows: { up: 0, right: 1, down: 2, left: 3 } }
};

let DEBUG_FRAMES = false;

// --- SISTEMA DE EDICIÓN ---
let EDIT_MODE = false;
let isDraggingWall = false;
let dragStartX = 0, dragStartY = 0;
let draggingLevel = null; 
let lastMouseX = 0, lastMouseY = 0; 

// --- MUROS ACTUALIZADOS CON TUS CORRECCIONES ---
const WALL_THICKNESS = 20; 
let WALLS = [
    { x: 205, y: 791, w: 30, h: 493 }, { x: 223, y: 1472, w: 230, h: 42 },
    { x: 201, y: 1276, w: 40, h: 226 }, { x: 565, y: 1486, w: 237, h: 24 },
    { x: 430, y: 1480, w: 131, h: 25 }, { x: 237, y: 1253, w: 97, h: 212 },
    { x: 394, y: 1300, w: 102, h: 144 }, { x: 1142, y: 1391, w: 32, h: 117 },
    { x: 1151, y: 1366, w: 29, h: 136 }, { x: 793, y: 1484, w: 384, h: 30 },
    { x: 1074, y: 1171, w: 83, h: 175 }, { x: 317, y: 171, w: 380, h: 26 },
    { x: 319, y: 183, w: 21, h: 422 }, { x: 345, y: 202, w: 243, h: 86 },
    { x: 612, y: 411, w: 54, h: 39 }, { x: 624, y: 543, w: 36, h: 36 },
    { x: 661, y: 596, w: 33, h: 187 }, { x: 313, y: 762, w: 110, h: 29 },
    { x: 187, y: 761, w: 140, h: 25 }, { x: 325, y: 594, w: 11, h: 180 },
    { x: 741, y: 758, w: 31, h: 28 }, { x: 325, y: 607, w: 37, h: 174 },
    { x: 672, y: 597, w: 31, h: 180 }, { x: 1524, y: 173, w: 712, h: 35 },
    { x: 2214, y: 218, w: 57, h: 438 }, { x: 1528, y: 631, w: 219, h: 33 },
    { x: 1526, y: 185, w: 20, h: 468 }, { x: 2101, y: 687, w: 36, h: 216 },
    { x: 1551, y: 887, w: 564, h: 21 }, { x: 1528, y: 893, w: 18, h: 207 },
    { x: 1527, y: 1089, w: 13, h: 33 }, { x: 1155, y: 172, w: 359, h: 23 },
    { x: 1163, y: 187, w: 16, h: 203 }, { x: 1157, y: 528, w: 23, h: 231 },
    { x: 923, y: 765, w: 243, h: 27 }, { x: 1148, y: 768, w: 29, h: 20 },
    { x: 1149, y: 775, w: 31, h: 207 }, { x: 1155, y: 775, w: 19, h: 208 },
    { x: 1157, y: 1130, w: 28, h: 246 }, { x: 1166, y: 1369, w: 99, h: 21 },
    { x: 1518, y: 1251, w: 23, h: 132 }, { x: 1522, y: 1363, w: 608, h: 24 },
    { x: 2032, y: 908, w: 50, h: 419 }, { x: 2029, y: 1307, w: 26, h: 48 },
    { x: 1687, y: 1014, w: 171, h: 84 }, { x: 1542, y: 223, w: 484, h: 90 },
    { x: 2064, y: 546, w: 108, h: 73 }, { x: 707, y: 176, w: 447, h: 20 },
    { x: 2241, y: 183, w: 13, h: 329 }, { x: 2235, y: 519, w: 12, h: 137 },
    { x: 665, y: 199, w: 30, h: 392 }, { x: 2208, y: 437, w: 34, h: 192 },
    { x: 2067, y: 921, w: 72, h: 452 }, { x: 1899, y: 639, w: 345, h: 32 },
    { x: 240, y: 151, w: 9, h: 22 }, { x: 579, y: 763, w: 183, h: 28 },
    { x: 1415, y: 1373, w: 108, h: 18 }
];

// --- NIVELES ACTUALIZADOS CON TUS POSICIONES ---
const LEVELS = [
    { id: 1, name: "Nivel 1: Mario", desc: "Reconocimiento", x: 498, y: 392, marker: "mario_coin" },
    { id: 2, name: "Nivel 2: Contra", desc: "Enumeración web", x: 956, y: 273 },
    { id: 3, name: "Nivel 3: Mega Man", desc: "La máscara", x: 1310, y: 264 },
    { id: 4, name: "Nivel 4: Castlevania", desc: "Manipulación", x: 1610, y: 372 },
    { id: 5, name: "Nivel 5: Bomberman", desc: "File Upload", x: 250, y: 500 },
    { id: 6, name: "Nivel 6: Metal Slug", desc: "Burp Suite", x: 963, y: 501 },
    { id: 7, name: "Nivel 7: Ghosts'n Goblins", desc: "Cookies", x: 1300, y: 500 },
    { id: 8, name: "Nivel 8: DOOM", desc: "Cmd Injection", x: 1900, y: 500, marker: "doom" },
    { id: 9, name: "Nivel 9: Sonic", desc: "SSH Acceso", x: 465, y: 1362, marker: "sonic_ring" },
    { id: 10, name: "Nivel 10: Prince", desc: "Linux System", x: 800, y: 950 },
    { id: 11, name: "Nivel 11: Earthworm", desc: "Docker", x: 1300, y: 950 },
    { id: 12, name: "Nivel 12: Kirby", desc: "Esteganografía", x: 1770, y: 1082 },
    { id: 13, name: "Nivel 13: Ninja Gaiden", desc: "Audio", x: 1047, y: 1406 },
    { id: 14, name: "Nivel 14: Pokémon", desc: "Reto final", x: 2076, y: 1199 }
];

// --- MARCADORES TEMÁTICOS POR NIVEL (sprite animado en vez de la moneda) ---
// Cada nivel con "marker" dibuja su sprite; los demás siguen con la moneda.
const MARKERS = {
    mario_coin: { img: loadImg('/static/img/markers/mario_coin.png'), fw:34, fh:35, frames:4, fps:8,  size:66 },
    sonic_ring: { img: loadImg('/static/img/markers/sonic_ring.png'), fw:64, fh:64, frames:8, fps:12, size:72 },
    doom:       { img: loadImg('/static/img/markers/doom.png'),       fw:71, fh:72, frames:7, fps:7,  size:104 }
};

const SPAWN_POINTS = [
    { x: 350, y: 200 }, { x: 700, y: 200 }, { x: 1200, y: 200 }, { x: 1800, y: 200 },
    { x: 300, y: 600 }, { x: 800, y: 600 }, { x: 1200, y: 600 }, { x: 1800, y: 600 },
    { x: 400, y: 700 }, { x: 1300, y: 700 }, { x: 1900, y: 700 }, { x: 1100, y: 500 }
];

let enemies = SPAWN_POINTS.map(sp => ({
    x: sp.x, y: sp.y, vx: 0, vy: 0, isDead: false, deathTimer: 0,
    animFrame: 0, animTimer: 0, facing: 'down', state: 'idle'
}));

// --- SPAWN DE RATAS ---
const RAT_SPAWNS = [
    { x: 600, y: 1350 }, { x: 1500, y: 1300 }, { x: 950, y: 1150 },
    { x: 1850, y: 1250 }, { x: 500, y: 900 }
];
let rats = RAT_SPAWNS.map(sp => ({
    x: sp.x, y: sp.y, isDead: false, deathTimer: 0,
    animFrame: 0, animTimer: 0, facing: 'left', state: 'idle'
}));

// --- SPAWN DE FABIANCHO EN LA PARTE INFERIOR ---
const SPAWN_X = 1000;
const SPAWN_Y = 1400;

const player = {
    x: SPAWN_X, y: SPAWN_Y, jumpOffset: 0, jumpVelocity: 0,
    facing: 'down', isMoving: false, isAttacking: false, isJumping: false, onGround: true,
    attackStartTime: 0, lastAttack: 0, animFrame: 0, animTimer: 0, time: 0,
    bounceVx: 0, bounceVy: 0
};

const camera = { x: 0, y: 0 };
const keys = { up: false, down: false, left: false, right: false };
let canInteract = true;

function unstickEntity(entity, size) {
    for (let wall of WALLS) {
        if (entity.x < wall.x + wall.w && entity.x + size > wall.x &&
            entity.y < wall.y + wall.h && entity.y + size > wall.y) {
            entity.x = WORLD_WIDTH / 2 - size / 2;
            entity.y = WORLD_HEIGHT / 2 - size / 2;
            return true;
        }
    }
    return false;
}

window.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') {
        EDIT_MODE = !EDIT_MODE;
        console.log("Modo edición:", EDIT_MODE);
        return;
    }

    if (e.key === 'c' || e.key === 'C') {
        if (EDIT_MODE) {
            console.log("--- COPIA Y PEGA ESTO EN TU CÓDIGO ---");
            console.log("let WALLS = [");
            WALLS.forEach(w => {
                console.log(`    { x: ${Math.round(w.x)}, y: ${Math.round(w.y)}, w: ${Math.round(w.w)}, h: ${Math.round(w.h)} },`);
            });
            console.log("];");
            console.log("\nconst LEVELS = [");
            LEVELS.forEach(l => {
                console.log(`    { id: ${l.id}, name: "${l.name}", desc: "${l.desc}", x: ${Math.round(l.x)}, y: ${Math.round(l.y)} },`);
            });
            console.log("];");
        }
        return;
    }

    if (EDIT_MODE) {
        if (e.key === 'e' || e.key === 'E') {
            for (let level of LEVELS) {
                const dist = Math.hypot(lastMouseX - level.x, lastMouseY - level.y);
                if (dist < 50) {
                    draggingLevel = level;
                    console.log(`Nivel ${level.id} seleccionado. Mueve el mouse y haz clic para soltar.`);
                    return;
                }
            }
        }
        return;
    }

    if(e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.up = true;
    if(e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.down = true;
    if(e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.left = true;
    if(e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.right = true;
    if(e.key === ' ') { e.preventDefault(); if (player.onGround) { player.jumpVelocity = JUMP_FORCE; player.onGround = false; player.isJumping = true; } }
    if(e.key === 'f' || e.key === 'F') {
        if (performance.now() - player.lastAttack > 500) {
            player.isAttacking = true; player.attackStartTime = performance.now();
            player.lastAttack = performance.now(); player.animFrame = 0;
            checkAttackHit();
        }
    }
    if (e.key === '0') DEBUG_FRAMES = !DEBUG_FRAMES;

    if((e.key === 'e' || e.key === 'E') && canInteract) {
        let closestLevel = null; let minDist = Infinity;
        LEVELS.forEach(level => {
            const dist = Math.hypot(player.x + PLAYER_SIZE/2 - level.x, player.y + PLAYER_SIZE/2 - level.y);
            if (dist < 120 && dist < minDist) { minDist = dist; closestLevel = level; }
        });
        if (closestLevel) {
            const isUnlocked = UNLOCKED_LEVELS.includes(closestLevel.id) || closestLevel.id === 1;
            const popup = document.getElementById('level-popup');
            document.getElementById('popup-title').innerText = closestLevel.name;
            document.getElementById('popup-desc').innerText = closestLevel.desc;
            const btnEnter = document.getElementById('btn-enter-level');
            if (isUnlocked) {
                btnEnter.innerText = "ENTRAR"; btnEnter.style.color = "var(--green)"; btnEnter.style.borderColor = "var(--green)";
                btnEnter.onclick = () => { window.location.href = `/level/${closestLevel.id}`; };
            } else {
                btnEnter.innerText = "BLOQUEADO"; btnEnter.style.color = "var(--magenta)"; btnEnter.style.borderColor = "var(--magenta)";
                btnEnter.onclick = null;
            }
            popup.classList.remove('hidden');
        }
    }
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
}, { passive: false });

window.addEventListener('keyup', (e) => {
    if (EDIT_MODE) return;
    if(e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.up = false;
    if(e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.down = false;
    if(e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.left = false;
    if(e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.right = false;
});

window.addEventListener('blur', () => { keys.up = keys.down = keys.left = keys.right = false; player.isAttacking = false; });

document.getElementById('btn-close-popup').onclick = () => {
    document.getElementById('level-popup').classList.add('hidden');
    canInteract = false; setTimeout(() => { canInteract = true; }, 500);
};

canvas.addEventListener('mousemove', (e) => {
    if (!EDIT_MODE) return;
    const rect = canvas.getBoundingClientRect();
    lastMouseX = e.clientX - rect.left + camera.x;
    lastMouseY = e.clientY - rect.top + camera.y;

    if (draggingLevel) {
        draggingLevel.x = lastMouseX;
        draggingLevel.y = lastMouseY;
    }
});

canvas.addEventListener('mousedown', (e) => {
    if (!EDIT_MODE) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left + camera.x;
    const mouseY = e.clientY - rect.top + camera.y;

    if (e.button === 2) {
        e.preventDefault();
        if (draggingLevel) {
            console.log("Arrastre de nivel cancelado.");
            draggingLevel = null;
            return;
        }
        for (let i = WALLS.length - 1; i >= 0; i--) {
            const wall = WALLS[i];
            if (mouseX >= wall.x && mouseX <= wall.x + wall.w &&
                mouseY >= wall.y && mouseY <= wall.y + wall.h) {
                WALLS.splice(i, 1);
                console.log(`Muro eliminado en (${Math.round(mouseX)}, ${Math.round(mouseY)})`);
                return;
            }
        }
    } else if (e.button === 0) {
        if (draggingLevel) {
            console.log(`Nivel ${draggingLevel.id} reubicado en (${Math.round(draggingLevel.x)}, ${Math.round(draggingLevel.y)})`);
            draggingLevel = null;
            return;
        }
        dragStartX = mouseX;
        dragStartY = mouseY;
        isDraggingWall = true;
    }
});

canvas.addEventListener('contextmenu', (e) => {
    if (EDIT_MODE) e.preventDefault();
});

canvas.addEventListener('mouseup', (e) => {
    if (!EDIT_MODE || !isDraggingWall) return;
    if (e.button !== 0) return;

    const rect = canvas.getBoundingClientRect();
    const endX = e.clientX - rect.left + camera.x;
    const endY = e.clientY - rect.top + camera.y;
    
    const w = Math.abs(endX - dragStartX);
    const h = Math.abs(endY - dragStartY);
    const x = Math.min(endX, dragStartX);
    const y = Math.min(endY, dragStartY);
    
    if (w > 5 && h > 5) {
        WALLS.push({ x, y, w, h });
        console.log(`Muro agregado: { x: ${Math.round(x)}, y: ${Math.round(y)}, w: ${Math.round(w)}, h: ${Math.round(h)} }`);
    }
    isDraggingWall = false;
});

let lastTime = performance.now();
function gameLoop(time) {
    const dt = time - lastTime; lastTime = time;
    player.time = time;
    update(dt, time); draw();
    requestAnimationFrame(gameLoop);
}

function update(dt, time) {
    if (EDIT_MODE) return;

    let dx = 0, dy = 0;
    if (keys.up) { dy -= 1; player.facing = 'up'; }
    if (keys.down) { dy += 1; player.facing = 'down'; }
    if (keys.left) { dx -= 1; player.facing = 'left'; }
    if (keys.right) { dx += 1; player.facing = 'right'; }
    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
    player.isMoving = (dx !== 0 || dy !== 0);
    const timeSinceAttack = time - player.attackStartTime;
    
    // Movimiento: el input SIEMPRE se aplica, con el rebote SUMADO encima.
    // Así, aunque te rodeen y empujen, puedes empujar de vuelta y salir de la esquina.
    let moveX = player.bounceVx;
    let moveY = player.bounceVy;
    if (!(player.isAttacking && timeSinceAttack < 150)) {   // breve plante al iniciar el golpe
        moveX += dx * PLAYER_SPEED;
        moveY += dy * PLAYER_SPEED;
    }

    let newX = player.x + moveX;
    if (!checkWallCollision(newX, player.y)) player.x = newX;
    else player.bounceVx = 0;

    let newY = player.y + moveY;
    if (!checkWallCollision(player.x, newY)) player.y = newY;
    else player.bounceVy = 0;

    player.bounceVx *= 0.85;
    player.bounceVy *= 0.85;

    if (player.x < 0) { player.x = 0; player.bounceVx = Math.abs(player.bounceVx) * 0.5; }
    if (player.x > WORLD_WIDTH - PLAYER_SIZE) { player.x = WORLD_WIDTH - PLAYER_SIZE; player.bounceVx = -Math.abs(player.bounceVx) * 0.5; }
    if (player.y < 0) { player.y = 0; player.bounceVy = Math.abs(player.bounceVy) * 0.5; }
    if (player.y > WORLD_HEIGHT - PLAYER_SIZE) { player.y = WORLD_HEIGHT - PLAYER_SIZE; player.bounceVy = -Math.abs(player.bounceVy) * 0.5; }

    if (!player.onGround) {
        player.jumpVelocity += GRAVITY;
        player.jumpOffset += player.jumpVelocity;
        if (player.jumpOffset >= 0) { player.jumpOffset = 0; player.jumpVelocity = 0; player.onGround = true; player.isJumping = false; }
    }
    if (player.isAttacking && timeSinceAttack > 450) player.isAttacking = false;

    // --- Máquina de animación: cada estado avanza a su propia velocidad ---
    let animState = 'idle';
    if (player.isJumping)       animState = 'jump';
    else if (player.isAttacking) animState = 'attack';
    else if (player.isMoving)    animState = 'walk';

    if (animState !== player.animState) { player.animState = animState; player.animFrame = 0; player.animTimer = 0; }
    const ad = ANIM[animState];
    player.animTimer += dt;
    while (player.animTimer >= ad.dur) {
        player.animTimer -= ad.dur;
        if (ad.loop) player.animFrame = (player.animFrame + 1) % ad.frames;
        else if (player.animFrame < ad.frames - 1) player.animFrame++;
    }

    updateEnemies(dt, time);
    updateRats(dt, time);

    // Tope del empuje: por fuerte o numeroso que sea el grupo, no te manda volando
    const bmag = Math.hypot(player.bounceVx, player.bounceVy);
    if (bmag > MAX_BOUNCE) {
        player.bounceVx = player.bounceVx / bmag * MAX_BOUNCE;
        player.bounceVy = player.bounceVy / bmag * MAX_BOUNCE;
    }

    updateCamera();
}

function updateRats(dt, time) {
    rats.forEach(rat => {
        if (rat.isDead) {
            rat.animTimer += dt;
            if (rat.animTimer > 90) {
                if (rat.animFrame < RAT_CFG.death.frames - 1) rat.animFrame++;
                rat.animTimer = 0;
            }
            return;
        }

        if (ratWallCollision(rat.x, rat.y)) { rat.x = 1000; rat.y = 1200; }

        const rcx = rat.x + RAT_SIZE/2, rcy = rat.y + RAT_SIZE/2;
        const pcx = player.x + PLAYER_SIZE/2, pcy = player.y + PLAYER_SIZE - 10;  // pies del jugador (colisión real)
        const dx = pcx - rcx, dy = pcy - rcy;
        const dist = Math.hypot(dx, dy);

        const canSee = dist < RAT_SIGHT_RANGE && hasLineOfSight(rcx, rcy, pcx, pcy);

        if (canSee && dist > 0) {
            const mx = (dx/dist) * RAT_SPEED, my = (dy/dist) * RAT_SPEED;
            if (!ratWallCollision(rat.x + mx, rat.y)) rat.x += mx;
            if (!ratWallCollision(rat.x, rat.y + my)) rat.y += my;
            rat.state = 'run';
            rat.facing = dx < 0 ? 'left' : 'right';
        } else {
            rat.state = 'idle';
        }

        // Empuje a Fabiancho al contacto (igual filosofía que el esqueleto)
        const minDist = (RAT_HITBOX/2) + (PLAYER_SIZE * 0.25);
        if (dist < minDist && dist > 0 && canSee) {   // sin línea de visión (muro en medio) no empuja
            const a = Math.atan2(dy, dx);
            const damp = (player.isAttacking && (time - player.attackStartTime) < 350) ? ATTACK_PUSH_DAMP : 1;
            player.bounceVx += Math.cos(a) * RAT_PUSH_FORCE * 0.6 * damp;
            player.bounceVy += Math.sin(a) * RAT_PUSH_FORCE * 0.6 * damp;
            rat.x -= Math.cos(a) * 1.5;
            rat.y -= Math.sin(a) * 1.5;
        }

        rat.animTimer += dt;
        if (rat.animTimer > 90) { rat.animFrame++; rat.animTimer = 0; }
    });
}

function ratWallCollision(nx, ny) {
    const cx = nx + RAT_SIZE/2, cy = ny + RAT_SIZE/2, half = RAT_HITBOX/2;
    for (let wall of WALLS) {
        if (cx - half < wall.x + wall.w && cx + half > wall.x &&
            cy - half < wall.y + wall.h && cy + half > wall.y) return true;
    }
    return false;
}

function updateEnemies(dt, time) {
    enemies.forEach(enemy => {
        if (enemy.isDead) {
            enemy.deathTimer += dt;
            enemy.animTimer += dt;
            const config = SHEET_CONFIG.death;
            if (enemy.animTimer > 100) {
                if (enemy.animFrame < config.cols - 1) enemy.animFrame++;
                enemy.animTimer = 0;
            }
            return;
        }

        if (enemyWallCollision(enemy.x, enemy.y)) {
            enemy.x = 1200;
            enemy.y = 800;
        }

        const enemyCenterX = enemy.x + ENEMY_SIZE/2;
        const enemyCenterY = enemy.y + ENEMY_SIZE/2;
        const playerCenterX = player.x + PLAYER_SIZE/2;
        const playerCenterY = player.y + PLAYER_SIZE - 10;  // punto de colisión real (pies), no el centro del sprite

        const dx = playerCenterX - enemyCenterX;
        const dy = playerCenterY - enemyCenterY;
        const dist = Math.hypot(dx, dy);

        const canSee = dist < ENEMY_SIGHT_RANGE && hasLineOfSight(enemyCenterX, enemyCenterY, playerCenterX, playerCenterY);

        if (canSee && dist > 0) {
            let moveX = (dx / dist) * ENEMY_SPEED;
            let moveY = (dy / dist) * ENEMY_SPEED;

            let nextEnemyX = enemy.x + moveX;
            let nextEnemyY = enemy.y + moveY;
            
            if (!enemyWallCollision(nextEnemyX, enemy.y)) enemy.x = nextEnemyX;
            if (!enemyWallCollision(enemy.x, nextEnemyY)) enemy.y = nextEnemyY;
            
            enemy.state = 'walk';
            
            if (Math.abs(dx) > Math.abs(dy)) {
                enemy.facing = dx > 0 ? 'right' : 'left';
            } else {
                enemy.facing = dy > 0 ? 'down' : 'up';
            }
        } else {
            enemy.state = 'idle';
        }

        const minDistForPush = (ENEMY_HITBOX / 2) + (PLAYER_SIZE * 0.3);
        if (dist < minDistForPush && dist > 0 && canSee) {   // canSee incluye línea de visión: no empuja a través de muros
            const pushAngle = Math.atan2(dy, dx);
            const damp = (player.isAttacking && (time - player.attackStartTime) < 350) ? ATTACK_PUSH_DAMP : 1;
            const bounceForce = ENEMY_PUSH_FORCE * 0.6 * damp;
            player.bounceVx += Math.cos(pushAngle) * bounceForce;
            player.bounceVy += Math.sin(pushAngle) * bounceForce;
            enemy.x -= Math.cos(pushAngle) * 1.5;
            enemy.y -= Math.sin(pushAngle) * 1.5;
        }

        enemy.animTimer += dt;
        if (enemy.animTimer > 120) { enemy.animFrame++; enemy.animTimer = 0; }
    });

    for (let i = 0; i < enemies.length; i++) {
        if (enemies[i].isDead) continue;
        for (let j = i + 1; j < enemies.length; j++) {
            if (enemies[j].isDead) continue;
            
            const a = enemies[i];
            const b = enemies[j];
            
            const ax = a.x + ENEMY_SIZE/2;
            const ay = a.y + ENEMY_SIZE/2;
            const bx = b.x + ENEMY_SIZE/2;
            const by = b.y + ENEMY_SIZE/2;
            
            const separationRadius = ENEMY_HITBOX;
            
            const dx = bx - ax;
            const dy = by - ay;
            const dist = Math.hypot(dx, dy);
            
            if (dist < separationRadius && dist > 0) {
                const overlap = separationRadius - dist;
                const nx = dx / dist;
                const ny = dy / dist;
                
                a.x -= nx * overlap * 0.5;
                a.y -= ny * overlap * 0.5;
                b.x += nx * overlap * 0.5;
                b.y += ny * overlap * 0.5;
                
                if (enemyWallCollision(a.x, a.y)) {
                    a.x += nx * overlap * 0.5;
                    a.y += ny * overlap * 0.5;
                }
                if (enemyWallCollision(b.x, b.y)) {
                    b.x -= nx * overlap * 0.5;
                    b.y -= ny * overlap * 0.5;
                }
            }
        }
    }
}

function hasLineOfSight(x1, y1, x2, y2) {
    const steps = 50;
    const dx = (x2 - x1) / steps;
    const dy = (y2 - y1) / steps;
    
    for (let i = 1; i < steps; i++) {
        const px = x1 + dx * i;
        const py = y1 + dy * i;
        
        for (let wall of WALLS) {
            if (px > wall.x && px < wall.x + wall.w && py > wall.y && py < wall.y + wall.h) {
                return false;
            }
        }
    }
    return true;
}

function enemyWallCollision(nx, ny) {
    const hbSize = ENEMY_HITBOX;
    const centerX = nx + ENEMY_SIZE/2;
    const centerY = ny + ENEMY_SIZE/2;
    const half = hbSize / 2;
    
    for (let wall of WALLS) {
        if (centerX - half < wall.x + wall.w && 
            centerX + half > wall.x && 
            centerY - half < wall.y + wall.h && 
            centerY + half > wall.y) {
            return true;
        }
    }
    return false;
}

function checkAttackHit() {
    // Rango aumentado un 10% (118 -> 130)
    const attackRange = 130; 
    const attackWidth = PLAYER_SIZE * 0.8; 
    
    let attackX, attackY, attackW, attackH;
    
    if (player.facing === 'up') {
        attackX = player.x + (PLAYER_SIZE - attackWidth) / 2;
        attackY = player.y - attackRange;
        attackW = attackWidth;
        attackH = attackRange;
    } else if (player.facing === 'down') {
        attackX = player.x + (PLAYER_SIZE - attackWidth) / 2;
        attackY = player.y + PLAYER_SIZE;
        attackW = attackWidth;
        attackH = attackRange;
    } else if (player.facing === 'left') {
        attackX = player.x - attackRange;
        attackY = player.y + (PLAYER_SIZE - attackWidth) / 2;
        attackW = attackRange;
        attackH = attackWidth;
    } else {
        attackX = player.x + PLAYER_SIZE;
        attackY = player.y + (PLAYER_SIZE - attackWidth) / 2;
        attackW = attackRange;
        attackH = attackWidth;
    }

    if (DEBUG_FRAMES) {
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 4;
        ctx.strokeRect(attackX, attackY, attackW, attackH);
    }
    
    enemies.forEach(enemy => {
        if (enemy.isDead) return;
        const enemyCenterX = enemy.x + ENEMY_SIZE/2;
        const enemyCenterY = enemy.y + ENEMY_SIZE/2;
        const eh = ENEMY_HITBOX/2;
        // Golpe conecta con el CUERPO del enemigo (AABB), no solo su centro exacto
        if (enemyCenterX - eh < attackX + attackW && enemyCenterX + eh > attackX &&
            enemyCenterY - eh < attackY + attackH && enemyCenterY + eh > attackY) {

            enemy.isDead = true; enemy.deathTimer = 0; enemy.animFrame = 0;
            const angle = Math.atan2(enemyCenterY - (player.y + PLAYER_SIZE/2), enemyCenterX - (player.x + PLAYER_SIZE/2));
            enemy.vx = Math.cos(angle) * 30; enemy.vy = Math.sin(angle) * 30;
        }
    });

    // El golpe también mata ratas
    rats.forEach(rat => {
        if (rat.isDead) return;
        const rcx = rat.x + RAT_SIZE/2, rcy = rat.y + RAT_SIZE/2;
        const rh = RAT_HITBOX/2;
        if (rcx - rh < attackX + attackW && rcx + rh > attackX &&
            rcy - rh < attackY + attackH && rcy + rh > attackY) {
            rat.isDead = true; rat.deathTimer = 0; rat.animFrame = 0;
        }
    });
}

function checkWallCollision(nx, ny) {
    const hbX = nx + HITBOX_OFFSET_X;
    const hbY = ny + HITBOX_OFFSET_Y;
    for (let wall of WALLS) {
        if (hbX < wall.x + wall.w && hbX + HITBOX_RADIUS_X * 2 > wall.x && 
            hbY < wall.y + wall.h && hbY + HITBOX_RADIUS_Y * 2 > wall.y) return true;
    }
    return false;
}

function updateCamera() {
    const targetX = player.x + PLAYER_SIZE / 2 - VIEW_WIDTH / 2;
    const targetY = player.y + PLAYER_SIZE / 2 - VIEW_HEIGHT / 2;
    camera.x += (targetX - camera.x) * 0.1;
    camera.y += (targetY - camera.y) * 0.1;
    camera.x = Math.max(0, Math.min(WORLD_WIDTH - VIEW_WIDTH, camera.x));
    camera.y = Math.max(0, Math.min(WORLD_HEIGHT - VIEW_HEIGHT, camera.y));
}

function draw() {
    ctx.fillStyle = '#11151c'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    if (backgroundImg.complete && backgroundImg.naturalWidth > 0) {
        ctx.drawImage(backgroundImg, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    } else {
        ctx.fillStyle = '#1e242d'; 
        ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    }

    if (EDIT_MODE || DEBUG_FRAMES) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
        WALLS.forEach(wall => {
            ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 1;
            ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
        });
    }

    LEVELS.forEach(level => {
        const isUnlocked = UNLOCKED_LEVELS.includes(level.id) || level.id === 1;
        const floatY = Math.sin(player.time / 300 + level.id) * 5;
        const coinY = level.y + floatY;
        const coreColor = isUnlocked ? '#ffd700' : '#ff5a5a'; 
        
        if (draggingLevel === level) {
            ctx.shadowBlur = 40; ctx.shadowColor = '#00ffff';
            ctx.beginPath(); ctx.arc(level.x, level.y, 40, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0, 255, 255, 0.3)'; ctx.fill();
        }
        
        const mk = level.marker ? MARKERS[level.marker] : null;
        if (mk && mk.img.complete && mk.img.naturalWidth > 0) {
            // Sprite temático animado
            const fi = Math.floor(player.time / (1000 / mk.fps)) % mk.frames;
            const scale = mk.size / mk.fh;
            const dw = mk.fw * scale, dh = mk.size;
            ctx.save();
            if (!isUnlocked) ctx.globalAlpha = 0.45;   // bloqueado = atenuado
            ctx.shadowBlur = 18; ctx.shadowColor = coreColor;
            ctx.drawImage(mk.img, fi * mk.fw, 0, mk.fw, mk.fh, level.x - dw/2, coinY - dh/2, dw, dh);
            ctx.restore();
            ctx.shadowBlur = 0;
        } else {
            // Moneda (comportamiento original) para niveles sin sprite
            ctx.shadowBlur = 20; ctx.shadowColor = isUnlocked ? '#ffd700' : '#ff5a5a';
            ctx.beginPath(); ctx.arc(level.x, coinY, 30, 0, Math.PI * 2); ctx.fillStyle = coreColor; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke();
            ctx.shadowBlur = 0; ctx.fillStyle = '#111'; ctx.font = 'bold 32px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(level.id, level.x, coinY + 4);
        }
        ctx.fillStyle = isUnlocked ? '#ffd700' : '#ff5a5a'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(level.name, level.x, coinY - 45);
        const dist = Math.hypot(player.x + PLAYER_SIZE/2 - level.x, player.y + PLAYER_SIZE/2 - level.y);
        if (dist < 120 && !EDIT_MODE) { ctx.fillStyle = '#fff'; ctx.font = 'bold 22px monospace'; ctx.fillText("Presiona [E]", level.x, coinY + 50); }
    });

    enemies.forEach(enemy => {
        const shadowY = enemy.y + ENEMY_SIZE + ENEMY_SHADOW_OFFSET_Y;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        const shadowW = (ENEMY_SIZE / 4) * 0.55;
        const shadowH = (ENEMY_SIZE / 8) * 0.55;
        ctx.beginPath();
        ctx.ellipse(enemy.x + ENEMY_SIZE/2, shadowY, shadowW, shadowH, 0, 0, Math.PI * 2);
        ctx.fill();

        const sheetKey = enemy.isDead ? 'death' : (enemy.state === 'walk' ? 'walk' : 'idle');
        const sheet = enemySheets[sheetKey];
        const config = SHEET_CONFIG[sheetKey];

        if (!sheet.complete || sheet.naturalWidth === 0) return;

        const row = config.rows[enemy.facing] !== undefined ? config.rows[enemy.facing] : 0;
        const frameInAnim = Math.floor(enemy.animFrame) % config.cols;
        const sx = frameInAnim * FRAME_W;
        const sy = row * FRAME_H;

        ctx.drawImage(sheet, sx, sy, FRAME_W, FRAME_H, enemy.x, enemy.y, ENEMY_SIZE, ENEMY_SIZE);

        if (DEBUG_FRAMES) {
            ctx.strokeStyle = 'red'; ctx.lineWidth = 2;
            ctx.strokeRect(enemy.x, enemy.y, ENEMY_SIZE, ENEMY_SIZE);
        }
    });

    rats.forEach(rat => {
        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.ellipse(rat.x + RAT_SIZE/2, rat.y + RAT_SIZE + RAT_SHADOW_OFFSET_Y,
                    RAT_SIZE*0.22, RAT_SIZE*0.08, 0, 0, Math.PI*2);
        ctx.fill();

        const key = rat.isDead ? 'death' : (rat.state === 'run' ? 'run' : 'idle');
        const sheet = ratSheets[key];
        const cfg = RAT_CFG[key];
        if (!sheet.complete || sheet.naturalWidth === 0) return;

        const fi = Math.floor(rat.animFrame) % cfg.frames;
        const sx = (fi % cfg.cols) * RAT_FRAME;
        const sy = Math.floor(fi / cfg.cols) * RAT_FRAME;

        const drawFlipped = RAT_SHEET_FACES_LEFT ? (rat.facing === 'right') : (rat.facing === 'left');
        if (drawFlipped) {
            ctx.save();
            ctx.translate(rat.x + RAT_SIZE, rat.y); ctx.scale(-1, 1);
            ctx.drawImage(sheet, sx, sy, RAT_FRAME, RAT_FRAME, 0, 0, RAT_SIZE, RAT_SIZE);
            ctx.restore();
        } else {
            ctx.drawImage(sheet, sx, sy, RAT_FRAME, RAT_FRAME, rat.x, rat.y, RAT_SIZE, RAT_SIZE);
        }

        if (DEBUG_FRAMES) {
            ctx.strokeStyle = 'lime'; ctx.lineWidth = 2;
            const half = RAT_HITBOX/2;
            ctx.strokeRect(rat.x + RAT_SIZE/2 - half, rat.y + RAT_SIZE/2 - half, RAT_HITBOX, RAT_HITBOX);
        }
    });

    const shadowY = player.y + PLAYER_SIZE - 10;
    const heightFromGround = -player.jumpOffset;
    const shadowScale = Math.max(0.3, 1 - (heightFromGround / 400)); 
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    const shadowW = (PLAYER_SIZE / 3) * 0.55 * shadowScale;
    const shadowH = (PLAYER_SIZE / 6) * 0.55 * shadowScale;
    ctx.beginPath(); ctx.ellipse(player.x + PLAYER_SIZE/2, shadowY, shadowW, shadowH, 0, 0, Math.PI * 2); ctx.fill();

    const st = player.animState || 'idle';
    const currentSpriteList = sprites[st] || sprites.idle;
    const frameIndex = player.animFrame % (ANIM[st] ? ANIM[st].frames : 4);
    const img = currentSpriteList[frameIndex] || sprites.idle[0];
    const drawY = player.y + player.jumpOffset;
    if (player.facing === 'left') {
        ctx.save(); ctx.translate(player.x + PLAYER_SIZE, drawY); ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, PLAYER_SIZE, PLAYER_SIZE); ctx.restore();
    } else {
        ctx.drawImage(img, player.x, drawY, PLAYER_SIZE, PLAYER_SIZE);
    }

    // DEBUG: hitbox real de los pies de Fabiancho (tecla 0)
    if (DEBUG_FRAMES) {
        ctx.strokeStyle = 'cyan'; ctx.lineWidth = 3;
        ctx.strokeRect(player.x + HITBOX_OFFSET_X, player.y + HITBOX_OFFSET_Y,
                       HITBOX_RADIUS_X * 2, HITBOX_RADIUS_Y * 2);
    }

    if (EDIT_MODE) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(camera.x + 10, camera.y + 10, 700, 130);
        ctx.fillStyle = '#fff';
        ctx.font = '20px monospace';
        ctx.textAlign = 'left';
        ctx.fillText("MODO EDICIÓN ACTIVO", camera.x + 20, camera.y + 40);
        ctx.font = '16px monospace';
        ctx.fillText("• Clic Izq. y arrastrar: Dibujar muro.", camera.x + 20, camera.y + 65);
        ctx.fillText("• Clic Der. sobre muro: Eliminarlo.", camera.x + 20, camera.y + 85);
        ctx.fillText("• Pasa el mouse sobre una moneda y presiona [E] para moverla. Clic Izq. para soltar.", camera.x + 20, camera.y + 105);
        ctx.fillText("• Presiona [C] para exportar muros y niveles.", camera.x + 20, camera.y + 125);
    }

    ctx.restore();
}

requestAnimationFrame(gameLoop);
