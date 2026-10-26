// ====================================================================
//  Nivel 2 - Contra: side-scroller (jungla) con Fabiancho
//  Corre y salta por plataformas hasta el PUESTO DE GUARDIA y pulsa E.
//  Soldados Contra patrullan y empujan. Reto: carga insegura de archivos.
// ====================================================================
const cv = document.getElementById('arena');
const ctx = cv.getContext('2d');
cv.width = 760; cv.height = 420;

const WORLD_W = 3400;
const GRAV = 0.7, JUMP = -13.5, SPEED = 3.4;

function loadImg(src){ const i = new Image(); i.src = src; return i; }
const sprites = { idle:[], walk:[], jump:[] };
for (let i=1;i<=4;i++) sprites.idle.push(loadImg(`/static/img/skeli_fixed/idle/idle${i}.png`));
for (let i=1;i<=6;i++) sprites.walk.push(loadImg(`/static/img/skeli_fixed/walk/walk${i}.png`));
for (let i=1;i<=4;i++) sprites.jump.push(loadImg(`/static/img/skeli_fixed/jump/jump${i}.png`));
const soldierImg = loadImg('/static/img/markers/contra.png');  // 4 frames 23x38

// --- Plataformas (jungla con huecos de agua) ---
const plats = [
    {x:0,    y:330, w:600,  h:120},
    {x:740,  y:330, w:640,  h:120},
    {x:1520, y:330, w:700,  h:120},
    {x:2360, y:330, w:1040, h:120},
    // flotantes
    {x:360,  y:250, w:120, h:20},
    {x:880,  y:250, w:120, h:20},
    {x:1140, y:205, w:120, h:20},
    {x:1660, y:250, w:140, h:20},
    {x:2000, y:215, w:120, h:20},
    {x:2500, y:250, w:150, h:20},
];
// zonas de agua (huecos entre segmentos de suelo): caer ahí = reaparecer
const WATER_Y = 390;

const PW=40, PH=66, PSIZE=92;   // caja de colisión vs sprite dibujado
const player = { x:40, y:250, vx:0, vy:0, facing:'right', onGround:false,
    jumping:false, animFrame:0, animTimer:0, bvx:0 };
let lastSafe = { x:40, y:250 };

const GUARD = { x:3180, y:330-70 };   // puesto de guardia sobre el suelo final

// Soldados Contra que patrullan y empujan
const soldiers = [
    { x:1000, y:330-38, dir:1, min:760,  max:1340, f:0, ft:0 },
    { x:1800, y:330-38, dir:-1,min:1520, max:2180, f:0, ft:0 },
    { x:2700, y:330-38, dir:1, min:2380, max:3100, f:0, ft:0 },
];

const keys = { left:false, right:false, up:false };
let challengeOpen = false;

function typingInField(e){ const t=e.target||document.activeElement;
    return t && (t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable); }

window.addEventListener('keydown', e=>{
    if (typingInField(e) || challengeOpen) return;
    if (['a','A','ArrowLeft'].includes(e.key)) keys.left=true;
    if (['d','D','ArrowRight'].includes(e.key)) keys.right=true;
    if (['w','W','ArrowUp',' '].includes(e.key)){ keys.up=true; e.preventDefault(); }
    if ((e.key==='e'||e.key==='E') && nearGuard()) openChallenge();
    if (['ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
});
window.addEventListener('keyup', e=>{
    if (typingInField(e)) return;
    if (['a','A','ArrowLeft'].includes(e.key)) keys.left=false;
    if (['d','D','ArrowRight'].includes(e.key)) keys.right=false;
    if (['w','W','ArrowUp',' '].includes(e.key)) keys.up=false;
});
window.addEventListener('blur', ()=>{ keys.left=keys.right=keys.up=false; });

function overlap(ax,ay,aw,ah,bx,by,bw,bh){ return ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by; }

function nearGuard(){ return Math.abs((player.x+PW/2)-(GUARD.x+30)) < 70 && Math.abs(player.y-GUARD.y) < 120; }

function updatePlayer(dt){
    if (challengeOpen){ return; }
    // horizontal
    player.vx = 0;
    if (keys.left){ player.vx=-SPEED; player.facing='left'; }
    if (keys.right){ player.vx=SPEED; player.facing='right'; }
    let tvx = player.vx + player.bvx;
    player.x += tvx;
    for (const p of plats){
        if (overlap(player.x,player.y,PW,PH,p.x,p.y,p.w,p.h)){
            if (tvx>0) player.x = p.x-PW; else if (tvx<0) player.x = p.x+p.w;
        }
    }
    player.bvx *= 0.85;
    if (player.x<0) player.x=0;
    if (player.x>WORLD_W-PW) player.x=WORLD_W-PW;

    // salto
    if (keys.up && player.onGround){ player.vy=JUMP; player.onGround=false; player.jumping=true; }
    // vertical
    player.vy += GRAV; if (player.vy>16) player.vy=16;
    player.y += player.vy;
    player.onGround=false;
    for (const p of plats){
        if (overlap(player.x,player.y,PW,PH,p.x,p.y,p.w,p.h)){
            if (player.vy>0){ player.y=p.y-PH; player.vy=0; player.onGround=true; player.jumping=false; }
            else if (player.vy<0){ player.y=p.y+p.h; player.vy=0; }
        }
    }
    if (player.onGround){ lastSafe={x:player.x,y:player.y-2}; }

    // caer al agua / vacío -> reaparecer en el último sitio seguro
    if (player.y > cv.height+80){ player.x=lastSafe.x; player.y=lastSafe.y; player.vy=0; player.bvx=0; }

    // animación
    const moving = player.vx!==0;
    player.animTimer+=dt;
    if (player.animTimer > (moving?85:170)){ player.animFrame++; player.animTimer=0; }
}

function updateSoldiers(dt){
    if (challengeOpen) return;
    const pcx=player.x+PW/2, pcy=player.y+PH/2;
    for (const s of soldiers){
        s.x += s.dir*1.4;
        if (s.x<s.min){ s.x=s.min; s.dir=1; } if (s.x>s.max){ s.x=s.max; s.dir=-1; }
        s.ft+=dt; if (s.ft>130){ s.f++; s.ft=0; }
        // empuje al contacto
        const scx=s.x+16, scy=s.y+19, dx=pcx-scx, dy=pcy-scy, d=Math.hypot(dx,dy);
        if (d<46 && d>0){ player.bvx += (dx/d)*8; player.vy += -2; }
    }
}

function drawBg(cam){
    // cielo
    const g=ctx.createLinearGradient(0,0,0,cv.height);
    g.addColorStop(0,'#0a1830'); g.addColorStop(0.6,'#143a2a'); g.addColorStop(1,'#0d2a1e');
    ctx.fillStyle=g; ctx.fillRect(0,0,cv.width,cv.height);
    // montañas parallax
    ctx.fillStyle='#0e2740';
    for (let i=-1;i<8;i++){ const mx=i*400 - (cam*0.3)%400; ctx.beginPath();
        ctx.moveTo(mx,200); ctx.lineTo(mx+200,90); ctx.lineTo(mx+400,200); ctx.closePath(); ctx.fill(); }
    // agua (al fondo, donde no hay suelo)
    ctx.fillStyle='#0b4a6b';
    ctx.fillRect(0, WATER_Y, cv.width, cv.height-WATER_Y);
}
function drawPlat(p, cam){
    const x=p.x-cam;
    if (x>cv.width || x+p.w<0) return;
    // tierra
    ctx.fillStyle='#6b4a28'; ctx.fillRect(x,p.y,p.w,p.h);
    ctx.fillStyle='#7d5730'; ctx.fillRect(x+2,p.y+6,p.w-4,p.h-6);
    // césped arriba
    ctx.fillStyle='#3ddc84'; ctx.fillRect(x,p.y,p.w,8);
    ctx.fillStyle='#2ea968'; ctx.fillRect(x,p.y+8,p.w,4);
}
function drawGuard(cam){
    const x=GUARD.x-cam, y=GUARD.y;
    if (x>cv.width || x+60<0) return;
    ctx.fillStyle='#2b3440'; ctx.fillRect(x,y,60,70);
    ctx.fillStyle='#1b2330'; ctx.fillRect(x+8,y+12,44,30);
    ctx.fillStyle=Math.floor(Date.now()/500)%2?'#ffb454':'#b07a30';
    ctx.fillRect(x+14,y+18,32,18);
    ctx.fillStyle='#0d1117'; ctx.font='9px monospace'; ctx.textAlign='center';
    ctx.fillText('PUESTO', x+30, y+31);
    if (nearGuard() && !challengeOpen){ ctx.fillStyle='#fff'; ctx.font='bold 13px monospace'; ctx.fillText('[E]', x+30, y-8); }
}
function drawSprite(img,sx,sy,sw,sh,dx,dy,dw,dh,flip){
    if (!img.complete||!img.naturalWidth) return;
    if (flip){ ctx.save(); ctx.translate(dx+dw,dy); ctx.scale(-1,1); ctx.drawImage(img,sx,sy,sw,sh,0,0,dw,dh); ctx.restore(); }
    else ctx.drawImage(img,sx,sy,sw,sh,dx,dy,dw,dh);
}

function draw(){
    const cam = Math.max(0, Math.min(WORLD_W-cv.width, player.x+PW/2-cv.width/2));
    drawBg(cam);
    for (const p of plats) drawPlat(p, cam);
    drawGuard(cam);

    // soldados
    for (const s of soldiers){
        const x=s.x-cam; if (x>cv.width||x+40<0) continue;
        ctx.fillStyle='rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(x+16, s.y+38, 14,4,0,0,Math.PI*2); ctx.fill();
        drawSprite(soldierImg, (Math.floor(s.f)%4)*23,0,23,38, x, s.y, 38, 62, s.dir>0);
    }

    // Fabiancho
    let list=sprites.idle, fcount=4;
    if (player.jumping){ list=sprites.jump; fcount=4; }
    else if (player.vx!==0){ list=sprites.walk; fcount=6; }
    const img=list[Math.floor(player.animFrame)%fcount]||sprites.idle[0];
    const dx=player.x-cam-(PSIZE-PW)/2, dy=player.y-(PSIZE-PH);
    if (img&&img.complete&&img.naturalWidth){
        if (player.facing==='left'){ ctx.save(); ctx.translate(dx+PSIZE,dy); ctx.scale(-1,1); ctx.drawImage(img,0,0,PSIZE,PSIZE); ctx.restore(); }
        else ctx.drawImage(img, dx, dy, PSIZE, PSIZE);
    }

    // título dentro del canvas
    ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(cv.width/2-150,5,300,26);
    ctx.fillStyle='#ffb454'; ctx.font='bold 14px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('NIVEL 2  ·  CONTRA', cv.width/2, 19);
}

let last=performance.now();
function loop(t){ const dt=t-last; last=t; updatePlayer(dt); updateSoldiers(dt); draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);

function openChallenge(){ challengeOpen=true; keys.left=keys.right=keys.up=false;
    document.getElementById('challenge').classList.add('show'); }
function closeChallenge(){ challengeOpen=false; document.getElementById('challenge').classList.remove('show'); }
window._closeChallenge = closeChallenge;
