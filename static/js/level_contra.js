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
const sceneryCanvas = document.createElement('canvas');
sceneryCanvas.width = WORLD_W;
sceneryCanvas.height = cv.height;
const sceneryCtx = sceneryCanvas.getContext('2d');
const terrainCanvas = document.createElement('canvas');
terrainCanvas.width = WORLD_W;
terrainCanvas.height = cv.height;
const terrainCtx = terrainCanvas.getContext('2d');

function loadImg(src){ const i = new Image(); i.src = src; return i; }
const sprites = { idle:[], walk:[], jump:[] };
for (let i=1;i<=4;i++) sprites.idle.push(loadImg(`/static/img/skeli_fixed/idle/idle${i}.png`));
for (let i=1;i<=6;i++) sprites.walk.push(loadImg(`/static/img/skeli_fixed/walk/walk${i}.png`));
for (let i=1;i<=4;i++) sprites.jump.push(loadImg(`/static/img/skeli_fixed/jump/jump${i}.png`));
const soldierImg = loadImg('/static/img/markers/contra.png');  // 4 frames 23x38

// --- Plataformas (jungla con huecos de agua) ---
const plats = [
    {x:0,    y:250, w:520, h:100},
    {x:600,  y:244, w:470, h:106},
    {x:1150, y:260, w:340, h:90},
    {x:1570, y:228, w:370, h:122},
    {x:1990, y:248, w:420, h:102},
    {x:2470, y:236, w:350, h:114},
    {x:2870, y:258, w:530, h:92},
    // ledges step up and down along the jungle cliffs
    {x:330,  y:198, w:100, h:18},
    {x:740,  y:186, w:110, h:18},
    {x:970,  y:210, w:90,  h:18},
    {x:1230, y:208, w:110, h:18},
    {x:1370, y:166, w:100, h:18},
    {x:1650, y:184, w:120, h:18},
    {x:1800, y:146, w:100, h:18},
    {x:2060, y:198, w:130, h:18},
    {x:2290, y:180, w:100, h:18},
    {x:2520, y:186, w:100, h:18},
    {x:2670, y:154, w:110, h:18},
    {x:2990, y:206, w:120, h:18},
    // short bridges link the changing shoreline heights
    {x:520,  y:247, w:80, h:14, bridge:true},
    {x:1070, y:252, w:80, h:14, bridge:true},
    {x:1490, y:244, w:80, h:14, bridge:true},
    {x:1940, y:238, w:50, h:14, bridge:true},
    {x:2410, y:242, w:60, h:14, bridge:true},
    {x:2820, y:247, w:50, h:14, bridge:true},
];
// zonas de agua (huecos entre segmentos de suelo): caer ahí = reaparecer
const WATER_Y = 350;

const PW=40, PH=66, PSIZE=115;   // Fabiancho +25% (sprite); hitbox PW/PH sin cambios
const player = { x:40, y:170, vx:0, vy:0, facing:'right', onGround:false,
    jumping:false, animFrame:0, animTimer:0, bvx:0 };
let lastSafe = { x:40, y:170 };

const GUARD = { x:3180, y:258-70 };

// Soldados Contra que patrullan, empujan y disparan bolas
const soldiers = [
    { x:320,  y:182, dir:1,  min:60,   max:470,  f:0, ft:0, fire:900 },
    { x:760,  y:176, dir:1,  min:640,  max:1000, f:0, ft:0, fire:1300 },
    { x:960,  y:176, dir:-1, min:640,  max:1000, f:0, ft:0, fire:1800 },
    { x:1290, y:192, dir:-1, min:1180, max:1450, f:0, ft:0, fire:1500 },
    { x:1740, y:160, dir:1,  min:1620, max:1900, f:0, ft:0, fire:2200 },
    { x:2100, y:180, dir:1,  min:2040, max:2370, f:0, ft:0, fire:1100 },
    { x:2550, y:168, dir:-1, min:2500, max:2780, f:0, ft:0, fire:2600 },
    { x:3000, y:190, dir:1,  min:2910, max:3300, f:0, ft:0, fire:1600 },
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
        s.x += s.dir*2.1;   // recorren más de lado a lado
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
        if (Math.hypot(bdx,bdy) < 34){   // impacto: EMPUJA más fuerte (no mata)
            player.bvx += (b.vx>0?1:-1)*16;
            player.vy  += -5.5;
            b.ttl = 0;
        }
    }
    for (let i=bullets.length-1;i>=0;i--){ if (bullets[i].ttl<=0) bullets.splice(i,1); }
}

function buildScenery(){
    const g=sceneryCtx.createLinearGradient(0,0,0,cv.height);
    g.addColorStop(0,'#03060a'); g.addColorStop(.58,'#07131d'); g.addColorStop(1,'#103b33');
    sceneryCtx.fillStyle=g; sceneryCtx.fillRect(0,0,WORLD_W,cv.height);
    for(let x=14,index=0;x<WORLD_W;x+=46,index++){
        const sy=18+(index*37%112);
        sceneryCtx.fillStyle=index%3===0?'#62d9f4':'#d7e8e9';
        sceneryCtx.fillRect(x,sy,index%4===0?2:1,index%4===0?2:1);
    }
    for(let mx=-100,index=0;mx<WORLD_W;mx+=240,index++){
        const base=226, peak=112+(index%3)*15;
        sceneryCtx.fillStyle=index%2?'#253844':'#1b303a';
        sceneryCtx.beginPath(); sceneryCtx.moveTo(mx,base); sceneryCtx.lineTo(mx+67,peak+56); sceneryCtx.lineTo(mx+116,peak);
        sceneryCtx.lineTo(mx+181,peak+62); sceneryCtx.lineTo(mx+240,base); sceneryCtx.closePath(); sceneryCtx.fill();
        sceneryCtx.fillStyle='#b9c9c8';
        sceneryCtx.beginPath(); sceneryCtx.moveTo(mx+91,peak+39); sceneryCtx.lineTo(mx+116,peak); sceneryCtx.lineTo(mx+141,peak+38);
        sceneryCtx.lineTo(mx+125,peak+31); sceneryCtx.lineTo(mx+116,peak+38); sceneryCtx.lineTo(mx+106,peak+30); sceneryCtx.closePath(); sceneryCtx.fill();
        sceneryCtx.fillStyle='#edf2e8';
        sceneryCtx.beginPath(); sceneryCtx.moveTo(mx+57,peak+73); sceneryCtx.lineTo(mx+67,peak+56); sceneryCtx.lineTo(mx+78,peak+76);
        sceneryCtx.lineTo(mx+68,peak+71); sceneryCtx.closePath(); sceneryCtx.fill();
    }
    for(let x=-30,index=0;x<WORLD_W;x+=34,index++){
        sceneryCtx.fillStyle='#173c24'; sceneryCtx.fillRect(x+13,218,8,35);
        sceneryCtx.fillStyle='#174b27';
        sceneryCtx.beginPath(); sceneryCtx.arc(x+17,215,19,0,Math.PI*2); sceneryCtx.arc(x+5,224,13,0,Math.PI*2);
        sceneryCtx.arc(x+28,224,14,0,Math.PI*2); sceneryCtx.fill();
        sceneryCtx.fillStyle='#237335';
        sceneryCtx.beginPath(); sceneryCtx.arc(x+13,209,11,0,Math.PI*2); sceneryCtx.arc(x+25,216,10,0,Math.PI*2);
        sceneryCtx.arc(x+2,218,8,0,Math.PI*2); sceneryCtx.fill();
        sceneryCtx.fillStyle='#49a637';
        sceneryCtx.fillRect(x+7,205,5,3); sceneryCtx.fillRect(x+23,211,4,3);
    }
}
function drawBg(cam){
    ctx.drawImage(sceneryCanvas,cam,0,cv.width,cv.height,0,0,cv.width,cv.height);
    const w=ctx.createLinearGradient(0,WATER_Y,0,cv.height);
    w.addColorStop(0,'#159bf2'); w.addColorStop(.28,'#087be5'); w.addColorStop(1,'#0753c5');
    ctx.fillStyle=w; ctx.fillRect(0, WATER_Y, cv.width, cv.height-WATER_Y);
    const waveOffset=(Date.now()/55)%44;
    for(let i=-1;i<20;i++){
        const wx=i*44-waveOffset+(cam%44), wy=WATER_Y+12+(i%3)*12;
        ctx.fillStyle='rgba(190,238,255,.52)'; ctx.fillRect(wx,wy,18,2);
        ctx.fillStyle='rgba(47,183,255,.65)'; ctx.fillRect(wx+11,wy+5,23,2);
    }
}
function drawPlat(p, cam, targetCtx=ctx){
    const x=p.x-cam;
    if (targetCtx===ctx && (x>cv.width || x+p.w<0)) return;
    if (p.bridge){
        targetCtx.fillStyle='#27313a'; targetCtx.fillRect(x,p.y,p.w,p.h);
        targetCtx.fillStyle='#aab4b8'; targetCtx.fillRect(x,p.y,p.w,3);
        targetCtx.fillStyle='#65747c'; targetCtx.fillRect(x,p.y+11,p.w,3);
        for(let i=0;i<=p.w;i+=20){
            targetCtx.fillStyle='#d8dfdc'; targetCtx.fillRect(x+i,p.y-16,3,16);
            targetCtx.fillStyle='#e93f37'; targetCtx.fillRect(x+i+4,p.y-12,10,3);
            targetCtx.fillStyle='#283743'; targetCtx.fillRect(x+i,p.y+3,3,11);
            targetCtx.fillStyle='#9da9ad'; targetCtx.fillRect(x+i+4,p.y+5,12,3);
        }
        targetCtx.fillStyle='#879398'; targetCtx.fillRect(x,p.y+4,p.w,2);
        return;
    }
    if(p.h<=20){
        targetCtx.fillStyle='#533d1f'; targetCtx.fillRect(x,p.y+5,p.w,p.h-5);
        targetCtx.fillStyle='#99702e'; targetCtx.fillRect(x+3,p.y+6,p.w-6,5);
        targetCtx.fillStyle='#5dcc3f'; targetCtx.fillRect(x,p.y-3,p.w,7);
        targetCtx.fillStyle='#a4e94b';
        for(let i=3;i<p.w;i+=12) targetCtx.fillRect(x+i,p.y-5+(i%3),6,3);
        return;
    }
    const worldX=localX=>p.x+localX;
    const shoreY=localX=>{
        const wx=worldX(localX);
        const seed=Math.sin(Math.floor(wx/shoreStep)*127.1+p.x*311.7)*43758.5453;
        const irregular=seed-Math.floor(seed);
        return p.y+p.h+10+irregular*19+Math.abs(Math.sin(wx*.017))*8;
    };
    const shoreStep=18;
    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.moveTo(x,p.y+9);
    targetCtx.lineTo(x+p.w,p.y+9);
    targetCtx.lineTo(x+p.w,shoreY(p.w));
    for(let localX=p.w-shoreStep;localX>0;localX-=shoreStep){
        targetCtx.lineTo(x+localX,shoreY(localX));
    }
    targetCtx.lineTo(x,shoreY(0));
    targetCtx.closePath();
    targetCtx.fillStyle='#523719';
    targetCtx.fill();
    targetCtx.clip();
    for(let row=0;row<Math.ceil((p.h+36)/25);row++){
        for(let col=0;col<p.w;col+=42){
            const rx=x+col+(row%2?7:0), rw=Math.min(42,x+p.w-rx);
            if(rx>=x+p.w) continue;
            const rh=23+(row+col/42)%3*2, ry=p.y+12+row*25;
            const stone=(row+col/42)%3;
            targetCtx.fillStyle=stone===0?'#c08b2c':stone===1?'#a87824':'#d0a13a';
            targetCtx.beginPath(); targetCtx.moveTo(rx+2,ry+7); targetCtx.lineTo(rx+9,ry+2);
            targetCtx.lineTo(rx+rw-6,ry); targetCtx.lineTo(rx+rw-1,ry+8);
            targetCtx.lineTo(rx+rw-5,ry+rh-3); targetCtx.lineTo(rx+rw-14,ry+rh);
            targetCtx.lineTo(rx+4,ry+rh-4); targetCtx.closePath(); targetCtx.fill();
            targetCtx.fillStyle='rgba(255,224,123,.58)';
            targetCtx.beginPath(); targetCtx.moveTo(rx+9,ry+4); targetCtx.lineTo(rx+rw*.65,ry+3);
            targetCtx.lineTo(rx+rw*.48,ry+rh*.48); targetCtx.lineTo(rx+5,ry+rh*.58); targetCtx.closePath(); targetCtx.fill();
            targetCtx.fillStyle='rgba(48,34,13,.44)';
            targetCtx.beginPath(); targetCtx.moveTo(rx+rw*.58,ry+rh*.46); targetCtx.lineTo(rx+rw-4,ry+8);
            targetCtx.lineTo(rx+rw-5,ry+rh-3); targetCtx.lineTo(rx+rw-14,ry+rh); targetCtx.closePath(); targetCtx.fill();
        }
    }
    targetCtx.restore();
    targetCtx.fillStyle='#328b22'; targetCtx.fillRect(x,p.y,p.w,11);
    targetCtx.fillStyle='#64d832'; targetCtx.fillRect(x,p.y,p.w,6);
    targetCtx.fillStyle='#b4ef4b';
    for(let i=0;i<p.w;i+=9) targetCtx.fillRect(x+i,p.y-3+(i%3),5,4);
    targetCtx.fillStyle='rgba(212,255,144,.72)';
    for(let i=5;i<p.w;i+=28) targetCtx.fillRect(x+i,p.y+2,3,2);
    if(p.y+p.h>=WATER_Y){
        targetCtx.save();
        targetCtx.beginPath();
        targetCtx.moveTo(x,shoreY(0));
        for(let localX=shoreStep;localX<p.w;localX+=shoreStep){
            targetCtx.lineTo(x+localX,shoreY(localX));
        }
        targetCtx.lineTo(x+p.w,shoreY(p.w));
        targetCtx.setLineDash([5,4]);
        targetCtx.strokeStyle='#e5fbff'; targetCtx.lineWidth=2; targetCtx.stroke();
        targetCtx.setLineDash([3,5]);
        targetCtx.strokeStyle='rgba(73,207,255,.9)'; targetCtx.lineWidth=1; targetCtx.stroke();
        targetCtx.restore();
    }
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

buildScenery();
for(const p of plats) drawPlat(p,0,terrainCtx);

function draw(){
    const cam = Math.max(0, Math.min(WORLD_W-cv.width, player.x+PW/2-cv.width/2));
    drawBg(cam);
    ctx.drawImage(terrainCanvas,cam,0,cv.width,cv.height,0,0,cv.width,cv.height);
    drawGuard(cam);

    // soldados (sombra en el suelo, aunque el sprite esté más arriba)
    for (const s of soldiers){
        const x=s.x-cam; if (x>cv.width||x+40<0) continue;
        ctx.fillStyle='rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(x+19, s.y+62, 15,4,0,0,Math.PI*2); ctx.fill();
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
