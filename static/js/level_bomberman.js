// ====================================================================
//  Nivel 5 - Bomberman: mapa jugable (rejilla) con Fabiancho + enemigo
//  Camina hasta el bloque-terminal y pulsa E para abrir el reto SQLi.
//  El Bomberman enemigo ronda, persigue y suelta bombas que EMPUJAN.
// ====================================================================
const cv = document.getElementById('arena');
const ctx = cv.getContext('2d');

const TILE = 48, COLS = 15, ROWS = 10;
cv.width = COLS * TILE; cv.height = ROWS * TILE;   // 720 x 480 (tablero completo visible)

function loadImg(src){ const i = new Image(); i.src = src; return i; }
const sprites = { idle: [], walk: [] };
for (let i=1;i<=4;i++) sprites.idle.push(loadImg(`/static/img/skeli_fixed/idle/idle${i}.png`));
for (let i=1;i<=6;i++) sprites.walk.push(loadImg(`/static/img/skeli_fixed/walk/walk${i}.png`));

// Enemigo reciclado del mapa
const bombWalk = loadImg('/static/img/markers/bomberman.png');  // 3 frames 20x30
const bombImg  = loadImg('/static/img/markers/bomb.png');       // 3 frames 20x20
const explImg  = loadImg('/static/img/markers/explosion.png');  // 4 frames 38x34
const EXPLOSION = { frames:4, frameMs:80, frameWidth:38, frameHeight:34 };
function tintSpriteSheet(image, tint){
    const canvas=document.createElement('canvas'), tintCtx=canvas.getContext('2d');
    const applyTint=()=>{
        if (!image.naturalWidth) return;
        canvas.width=image.naturalWidth; canvas.height=image.naturalHeight;
        tintCtx.drawImage(image,0,0);
        tintCtx.globalCompositeOperation='source-atop';
        tintCtx.fillStyle=tint; tintCtx.fillRect(0,0,canvas.width,canvas.height);
        tintCtx.globalCompositeOperation='source-over';
    };
    image.addEventListener('load',applyTint);
    if (image.complete) applyTint();
    return canvas;
}
const playerBombImg=tintSpriteSheet(bombImg,'#19dfff');
const playerExplImg=tintSpriteSheet(explImg,'#19dfff');

// --- Rejilla estilo Bomberman ---
const grid = [];
for (let r=0;r<ROWS;r++){ grid[r]=[]; for (let c=0;c<COLS;c++){
    const border=(r===0||c===0||r===ROWS-1||c===COLS-1), lattice=(r%2===0&&c%2===0);
    grid[r][c]=(border||lattice)?1:0;
}}
const TERM = { c:13, r:8 }; grid[TERM.r][TERM.c]=0;

const PSIZE=130, HB=18, SPEED=3.0;   // Fabiancho +35% (96->130); hitbox sin cambios
const player = { x:1*TILE+(TILE-PSIZE)/2, y:1*TILE+(TILE-PSIZE)/2,
    facing:'down', moving:false, animFrame:0, animTimer:0, bvx:0, bvy:0 };

// --- Enemigos Bomberman (3, para molestar) ---
const ESIZE=56, EHB=16, ESPEED=1.7;   // enemigos a su tamaño normal (como antes)
function mkEnemy(c, r, delay){
    return { x:c*TILE+(TILE-ESIZE)/2, y:r*TILE+(TILE-ESIZE)/2,
        facing:'left', animFrame:Math.random()*3, animTimer:0, bombTimer:delay, bombs:[] };
}
const enemies = [ mkEnemy(7,5,2200), mkEnemy(11,3,3400), mkEnemy(3,7,4200) ];
const playerBombs = [];

const keys = { up:false, down:false, left:false, right:false };
let challengeOpen = false;
let playerDead = false;
let gameplayHint = '';
let gameplayHintTitle = '';
let gameplayHintTimer = 0;
let defeatedEnemies = 0;

function typingInField(e){ const t=e.target||document.activeElement;
    return t && (t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable); }

window.addEventListener('keydown', e=>{
    if (typingInField(e) || challengeOpen) return;
    if (e.code==='Space'){ e.preventDefault(); placeBomb(); return; }
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
    const minC=Math.floor((cx-half)/TILE), maxC=Math.floor((cx+half-.001)/TILE);
    const minR=Math.floor((cy-half)/TILE), maxR=Math.floor((cy+half-.001)/TILE);
    for (let r=minR;r<=maxR;r++) for (let c=minC;c<=maxC;c++){
        if (r<0||c<0||r>=ROWS||c>=COLS||grid[r][c]===1) return true;
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
    if (challengeOpen||playerDead){ player.moving=false; return; }
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
    if (challengeOpen||playerDead) return;
    const pcx=player.x+PSIZE/2, pcy=player.y+PSIZE-10;
    for (const enemy of enemies){
        if (enemy.defeated) continue;
        const ecx=enemy.x+ESIZE/2, ecy=enemy.y+ESIZE/2;
        const dx=pcx-ecx, dy=pcy-ecy, dist=Math.hypot(dx,dy)||1;
        const mvx=(dx/dist)*ESPEED, mvy=(dy/dist)*ESPEED;
        if (!enemyHitsWall(enemy.x+mvx, enemy.y)) enemy.x+=mvx;
        if (!enemyHitsWall(enemy.x, enemy.y+mvy)) enemy.y+=mvy;
        enemy.facing = dx<0?'left':'right';
        enemy.animTimer+=dt;
        if (enemy.animTimer>140){ enemy.animFrame++; enemy.animTimer=0; }

        // Empuje al CONTACTO directo (además del empuje de las bombas)
        const contact = (EHB) + (PSIZE*0.20);
        if (dist < contact && dist>0){
            player.bvx += (dx/dist)*7;
            player.bvy += (dy/dist)*7;
            const pushX=enemy.x-(dx/dist)*1.2, pushY=enemy.y-(dy/dist)*1.2;
            if (!enemyHitsWall(pushX,enemy.y)) enemy.x=pushX;
            if (!enemyHitsWall(enemy.x,pushY)) enemy.y=pushY;
        }

        enemy.bombTimer-=dt;
        if (enemy.bombTimer<=0 && dist<360){
            enemy.bombs.push({ x:ecx, y:ecy, fuse:1300, exploded:false, et:0 });
            enemy.bombTimer=2600+Math.random()*1400;
        }
        for (const b of enemy.bombs){
            if (!b.exploded){
                b.fuse-=dt;
                if (b.fuse<=0){
                    b.exploded=true; b.et=0;
                    const bdx=pcx-b.x, bdy=pcy-b.y, bd=Math.hypot(bdx,bdy);
                    if (bd<130) handlePlayerDeath('enemy');
                }
            } else { b.et+=dt; }
        }
        enemy.bombs = enemy.bombs.filter(b=>!(b.exploded && b.et>EXPLOSION.frames*EXPLOSION.frameMs));
    }

    // Separación entre enemigos: si se acercan demasiado, se empujan (no se fusionan)
    const SEP = ESIZE * 0.85;
    for (let i=0;i<enemies.length;i++){
        for (let j=i+1;j<enemies.length;j++){
            const a=enemies[i], b=enemies[j];
            const ax=a.x+ESIZE/2, ay=a.y+ESIZE/2, bx=b.x+ESIZE/2, by=b.y+ESIZE/2;
            const dx=bx-ax, dy=by-ay, d=Math.hypot(dx,dy)||1;
            if (d < SEP){
                const push=(SEP-d)/2, nx=dx/d, ny=dy/d;
                const aox=a.x, aoy=a.y, box=b.x, boy=b.y;
                a.x-=nx*push; a.y-=ny*push; b.x+=nx*push; b.y+=ny*push;
                if (enemyHitsWall(a.x,a.y)){ a.x=aox; a.y=aoy; }
                if (enemyHitsWall(b.x,b.y)){ b.x=box; b.y=boy; }
            }
        }
    }
}

function playerCell(){
    return {
        c:Math.floor((player.x+PSIZE/2)/TILE),
        r:Math.floor((player.y+PSIZE-10)/TILE)
    };
}
function placeBomb(){
    if (playerDead) return;
    const {c,r}=playerCell();
    if (grid[r][c]===1 || playerBombs.some(b=>b.c===c&&b.r===r)) return;
    playerBombs.push({c,r,x:c*TILE+TILE/2,y:r*TILE+TILE/2,fuse:1500,exploded:false,et:0,cells:[]});
}
function explosionCells(c,r){
    const cells=[{c,r}];
    for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){
        for(let distance=1;distance<=2;distance++){
            const nc=c+dc*distance,nr=r+dr*distance;
            if(nc<0||nr<0||nc>=COLS||nr>=ROWS||grid[nr][nc]===1) break;
            cells.push({c:nc,r:nr});
        }
    }
    return cells;
}
function showDefeatHint(){
    defeatedEnemies++;
    const hints=[
        'Enemigo derrotado: el formulario bloquea comillas, pero esa restricción está en tu navegador.',
        'Abre F12 > Console y revisa cómo se valida el usuario antes de pulsar ACCEDER.',
        '¡Zona despejada! F12 > Elements: muestra sector-oculto y revisa el id del expediente.'
    ];
    gameplayHint=hints[Math.min(defeatedEnemies-1,hints.length-1)];
    gameplayHintTitle=`PISTA ${defeatedEnemies}/3 DESBLOQUEADA`;
    gameplayHintTimer=6500;
}
function resolvePlayerBlast(bomb, playerPosition){
    if(bomb.cells.some(cell=>cell.c===playerPosition.c&&cell.r===playerPosition.r)){
        handlePlayerDeath('player');
    }
    for(const enemy of enemies){
        if(enemy.defeated) continue;
        const ec=Math.floor((enemy.x+ESIZE/2)/TILE);
        const er=Math.floor((enemy.y+ESIZE/2)/TILE);
        if(bomb.cells.some(cell=>cell.c===ec&&cell.r===er)){
            enemy.defeated=true;
            showDefeatHint();
        }
    }
}
function updatePlayerBombs(dt){
    const playerPosition=playerCell();
    for(const bomb of playerBombs){
        if(!bomb.exploded){
            bomb.fuse-=dt;
            if(bomb.fuse<=0){
                bomb.exploded=true; bomb.et=0; bomb.cells=explosionCells(bomb.c,bomb.r);
                resolvePlayerBlast(bomb,playerPosition);
            }
        }else{
            bomb.et+=dt;
            resolvePlayerBlast(bomb,playerPosition);
        }
    }
    for(let i=playerBombs.length-1;i>=0;i--){
        if(playerBombs[i].exploded&&playerBombs[i].et>EXPLOSION.frames*EXPLOSION.frameMs) playerBombs.splice(i,1);
    }
}
function handlePlayerDeath(source){
    if(playerDead) return;
    playerDead=true;
    gameplayHintTitle='DERROTA';
    gameplayHint=source==='player'
        ? 'Tu propia explosión te alcanzó. Reiniciando la partida…'
        : 'La explosión de un enemigo te alcanzó. Reiniciando la partida…';
    gameplayHintTimer=1000;
    keys.up=keys.down=keys.left=keys.right=false;
    setTimeout(()=>window.location.reload(),1000);
}

function drawTile(targetCtx,c,r){
    const x=c*TILE,y=r*TILE;
    if (grid[r][c]===1){
        const block=targetCtx.createLinearGradient(x,y,x+TILE,y+TILE);
        block.addColorStop(0,'#506b7e'); block.addColorStop(.48,'#30485d'); block.addColorStop(1,'#1b2c40');
        targetCtx.fillStyle=block; targetCtx.fillRect(x,y,TILE,TILE);
        targetCtx.fillStyle='#70899a'; targetCtx.fillRect(x+3,y+3,TILE-6,TILE-6);
        targetCtx.fillStyle='#526e82'; targetCtx.fillRect(x+6,y+8,TILE-12,TILE-14);
        targetCtx.fillStyle='rgba(209,239,255,.38)'; targetCtx.fillRect(x+6,y+6,TILE-12,2);
        targetCtx.fillStyle='rgba(4,11,22,.55)'; targetCtx.fillRect(x+6,y+TILE-8,TILE-12,2);
        targetCtx.fillStyle='#b8d2dc';
        for(const [rx,ry] of [[7,7],[TILE-9,7],[7,TILE-9],[TILE-9,TILE-9]]){
            targetCtx.fillRect(x+rx,y+ry,2,2);
        }
        targetCtx.strokeStyle='rgba(166,213,235,.16)'; targetCtx.lineWidth=1;
        targetCtx.strokeRect(x+1.5,y+1.5,TILE-3,TILE-3);
    } else {
        const floor=targetCtx.createLinearGradient(x,y,x+TILE,y+TILE);
        floor.addColorStop(0,((c+r)%2===0)?'#143b3c':'#102f37');
        floor.addColorStop(1,((c+r)%2===0)?'#0d2934':'#122d36');
        targetCtx.fillStyle=floor; targetCtx.fillRect(x,y,TILE,TILE);
        targetCtx.strokeStyle='rgba(103,201,194,.12)'; targetCtx.lineWidth=1;
        targetCtx.strokeRect(x+.5,y+.5,TILE-1,TILE-1);
        targetCtx.fillStyle='rgba(104,218,206,.22)';
        targetCtx.fillRect(x+5,y+5,2,2);
        if((c+r)%3===0) targetCtx.fillRect(x+TILE-8,y+TILE-8,2,2);
    }
}
const terrainCanvas=document.createElement('canvas');
terrainCanvas.width=cv.width; terrainCanvas.height=cv.height;
const terrainCtx=terrainCanvas.getContext('2d');
for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) drawTile(terrainCtx,c,r);

function drawTerminal(){
    const x=TERM.c*TILE,y=TERM.r*TILE;
    const pulse=.5+.5*Math.sin(Date.now()/260);
    ctx.save();
    ctx.shadowColor='#44f5cf'; ctx.shadowBlur=10+12*pulse;
    ctx.fillStyle='#101d2c'; ctx.fillRect(x+4,y+4,TILE-8,TILE-8);
    ctx.shadowBlur=0;
    ctx.fillStyle='#263a4d'; ctx.fillRect(x+7,y+7,TILE-14,24);
    ctx.fillStyle='#66f2ce'; ctx.fillRect(x+10,y+10,TILE-20,16);
    ctx.fillStyle='#07131e'; ctx.font='bold 9px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('SQL',x+TILE/2,y+18);
    ctx.fillStyle='#536b7d'; ctx.fillRect(x+10,y+34,TILE-20,4);
    ctx.fillStyle='#ffb454'; ctx.fillRect(x+12,y+40,5,3);
    ctx.fillStyle='#54e5c4'; ctx.fillRect(x+TILE-17,y+40,5,3);
    ctx.strokeStyle='rgba(124,255,224,.8)'; ctx.lineWidth=1;
    ctx.strokeRect(x+4.5,y+4.5,TILE-9,TILE-9);
    if (nearTerminal() && !challengeOpen){
        const label='[ E ] ABRIR';
        ctx.font='bold 9px monospace';
        const labelWidth=ctx.measureText(label).width+14;
        const labelX=x+TILE/2-labelWidth/2, labelY=y-20;
        ctx.fillStyle='rgba(4,14,24,.94)'; ctx.fillRect(labelX,labelY,labelWidth,15);
        ctx.strokeStyle='#ffb454'; ctx.strokeRect(labelX+.5,labelY+.5,labelWidth-1,14);
        ctx.fillStyle='#ffe0a6'; ctx.textBaseline='middle'; ctx.fillText(label,x+TILE/2,labelY+8);
    }
    ctx.restore();
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
    ctx.fillStyle='#07111d'; ctx.fillRect(0,0,cv.width,cv.height);
    ctx.drawImage(terrainCanvas,0,0);
    drawTerminal();

    // enemigos + sombras + sus bombas
    for (const enemy of enemies){
        if (enemy.defeated) continue;
        const groundX=enemy.x+ESIZE/2, groundY=enemy.y+ESIZE/2;
        ctx.fillStyle='rgba(0,0,0,.45)';
        ctx.beginPath(); ctx.ellipse(groundX,groundY,14,5,0,0,Math.PI*2); ctx.fill();
        drawSprite(bombWalk,enemy.x,groundY-ESIZE*30/20,ESIZE,enemy.facing,20,30,Math.floor(enemy.animFrame)%3);
        for (const b of enemy.bombs){
            if (!b.exploded){
                const fi=Math.floor(Date.now()/150)%3, s=42;
                const danger=Math.max(0,Math.min(1,1-b.fuse/1300));
                ctx.strokeStyle=`rgba(255,${Math.round(174-95*danger)},${Math.round(64-35*danger)},${.3+.6*danger})`;
                ctx.lineWidth=2;
                ctx.beginPath(); ctx.arc(b.x,b.y,17+danger*5,0,Math.PI*2); ctx.stroke();
                if (bombImg.complete) ctx.drawImage(bombImg, fi*20,0,20,20, b.x-s/2, b.y-s/2, s, s);
            } else {
                const fi=Math.min(Math.floor(b.et/EXPLOSION.frameMs),EXPLOSION.frames-1), s=120;
                if (explImg.complete) ctx.drawImage(explImg,fi*EXPLOSION.frameWidth,0,EXPLOSION.frameWidth,EXPLOSION.frameHeight,
                    b.x-s/2,b.y-s/2,s,s*(EXPLOSION.frameHeight/EXPLOSION.frameWidth));
            }
        }
    }

    for(const bomb of playerBombs){
        if(!bomb.exploded){
            const frame=Math.floor(Date.now()/150)%3, size=38;
            const danger=Math.max(0,Math.min(1,1-bomb.fuse/1500));
            ctx.strokeStyle=`rgba(25,223,255,${.35+.55*danger})`; ctx.lineWidth=2;
            ctx.beginPath(); ctx.arc(bomb.x,bomb.y,17+danger*5,0,Math.PI*2); ctx.stroke();
            if(playerBombImg.width) ctx.drawImage(playerBombImg,frame*20,0,20,20,bomb.x-size/2,bomb.y-size/2,size,size);
        }else{
            const frame=Math.min(Math.floor(bomb.et/EXPLOSION.frameMs),EXPLOSION.frames-1), size=TILE*2;
            if(playerExplImg.width) for(const cell of bomb.cells){
                ctx.drawImage(playerExplImg,frame*EXPLOSION.frameWidth,0,EXPLOSION.frameWidth,EXPLOSION.frameHeight,
                    cell.c*TILE+TILE/2-size/2,cell.r*TILE+TILE/2-size/2,size,size*(EXPLOSION.frameHeight/EXPLOSION.frameWidth));
            }
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
    const hudX=cv.width/2-174, hudY=5, hudW=348, hudH=35;
    ctx.fillStyle='rgba(5,13,24,.94)'; ctx.fillRect(hudX,hudY,hudW,hudH);
    ctx.strokeStyle='rgba(89,208,221,.75)'; ctx.lineWidth=1;
    ctx.strokeRect(hudX+.5,hudY+.5,hudW-1,hudH-1);
    ctx.fillStyle='#ffb454'; ctx.fillRect(hudX+7,hudY+7,3,hudH-14);
    ctx.fillStyle='#ffb454'; ctx.font='bold 14px monospace';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('SECTOR 05  /  BOMBERMAN', cv.width/2, hudY+13);
    ctx.fillStyle='#78b7c8'; ctx.font='bold 8px monospace';
    ctx.fillText('ESPACIO: BOMBA  ·  EVITA LA EXPLOSIÓN', cv.width/2, hudY+28);
    ctx.strokeStyle='rgba(118,220,218,.7)'; ctx.lineWidth=2;
    ctx.strokeRect(1,1,cv.width-2,cv.height-2);
    if (gameplayHintTimer>0){
        ctx.fillStyle='rgba(4,14,24,.96)'; ctx.fillRect(30,cv.height-58,cv.width-60,44);
        ctx.strokeStyle=playerDead?'#ff5a5a':'#ffb454'; ctx.strokeRect(30.5,cv.height-57.5,cv.width-61,43);
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillStyle=playerDead?'#ff9b9b':'#54efff'; ctx.font='bold 10px monospace';
        ctx.fillText(gameplayHintTitle,cv.width/2,cv.height-46);
        ctx.fillStyle='#ffe0a6'; ctx.font='bold 10px monospace';
        ctx.fillText(gameplayHint,cv.width/2,cv.height-28,cv.width-76);
    }
}

let last=performance.now();
function loop(t){ const dt=t-last; last=t; updatePlayer(dt); updateEnemy(dt); updatePlayerBombs(dt); gameplayHintTimer=Math.max(0,gameplayHintTimer-dt); draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);

function openChallenge(){ challengeOpen=true; keys.up=keys.down=keys.left=keys.right=false;
    document.getElementById('challenge').classList.add('show'); }
function closeChallenge(){ challengeOpen=false; document.getElementById('challenge').classList.remove('show'); }
window._closeChallenge = closeChallenge;
