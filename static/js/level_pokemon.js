// ====================================================================
//  Nivel 14 - Pokémon: "La Liga de los administradores" (isométrico 2.5D)
//  Fabiancho recorre un pueblo isométrico hasta el CENTRO DE LA LIGA (E).
//  Aldeanos y carteles sueltan frases al acercarte. Todo arte propio.
// ====================================================================
const cv = document.getElementById('arena');
const ctx = cv.getContext('2d');
cv.width = 760; cv.height = 460;

const TW = 64, TH = 32, BUILD_H = 54;

function loadImg(src){ const i=new Image(); i.src=src; return i; }
const sprites = { idle:[], walk:[] };
for (let i=1;i<=4;i++) sprites.idle.push(loadImg(`/static/img/skeli_fixed/idle/idle${i}.png`));
for (let i=1;i<=6;i++) sprites.walk.push(loadImg(`/static/img/skeli_fixed/walk/walk${i}.png`));

// Mapa 14x12 (filas de igual largo): G césped, P camino, W agua, B/L edificio, S spawn
const MAPSTR = [
    "WWWWWWWWWWWWWW",
    "WGGGGGPGGGGGGW",
    "WGBBGGPGGBBGGW",
    "WGBBGGPGGBBGGW",
    "WGGGGGPGGGGGGW",
    "WPPPPPPPPPPPGW",
    "WGGGGGPGGGGGGW",
    "WGBGGGPGLLGGGW",
    "WGBGGGPGLLGGGW",
    "WGGGGSPGGGGGGW",
    "WGGGGGGGGGGGGW",
    "WWWWWWWWWWWWWW",
];
const MAP = MAPSTR.map(r=>r.split(""));
const MH = MAP.length, MW = MAP[0].length;
function tile(gx,gy){ if (gx<0||gy<0||gx>=MW||gy>=MH) return 'W'; return MAP[gy][gx]; }
function solid(gx,gy){ const t=tile(gx,gy); return t==='W'||t==='B'||t==='L'; }

let spawn={x:5,y:9}, liga={x:8,y:7};
for (let y=0;y<MH;y++) for (let x=0;x<MW;x++){ if (MAP[y][x]==='S'){ spawn={x,y}; MAP[y][x]='P'; } }
const player = { gx:spawn.x+0.5, gy:spawn.y+0.5, facing:'right', moving:false, animFrame:0, animTimer:0 };
const cam = { x:0, y:0 };

// Aldeanos (diseño propio) y carteles con frases
const npcs = [
    { gx:2.5, gy:4.5, robe:'#e85d5d', hat:'#b03030', say:"¡Bienvenido a la Liga, retador!" },
    { gx:11.5, gy:4.5, robe:'#4d8de8', hat:'#2b5bb0', say:"Dicen que el admin es descuidado con sus respaldos..." },
    { gx:3.5, gy:6.5, robe:'#3ddc84', hat:'#1a7a44', say:"Correlaciona lo que encuentres. Nada es casualidad." },
    { gx:11.5, gy:7.5, robe:'#e8c04d', hat:'#b08a30', say:"El Centro de la Liga está al fondo. ¡Suerte!" },
    { gx:4.5, gy:10.5, robe:'#b06ad0', hat:'#7e45b0', say:"Un buen hacker lee hasta los archivos .bak." },
];
const signs = [
    { gx:6.5, gy:1.5, say:"CARTEL: Torneo de la Liga — solo administradores autorizados." },
    { gx:6.5, gy:6.5, say:"CARTEL: Config del servidor en mantenimiento. No tocar." },
    { gx:10.5, gy:10.5, say:"CARTEL: Rota tus credenciales. (nadie lo hace)" },
];
const trees = [ [1.5,1.5],[12.5,1.5],[1.5,10.5],[12.5,6.5],[5.5,10.5],[12.5,9.5] ];
const lamps = [ [6.5,2.5],[6.5,8.5],[9.5,5.5] ];

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

function nearLiga(){ return Math.hypot(player.gx-(liga.x+0.5), player.gy-(liga.y+1.4)) < 1.8; }
function isoToScreen(gx,gy){ return { x:(gx-gy)*TW/2 - cam.x + cv.width/2, y:(gx+gy)*TH/2 - cam.y + cv.height/2 }; }

function update(dt){
    if (challengeOpen){ player.moving=false; return; }
    let dx=0, dy=0;
    if (keys['w']||keys['arrowup']) dy-=1;
    if (keys['s']||keys['arrowdown']) dy+=1;
    if (keys['a']||keys['arrowleft']) dx-=1;
    if (keys['d']||keys['arrowright']) dx+=1;
    player.moving=(dx||dy)!==0;
    if (dx<0) player.facing='left'; else if (dx>0) player.facing='right';
    const sp=0.05; if (dx&&dy){ dx*=0.707; dy*=0.707; }
    const nx=player.gx+dx*sp, ny=player.gy+dy*sp, r=0.28;
    if (!solid(Math.floor(nx+(dx>0?r:-r)), Math.floor(player.gy))) player.gx=nx;
    if (!solid(Math.floor(player.gx), Math.floor(ny+(dy>0?r:-r)))) player.gy=ny;
    cam.x += ((player.gx-player.gy)*TW/2 - cam.x)*0.1;
    cam.y += ((player.gx+player.gy)*TH/2 - cam.y)*0.1;
    player.animTimer+=dt;
    if (player.animTimer>(player.moving?90:180)){ player.animFrame++; player.animTimer=0; }
}

function diamond(cx,cy,fill){
    ctx.beginPath(); ctx.moveTo(cx,cy-TH/2); ctx.lineTo(cx+TW/2,cy); ctx.lineTo(cx,cy+TH/2); ctx.lineTo(cx-TW/2,cy); ctx.closePath();
    ctx.fillStyle=fill; ctx.fill();
}
function drawTileTop(gx,gy){
    const s=isoToScreen(gx+0.5,gy+0.5), t=tile(gx,gy);
    let col='#54b85a';
    if (t==='P') col='#e0c07a';
    else if (t==='W') col='#2b8fd0';
    else col = ((gx+gy)%2===0)?'#54b85a':'#4aad50';
    diamond(s.x,s.y,col);
    ctx.strokeStyle='rgba(0,0,0,.07)'; ctx.lineWidth=1; ctx.stroke();
    if (t==='W'){ ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fillRect(s.x-7, s.y-2+((Date.now()/120)%6), 14, 2); }
    // flores en el césped
    else if (t==='G' && ((gx*7+gy*13)%5===0)){
        ctx.fillStyle=['#ff6b9d','#ffd24a','#fff'][(gx+gy)%3];
        ctx.beginPath(); ctx.arc(s.x-6+((gx*3)%12), s.y+2, 2, 0, Math.PI*2); ctx.fill();
    }
}
function drawBuilding(gx,gy,isLiga){
    const s=isoToScreen(gx+0.5,gy+0.5), topY=s.y-BUILD_H;
    // caras laterales
    ctx.fillStyle=isLiga?'#9a5bd0':'#c98a5a';
    ctx.beginPath(); ctx.moveTo(s.x-TW/2,s.y); ctx.lineTo(s.x,s.y+TH/2); ctx.lineTo(s.x,s.y+TH/2-BUILD_H); ctx.lineTo(s.x-TW/2,s.y-BUILD_H); ctx.closePath(); ctx.fill();
    ctx.fillStyle=isLiga?'#7e45b0':'#a86f42';
    ctx.beginPath(); ctx.moveTo(s.x+TW/2,s.y); ctx.lineTo(s.x,s.y+TH/2); ctx.lineTo(s.x,s.y+TH/2-BUILD_H); ctx.lineTo(s.x+TW/2,s.y-BUILD_H); ctx.closePath(); ctx.fill();
    // puerta (cara izquierda) y ventana (cara derecha)
    ctx.fillStyle='#5b3a22';
    ctx.beginPath(); ctx.moveTo(s.x-16,s.y-6); ctx.lineTo(s.x-4,s.y); ctx.lineTo(s.x-4,s.y-20); ctx.lineTo(s.x-16,s.y-26); ctx.closePath(); ctx.fill();
    ctx.fillStyle=isLiga?'#d6b3ff':'#bfe0ff';
    ctx.beginPath(); ctx.moveTo(s.x+8,s.y-14); ctx.lineTo(s.x+18,s.y-19); ctx.lineTo(s.x+18,s.y-33); ctx.lineTo(s.x+8,s.y-28); ctx.closePath(); ctx.fill();
    // techo a dos aguas
    ctx.fillStyle=isLiga?'#c48bf0':'#c0493a';
    ctx.beginPath(); ctx.moveTo(s.x,topY-TH/2-10); ctx.lineTo(s.x+TW/2,topY); ctx.lineTo(s.x,topY+TH/2); ctx.lineTo(s.x-TW/2,topY); ctx.closePath(); ctx.fill();
    ctx.fillStyle=isLiga?'#a86de0':'#9c3a2e';
    ctx.beginPath(); ctx.moveTo(s.x,topY-TH/2-10); ctx.lineTo(s.x,topY+TH/2); ctx.lineTo(s.x-TW/2,topY); ctx.closePath(); ctx.fill();
    if (isLiga){
        ctx.fillStyle='#fff'; ctx.font='bold 10px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('LIGA', s.x, topY);
        if (nearLiga() && !challengeOpen){ ctx.fillStyle='#fffb8a'; ctx.font='bold 12px monospace'; ctx.fillText('[E]', s.x, topY-TH/2-22); }
    }
}
function drawTree(gx,gy){
    const s=isoToScreen(gx,gy);
    ctx.fillStyle='rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(s.x,s.y+4,12,5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#6b4a28'; ctx.fillRect(s.x-3,s.y-16,6,18);
    ctx.fillStyle='#2f8f4e'; ctx.beginPath(); ctx.arc(s.x,s.y-26,16,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#3ddc84'; ctx.beginPath(); ctx.arc(s.x-5,s.y-30,10,0,Math.PI*2); ctx.fill();
}
function drawLamp(gx,gy){
    const s=isoToScreen(gx,gy);
    ctx.fillStyle='#2b3440'; ctx.fillRect(s.x-2,s.y-34,4,34);
    ctx.fillStyle=Math.floor(Date.now()/600)%2?'#ffe9a0':'#ffd24a';
    ctx.beginPath(); ctx.arc(s.x,s.y-38,6,0,Math.PI*2); ctx.fill();
}
function drawNpc(n){
    const s=isoToScreen(n.gx,n.gy);
    ctx.fillStyle='rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(s.x,s.y+3,10,4,0,0,Math.PI*2); ctx.fill();
    // cuerpo (túnica) + cabeza + sombrero (aldeano original)
    ctx.fillStyle=n.robe; ctx.beginPath(); ctx.moveTo(s.x-9,s.y+2); ctx.lineTo(s.x+9,s.y+2); ctx.lineTo(s.x+6,s.y-16); ctx.lineTo(s.x-6,s.y-16); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#f1c9a5'; ctx.beginPath(); ctx.arc(s.x,s.y-20,7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=n.hat; ctx.beginPath(); ctx.moveTo(s.x-9,s.y-23); ctx.lineTo(s.x+9,s.y-23); ctx.lineTo(s.x,s.y-34); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#000'; ctx.fillRect(s.x-3,s.y-21,1.5,1.5); ctx.fillRect(s.x+2,s.y-21,1.5,1.5);
}
function drawSign(sg){
    const s=isoToScreen(sg.gx,sg.gy);
    ctx.fillStyle='#6b4a28'; ctx.fillRect(s.x-2,s.y-20,4,20);
    ctx.fillStyle='#caa26a'; ctx.fillRect(s.x-14,s.y-34,28,16);
    ctx.strokeStyle='#5b3a22'; ctx.lineWidth=2; ctx.strokeRect(s.x-14,s.y-34,28,16);
    ctx.fillStyle='#5b3a22'; for (let i=0;i<3;i++) ctx.fillRect(s.x-10,s.y-31+i*4,20,1);
}
function drawPlayer(){
    const s=isoToScreen(player.gx,player.gy), PSIZE=78;
    ctx.fillStyle='rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(s.x,s.y+6,16,7,0,0,Math.PI*2); ctx.fill();
    const list=player.moving?sprites.walk:sprites.idle;
    const img=list[Math.floor(player.animFrame)%list.length]||sprites.idle[0];
    const dx=s.x-PSIZE/2, dy=s.y+8-PSIZE;
    if (img&&img.complete&&img.naturalWidth){
        if (player.facing==='left'){ ctx.save(); ctx.translate(dx+PSIZE,dy); ctx.scale(-1,1); ctx.drawImage(img,0,0,PSIZE,PSIZE); ctx.restore(); }
        else ctx.drawImage(img,dx,dy,PSIZE,PSIZE);
    }
}
function drawBubble(screenX, screenY, text){
    ctx.font='12px monospace';
    const maxw=200; const words=text.split(' '); const lines=[]; let cur='';
    for (const w of words){ if (ctx.measureText(cur+w).width>maxw){ lines.push(cur); cur=w+' '; } else cur+=w+' '; }
    if (cur) lines.push(cur);
    const bw=Math.min(maxw+16, Math.max(...lines.map(l=>ctx.measureText(l).width))+16);
    const bh=lines.length*16+12;
    let bx=screenX-bw/2, by=screenY-bh-10;
    bx=Math.max(6, Math.min(cv.width-bw-6, bx)); by=Math.max(28, by);
    ctx.fillStyle='rgba(255,255,255,.96)'; ctx.strokeStyle='#223049'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,8); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(screenX-6,by+bh); ctx.lineTo(screenX+6,by+bh); ctx.lineTo(screenX,by+bh+8); ctx.closePath(); ctx.fillStyle='rgba(255,255,255,.96)'; ctx.fill();
    ctx.fillStyle='#0d1117'; ctx.textAlign='left'; ctx.textBaseline='top';
    lines.forEach((l,i)=>ctx.fillText(l.trim(), bx+8, by+7+i*16));
}

function draw(){
    const g=ctx.createLinearGradient(0,0,0,cv.height); g.addColorStop(0,'#bfe9ff'); g.addColorStop(1,'#eafff0');
    ctx.fillStyle=g; ctx.fillRect(0,0,cv.width,cv.height);

    for (let gy=0; gy<MH; gy++) for (let gx=0; gx<MW; gx++) drawTileTop(gx,gy);

    // objetos ordenados por profundidad (gx+gy)
    const objs=[];
    for (let gy=0; gy<MH; gy++) for (let gx=0; gx<MW; gx++){
        const t=tile(gx,gy);
        if (t==='B') objs.push({d:gx+gy, f:()=>drawBuilding(gx,gy,false)});
        if (t==='L') objs.push({d:gx+gy, f:()=>drawBuilding(gx,gy,true)});
    }
    for (const [x,y] of trees) objs.push({d:x+y, f:()=>drawTree(x,y)});
    for (const [x,y] of lamps) objs.push({d:x+y, f:()=>drawLamp(x,y)});
    for (const n of npcs) objs.push({d:n.gx+n.gy, f:()=>drawNpc(n)});
    for (const sg of signs) objs.push({d:sg.gx+sg.gy, f:()=>drawSign(sg)});
    objs.push({d:player.gx+player.gy, f:drawPlayer});
    objs.sort((a,b)=>a.d-b.d);
    for (const o of objs) o.f();

    // diálogo: aldeano/cartel más cercano dentro de rango
    let best=null, bd=1.9;
    for (const n of npcs){ const d=Math.hypot(player.gx-n.gx,player.gy-n.gy); if (d<bd){ bd=d; best={e:n,say:n.say}; } }
    for (const sg of signs){ const d=Math.hypot(player.gx-sg.gx,player.gy-sg.gy); if (d<bd){ bd=d; best={e:sg,say:sg.say}; } }
    if (best && !challengeOpen){ const s=isoToScreen(best.e.gx,best.e.gy); drawBubble(s.x, s.y-30, best.say); }

    ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(cv.width/2-155,6,310,24);
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
