(() => {
  const canvas = document.getElementById('arena');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const WORLD_H = 1870;
  const GRAVITY = 0.58;
  const JUMP_SPEED = -14.2;
  const PLAYER_W = 34;
  const PLAYER_H = 48;
  const PLAYER_SPEED = 3.7;
  const TERMINAL = { x: 382, y: 112, w: 70, h: 58 };

  const platforms = [
    { x: 0, y: 1770, w: W, h: 100, checkpoint: true },
    { x: 70, y: 1625, w: 200, h: 18 },
    { x: 225, y: 1480, w: 210, h: 18 },
    { x: 400, y: 1335, w: 190, h: 18 },
    { x: 300, y: 1190, w: 190, h: 18, checkpoint: true },
    { x: 400, y: 1045, w: 190, h: 18 },
    { x: 550, y: 900, w: 170, h: 18 },
    { x: 500, y: 755, w: 180, h: 18, checkpoint: true },
    { x: 390, y: 610, w: 190, h: 18 },
    { x: 250, y: 465, w: 190, h: 18 },
    { x: 320, y: 320, w: 190, h: 18 },
    { x: 320, y: 170, w: 220, h: 22, checkpoint: true }
  ];
  const spikes = [
    { x: 380, y: 1462, w: 48, h: 18 },
    { x: 425, y: 1172, w: 50, h: 18 },
    { x: 640, y: 882, w: 52, h: 18 },
    { x: 500, y: 592, w: 48, h: 18 },
    { x: 430, y: 302, w: 54, h: 18 }
  ];
  const enemyDefs = [
    { x: 290, y: 1430, min: 285, max: 330 },
    { x: 480, y: 1285, min: 460, max: 530 },
    { x: 500, y: 995, min: 470, max: 540 },
    { x: 580, y: 705, min: 560, max: 630 },
    { x: 270, y: 415, min: 260, max: 385 }
  ];
  const megaman = new Image();
  megaman.src = '/static/img/markers/megaman_walk.png';

  const player = {
    x: 108, y: 1770 - PLAYER_H, vx: 0, vy: 0, facing: 1, grounded: false,
    lives: 3, invulnerable: 900, shotCooldown: 0, animTime: 0,
    checkpoint: { x: 108, y: 1770 - PLAYER_H }
  };
  let enemies = [];
  let playerShots = [];
  let enemyShots = [];
  let cameraY = WORLD_H - H;
  let terminalOpen = false;
  let gameOver = false;
  let message = '';
  let messageTime = 0;
  const keys = { left: false, right: false, jump: false, fire: false };
  let jumpQueued = false;

  function resetEnemies() {
    enemies = enemyDefs.map((enemy, index) => ({
      ...enemy, homeX: enemy.x, dir: index % 2 ? -1 : 1,
      fire: 1300 + index * 450, warn: false, alive: true
    }));
    playerShots = [];
    enemyShots = [];
  }
  resetEnemies();

  function typingInField(target) {
    return target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
  }

  const clueNotebook = window.createClueNotebook({
    title: 'BITÁCORA · LABORATORIO WILY',
    intro: 'Las notas del ascenso y del visor se guardan aquí.',
    lockedText: 'Continúa explorando el laboratorio para recuperar esta pista.',
    isBlocked: () => terminalOpen,
    onToggle: open => {
      if (open) keys.left = keys.right = keys.jump = keys.fire = false;
    },
    clues: [
      {
        id: 'checkpoints', icon: '🪜', title: 'Ruta de ascenso',
        body: 'Las plataformas azules marcan la subida. Los puntos de control guardan tu avance.',
        source: 'Activaste un punto de control',
      },
      {
        id: 'readme', icon: '📄', title: 'Registro público',
        body: 'El visor empieza en una carpeta pública. README.txt describe dónde buscar los planos.',
        source: 'Leíste README.txt',
      },
      {
        id: 'paths', icon: '🔐', title: 'Fuera del directorio',
        body: 'El registro indica que los planos están fuera de la carpeta pública. Comprueba cómo el visor resuelve rutas relativas.',
        source: 'Exploraste las rutas del visor',
      },
    ],
  });

  window.registerSecretAccessCode(openTerminal, () =>
    terminalOpen || gameOver || clueNotebook.isOpen()
  );

  function setKeys(event, pressed) {
    if (typingInField(event.target)) return;
    if (clueNotebook.isOpen()) return;
    const key = event.key.toLowerCase();
    if (['a', 'arrowleft'].includes(key)) keys.left = pressed;
    if (['d', 'arrowright'].includes(key)) keys.right = pressed;
    if (['w', 'arrowup', ' '].includes(key)) {
      if (pressed && !keys.jump) jumpQueued = true;
      keys.jump = pressed;
      if (pressed) event.preventDefault();
    }
    if (['j', 'f'].includes(key)) keys.fire = pressed;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') event.preventDefault();
    if (event.key === 'Escape' && terminalOpen) closeTerminal();
    if (gameOver && pressed && key === 'r') restartGame();
    if (!terminalOpen && !gameOver && pressed && key === 'e' && nearTerminal()) openTerminal();
  }
  window.addEventListener('keydown', event => setKeys(event, true));
  window.addEventListener('keyup', event => setKeys(event, false));
  window.addEventListener('blur', () => {
    keys.left = keys.right = keys.jump = keys.fire = false;
    jumpQueued = false;
  });

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function nearTerminal() {
    return Math.abs((player.x + PLAYER_W / 2) - (TERMINAL.x + TERMINAL.w / 2)) < 86 &&
      Math.abs((player.y + PLAYER_H / 2) - (TERMINAL.y + TERMINAL.h / 2)) < 100;
  }
  function showMessage(text) {
    message = text;
    messageTime = 1900;
  }
  function updateCamera() {
    const target = player.y + PLAYER_H / 2 - H * 0.56;
    cameraY = Math.max(0, Math.min(WORLD_H - H, target));
  }
  function openTerminal() {
    terminalOpen = true;
    keys.left = keys.right = keys.jump = keys.fire = false;
    clueNotebook.unlock('paths');
    document.getElementById('terminal-overlay').classList.add('show');
    document.getElementById('file-path').focus();
  }
  function closeTerminal() {
    terminalOpen = false;
    document.getElementById('terminal-overlay').classList.remove('show');
    canvas.focus();
  }

  function damage(reason) {
    if (player.invulnerable > 0 || gameOver) return;
    player.lives -= 1;
    player.invulnerable = 1200;
    if (player.lives <= 0) {
      player.lives = 0;
      gameOver = true;
      showMessage('SISTEMA DAÑADO');
      return;
    }
    player.x = player.checkpoint.x;
    player.y = player.checkpoint.y;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    enemyShots = [];
    showMessage(`${reason} · VIDAS: ${player.lives}`);
  }

  function restartGame() {
    player.lives = 3;
    player.checkpoint = { x: 108, y: 1770 - PLAYER_H };
    player.x = player.checkpoint.x;
    player.y = player.checkpoint.y;
    player.vx = player.vy = 0;
    player.invulnerable = 1200;
    gameOver = false;
    cameraY = WORLD_H - H;
    resetEnemies();
  }

  function firePlayerShot() {
    if (player.shotCooldown > 0) return;
    player.shotCooldown = 210;
    playerShots.push({
      x: player.x + (player.facing > 0 ? PLAYER_W : -8),
      y: player.y + 21, vx: player.facing * 8, ttl: 1100
    });
  }

  function updatePlayer(dt) {
    if (terminalOpen || gameOver || clueNotebook.isOpen()) return;
    const step = dt / 16.67;
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.shotCooldown = Math.max(0, player.shotCooldown - dt);
    player.animTime += dt;
    if (keys.fire) firePlayerShot();

    player.vx = (keys.right ? PLAYER_SPEED : 0) - (keys.left ? PLAYER_SPEED : 0);
    if (player.vx) player.facing = Math.sign(player.vx);
    player.x = Math.max(8, Math.min(W - PLAYER_W - 8, player.x + player.vx * step));

    if (jumpQueued && player.grounded) {
      player.vy = JUMP_SPEED;
      player.grounded = false;
    }
    jumpQueued = false;
    const previousBottom = player.y + PLAYER_H;
    player.vy = Math.min(13, player.vy + GRAVITY * step);
    player.y += player.vy * step;
    player.grounded = false;
    if (player.vy >= 0) {
      for (const platform of platforms) {
        const horizontalOverlap = player.x + PLAYER_W > platform.x && player.x < platform.x + platform.w;
        const bottom = player.y + PLAYER_H;
        if (horizontalOverlap && previousBottom <= platform.y && bottom >= platform.y) {
          player.y = platform.y - PLAYER_H;
          player.vy = 0;
          player.grounded = true;
          if (platform.checkpoint) {
            player.checkpoint = {
              x: platform.x + 14,
              y: platform.y - PLAYER_H
            };
            clueNotebook.unlock('checkpoints');
          }
          break;
        }
      }
    }

    const playerBox = { x: player.x + 5, y: player.y + 5, w: PLAYER_W - 10, h: PLAYER_H - 8 };
    for (const spike of spikes) {
      if (overlap(playerBox, spike)) {
        damage('TRAMPA');
        break;
      }
    }
    if (player.y > WORLD_H + 60) damage('CAÍDA');
    if (messageTime > 0) messageTime -= dt;
  }

  function updateCombat(dt) {
    if (terminalOpen || gameOver || clueNotebook.isOpen()) return;
    const step = dt / 16.67;
    const playerCenter = { x: player.x + PLAYER_W / 2, y: player.y + PLAYER_H / 2 };
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      enemy.x += enemy.dir * 0.65 * step;
      if (enemy.x < enemy.min || enemy.x > enemy.max) enemy.dir *= -1;
      enemy.fire -= dt;
      enemy.warn = enemy.fire < 550;
      if (enemy.fire <= 0) {
        const ex = enemy.x + 21, ey = enemy.y + 21;
        const dx = playerCenter.x - ex, dy = playerCenter.y - ey;
        const distance = Math.hypot(dx, dy) || 1;
        if (Math.abs(dx) < 510 && Math.abs(dy) < 430) {
          const speed = 1.45;
          enemyShots.push({ x: ex, y: ey, vx: dx / distance * speed, vy: dy / distance * speed, r: 11, ttl: 5200 });
        }
        enemy.fire = 2700 + Math.random() * 900;
      }
      const enemyBox = { x: enemy.x, y: enemy.y, w: 42, h: 42 };
      if (overlap(playerBoxForContact(), enemyBox)) damage('ROBOT');
    }

    for (const shot of playerShots) {
      shot.x += shot.vx * step;
      shot.ttl -= dt;
      for (const enemy of enemies) {
        if (enemy.alive && shot.x > enemy.x - 4 && shot.x < enemy.x + 46 &&
            shot.y > enemy.y - 5 && shot.y < enemy.y + 46) {
          enemy.alive = false;
          shot.ttl = 0;
          showMessage('ROBOT DESACTIVADO');
          break;
        }
      }
    }
    playerShots = playerShots.filter(shot => shot.ttl > 0 && shot.x > -20 && shot.x < W + 20);

    for (const shot of enemyShots) {
      shot.x += shot.vx * step;
      shot.y += shot.vy * step;
      shot.ttl -= dt;
      const dx = playerCenter.x - shot.x, dy = playerCenter.y - shot.y;
      if (dx * dx + dy * dy < (shot.r + 15) * (shot.r + 15)) {
        damage('DISPARO');
        shot.ttl = 0;
      }
    }
    enemyShots = enemyShots.filter(shot => shot.ttl > 0 && shot.y > cameraY - 40 && shot.y < cameraY + H + 40);
  }
  function playerBoxForContact() {
    return { x: player.x + 5, y: player.y + 5, w: PLAYER_W - 10, h: PLAYER_H - 8 };
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, '#07182e');
    gradient.addColorStop(1, '#101e37');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
    for (let y = -((cameraY * 0.28) % 70); y < H; y += 70) {
      ctx.strokeStyle = 'rgba(58,126,185,.13)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    for (let x = 20; x < W; x += 80) {
      ctx.fillStyle = 'rgba(42,157,244,.11)';
      ctx.fillRect(x, 0, 2, H);
    }
    for (let index = 0; index < 8; index++) {
      const y = ((index * 257 - cameraY * 0.42) % (H + 80) + H + 80) % (H + 80) - 40;
      ctx.fillStyle = index % 2 ? '#0c2e4a' : '#102541';
      ctx.fillRect(index % 2 ? 0 : W - 30, y, 30, 78);
      ctx.fillStyle = '#31a9ec';
      ctx.fillRect(index % 2 ? 12 : W - 18, y + 13, 5, 28);
    }
  }
  function worldRect(x, y, w, h, color) {
    const screenY = y - cameraY;
    if (screenY > H || screenY + h < 0) return;
    ctx.fillStyle = color;
    ctx.fillRect(x, screenY, w, h);
  }
  function drawPlatform(platform) {
    const y = platform.y - cameraY;
    if (y < -30 || y > H + 30) return;
    ctx.fillStyle = '#152c48';
    ctx.fillRect(platform.x, y, platform.w, platform.h);
    ctx.fillStyle = '#2979b8';
    ctx.fillRect(platform.x, y, platform.w, 5);
    ctx.fillStyle = '#5ac8ff';
    for (let x = platform.x + 10; x < platform.x + platform.w; x += 36) {
      ctx.fillRect(x, y + 8, 14, 3);
    }
    ctx.strokeStyle = 'rgba(6,10,20,.8)';
    ctx.strokeRect(platform.x + .5, y + .5, platform.w - 1, platform.h - 1);
  }
  function drawSpike(spike) {
    const y = spike.y - cameraY;
    if (y < -25 || y > H + 25) return;
    ctx.fillStyle = '#fd526b';
    ctx.beginPath();
    for (let x = spike.x; x < spike.x + spike.w; x += 12) {
      ctx.moveTo(x, y + spike.h);
      ctx.lineTo(x + 6, y);
      ctx.lineTo(x + 12, y + spike.h);
    }
    ctx.fill();
    ctx.fillStyle = '#731d40';
    ctx.fillRect(spike.x, y + spike.h - 2, spike.w, 4);
  }
  function drawTerminal() {
    const y = TERMINAL.y - cameraY;
    if (y < -90 || y > H + 20) return;
    ctx.fillStyle = '#1b3450';
    ctx.fillRect(TERMINAL.x, y + 12, TERMINAL.w, TERMINAL.h);
    ctx.fillStyle = '#62cbff';
    ctx.fillRect(TERMINAL.x + 8, y + 20, TERMINAL.w - 16, 25);
    ctx.fillStyle = '#09213a';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('WILY', TERMINAL.x + TERMINAL.w / 2, y + 37);
    ctx.fillStyle = '#a4e7ff';
    ctx.fillText(nearTerminal() ? '[E] USAR' : 'TERMINAL', TERMINAL.x + TERMINAL.w / 2, y + 4);
  }
  function drawEnemy(enemy) {
    if (!enemy.alive) return;
    const y = enemy.y - cameraY;
    if (y < -60 || y > H + 20) return;
    ctx.save();
    ctx.shadowBlur = enemy.warn ? 15 : 5;
    ctx.shadowColor = enemy.warn ? '#ff596f' : '#42bfff';
    ctx.fillStyle = '#35688f';
    ctx.fillRect(enemy.x + 5, y + 7, 32, 29);
    ctx.fillStyle = '#80d8ff';
    ctx.fillRect(enemy.x + 10, y + 2, 22, 9);
    ctx.fillStyle = enemy.warn ? '#ff435e' : '#ffb84a';
    ctx.fillRect(enemy.dir > 0 ? enemy.x + 29 : enemy.x + 8, y + 17, 7, 7);
    ctx.fillStyle = '#162c46';
    ctx.fillRect(enemy.x, y + 35, 42, 7);
    ctx.restore();
  }
  function drawPlayer() {
    const y = player.y - cameraY;
    const blinking = player.invulnerable > 0 && Math.floor(player.invulnerable / 90) % 2 === 0;
    if (blinking) return;
    const frame = player.vx === 0 ? 1 : Math.floor(player.animTime / 100) % 3;
    if (megaman.complete && megaman.naturalWidth) {
      ctx.save();
      if (player.facing < 0) {
        ctx.translate(player.x + PLAYER_W, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(megaman, frame * 25, 0, 25, 28, 0, y, PLAYER_W, PLAYER_H);
      } else {
        ctx.drawImage(megaman, frame * 25, 0, 25, 28, player.x, y, PLAYER_W, PLAYER_H);
      }
      ctx.restore();
    } else {
      ctx.fillStyle = '#1688dc';
      ctx.fillRect(player.x + 5, y + 5, PLAYER_W - 10, PLAYER_H - 5);
      ctx.fillStyle = '#9ee5ff';
      ctx.fillRect(player.x + 7, y + 5, PLAYER_W - 14, 11);
    }
    if (keys.fire && player.shotCooldown > 100) {
      ctx.fillStyle = '#b9f4ff';
      ctx.fillRect(player.x + (player.facing > 0 ? PLAYER_W : -10), y + 18, 12, 8);
    }
  }
  function drawShots() {
    for (const shot of playerShots) {
      ctx.fillStyle = '#bff8ff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#3dcaff';
      ctx.fillRect(shot.x - 6, shot.y - cameraY - 2, 13, 4);
    }
    ctx.shadowBlur = 0;
    for (const shot of enemyShots) {
      const y = shot.y - cameraY;
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ff4f69';
      ctx.fillStyle = '#ff9e59';
      ctx.beginPath();
      ctx.arc(shot.x, y, shot.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe4a8';
      ctx.beginPath();
      ctx.arc(shot.x - 3, y - 3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  function drawHud() {
    ctx.fillStyle = 'rgba(2,8,18,.78)';
    ctx.fillRect(10, 10, W - 20, 42);
    ctx.strokeStyle = '#2a9df4';
    ctx.strokeRect(10.5, 10.5, W - 21, 41);
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#a9dcff';
    ctx.fillText('NIVEL 3 · LABORATORIO WILY', 22, 31);
    ctx.fillStyle = '#ff697c';
    ctx.fillText(`VIDAS ${'♥ '.repeat(player.lives)}`, 320, 31);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#9fc8e8';
    ctx.fillText('A/D MOVER · W SALTAR · J DISPARAR', W - 20, 31);
    if (messageTime > 0 && message) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#ffe4a8';
      ctx.fillText(message, W / 2, 73);
    }
  }
  function draw() {
    drawBackground();
    for (const platform of platforms) drawPlatform(platform);
    for (const spike of spikes) drawSpike(spike);
    drawTerminal();
    for (const enemy of enemies) drawEnemy(enemy);
    drawShots();
    drawPlayer();
    drawHud();
    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,.78)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff6578';
      ctx.font = 'bold 30px monospace';
      ctx.fillText('GAME OVER', W / 2, H / 2 - 18);
      ctx.fillStyle = '#e2efff';
      ctx.font = '16px monospace';
      ctx.fillText('Pulsa R para reintentar', W / 2, H / 2 + 20);
    }
  }

  async function readFile() {
    const output = document.getElementById('file-output');
    const form = new URLSearchParams({ path: document.getElementById('file-path').value });
    const response = await fetch('/level/megaman/read', { method: 'POST', body: form });
    const result = await response.json();
    output.textContent = result.ok ? `${result.path}\n\n${result.content}` : result.message;
    output.style.color = result.ok ? '#a6f0ca' : '#ff9a9a';
    if (result.ok && result.path.endsWith('/README.txt')) clueNotebook.unlock('readme');
    if (result.ok && result.path === '/opt/wily/secure/flag.txt') clueNotebook.unlock('paths');
  }
  async function submitFlag() {
    const messageEl = document.getElementById('terminal-message');
    const form = new URLSearchParams({ flag: document.getElementById('flag-input').value.trim() });
    const response = await fetch('/level/megaman/submit', { method: 'POST', body: form });
    const result = await response.json();
    messageEl.textContent = result.message;
    messageEl.className = result.ok ? 'ok' : 'error';
    if (result.ok) showMessage('LABORATORIO SUPERADO');
  }
  document.getElementById('read-file').addEventListener('click', () => {
    readFile().catch(() => {
      document.getElementById('file-output').textContent = 'No se pudo contactar con el visor.';
    });
  });
  document.getElementById('submit-flag').addEventListener('click', () => {
    submitFlag().catch(() => {
      const messageEl = document.getElementById('terminal-message');
      messageEl.textContent = 'No se pudo enviar la flag.';
      messageEl.className = 'error';
    });
  });
  document.getElementById('file-path').addEventListener('keydown', event => {
    if (event.key === 'Enter') document.getElementById('read-file').click();
  });
  document.getElementById('flag-input').addEventListener('keydown', event => {
    if (event.key === 'Enter') document.getElementById('submit-flag').click();
  });
  document.getElementById('close-terminal').addEventListener('click', closeTerminal);

  let previousTime = performance.now();
  function frame(now) {
    const dt = Math.min(50, now - previousTime);
    previousTime = now;
    updatePlayer(dt);
    updateCamera();
    updateCombat(dt);
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
