const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

ctx.imageSmoothingEnabled = false;

function loadFrames(folder, count) {

    const frames = [];

    for (let i = 1; i <= count; i++) {

        const img = new Image();
        img.src = `/static/img/skeli_fixed/${folder}/${folder}${i}.png`;

        console.log("Cargando:", img.src);

        frames.push(img);
    }

    return frames;
}

const animations = {
    idle: loadFrames("idle", 4),
    walk: loadFrames("walk", 6),
    jump: loadFrames("jump", 4),
    attack: loadFrames("attack", 4)
};

const player = {
    x: 350,
    y: 450,

    width: 110,
    height: 170,

    speed: 5,

    state: "idle",

    frame: 0,

    facing: 1,

    jumping: false,
    attacking: false,

    velocityY: 0
};

const FLOOR_Y = 450;
const GRAVITY = 0.8;
const JUMP_FORCE = -14;

const keys = {};

document.addEventListener("keydown", (e) => {

    keys[e.key] = true;

    if (e.code === "Space" && !player.jumping) {

        player.jumping = true;
        player.velocityY = JUMP_FORCE;
        player.state = "jump";
        player.frame = 0;
    }

    if ((e.key === "j" || e.key === "J") && !player.attacking) {

        player.attacking = true;
        player.state = "attack";
        player.frame = 0;
    }
});

document.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

function updatePlayer() {

    let moving = false;

    if (!player.attacking) {

        if (keys["a"] || keys["A"]) {

            player.x -= player.speed;
            player.facing = -1;
            moving = true;
        }

        if (keys["d"] || keys["D"]) {

            player.x += player.speed;
            player.facing = 1;
            moving = true;
        }
    }

    if (player.jumping) {

        player.y += player.velocityY;

        player.velocityY += GRAVITY;

        if (player.y >= FLOOR_Y) {

            player.y = FLOOR_Y;
            player.velocityY = 0;
            player.jumping = false;
        }
    }

    if (!player.jumping && !player.attacking) {
        player.state = moving ? "walk" : "idle";
    }

    player.x = Math.max(0, Math.min(player.x, canvas.width - player.width));
}

let animationTick = 0;

function updateAnimation() {

    animationTick++;

    if (animationTick < 8) {
        return;
    }

    animationTick = 0;

    const anim = animations[player.state];

    player.frame++;

    if (player.frame >= anim.length) {

        if (player.state === "attack") {

            player.attacking = false;
            player.state = "idle";
        }

        player.frame = 0;
    }
}

function drawBackground() {

    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#555";
    ctx.fillRect(0, 580, canvas.width, 140);
}

function drawPlayer() {

    const anim = animations[player.state];

    if (!anim || !anim[player.frame]) {
        return;
    }

    const sprite = anim[player.frame];

    ctx.save();

    if (player.facing === -1) {

        ctx.scale(-1, 1);

        ctx.drawImage(
            sprite,
            -player.x - player.width,
            player.y,
            player.width,
            player.height
        );

    } else {

        ctx.drawImage(
            sprite,
            player.x,
            player.y,
            player.width,
            player.height
        );
    }

    ctx.restore();
}

function loop() {

    requestAnimationFrame(loop);

    updatePlayer();
    updateAnimation();

    drawBackground();
    drawPlayer();
}

loop();
