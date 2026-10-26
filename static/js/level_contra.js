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
    // puentes de tablas sobre el agua (estética Contra)
    {x:600,  y:318, w:140, h:14, bridge:true},
    {x:1380, y:318, w:140, h:14, bridge:true},
    {x:2220, y:318, w:140, h:14, bridge:true},
];
// zonas de agua (huecos entre segmentos de suelo): caer ahí = reaparecer
const WATER_Y = 384;

const PW=40, PH=66, PSIZE=115;   // Fabiancho +25% (sprite); hitbox PW/PH sin cambios
const player = { x:40, y:250, vx:0, vy:0, facing:'right', onGround:false,
    jumping:false, animFrame:0, animTimer:0, bvx:0 };
let lastSafe = { x:40, y:250 };

const GUARD = { x:3180, y:330-70 };   // puesto de guardia sobre el suelo final

// Soldados Contra que patrullan, empujan y disparan bolas
const SOLDIER_Y = 330 - 68;   // más arriba (antes quedaban hundidos en el suelo)
const soldiers = [
    { x:320,  y:SOLDIER_Y, dir:1, min:60,   max:540,  f:0, ft:0, fire:900 },
    { x:1000, y:SOLDIER_Y, dir:1, min:760,  max:1340, f:0, ft:0, fire:1300 },
    { x:1200, y:SOLDIER_Y, dir:-1,min:760,  max:1340, f:0, ft:0, fire:1800 },
    { x:1700, y:SOLDIER_Y, dir:-1,min:1520, max:2180, f:0, ft:0, fire:1500 },
    { x:2050, y:SOLDIER_Y, dir:1, min:1520, max:2180, f:0, ft:0, fire:2200 },
    { x:2550, y:SOLDIER_Y, dir:1, min:2380, max:3080, f:0, ft:0, fire:1100 },
    { x:2900, y:SOLDIER_Y, dir:-1,min:2380, max:3080, f:0, ft:0, fire:2600 },
];
const bullets = [];   // bolas disparadas

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
        const scx=s.x+19, scy=s.y+30, dx=pcx-scx, dy=pcy-scy, d=Math.hypot(dx,dy)||1;
        // mira hacia el jugador si está cerca
        if (Math.abs(dx)<560) s.dir = dx<0?-1:1;
        // empuje al contacto directo
        if (d<48){ player.bvx += (dx/d)*8; player.vy += -2; }
        // disparar una bola hacia el jugador
        s.fire -= dt;
        if (s.fire<=0 && Math.abs(dx)<560){
            const sp=4.3;
            bullets.push({ x:scx, y:scy, vx:(dx/d)*sp, vy:(dy/d)*sp*0.5, ttl:2200 });
            s.fire = 935 + Math.random()*715;   // 45% más rápido que antes (1700+1300 -> *0.55)
        }
    }
    // separación entre soldados (que no se queden unidos en uno)
    const SEP = 42;
    for (let i=0;i<soldiers.length;i++){
        for (let j=i+1;j<soldiers.length;j++){
            const a=soldiers[i], b=soldiers[j];
            if (Math.abs(a.y-b.y) > 30) continue;   // solo si están a la misma altura
            const dx=(b.x+19)-(a.x+19);
            if (Math.abs(dx)<SEP){
                const push=(SEP-Math.abs(dx))/2, dir=dx<0?-1:1;
                a.x-=dir*push; b.x+=dir*push;
                a.x=Math.max(a.min,Math.min(a.max,a.x));
                b.x=Math.max(b.min,Math.min(b.max,b.x));
            }
        }
    }

    // mover/colisionar bolas
    for (const b of bullets){
        b.x += b.vx; b.y += b.vy; b.ttl -= dt;
        const bdx=pcx-b.x, bdy=pcy-b.y;
        if (Math.hypot(bdx,bdy) < 34){   // impacto: EMPUJA (no mata)
            player.bvx += (b.vx>0?1:-1)*11;
            player.vy  += -4;
            b.ttl = 0;
        }
    }
    for (let i=bullets.length-1;i>=0;i--){ if (bullets[i].ttl<=0) bullets.splice(i,1); }
}

function hill(cam, par, base, amp, step, color){
    ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(0,cv.height);
    const off=(cam*par)%step;
    for (let x=-off; x<=cv.width+step; x+=step){
        ctx.lineTo(x, base); ctx.lineTo(x+step/2, base-amp);
    }
    ctx.lineTo(cv.width,cv.height); ctx.closePath(); ctx.fill();
}
function drawBg(cam){
    // cielo nocturno de jungla
    const g=ctx.createLinearGradient(0,0,0,cv.height);
    g.addColorStop(0,'#071327'); g.addColorStop(0.5,'#0c2a2c'); g.addColorStop(1,'#0a2218');
    ctx.fillStyle=g; ctx.fillRect(0,0,cv.width,cv.height);
    // luna
    ctx.fillStyle='#d7e3c8'; ctx.beginPath(); ctx.arc(cv.width-90,70,26,0,Math.PI*2); ctx.fill();
    // montañas lejanas con cumbres nevadas (parallax lento)
    const moff=(cam*0.1)%320;
    for (let i=-1;i<10;i++){
        const mx=i*320 - moff, peak=108, by=235;
        ctx.fillStyle='#223a4e';
        ctx.beginPath(); ctx.moveTo(mx,by); ctx.lineTo(mx+160,peak); ctx.lineTo(mx+320,by); ctx.closePath(); ctx.fill();
        // nieve en la cima
        ctx.fillStyle='#e8eef0';
        ctx.beginPath(); ctx.moveTo(mx+128,peak+30); ctx.lineTo(mx+160,peak); ctx.lineTo(mx+192,peak+30);
        ctx.lineTo(mx+176,peak+24); ctx.lineTo(mx+160,peak+34); ctx.lineTo(mx+144,peak+24); ctx.closePath(); ctx.fill();
    }
    // capas de selva (parallax)
    hill(cam,0.15, 230, 120, 260, '#0f2e3a');
    hill(cam,0.30, 250, 150, 200, '#123a30');
    hill(cam,0.50, 275, 120, 150, '#16492f');
    // copas de árboles cercanas
    ctx.fillStyle='#0d3322';
    for (let i=-1;i<10;i++){ const tx=i*150 - (cam*0.5)%150; ctx.beginPath();
        ctx.arc(tx,290,46,Math.PI,0); ctx.fill(); }
    // agua
    const w=ctx.createLinearGradient(0,WATER_Y,0,cv.height);
    w.addColorStop(0,'#1d7fa8'); w.addColorStop(1,'#0b4a6b');
    ctx.fillStyle=w; ctx.fillRect(0, WATER_Y, cv.width, cv.height-WATER_Y);
    // reflejo
    ctx.fillStyle='rgba(255,255,255,.08)';
    for (let i=0;i<cv.width;i+=40){ ctx.fillRect(i+((Date.now()/80)%40), WATER_Y+10, 18, 2); }
}
function drawPlat(p, cam){
    const x=p.x-cam;
    if (x>cv.width || x+p.w<0) return;
    if (p.bridge){
        // puente de tablas con cuerdas (estética Contra)
        ctx.strokeStyle='#5b3c1c'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(x,p.y); ctx.lineTo(x+p.w,p.y); ctx.stroke();
        for (let i=0;i<=p.w;i+=12){
            ctx.fillStyle=(i/12)%2?'#8a5a2c':'#9c6a34';
            ctx.fillRect(x+i, p.y, 10, p.h);
        }
        ctx.strokeStyle='#3a2612'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(x,p.y+p.h); ctx.lineTo(x+p.w,p.y+p.h); ctx.stroke();
        return;
    }
    // acantilado: tierra + roca + césped encima
    ctx.fillStyle='#5a3d22'; ctx.fillRect(x,p.y,p.w,p.h);
    ctx.fillStyle='#6b4a28'; ctx.fillRect(x+2,p.y+8,p.w-4,p.h-8);
    // vetas de roca
    ctx.fillStyle='rgba(0,0,0,.18)';
    for (let i=10;i<p.w;i+=46) ctx.fillRect(x+i, p.y+16, 3, p.h-18);
    // césped con borde irregular
    ctx.fillStyle='#3ddc84'; ctx.fillRect(x,p.y,p.w,9);
    ctx.fillStyle='#2ea968'; ctx.fillRect(x,p.y+9,p.w,5);
    ctx.fillStyle='#3ddc84';
    for (let i=0;i<p.w;i+=10) ctx.fillRect(x+i, p.y-3, 5, 4);
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

    // soldados (sombra en el suelo, aunque el sprite esté más arriba)
    for (const s of soldiers){
        const x=s.x-cam; if (x>cv.width||x+40<0) continue;
        ctx.fillStyle='rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(x+19, 328, 15,4,0,0,Math.PI*2); ctx.fill();
        drawSprite(soldierImg, (Math.floor(s.f)%4)*23,0,23,38, x, s.y, 38, 62, s.dir>0);
    }

    // bolas disparadas
    for (const b of bullets){
        const x=b.x-cam; if (x<-20||x>cv.width+20) continue;
        ctx.save();
        ctx.shadowBlur=12; ctx.shadowColor='#ffb454';
        ctx.fillStyle='#ffd24a'; ctx.beginPath(); ctx.arc(x,b.y,8,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ff8a3d'; ctx.beginPath(); ctx.arc(x,b.y,4,0,Math.PI*2); ctx.fill();
        ctx.restore();
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
