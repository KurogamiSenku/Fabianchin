// ====================================================================
//  Nivel 5 - Bomberman: mapa jugable (rejilla) con Fabiancho
//  Camina hasta el bloque-terminal y pulsa E para abrir el reto SQLi.
// ====================================================================
const cv = document.getElementById('arena');
const ctx = cv.getContext('2d');

const TILE = 48, COLS = 15, ROWS = 10;
cv.width = COLS * TILE;   // 720
cv.height = ROWS * TILE;  // 480

// --- Sprites de Fabiancho (reusa los del juego) ---
const sprites = { idle: [], walk: [] };
function loadImg(src){ const i = new Image(); i.src = src; return i; }
for (let i=1;i<=4;i++) sprites.idle.push(loadImg(`/static/img/skeli_fixed/idle/idle${i}.png`));
for (let i=1;i<=6;i++) sprites.walk.push(loadImg(`/static/img/skeli_fixed/walk/walk${i}.png`));

// --- Rejilla estilo Bomberman: borde + bloques duros en celdas (par,par) ---
const grid = [];
for (let r=0;r<ROWS;r++){
    grid[r]=[];
    for (let c=0;c<COLS;c++){
        const border = (r===0||c===0||r===ROWS-1||c===COLS-1);
        const lattice = (r%2===0 && c%2===0);
        grid[r][c] = (border || lattice) ? 1 : 0;   // 1 = muro
    }
}
// Terminal (computador) en una celda libre
const TERM = { c: 13, r: 8 };
grid[TERM.r][TERM.c] = 0;

const PSIZE = 58;                 // tamaño dibujado de Fabiancho
const HB = 20;                    // mitad de la hitbox (pies)
const SPEED = 3.0;
const player = {
    x: 1*TILE + (TILE-PSIZE)/2, y: 1*TILE + (TILE-PSIZE)/2,
    facing:'down', moving:false, animFrame:0, animTimer:0
};

const keys = { up:false, down:false, left:false, right:false };
let challengeOpen = false;

window.addEventListener('keydown', e=>{
    if (challengeOpen) return;   // mientras el reto está abierto, no se mueve
    if (['w','W','ArrowUp'].includes(e.key)) keys.up=true;
    if (['s','S','ArrowDown'].includes(e.key)) keys.down=true;
    if (['a','A','ArrowLeft'].includes(e.key)) keys.left=true;
    if (['d','D','ArrowRight'].includes(e.key)) keys.right=true;
    if ((e.key==='e'||e.key==='E') && nearTerminal()) openChallenge();
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
});
window.addEventListener('keyup', e=>{
    if (['w','W','ArrowUp'].includes(e.key)) keys.up=false;
    if (['s','S','ArrowDown'].includes(e.key)) keys.down=false;
    if (['a','A','ArrowLeft'].includes(e.key)) keys.left=false;
    if (['d','D','ArrowRight'].includes(e.key)) keys.right=false;
});
window.addEventListener('blur', ()=>{ keys.up=keys.down=keys.left=keys.right=false; });

function hitsWall(nx, ny){
    // hitbox en los pies del sprite
    const cx = nx + PSIZE/2, cy = ny + PSIZE - 10;
    const pts = [[cx-HB,cy-HB],[cx+HB,cy-HB],[cx-HB,cy+HB],[cx+HB,cy+HB]];
    for (const [px,py] of pts){
        const c = Math.floor(px/TILE), r = Math.floor(py/TILE);
        if (r<0||c<0||r>=ROWS||c>=COLS) return true;
        if (grid[r][c]===1) return true;
    }
    return false;
}

function nearTerminal(){
    const pc = Math.floor((player.x+PSIZE/2)/TILE);
    const pr = Math.floor((player.y+PSIZE-10)/TILE);
    return Math.abs(pc-TERM.c)<=1 && Math.abs(pr-TERM.r)<=1;
}

function update(dt){
    if (challengeOpen){ player.moving=false; return; }
    let dx=0, dy=0;
    if (keys.up){dy-=1;player.facing='up';}
    if (keys.down){dy+=1;player.facing='down';}
    if (keys.left){dx-=1;player.facing='left';}
    if (keys.right){dx+=1;player.facing='right';}
    if (dx&&dy){dx*=0.707;dy*=0.707;}
    player.moving = (dx||dy)!==0;

    let nx = player.x + dx*SPEED;
    if (!hitsWall(nx, player.y)) player.x = nx;
    let ny = player.y + dy*SPEED;
    if (!hitsWall(player.x, ny)) player.y = ny;

    player.animTimer += dt;
    const spd = player.moving ? 90 : 170;
    if (player.animTimer > spd){ player.animFrame++; player.animTimer=0; }
}

function drawTile(c, r){
    const x=c*TILE, y=r*TILE;
    if (grid[r][c]===1){
        // bloque duro estilo Bomberman (gris con bisel)
        ctx.fillStyle='#5b6473'; ctx.fillRect(x,y,TILE,TILE);
        ctx.fillStyle='#737d8e'; ctx.fillRect(x+3,y+3,TILE-6,TILE-6);
        ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fillRect(x+3,y+3,TILE-6,5);
        ctx.fillStyle='rgba(0,0,0,.25)'; ctx.fillRect(x+3,y+TILE-8,TILE-6,5);
    } else {
        // piso con rejilla sutil
        ctx.fillStyle = ((c+r)%2===0) ? '#143024' : '#122b21';
        ctx.fillRect(x,y,TILE,TILE);
    }
}

function drawTerminal(){
    const x=TERM.c*TILE, y=TERM.r*TILE;
    // peana
    ctx.fillStyle='#0a0d14'; ctx.fillRect(x+6,y+30,TILE-12,TILE-34);
    // monitor
    ctx.fillStyle='#1b2433'; ctx.fillRect(x+6,y+6,TILE-12,30);
    ctx.fillStyle = Math.floor(Date.now()/500)%2 ? '#3ddc84' : '#2ea968';
    ctx.fillRect(x+10,y+10,TILE-20,20);
    ctx.fillStyle='#0d1117'; ctx.font='10px monospace'; ctx.textAlign='center';
    ctx.fillText('SQL', x+TILE/2, y+24);
    if (nearTerminal() && !challengeOpen){
        ctx.fillStyle='#fff'; ctx.font='bold 13px monospace';
        ctx.fillText('[E]', x+TILE/2, y-6);
    }
}

function draw(){
    ctx.clearRect(0,0,cv.width,cv.height);
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) drawTile(c,r);
    drawTerminal();
    // sombra
    ctx.fillStyle='rgba(0,0,0,.5)';
    ctx.beginPath(); ctx.ellipse(player.x+PSIZE/2, player.y+PSIZE-12, 16, 6, 0,0,Math.PI*2); ctx.fill();
    // Fabiancho
    let list = player.moving ? sprites.walk : sprites.idle;
    let fi = Math.floor(player.animFrame) % list.length;
    const img = list[fi] || sprites.idle[0];
    if (img && img.complete && img.naturalWidth){
        if (player.facing==='left'){
            ctx.save(); ctx.translate(player.x+PSIZE, player.y); ctx.scale(-1,1);
            ctx.drawImage(img,0,0,PSIZE,PSIZE); ctx.restore();
        } else {
            ctx.drawImage(img, player.x, player.y, PSIZE, PSIZE);
        }
    }
}

let last=performance.now();
function loop(t){
    const dt=t-last; last=t;
    update(dt); draw();
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// --- Abrir/cerrar el reto (lo conecta el template) ---
function openChallenge(){ challengeOpen=true; keys.up=keys.down=keys.left=keys.right=false;
    document.getElementById('challenge').classList.add('show'); }
function closeChallenge(){ challengeOpen=false; document.getElementById('challenge').classList.remove('show'); }
window._closeChallenge = closeChallenge;
