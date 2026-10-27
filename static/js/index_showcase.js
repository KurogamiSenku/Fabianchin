const canvas = document.getElementById('indexCanvas');
if (canvas) {
    const ctx = canvas.getContext('2d');
    const PLAYER_SIZE = 300; // 450% más grande
    const PLAYER_SPEED = 3;
    const JUMP_FORCE = -12;
    const GRAVITY = 0.6;
    const GROUND_Y = canvas.height - PLAYER_SIZE - 10;

    const sprites = { idle: [], walk: [], attack: [], jump: [] };
    function loadImg(src) { const img = new Image(); img.src = src; return img; }

    for(let i=1; i<=4; i++) sprites.idle.push(loadImg(`/static/img/skeli_fixed/idle/idle${i}.png`));
    for(let i=1; i<=6; i++) sprites.walk.push(loadImg(`/static/img/skeli_fixed/walk/walk${i}.png`));
    for(let i=1; i<=4; i++) sprites.attack.push(loadImg(`/static/img/skeli_fixed/attack/attack${i}.png`));
    for(let i=1; i<=4; i++) sprites.jump.push(loadImg(`/static/img/skeli_fixed/jump/jump${i}.png`));

    const player = {
        x: canvas.width / 2 - PLAYER_SIZE / 2, y: GROUND_Y,
        vx: 0, vy: 0,
        facing: 'down',
        isMoving: false,
        isAttacking: false,
        isJumping: false,
        onGround: true,
        lastAttack: 0,
        animFrame: 0, animTimer: 0
    };

    const keys = { up: false, down: false, left: false, right: false };

    window.addEventListener('keydown', (e) => {
        if(e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.up = true;
        if(e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.down = true;
        if(e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.left = true;
        if(e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.right = true;
        
        if(e.key === ' ') {
            e.preventDefault();
            if (player.onGround && !keys.down) {   // no saltar mientras está agachado
                player.vy = JUMP_FORCE;
                player.onGround = false;
                player.isJumping = true;
            }
        }
        
        if(e.key === 'f' || e.key === 'F') {
            if (performance.now() - player.lastAttack > 400) {
                player.isAttacking = true;
                player.lastAttack = performance.now();
                player.animFrame = 0;
            }
        }
    });
    window.addEventListener('keyup', (e) => {
        if(e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.up = false;
        if(e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.down = false;
        if(e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.left = false;
        if(e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.right = false;
    });

    function update() {
        let dx = 0, dy = 0;
        if (keys.left) { dx -= 1; player.facing = 'left'; }
        if (keys.right) { dx += 1; player.facing = 'right'; }
        // En el showcase (lateral) solo importa izquierda/derecha; no tocamos
        // facing con up/down para que al agacharse conserve hacia dónde mira.

        // Agacharse: mantener S / ↓ estando en el suelo. No camina mientras está agachado.
        player.isCrouching = keys.down && player.onGround;
        if (player.isCrouching) dx = 0;

        player.vx = dx * PLAYER_SPEED;
        player.isMoving = (dx !== 0);

        player.x += player.vx;
        if (player.x < 10) player.x = 10;
        if (player.x > canvas.width - PLAYER_SIZE - 10) player.x = canvas.width - PLAYER_SIZE - 10;

        if (!player.onGround) {
            player.vy += GRAVITY;
            player.y += player.vy;
            if (player.y >= GROUND_Y) {
                player.y = GROUND_Y;
                player.vy = 0;
                player.onGround = true;
                player.isJumping = false;
            }
        }

        if (player.isAttacking && performance.now() - player.lastAttack > 400) {
            player.isAttacking = false;
        }

        player.animTimer += 16;
        if (player.animTimer > 120) { player.animFrame++; player.animTimer = 0; }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let currentSpriteList = sprites.idle;
        let frameIndex = 0;
        
        if (player.isJumping) {
            currentSpriteList = sprites.jump;
            frameIndex = Math.floor(player.animFrame / 3) % 4;
        } else if (player.isAttacking) {
            currentSpriteList = sprites.attack;
            frameIndex = Math.floor(player.animFrame) % 4;
        } else if (player.isCrouching) {
            currentSpriteList = sprites.jump;   // jump4 = pose de agacharse
            frameIndex = 3;
        } else if (player.isMoving) {
            currentSpriteList = sprites.walk;
            frameIndex = Math.floor(player.animFrame) % 6;
        } else {
            currentSpriteList = sprites.idle;
            frameIndex = Math.floor(player.animFrame) % 4;
        }
        
        const img = currentSpriteList[frameIndex] || sprites.idle[0];
        
        // Sombra (misma configuración que pediste)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        const shadowWidth = (PLAYER_SIZE / 3) * 0.55;
        const shadowHeight = (PLAYER_SIZE / 6) * 0.55;
        ctx.beginPath();
        ctx.ellipse(player.x + PLAYER_SIZE/2, GROUND_Y + PLAYER_SIZE - 5, shadowWidth, shadowHeight, 0, 0, Math.PI * 2);
        ctx.fill();

        if (player.facing === 'left') {
            ctx.save();
            ctx.translate(player.x + PLAYER_SIZE, player.y);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, PLAYER_SIZE, PLAYER_SIZE);
            ctx.restore();
        } else {
            ctx.drawImage(img, player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
        }
    }

    setInterval(() => { update(); draw(); }, 1000/60);
}
