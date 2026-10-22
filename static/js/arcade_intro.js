const stick = document.getElementById('joystick-stick');
const ball = document.getElementById('joystick-ball');
const jumpVisual = document.getElementById('btn-jump-visual');
const hitVisual = document.getElementById('btn-hit-visual');
const exitBtn = document.getElementById('btn-exit');

const TILT = 22;

function setJoystick(dx, dy) {
    stick.style.transform = `rotate(${dx * TILT}deg)`;
    ball.style.transform = `translate(${dx * 14}px, ${dy * 14}px)`;
}

const DIRS = { up: false, down: false, left: false, right: false };

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
    if (dir) {
        DIRS[dir] = true;
        e.preventDefault();
    }
    if (e.key === ' ') {
        jumpVisual.classList.add('pressed');
        e.preventDefault();
    }
    if (e.key === 'j' || e.key === 'J') {
        hitVisual.classList.add('pressed');
    }
    updateFromKeys();
});

window.addEventListener('keyup', (e) => {
    const dir = KEY_DIR[e.key];
    if (dir) {
        DIRS[dir] = false;
    }
    if (e.key === ' ') {
        jumpVisual.classList.remove('pressed');
    }
    if (e.key === 'j' || e.key === 'J') {
        hitVisual.classList.remove('pressed');
    }
    updateFromKeys();
});

window.addEventListener('blur', () => {
    DIRS.up = DIRS.down = DIRS.left = DIRS.right = false;
    jumpVisual.classList.remove('pressed');
    hitVisual.classList.remove('pressed');
    updateFromKeys();
});

jumpVisual.addEventListener('mousedown', () => jumpVisual.classList.add('pressed'));
jumpVisual.addEventListener('mouseup',   () => jumpVisual.classList.remove('pressed'));
jumpVisual.addEventListener('mouseleave',() => jumpVisual.classList.remove('pressed'));
hitVisual.addEventListener('mousedown',  () => hitVisual.classList.add('pressed'));
hitVisual.addEventListener('mouseup',    () => hitVisual.classList.remove('pressed'));
hitVisual.addEventListener('mouseleave', () => hitVisual.classList.remove('pressed'));

exitBtn.addEventListener('click', async () => {
    if (!confirm('¿Apagar el servidor del CTF?')) return;
    try {
        await fetch('/shutdown', { method: 'POST' });
    } catch (e) {}
    document.body.innerHTML = '<div style="color:#58a6ff; text-align:center; margin-top:40vh; font-family:monospace;">Servidor apagado. Puedes cerrar esta pestaña.</div>';
});
