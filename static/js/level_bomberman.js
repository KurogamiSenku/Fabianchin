// ====================================================================
//  Nivel 5 - Bomberman: mapa jugable (rejilla) con Fabiancho + enemigo
//  Camina hasta el bloque-terminal y pulsa E para abrir el reto SQLi.
//  El Bomberman enemigo ronda, persigue y suelta bombas que EMPUJAN.
// ====================================================================
const cv = document.getElementById('arena');
const ctx = cv.getContext('2d');

const TILE = 48, COLS = 15, ROWS = 10;
cv.width = COLS * TILE; cv.height = ROWS * TILE;

function loadImg(src){ const i = new Image(); i.src = src; return i; }
const sprites = { idle: [], walk: [] };
for (let i=1;i<=4;i++) sprites.idle.push(loadImg(`/static/img/skeli_fixed/idle/idle${i}.png`));
for (let i=1;i<=6;i++) sprites.walk.push(loadImg(`/static/img/skeli_fixed/walk/walk${i}.png`));

// Enemigo reciclado del mapa
const bombWalk = loadImg('/static/img/markers/bomberman.png');  // 3 frames 20x30
const bombImg  = loadImg('/static/img/markers/bomb.png');       // 3 frames 20x20
const explImg  = loadImg('/static/img/markers/explosion.png');  // 4 frames 38x34

// --- Rejilla estilo Bomberman ---
const grid = [];
for (let r=0;r<ROWS;r++){ grid[r]=[]; for (let c=0;c<COLS;c++){
    const border=(r===0||c===0||r===ROWS-1||c===COLS-1), lattice=(r%2===0&&c%2===0);
    grid[r][c]=(border||lattice)?1:0;
}}
const TERM = { c:13, r:8 }; grid[TERM.r][TERM.c]=0;

const PSIZE=58, HB=18, SPEED=3.0;
const player = { x:1*TILE+(TILE-PSIZE)/2, y:1*TILE+(TILE-PSIZE)/2,
    facing:'down', moving:false, animFrame:0, animTimer:0, bvx:0, bvy:0 };

// --- Enemigo Bomberman ---
const ESIZE=46, EHB=16, ESPEED=1.7;
const enemy = { x:7*TILE+1, y:5*TILE+1, facing:'left', animFrame:0, animTimer:0,
    bombTimer:2600, bombs:[] };

const keys = { up:false, down:false, left:false, right:false };
let challengeOpen = false;

function typingInField(e){ const t=e.target||document.activeElement;
    return t && (t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable); }

window.addEventListener('keydown', e=>{
    if (typingInField(e) || challengeOpen) return;
    if (['w','W','ArrowUp'].includes(e.key)) keys.up=true;
    if (['s','S','ArrowDown'].includes(e.key)) keys.down=true;
    if (['a','A','ArrowLeft'].includes(e.key)) keys.left=true;
    if (['d','D','ArrowRight'].includes(e.key)) keys.right=true;
    if ((e.key==='e'||e.key==='E') && nearTerminal()) openChallenge();
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
});
window.addEventListener('keyup', e=>{
    if (typingInField(e)) return;
    if (['w','W','ArrowUp'].includes(e.key)) keys.up=false;
    if (['s','S','ArrowDown'].includes(e.key)) keys.down=false;
    if (['a','A','ArrowLeft'].includes(e.key)) keys.left=false;
    if (['d','D','ArrowRight'].includes(e.key)) keys.right=false;
});
window.addEventListener('blur', ()=>{ keys.up=keys.down=keys.left=keys.right=false; });

function hitsWallBox(cx, cy, half){
    const pts=[[cx-half,cy-half],[cx+half,cy-half],[cx-half,cy+half],[cx+half,cy+half]];
    for (const [px,py] of pts){
        const c=Math.floor(px/TILE), r=Math.floor(py/TILE);
        if (r<0||c<0||r>=ROWS||c>=COLS) return true;
        if (grid[r][c]===1) return true;
    }
    return false;
}
function playerHitsWall(nx, ny){ return hitsWallBox(nx+PSIZE/2, ny+PSIZE-10, HB); }
function enemyHitsWall(nx, ny){ return hitsWallBox(nx+ESIZE/2, ny+ESIZE/2, EHB); }

function nearTerminal(){
    const pc=Math.floor((player.x+PSIZE/2)/TILE), pr=Math.floor((player.y+PSIZE-10)/TILE);
    return Math.abs(pc-TERM.c)<=1 && Math.abs(pr-TERM.r)<=1;
}

function updatePlayer(dt){
    if (challengeOpen){ player.moving=false; return; }
    let dx=0,dy=0;
    if (keys.up){dy-=1;player.facing='up';}
    if (keys.down){dy+=1;player.facing='down';}
    if (keys.left){dx-=1;player.facing='left';}
    if (keys.right){dx+=1;player.facing='right';}
    if (dx&&dy){dx*=0.707;dy*=0.707;}
    player.moving=(dx||dy)!==0;

    let mx=dx*SPEED+player.bvx, my=dy*SPEED+player.bvy;
    if (!playerHitsWall(player.x+mx, player.y)) player.x+=mx; else player.bvx=0;
    if (!playerHitsWall(player.x, player.y+my)) player.y+=my; else player.bvy=0;
    player.bvx*=0.85; player.bvy*=0.85;

    player.animTimer+=dt;
    if (player.animTimer > (player.moving?90:170)){ player.animFrame++; player.animTimer=0; }
}

function updateEnemy(dt){
    if (challengeOpen) return;
    const ecx=enemy.x+ESIZE/2, ecy=enemy.y+ESIZE/2;
    const pcx=player.x+PSIZE/2, pcy=player.y+PSIZE-10;
    const dx=pcx-ecx, dy=pcy-ecy, dist=Math.hypot(dx,dy)||1;
    const mvx=(dx/dist)*ESPEED, mvy=(dy/dist)*ESPEED;
    if (!enemyHitsWall(enemy.x+mvx, enemy.y)) enemy.x+=mvx;
    if (!enemyHitsWall(enemy.x, enemy.y+mvy)) enemy.y+=mvy;
    enemy.facing = dx<0?'left':'right';
    enemy.animTimer+=dt;
    if (enemy.animTimer>140){ enemy.animFrame++; enemy.animTimer=0; }

    // soltar bombas cuando el jugador está cerca
    enemy.bombTimer-=dt;
    if (enemy.bombTimer<=0 && dist<360){
        enemy.bombs.push({ x:ecx, y:ecy, fuse:1300, exploded:false, et:0 });
        enemy.bombTimer=2600+Math.random()*1200;
    }
    for (const b of enemy.bombs){
        if (!b.exploded){
            b.fuse-=dt;
            if (b.fuse<=0){
                b.exploded=true; b.et=0;
                const bdx=pcx-b.x, bdy=pcy-b.y, bd=Math.hypot(bdx,bdy);
                if (bd<130 && bd>0){   // solo EMPUJA, no mata
                    player.bvx += (bdx/bd)*14;
                    player.bvy += (bdy/bd)*14;
                }
            }
        } else { b.et+=dt; }
    }
    enemy.bombs = enemy.bombs.filter(b=>!(b.exploded && b.et>4*80));
}

function drawTile(c,r){
    const x=c*TILE,y=r*TILE;
    if (grid[r][c]===1){
        ctx.fillStyle='#5b6473'; ctx.fillRect(x,y,TILE,TILE);
        ctx.fillStyle='#737d8e'; ctx.fillRect(x+3,y+3,TILE-6,TILE-6);
        ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fillRect(x+3,y+3,TILE-6,5);
        ctx.fillStyle='rgba(0,0,0,.25)'; ctx.fillRect(x+3,y+TILE-8,TILE-6,5);
    } else {
        ctx.fillStyle=((c+r)%2===0)?'#143024':'#122b21'; ctx.fillRect(x,y,TILE,TILE);
    }
}
function drawTerminal(){
    const x=TERM.c*TILE,y=TERM.r*TILE;
    ctx.fillStyle='#0a0d14'; ctx.fillRect(x+6,y+30,TILE-12,TILE-34);
    ctx.fillStyle='#1b2433'; ctx.fillRect(x+6,y+6,TILE-12,30);
    ctx.fillStyle=Math.floor(Date.now()/500)%2?'#3ddc84':'#2ea968'; ctx.fillRect(x+10,y+10,TILE-20,20);
    ctx.fillStyle='#0d1117'; ctx.font='10px monospace'; ctx.textAlign='center'; ctx.fillText('SQL',x+TILE/2,y+24);
    if (nearTerminal() && !challengeOpen){ ctx.fillStyle='#fff'; ctx.font='bold 13px monospace'; ctx.fillText('[E]',x+TILE/2,y-6); }
}
function drawSprite(img,x,y,size,facing,fw,fh,fi){
    if (!img.complete || !img.naturalWidth) return;
    const sx = (fw?fi*fw:0), sw=fw||img.width, sh=fh||img.height;
    if (facing==='left'){
        ctx.save(); ctx.translate(x+size, y); ctx.scale(-1,1);
        ctx.drawImage(img, sx,0,sw,sh, 0,0,size,size*(sh/sw)); ctx.restore();
    } else {
        ctx.drawImage(img, sx,0,sw,sh, x,y,size,size*(sh/sw));
    }
}

function draw(){
    ctx.clearRect(0,0,cv.width,cv.height);
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) drawTile(c,r);
    drawTerminal();

    // enemigo + sombra
    ctx.fillStyle='rgba(0,0,0,.45)';
    ctx.beginPath(); ctx.ellipse(enemy.x+ESIZE/2, enemy.y+ESIZE-4, 13,5,0,0,Math.PI*2); ctx.fill();
    drawSprite(bombWalk, enemy.x, enemy.y, ESIZE, enemy.facing, 20, 30, Math.floor(enemy.animFrame)%3);

    // bombas y explosiones
    for (const b of enemy.bombs){
        if (!b.exploded){
            const fi=Math.floor(Date.now()/150)%3, s=40;
            if (bombImg.complete) ctx.drawImage(bombImg, fi*20,0,20,20, b.x-s/2, b.y-s/2, s, s);
        } else {
            const fi=Math.min(Math.floor(b.et/80),3), s=120;
            if (explImg.complete) ctx.drawImage(explImg, fi*38,0,38,34, b.x-s/2, b.y-s/2, s, s*(34/38));
        }
    }

    // sombra + Fabiancho
    ctx.fillStyle='rgba(0,0,0,.5)';
    ctx.beginPath(); ctx.ellipse(player.x+PSIZE/2, player.y+PSIZE-12, 16,6,0,0,Math.PI*2); ctx.fill();
    const list=player.moving?sprites.walk:sprites.idle;
    const img=list[Math.floor(player.animFrame)%list.length]||sprites.idle[0];
    if (img&&img.complete&&img.naturalWidth){
        if (player.facing==='left'){ ctx.save(); ctx.translate(player.x+PSIZE,player.y); ctx.scale(-1,1);
            ctx.drawImage(img,0,0,PSIZE,PSIZE); ctx.restore(); }
        else ctx.drawImage(img, player.x, player.y, PSIZE, PSIZE);
    }

    // Título dentro del mapa (ahorra espacio fuera del canvas)
    ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(cv.width/2-165, 5, 330, 28);
    ctx.fillStyle='#ffb454'; ctx.font='bold 15px monospace';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('NIVEL 5  ·  BOMBERMAN', cv.width/2, 20);
}

let last=performance.now();
function loop(t){ const dt=t-last; last=t; updatePlayer(dt); updateEnemy(dt); draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);

function openChallenge(){ challengeOpen=true; keys.up=keys.down=keys.left=keys.right=false;
    document.getElementById('challenge').classList.add('show'); }
function closeChallenge(){ challengeOpen=false; document.getElementById('challenge').classList.remove('show'); }
window._closeChallenge = closeChallenge;
