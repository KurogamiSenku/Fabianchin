// ====================================================================
//  Nivel 9 - Sonic: "La carrera de los datos perdidos" (side-scroller)
//  Fabiancho corre por colinas verdes, recoge anillos y llega a la META,
//  donde recupera el archivo de datos perdido (reto de esteganografía).
//  Arte propio (colinas genéricas); se reusa el sprite de anillo.
// ====================================================================
const cv = document.getElementById('arena');
const ctx = cv.getContext('2d');
cv.width = 760; cv.height = 420;

const WORLD_W = 3600;
const GRAV = 0.7, JUMP = -13.5, SPEED = 4.2;   // un poco más rápido (es Sonic)

function loadImg(src){ const i = new Image(); i.src = src; return i; }
const sprites = { idle:[], walk:[], jump:[] };
for (let i=1;i<=4;i++) sprites.idle.push(loadImg(`/static/img/skeli_fixed/idle/idle${i}.png`));
for (let i=1;i<=6;i++) sprites.walk.push(loadImg(`/static/img/skeli_fixed/walk/walk${i}.png`));
for (let i=1;i<=4;i++) sprites.jump.push(loadImg(`/static/img/skeli_fixed/jump/jump${i}.png`));
const ringImg = loadImg('/static/img/markers/sonic_ring.png');   // 8 frames 64x64

// --- Plataformas (colinas) ---
const plats = [
    {x:0,    y:330, w:620,  h:120},
    {x:760,  y:330, w:680,  h:120},
    {x:1560, y:330, w:720,  h:120},
    {x:2420, y:330, w:1180, h:120},
    // colinas flotantes / escalones
    {x:380,  y:255, w:130, h:18},
    {x:900,  y:250, w:130, h:18},
    {x:1120, y:205, w:120, h:18},
    {x:1700, y:255, w:140, h:18},
    {x:2000, y:210, w:120, h:18},
    {x:2560, y:250, w:150, h:18},
    {x:2760, y:205, w:130, h:18},
    {x:3020, y:250, w:140, h:18},
    // puentes
    {x:620,  y:320, w:140, h:12, bridge:true},
    {x:1440, y:320, w:120, h:12, bridge:true},
    {x:2280, y:320, w:140, h:12, bridge:true},
];
const WATER_Y = 388;

// Anillos para recoger (decorativos, suman al marcador)
const rings = [];
[[300,290],[430,210],[520,290],[950,205],[1140,160],[1260,290],[1740,210],
 [2040,165],[2200,290],[2600,205],[2810,160],[3060,205],[3300,290],[3450,290]]
 .forEach(([x,y])=>rings.push({x,y,got:false}));
let ringCount = 0;

const PW=40, PH=66, PSIZE=100;
const player = { x:40, y:250, vx:0, vy:0, facing:'right', onGround:false,
    jumping:false, animFrame:0, animTimer:0, bvx:0 };
let lastSafe = { x:40, y:250 };

const GOAL = { x:3380, y:330-80 };   // meta al final

const keys = { left:false, right:false, up:false };
let challengeOpen = false;

function typingInField(e){ const t=e.target||document.activeElement;
    return t && (t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable); }
window.addEventListener('keydown', e=>{
    if (typingInField(e) || challengeOpen) return;
    if (['a','A','ArrowLeft'].includes(e.key)) keys.left=true;
    if (['d','D','ArrowRight'].includes(e.key)) keys.right=true;
    if (['w','W','ArrowUp',' '].includes(e.key)){ keys.up=true; e.preventDefault(); }
    if ((e.key==='e'||e.key==='E') && nearGoal()) openChallenge();
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
function nearGoal(){ return Math.abs((player.x+PW/2)-(GOAL.x+20))<70 && Math.abs(player.y-GOAL.y)<140; }

function updatePlayer(dt){
    if (challengeOpen) return;
    player.vx=0;
    if (keys.left){ player.vx=-SPEED; player.facing='left'; }
    if (keys.right){ player.vx=SPEED; player.facing='right'; }
    let tvx=player.vx+player.bvx; player.x+=tvx;
    for (const p of plats){ if (overlap(player.x,player.y,PW,PH,p.x,p.y,p.w,p.h)){
        if (tvx>0) player.x=p.x-PW; else if (tvx<0) player.x=p.x+p.w; } }
    player.bvx*=0.85;
    if (player.x<0) player.x=0; if (player.x>WORLD_W-PW) player.x=WORLD_W-PW;

    if (keys.up && player.onGround){ player.vy=JUMP; player.onGround=false; player.jumping=true; }
    player.vy+=GRAV; if (player.vy>16) player.vy=16; player.y+=player.vy;
    player.onGround=false;
    for (const p of plats){ if (overlap(player.x,player.y,PW,PH,p.x,p.y,p.w,p.h)){
        if (player.vy>0){ player.y=p.y-PH; player.vy=0; player.onGround=true; player.jumping=false; }
        else if (player.vy<0){ player.y=p.y+p.h; player.vy=0; } } }
    if (player.onGround) lastSafe={x:player.x,y:player.y-2};
    if (player.y>cv.height+80){ player.x=lastSafe.x; player.y=lastSafe.y; player.vy=0; player.bvx=0; }

    // recoger anillos
    const pcx=player.x+PW/2, pcy=player.y+PH/2;
    for (const r of rings){ if (!r.got && Math.hypot(pcx-r.x,pcy-r.y)<42){ r.got=true; ringCount++; } }

    const moving=player.vx!==0; player.animTimer+=dt;
    if (player.animTimer>(moving?80:170)){ player.animFrame++; player.animTimer=0; }
}

function hill(cam,par,base,amp,step,color){
    ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(0,cv.height);
    const off=(cam*par)%step;
    for (let x=-off;x<=cv.width+step;x+=step){ ctx.lineTo(x,base); ctx.lineTo(x+step/2,base-amp); }
    ctx.lineTo(cv.width,cv.height); ctx.closePath(); ctx.fill();
}
function drawBg(cam){
    const g=ctx.createLinearGradient(0,0,0,cv.height);
    g.addColorStop(0,'#2aa6e8'); g.addColorStop(0.65,'#7fd0f0'); g.addColorStop(1,'#bfeaff');
    ctx.fillStyle=g; ctx.fillRect(0,0,cv.width,cv.height);
    // nubes
    ctx.fillStyle='rgba(255,255,255,.85)';
    for (let i=-1;i<8;i++){ const nx=i*320-(cam*0.2)%320; ctx.beginPath();
        ctx.arc(nx,70,22,0,Math.PI*2); ctx.arc(nx+28,66,28,0,Math.PI*2); ctx.arc(nx+58,72,20,0,Math.PI*2); ctx.fill(); }
    // colinas verdes de fondo (parallax)
    hill(cam,0.2, 300, 120, 300, '#2e8b57');
    hill(cam,0.4, 330, 150, 220, '#3ca866');
    // agua
    const w=ctx.createLinearGradient(0,WATER_Y,0,cv.height);
    w.addColorStop(0,'#2bb6e0'); w.addColorStop(1,'#1577a8');
    ctx.fillStyle=w; ctx.fillRect(0,WATER_Y,cv.width,cv.height-WATER_Y);
}
function drawPlat(p,cam){
    const x=p.x-cam; if (x>cv.width||x+p.w<0) return;
    if (p.bridge){
        ctx.strokeStyle='#8a5a2c'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x,p.y); ctx.lineTo(x+p.w,p.y); ctx.stroke();
        for (let i=0;i<=p.w;i+=12){ ctx.fillStyle=(i/12)%2?'#b07a34':'#c98a3e'; ctx.fillRect(x+i,p.y,10,p.h); }
        return;
    }
    // ladera: tierra clara con césped brillante (estilo colinas)
    ctx.fillStyle='#b07a34'; ctx.fillRect(x,p.y,p.w,p.h);
    ctx.fillStyle='#c98a3e'; ctx.fillRect(x+2,p.y+10,p.w-4,p.h-10);
    ctx.fillStyle='#4fd96a'; ctx.fillRect(x,p.y,p.w,11);
    ctx.fillStyle='#39b853'; ctx.fillRect(x,p.y+11,p.w,5);
    ctx.fillStyle='#4fd96a'; for (let i=0;i<p.w;i+=12) ctx.fillRect(x+i,p.y-3,6,4);
}
function drawGoal(cam){
    const x=GOAL.x-cam,y=GOAL.y; if (x>cv.width||x+40<0) return;
    // poste de meta con pantalla de datos
    ctx.fillStyle='#444'; ctx.fillRect(x+16,y,8,80);
    ctx.fillStyle='#1b2433'; ctx.fillRect(x,y-4,40,34);
    ctx.fillStyle=Math.floor(Date.now()/400)%2?'#58f5ff':'#2ea9a9'; ctx.fillRect(x+4,y,32,24);
    ctx.fillStyle='#0d1117'; ctx.font='9px monospace'; ctx.textAlign='center'; ctx.fillText('DATA',x+20,y+14);
    if (nearGoal() && !challengeOpen){ ctx.fillStyle='#003'; ctx.font='bold 13px monospace'; ctx.fillText('[E]',x+20,y-12); }
}

function draw(){
    const cam=Math.max(0,Math.min(WORLD_W-cv.width, player.x+PW/2-cv.width/2));
    drawBg(cam);
    for (const p of plats) drawPlat(p,cam);
    drawGoal(cam);

    // anillos
    for (const r of rings){ if (r.got) continue; const x=r.x-cam; if (x<-40||x>cv.width+40) continue;
        const fi=Math.floor(Date.now()/90)%8;
        if (ringImg.complete) ctx.drawImage(ringImg, fi*64,0,64,64, x-16,r.y-16,32,32);
    }

    // Fabiancho
    let list=sprites.idle,fc=4;
    if (player.jumping){ list=sprites.jump; fc=4; } else if (player.vx!==0){ list=sprites.walk; fc=6; }
    const img=list[Math.floor(player.animFrame)%fc]||sprites.idle[0];
    const dx=player.x-cam-(PSIZE-PW)/2, dy=player.y-(PSIZE-PH);
    if (img&&img.complete&&img.naturalWidth){
        if (player.facing==='left'){ ctx.save(); ctx.translate(dx+PSIZE,dy); ctx.scale(-1,1); ctx.drawImage(img,0,0,PSIZE,PSIZE); ctx.restore(); }
        else ctx.drawImage(img,dx,dy,PSIZE,PSIZE);
    }

    // HUD: anillos + título
    ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(cv.width/2-150,5,300,26);
    ctx.fillStyle='#ffd24a'; ctx.font='bold 14px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('NIVEL 9  ·  SONIC', cv.width/2, 19);
    ctx.fillStyle='#ffd24a'; ctx.font='bold 16px monospace'; ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText('◉ '+ringCount, 14, 12);
}

let last=performance.now();
function loop(t){ const dt=t-last; last=t; updatePlayer(dt); draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);

function openChallenge(){ challengeOpen=true; keys.left=keys.right=keys.up=false;
    document.getElementById('challenge').classList.add('show'); }
function closeChallenge(){ challengeOpen=false; document.getElementById('challenge').classList.remove('show'); }
window._closeChallenge = closeChallenge;
