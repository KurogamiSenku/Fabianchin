// ====================================================================
//  Nivel 14 - Pokémon: "La Liga de los administradores" (isométrico 2.5D)
//  Fabiancho recorre un pueblo isométrico hasta el CENTRO DE LA LIGA y pulsa E.
//  Mapa, edificios y personaje son diseño propio (Fabiancho).
// ====================================================================
const cv = document.getElementById('arena');
const ctx = cv.getContext('2d');
cv.width = 760; cv.height = 460;

const TW = 64, TH = 32;   // tile isométrico (ancho/alto del rombo)
const BUILD_H = 54;       // altura de los edificios extruidos

function loadImg(src){ const i=new Image(); i.src=src; return i; }
const sprites = { idle:[], walk:[] };
for (let i=1;i<=4;i++) sprites.idle.push(loadImg(`/static/img/skeli_fixed/idle/idle${i}.png`));
for (let i=1;i<=6;i++) sprites.walk.push(loadImg(`/static/img/skeli_fixed/walk/walk${i}.png`));

// Mapa del pueblo: G césped, P camino, W agua, B edificio, L Centro de la Liga, S spawn
const MAPSTR = [
    "WWWWWWWWWWWWWW",
    "WGGGGPGGGGGGW",
    "WGBBGPGBBGGGW",
    "WGBBGPGBBGGGW",
    "WGGGGPGGGGGGW",
    "WPPPPPPPPPGGW",
    "WGGGGPGGGPGGW",
    "WGBGGPGLLPGGW",
    "WGBGGPGLLPGGW",
    "WGGGGSGGGPGGW",
    "WGGGGGGGGGGGW",
    "WWWWWWWWWWWWWW",
];
const MAP = MAPSTR.map(r=>r.split(""));
const MH = MAP.length, MW = MAP[0].length;
function tile(gx,gy){ if (gx<0||gy<0||gx>=MW||gy>=MH) return 'W'; return MAP[gy][gx]; }
function solid(gx,gy){ const t=tile(gx,gy); return t==='W'||t==='B'||t==='L'; }

let spawn={x:5,y:9}, liga={x:7,y:7};
for (let y=0;y<MH;y++) for (let x=0;x<MW;x++){
    if (MAP[y][x]==='S'){ spawn={x,y}; MAP[y][x]='P'; }
}
const player = { gx:spawn.x+0.5, gy:spawn.y+0.5, facing:'right', moving:false, animFrame:0, animTimer:0 };
const cam = { x:0, y:0 };

const keys = {};
let challengeOpen = false;
function typing(e){ const t=e.target||document.activeElement; return t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable); }
window.addEventListener('keydown', e=>{
    if (typing(e)||challengeOpen) return;
    keys[e.key.toLowerCase()]=true;
    if ((e.key==='e'||e.key==='E') && nearLiga()) openChallenge();
    if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault();
});
window.addEventListener('keyup', e=>{ if (typing(e)) return; keys[e.key.toLowerCase()]=false; });
window.addEventListener('blur', ()=>{ for (const k in keys) keys[k]=false; });

function nearLiga(){ return Math.hypot(player.gx-(liga.x+0.5), player.gy-(liga.y+1.2)) < 1.6; }

function isoToScreen(gx,gy){
    return { x:(gx-gy)*TW/2 - cam.x + cv.width/2, y:(gx+gy)*TH/2 - cam.y + cv.height/2 };
}
function update(dt){
    if (challengeOpen){ player.moving=false; return; }
    let dx=0, dy=0;
    if (keys['w']||keys['arrowup']) dy-=1;
    if (keys['s']||keys['arrowdown']) dy+=1;
    if (keys['a']||keys['arrowleft']) dx-=1;
    if (keys['d']||keys['arrowright']) dx+=1;
    player.moving=(dx||dy)!==0;
    if (dx<0) player.facing='left'; else if (dx>0) player.facing='right';
    const sp=0.05;
    if (dx&&dy){ dx*=0.707; dy*=0.707; }
    const nx=player.gx+dx*sp, ny=player.gy+dy*sp;
    const r=0.28;
    if (!solid(Math.floor(nx+(dx>0?r:-r)), Math.floor(player.gy))) player.gx=nx;
    if (!solid(Math.floor(player.gx), Math.floor(ny+(dy>0?r:-r)))) player.gy=ny;

    // cámara sigue al jugador
    const tgt=isoToScreen(player.gx,player.gy);
    cam.x += ((player.gx-player.gy)*TW/2 - cam.x)*0.1;
    cam.y += ((player.gx+player.gy)*TH/2 - cam.y)*0.1;

    player.animTimer+=dt;
    if (player.animTimer>(player.moving?90:180)){ player.animFrame++; player.animTimer=0; }
}

function diamond(cx,cy,fill){
    ctx.beginPath();
    ctx.moveTo(cx, cy-TH/2); ctx.lineTo(cx+TW/2, cy); ctx.lineTo(cx, cy+TH/2); ctx.lineTo(cx-TW/2, cy); ctx.closePath();
    ctx.fillStyle=fill; ctx.fill();
}
function drawTileTop(gx,gy){
    const s=isoToScreen(gx+0.5,gy+0.5); const t=tile(gx,gy);
    let col = '#4caf50';
    if (t==='P') col='#d9b36b';           // camino
    else if (t==='W') col='#2b8fd0';       // agua
    else if (t==='G') col = ((gx+gy)%2===0)?'#4caf50':'#46a34a';
    else col = ((gx+gy)%2===0)?'#4caf50':'#46a34a'; // base bajo edificios
    diamond(s.x, s.y, col);
    // borde sutil
    ctx.strokeStyle='rgba(0,0,0,.08)'; ctx.lineWidth=1; ctx.stroke();
    if (t==='W'){ // brillo del agua
        ctx.fillStyle='rgba(255,255,255,.10)';
        ctx.fillRect(s.x-6, s.y-2+((Date.now()/120)%6), 12, 2);
    }
}
function drawBuilding(gx,gy, isLiga){
    const s=isoToScreen(gx+0.5,gy+0.5);
    const topY = s.y - BUILD_H;
    // caras laterales (extrusión)
    ctx.fillStyle = isLiga ? '#9a5bd0' : '#b06a3a';
    ctx.beginPath(); ctx.moveTo(s.x-TW/2, s.y); ctx.lineTo(s.x, s.y+TH/2); ctx.lineTo(s.x, s.y+TH/2-BUILD_H); ctx.lineTo(s.x-TW/2, s.y-BUILD_H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = isLiga ? '#7e45b0' : '#8f5330';
    ctx.beginPath(); ctx.moveTo(s.x+TW/2, s.y); ctx.lineTo(s.x, s.y+TH/2); ctx.lineTo(s.x, s.y+TH/2-BUILD_H); ctx.lineTo(s.x+TW/2, s.y-BUILD_H); ctx.closePath(); ctx.fill();
    // techo (rombo)
    diamond(s.x, topY, isLiga ? '#c48bf0' : '#d98f55');
    if (isLiga){
        ctx.fillStyle='#fff'; ctx.font='bold 10px monospace'; ctx.textAlign='center';
        ctx.fillText('LIGA', s.x, topY+3);
        if (nearLiga() && !challengeOpen){ ctx.fillStyle='#fffb8a'; ctx.font='bold 12px monospace'; ctx.fillText('[E]', s.x, topY-14); }
    }
}
function drawPlayer(){
    const s=isoToScreen(player.gx,player.gy);
    const PSIZE=78;
    ctx.fillStyle='rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(s.x, s.y+6, 16,7,0,0,Math.PI*2); ctx.fill();
    const list=player.moving?sprites.walk:sprites.idle;
    const img=list[Math.floor(player.animFrame)%list.length]||sprites.idle[0];
    const dx=s.x-PSIZE/2, dy=s.y+8-PSIZE;
    if (img&&img.complete&&img.naturalWidth){
        if (player.facing==='left'){ ctx.save(); ctx.translate(dx+PSIZE,dy); ctx.scale(-1,1); ctx.drawImage(img,0,0,PSIZE,PSIZE); ctx.restore(); }
        else ctx.drawImage(img,dx,dy,PSIZE,PSIZE);
    }
}

function draw(){
    // cielo
    const g=ctx.createLinearGradient(0,0,0,cv.height); g.addColorStop(0,'#bfe9ff'); g.addColorStop(1,'#eafff0');
    ctx.fillStyle=g; ctx.fillRect(0,0,cv.width,cv.height);

    // suelo (todos los tiles, de atrás hacia adelante)
    for (let gy=0; gy<MH; gy++) for (let gx=0; gx<MW; gx++) drawTileTop(gx,gy);

    // objetos (edificios + jugador) ordenados por profundidad (gx+gy)
    const objs=[];
    for (let gy=0; gy<MH; gy++) for (let gx=0; gx<MW; gx++){
        const t=tile(gx,gy);
        if (t==='B') objs.push({depth:gx+gy, kind:'b', gx, gy, liga:false});
        if (t==='L') objs.push({depth:gx+gy, kind:'b', gx, gy, liga:true});
    }
    objs.push({depth:player.gx+player.gy, kind:'p'});
    objs.sort((a,b)=>a.depth-b.depth);
    for (const o of objs){ if (o.kind==='b') drawBuilding(o.gx,o.gy,o.liga); else drawPlayer(); }

    // HUD
    ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(cv.width/2-150,6,300,24);
    ctx.fillStyle='#ffd24a'; ctx.font='bold 13px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('NIVEL 14 · POKÉMON — LA LIGA', cv.width/2, 18);
}

let last=performance.now();
function loop(t){ const dt=t-last; last=t; update(dt); draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);

function openChallenge(){ challengeOpen=true; for (const k in keys) keys[k]=false;
    document.getElementById('challenge').classList.add('show'); }
function closeChallenge(){ challengeOpen=false; document.getElementById('challenge').classList.remove('show'); }
window._closeChallenge = closeChallenge;
