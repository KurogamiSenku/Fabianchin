const stick = document.getElementById('joystick-stick');
const ball = document.getElementById('joystick-ball');
const jumpVisual = document.getElementById('btn-jump-visual');
const hitVisual = document.getElementById('btn-atk-visual'); // Ahora es el botón de ataque

const TILT = 22;
const DIRS = { up: false, down: false, left: false, right: false };

function setJoystick(dx, dy) {
    if (!stick || !ball) return;
    stick.style.transform = `rotate(${dx * TILT}deg)`;
    ball.style.transform = `translate(${dx * 14}px, ${dy * 14}px)`;
}

function updateFromKeys() {
    let dx = 0, dy = 0;
    if (DIRS.left) dx -= 1;
    if (DIRS.right) dx += 1;
    if (DIRS.up) dy -= 1;
    if (DIRS.down) dy += 1;
    setJoystick(dx, dy);
}

const KEY_DIR = {
    'ArrowUp': 'up',    'w': 'up',    'W': 'up',
    'ArrowDown': 'down','s': 'down',  'S': 'down',
    'ArrowLeft': 'left','a': 'left',  'A': 'left',
    'ArrowRight': 'right','d': 'right','D': 'right',
};

window.addEventListener('keydown', (e) => {
    const dir = KEY_DIR[e.key];
    if (dir) { DIRS[dir] = true; e.preventDefault(); }
    if (e.key === ' ') { jumpVisual?.classList.add('pressed'); e.preventDefault(); }
    if (e.key === 'f' || e.key === 'F') { hitVisual?.classList.add('pressed'); } // F para Golpe
    updateFromKeys();
});

window.addEventListener('keyup', (e) => {
    const dir = KEY_DIR[e.key];
    if (dir) { DIRS[dir] = false; }
    if (e.key === ' ') { jumpVisual?.classList.remove('pressed'); }
    if (e.key === 'f' || e.key === 'F') { hitVisual?.classList.remove('pressed'); } // F para Golpe
    updateFromKeys();
});

window.addEventListener('blur', () => {
    DIRS.up = DIRS.down = DIRS.left = DIRS.right = false;
    jumpVisual?.classList.remove('pressed');
    hitVisual?.classList.remove('pressed');
    updateFromKeys();
});
