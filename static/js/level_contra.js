// ====================================================================
//  Nivel 2 - Contra: "La base militar fantasma"  (Fabiancho)
//  Side-scroller de jungla. Ahora con COMBATE:
//    - Fabiancho DISPARA (tecla J / F) y elimina a los soldados.
//    - Las balas enemigas son más lentas y esquivables, pero QUITAN VIDA.
//    - Sistema de 3 vidas + Game Over + reinicio.
//    - PISTAS regadas por el mapa (expedientes/intel) -> BITÁCORA (tecla Q).
//  Reto: carga insegura de archivos (file upload bypass) en el puesto.
// ====================================================================
const cv = document.getElementById('arena');
const ctx = cv.getContext('2d');
cv.width = 760; cv.height = 420;

const WORLD_W = 3400;
const GRAV = 0.7, JUMP = -13.5, SPEED = 3.4;
const sceneryCanvas = document.createElement('canvas');
sceneryCanvas.width = WORLD_W; sceneryCanvas.height = cv.height;
const sceneryCtx = sceneryCanvas.getContext('2d');
const terrainCanvas = document.createElement('canvas');
terrainCanvas.width = WORLD_W; terrainCanvas.height = cv.height;
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
    {x:520,  y:247, w:80, h:14, bridge:true},
    {x:1070, y:252, w:80, h:14, bridge:true},
    {x:1490, y:244, w:80, h:14, bridge:true},
    {x:1940, y:238, w:50, h:14, bridge:true},
    {x:2410, y:242, w:60, h:14, bridge:true},
    {x:2820, y:247, w:50, h:14, bridge:true},
];
const WATER_Y = 350;

const PW=40, PH=66, PSIZE=115;
const player = { x:40, y:170, vx:0, vy:0, facing:'right', onGround:false,
    jumping:false, animFrame:0, animTimer:0, bvx:0,
    hp:3, invuln:0, shootCd:0, muzzle:0 };
let lastSafe = { x:40, y:170 };

const GUARD = { x:3180, y:258-70 };

// ====================================================================
// PISTAS (BITÁCORA) — expedientes/intel regados por el mapa
// ====================================================================
const PISTAS = [
  { id:'intel1', found:false, icon:'🗂️', how:'Recogiste un expediente en la jungla',
    title:'Intel · El puesto EJECUTA la credencial',
    body:'El puesto no “mira” tu credencial: la <b>ejecuta</b> como si fuera un programa. '+
         'Una foto (.jpg/.png) nunca corre; necesitas subir algo que se ejecute, tipo script.' },
  { id:'intel2', found:false, icon:'📡', how:'Interceptaste una transmisión',
    title:'Intel · El filtro está en TU lado',
    body:'El candado que solo deja subir imágenes vive en el <b>navegador</b> (el atributo '+
         '<code>accept</code> y un chequeo JS). El puesto confía y <b>no vuelve a revisar</b> el tipo.' },
  { id:'intel3', found:false, icon:'🧪', how:'Hallaste las notas del infiltrado',
    title:'Intel · Cómo colar el script',
    body:'Abre <b>F12 → Console</b> y envía tú mismo la credencial como <code>.php</code>:<br>'+
         '<code>const fd=new FormData();fd.append("cred",new File(["&lt;?php echo 1;?&gt;"],"cred.php"));'+
         'fetch("/level/contra/upload",{method:"POST",body:fd}).then(r=&gt;r.json()).then(console.log)</code><br>'+
         'O en <b>Elements</b> quita el atributo <code>accept</code> del input y elige “Todos los archivos”.' },
  { id:'puesto', found:false, icon:'🎖️', how:'Llegaste al puesto de guardia',
    title:'Intel · La flag viaja en la respuesta',
    body:'Cuando el puesto acepte la credencial ejecutable, él mismo te devuelve la <b>FLAG</b> '+
         'en su respuesta. Cópiala y envíala abajo para tomar la base.' },
];
let notebookOpen = false;
const pistaById = id => PISTAS.find(p=>p.id===id);
const foundCount = () => PISTAS.filter(p=>p.found).length;

let pistaPopT=null, popupOpen=false;
function showPistaPop(p){
  const el=document.getElementById('pista-pop'); if(!el) return;
  el.innerHTML =
    '<div class="pp-head"><span class="pp-ic">'+p.icon+'</span>'+
    '<span class="pp-tag">¡INTEL OBTENIDO!  '+foundCount()+'/'+PISTAS.length+'</span></div>'+
    '<div class="pp-title">'+p.title+'</div>'+
    '<div class="pp-body">'+p.body+'</div>'+
    '<div class="pp-foot">▶ Pulsa una tecla para continuar · [Q] Bitácora</div>';
  el.classList.add('show'); popupOpen=true;   // pausa el juego mientras se lee
  clearTimeout(pistaPopT);
  pistaPopT=setTimeout(dismissPop, 7000);
}
function dismissPop(){
  const el=document.getElementById('pista-pop'); if(el) el.classList.remove('show');
  popupOpen=false; clearTimeout(pistaPopT);
}
function unlockPista(id){
  const p=pistaById(id); if(!p||p.found) return;
  p.found=true; showPistaPop(p); renderPistas(); flashNotebookBtn();
}
function renderPistas(){
  const n=foundCount();
  document.querySelectorAll('[data-pista-count]').forEach(e=>e.textContent=n+'/'+PISTAS.length);
  const html=PISTAS.map(p=>p.found
    ? ('<div class="pista found"><div class="pista-h"><span class="pista-ic">'+p.icon+'</span>'+
       '<span class="pista-t">'+p.title+'</span></div><div class="pista-b">'+p.body+'</div>'+
       '<div class="pista-src">✔ '+p.how+'</div></div>')
    : ('<div class="pista locked"><div class="pista-h"><span class="pista-ic">🔒</span>'+
       '<span class="pista-t">Intel por recuperar</span></div><div class="pista-b">'+
       'Explora la jungla: hay expedientes escondidos en las cornisas. Elimina soldados para abrirte paso.</div></div>')
  ).join('');
  const list=document.getElementById('notebook-list'); if(list) list.innerHTML=html;
  const modal=document.getElementById('modal-pistas'); if(modal) modal.innerHTML=html;
}
function flashNotebookBtn(){
  const b=document.getElementById('notebook-btn'); if(!b) return;
  b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
}
function toggleNotebook(force){
  notebookOpen = force===undefined ? !notebookOpen : force;
  const nb=document.getElementById('notebook'); if(nb) nb.classList.toggle('show',notebookOpen);
}
window._toggleNotebook = toggleNotebook;

// ====================================================================
// EXPEDIENTES (pistas) y CURACIONES regados por el mapa
// ====================================================================
const INTEL_DEFS = [
  { x:788,  y:150, clue:'intel1' },   // cornisa a x740
  { x:1836, y:110, clue:'intel2' },   // cornisa alta a x1800
  { x:2700, y:118, clue:'intel3' },   // cornisa a x2670
];
let intel = [];
let pickups = [];   // curaciones que sueltan los soldados

// ====================================================================
// SOLDADOS
// ====================================================================
const SOLDIER_DEFS = [
    { x:320,  y:182, dir:1,  min:60,   max:470,  fire:1700 },
    { x:540,  y:180, dir:-1, min:480,  max:640,  fire:1600 },
    { x:760,  y:176, dir:1,  min:640,  max:1000, fire:2100 },
    { x:960,  y:176, dir:-1, min:640,  max:1000, fire:2600 },
    { x:1120, y:186, dir:1,  min:1030, max:1180, fire:1800 },
    { x:1290, y:192, dir:-1, min:1180, max:1450, fire:2300 },
    { x:1500, y:178, dir:1,  min:1460, max:1620, fire:1500 },
    { x:1740, y:160, dir:1,  min:1620, max:1900, fire:3000 },
    { x:1950, y:172, dir:-1, min:1905, max:2030, fire:2200 },
    { x:2100, y:180, dir:1,  min:2040, max:2370, fire:1900 },
    { x:2300, y:184, dir:-1, min:2210, max:2470, fire:1650 },
    { x:2550, y:168, dir:-1, min:2500, max:2780, fire:3200 },
    { x:2750, y:176, dir:1,  min:2610, max:2900, fire:2000 },
    { x:3000, y:190, dir:1,  min:2910, max:3230, fire:2400 },
    { x:3300, y:188, dir:-1, min:3230, max:3360, fire:2600 },
];
let soldiers = [];
const bullets = [];    // balas enemigas
const pBullets = [];   // balas del jugador
const fx = [];         // explosiones / chispas

function resetEntities(){
  soldiers = SOLDIER_DEFS.map(d=>({ x:d.x, y:d.y, dir:d.dir, min:d.min, max:d.max,
      f:0, ft:0, fire:d.fire + Math.random()*600, dead:false, deadT:0, warn:0 }));
  intel = INTEL_DEFS.map(d=>({ x:d.x, y:d.y, clue:d.clue, got:false, t:0 }));
  pickups.length=0; bullets.length=0; pBullets.length=0; fx.length=0;
}
resetEntities();

let challengeOpen = false;
let gameOverT = 0;
let msg='', msgT=0;
function toast(t){ msg=t; msgT=2200; }

const keys = { left:false, right:false, up:false };

function typingInField(e){ const t=e.target||document.activeElement;
    return t && (t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable); }

window.registerSecretAccessCode(openChallenge, () =>
    challengeOpen || notebookOpen || gameOverT > 0 || popupOpen
);

window.addEventListener('keydown', e=>{
    if (!typingInField(e)){
      if (e.key==='q'||e.key==='Q'){ dismissPop(); toggleNotebook(); e.preventDefault(); return; }
      if (e.key==='Escape'){ dismissPop(); toggleNotebook(false); }
      if (popupOpen){ dismissPop(); e.preventDefault(); return; }   // cualquier tecla reanuda
    }
    if (typingInField(e) || challengeOpen || notebookOpen || gameOverT>0) return;
    if (['a','A','ArrowLeft'].includes(e.key)) keys.left=true;
    if (['d','D','ArrowRight'].includes(e.key)) keys.right=true;
    if (['w','W','ArrowUp',' '].includes(e.key)){ keys.up=true; e.preventDefault(); }
    if (['j','J','f','F'].includes(e.key)) shoot();
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

function shoot(){
  if (player.shootCd>0) return;
  player.shootCd = 230;
  player.muzzle = 90;
  const dir = player.facing==='right'?1:-1;
  pBullets.push({ x:player.x+PW/2 + dir*18, y:player.y+22, vx:dir*8.2, ttl:900 });
}

function hurt(amount){
  if (player.invuln>0) return;
  player.hp -= amount;
  player.invuln = 1300;
  if (player.hp<=0){ player.hp=0; gameOverT=2200; }
  else toast('¡Impacto! Vidas: '+player.hp);
}

function spawnBoom(x,y,color){
  for(let i=0;i<10;i++){
    const a=Math.random()*Math.PI*2, sp=1+Math.random()*3;
    fx.push({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp-1, t:0, life:480, c:color });
  }
}

function resetLevel(){
  player.x=40; player.y=170; player.vx=0; player.vy=0; player.bvx=0;
  player.facing='right'; player.onGround=false; player.jumping=false;
  player.hp=3; player.invuln=1200; player.shootCd=0; player.muzzle=0;
  lastSafe={x:40,y:170};
  resetEntities();
  gameOverT=0; msg=''; msgT=0;
  keys.left=keys.right=keys.up=false;
  // las PISTAS descubiertas se conservan.
  const ch=document.getElementById('challenge'); if(ch) ch.classList.remove('show');
  challengeOpen=false;
}

function updatePlayer(dt){
    if (gameOverT>0){ gameOverT-=dt; if(gameOverT<=0) resetLevel(); return; }
    if (challengeOpen || notebookOpen || popupOpen){ return; }
    if (player.invuln>0) player.invuln-=dt;
    if (player.shootCd>0) player.shootCd-=dt;
    if (player.muzzle>0) player.muzzle-=dt;

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

    if (keys.up && player.onGround){ player.vy=JUMP; player.onGround=false; player.jumping=true; }
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

    if (player.y > cv.height+80){
        player.x=lastSafe.x; player.y=lastSafe.y; player.vy=0; player.bvx=0;
        if (player.invuln<=0){ player.hp--; player.invuln=1200;
          if (player.hp<=0){ player.hp=0; gameOverT=2200; } else toast('¡Al agua! Vidas: '+player.hp); }
    }

    // recoger expedientes (pistas)
    const pcx=player.x+PW/2, pcy=player.y+PH/2;
    for (const it of intel){
        if (!it.got && Math.abs(pcx-it.x)<30 && Math.abs(pcy-it.y)<40){
            it.got=true; unlockPista(it.clue);
        }
    }
    // recoger curaciones
    for (const h of pickups){
        if (!h.got && Math.abs(pcx-h.x)<28 && Math.abs(pcy-h.y)<34){
            h.got=true; if(player.hp<3){ player.hp++; toast('¡Botiquín! Vidas: '+player.hp); }
        }
    }
    for (let i=pickups.length-1;i>=0;i--) if (pickups[i].got) pickups.splice(i,1);

    const moving = player.vx!==0;
    player.animTimer+=dt;
    if (player.animTimer > (moving?85:170)){ player.animFrame++; player.animTimer=0; }
    if (msgT>0) msgT-=dt;
}

function updateSoldiers(dt){
    if (challengeOpen || notebookOpen || gameOverT>0 || popupOpen) return;
    const pcx=player.x+PW/2, pcy=player.y+PH/2;

    for (const s of soldiers){
        if (s.dead){ s.deadT+=dt; continue; }
        s.x += s.dir*2.1;
        if (s.x<s.min){ s.x=s.min; s.dir=1; } if (s.x>s.max){ s.x=s.max; s.dir=-1; }
        s.ft+=dt; if (s.ft>130){ s.f++; s.ft=0; }
        const scx=s.x+19, scy=s.y+30, dx=pcx-scx, dy=pcy-scy, d=Math.hypot(dx,dy)||1;
        if (Math.abs(dx)<560) s.dir = dx<0?-1:1;
        if (d<46){ player.bvx += (dx/d)*7; }   // contacto: empuje (sin quitar vida)
        // disparo telegrafiado y más lento (esquivable)
        s.fire -= dt;
        s.warn = (s.fire<340 && s.fire>0 && Math.abs(dx)<540) ? 1 : 0;
        if (s.fire<=0){
            if (Math.abs(dx)<540){
                const sp=3.1;   // más lento -> se puede esquivar
                bullets.push({ x:scx, y:scy, vx:(dx/d)*sp, vy:(dy/d)*sp*0.35, ttl:3200 });
            }
            s.fire = 1700 + Math.random()*1500;   // menos frecuente
        }
    }

    // separación entre soldados vivos
    const SEP=42, alive=soldiers.filter(s=>!s.dead);
    for (let i=0;i<alive.length;i++) for (let j=i+1;j<alive.length;j++){
        const a=alive[i], b=alive[j];
        if (Math.abs(a.y-b.y)>30) continue;
        const dx=(b.x+19)-(a.x+19);
        if (Math.abs(dx)<SEP){
            const push=(SEP-Math.abs(dx))/2, dir=dx<0?-1:1;
            a.x-=dir*push; b.x+=dir*push;
            a.x=Math.max(a.min,Math.min(a.max,a.x)); b.x=Math.max(b.min,Math.min(b.max,b.x));
        }
    }

    // balas enemigas -> quitan vida, esquivables
    for (const b of bullets){
        b.x += b.vx; b.y += b.vy; b.ttl -= dt;
        if (Math.abs(pcx-b.x)<24 && Math.abs(pcy-b.y)<30){ hurt(1); b.ttl=0; spawnBoom(b.x,b.y,'#ff6a3d'); }
    }
    for (let i=bullets.length-1;i>=0;i--) if (bullets[i].ttl<=0) bullets.splice(i,1);

    // balas del jugador -> eliminan soldados
    for (const pb of pBullets){
        pb.x += pb.vx; pb.ttl -= dt;
        for (const s of soldiers){
            if (s.dead) continue;
            if (pb.x > s.x-4 && pb.x < s.x+42 && pb.y > s.y-4 && pb.y < s.y+62){
                s.dead=true; s.deadT=0; pb.ttl=0;
                spawnBoom(s.x+19, s.y+30, '#ffd24a');
                toast('¡Soldado eliminado!');
                if (Math.random()<0.4) pickups.push({ x:s.x+19, y:s.y+40, got:false });
                break;
            }
        }
    }
    for (let i=pBullets.length-1;i>=0;i--) if (pBullets[i].ttl<=0) pBullets.splice(i,1);
    soldiers = soldiers.filter(s=>!(s.dead && s.deadT>700));

    // partículas
    for (const p of fx){ p.t+=dt; p.vy+=0.18; p.x+=p.vx; p.y+=p.vy; }
    for (let i=fx.length-1;i>=0;i--) if (fx[i].t>fx[i].life) fx.splice(i,1);

    // intel flotante
    for (const it of intel) it.t+=dt;
}

// ================= ESCENARIO (igual que antes) =================
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
    const shoreStep=18;
    const shoreY=localX=>{
        const wx=worldX(localX);
        const seed=Math.sin(Math.floor(wx/shoreStep)*127.1+p.x*311.7)*43758.5453;
        const irregular=seed-Math.floor(seed);
        return p.y+p.h+10+irregular*19+Math.abs(Math.sin(wx*.017))*8;
    };
    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.moveTo(x,p.y+9); targetCtx.lineTo(x+p.w,p.y+9); targetCtx.lineTo(x+p.w,shoreY(p.w));
    for(let localX=p.w-shoreStep;localX>0;localX-=shoreStep) targetCtx.lineTo(x+localX,shoreY(localX));
    targetCtx.lineTo(x,shoreY(0)); targetCtx.closePath();
    targetCtx.fillStyle='#523719'; targetCtx.fill(); targetCtx.clip();
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
        targetCtx.save(); targetCtx.beginPath(); targetCtx.moveTo(x,shoreY(0));
        for(let localX=shoreStep;localX<p.w;localX+=shoreStep) targetCtx.lineTo(x+localX,shoreY(localX));
        targetCtx.lineTo(x+p.w,shoreY(p.w));
        targetCtx.setLineDash([5,4]); targetCtx.strokeStyle='#e5fbff'; targetCtx.lineWidth=2; targetCtx.stroke();
        targetCtx.setLineDash([3,5]); targetCtx.strokeStyle='rgba(73,207,255,.9)'; targetCtx.lineWidth=1; targetCtx.stroke();
        targetCtx.restore();
    }
}
function drawGuard(cam){
    const x=GUARD.x-cam, y=GUARD.y, t=Date.now();
    if (x>cv.width+50 || x+80<0) return;
    const near = nearGuard();

    // sacos de arena en la base
    for(let i=0;i<4;i++){ ctx.fillStyle=i%2?'#7d6b3a':'#6b5a2e';
        ctx.beginPath(); ctx.ellipse(x+9+i*15, y+66, 10,6,0,0,Math.PI*2); ctx.fill(); }

    // cuerpo del búnker (concreto con bisel)
    ctx.fillStyle='#39434f'; ctx.fillRect(x, y+6, 64, 58);
    ctx.fillStyle='#4a5667'; ctx.fillRect(x, y+6, 64, 5);
    ctx.fillStyle='#232a33'; ctx.fillRect(x, y+58, 64, 6);
    // techo inclinado
    ctx.fillStyle='#2b3440'; ctx.beginPath();
    ctx.moveTo(x-6,y+8); ctx.lineTo(x+32,y-6); ctx.lineTo(x+70,y+8); ctx.closePath(); ctx.fill();
    // franja de peligro
    for(let i=0;i<64;i+=12){ ctx.fillStyle='#d9a441'; ctx.fillRect(x+i, y+50, 7, 5);
        ctx.fillStyle='#1c222b'; ctx.fillRect(x+i+7, y+50, 5,5); }
    // puerta con brillo interior
    const glow = near ? '#8fe39b' : (Math.floor(t/500)%2?'#ffb454':'#7a5a28');
    ctx.fillStyle='#10151c'; ctx.fillRect(x+20, y+21, 24, 29);
    ctx.save(); ctx.shadowBlur=near?16:7; ctx.shadowColor=glow;
    ctx.fillStyle=glow; ctx.fillRect(x+24, y+25, 16, 11); ctx.restore();
    // letrero
    ctx.fillStyle='#0d1117'; ctx.fillRect(x+5, y+12, 54, 9);
    ctx.fillStyle='#ffd98a'; ctx.font='bold 8px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('PUESTO', x+32, y+17);
    // antena con luz parpadeante
    ctx.strokeStyle='#8a97a5'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(x+54,y-5); ctx.lineTo(x+54,y+8); ctx.stroke();
    ctx.fillStyle=Math.floor(t/300)%2?'#ff4d4d':'#5a1c1c';
    ctx.beginPath(); ctx.arc(x+54,y-7,3,0,Math.PI*2); ctx.fill();

    // prompt [E] grande y llamativo
    if (near && !challengeOpen && !popupOpen && !notebookOpen){
        const bob=Math.sin(t/180)*3, bx=x+32, by=y-24+bob;
        ctx.save();
        ctx.globalAlpha=.35+.3*(0.5+0.5*Math.sin(t/160));
        ctx.fillStyle='#8fe39b';
        ctx.beginPath(); ctx.ellipse(bx, by+2, 56, 18, 0, 0, Math.PI*2); ctx.fill();
        ctx.restore();
        ctx.fillStyle='#0f2417'; ctx.fillRect(bx-52, by-11, 104, 23);
        ctx.strokeStyle='#8fe39b'; ctx.lineWidth=2; ctx.strokeRect(bx-52, by-11, 104, 23);
        ctx.fillStyle='#163a23'; ctx.fillRect(bx-48, by-8, 22, 17);
        ctx.fillStyle='#aef0b6'; ctx.font='bold 13px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('E', bx-37, by);
        ctx.fillStyle='#eafbe6'; ctx.font='bold 12px monospace';
        ctx.fillText('ENTRAR', bx+13, by);
        ctx.fillStyle='#8fe39b';
        ctx.beginPath(); ctx.moveTo(bx-7,by+14); ctx.lineTo(bx+7,by+14); ctx.lineTo(bx,by+21); ctx.closePath(); ctx.fill();
    }
}
function drawSprite(img,sx,sy,sw,sh,dx,dy,dw,dh,flip){
    if (!img.complete||!img.naturalWidth) return;
    if (flip){ ctx.save(); ctx.translate(dx+dw,dy); ctx.scale(-1,1); ctx.drawImage(img,sx,sy,sw,sh,0,0,dw,dh); ctx.restore(); }
    else ctx.drawImage(img,sx,sy,sw,sh,dx,dy,dw,dh);
}
function heart(x,y,s,filled){
    ctx.save(); ctx.translate(x,y); ctx.scale(s,s);
    ctx.fillStyle = filled ? '#ff4d6d' : '#3a2030';
    ctx.beginPath(); ctx.moveTo(5,9); ctx.bezierCurveTo(-2,3,1,-2,5,2); ctx.bezierCurveTo(9,-2,12,3,5,9); ctx.fill();
    ctx.restore();
}

buildScenery();
for(const p of plats) drawPlat(p,0,terrainCtx);

function draw(){
    const cam = Math.max(0, Math.min(WORLD_W-cv.width, player.x+PW/2-cv.width/2));
    drawBg(cam);
    ctx.drawImage(terrainCanvas,cam,0,cv.width,cv.height,0,0,cv.width,cv.height);
    drawGuard(cam);

    // expedientes (intel) flotantes
    for (const it of intel){
        if (it.got) continue;
        const x=it.x-cam; if (x<-20||x>cv.width+20) continue;
        const bob=Math.sin(it.t/260)*4;
        ctx.save();
        ctx.shadowBlur=12; ctx.shadowColor='#ffe08a';
        ctx.fillStyle='#e9d9a6'; ctx.fillRect(x-9, it.y-11+bob, 18, 22);
        ctx.fillStyle='#b79c5f'; ctx.fillRect(x-9, it.y-11+bob, 18, 3);
        ctx.fillStyle='#7a6a3a'; ctx.fillRect(x-6, it.y-6+bob, 12, 2); ctx.fillRect(x-6, it.y-1+bob, 12, 2); ctx.fillRect(x-6, it.y+4+bob, 9, 2);
        ctx.fillStyle='#e8402f'; ctx.fillRect(x+2, it.y-11+bob, 5, 8);
        ctx.restore();
        ctx.fillStyle='#ffe08a'; ctx.font='bold 9px monospace'; ctx.textAlign='center';
        ctx.fillText('INTEL', x, it.y-16+bob);
    }

    // curaciones
    for (const h of pickups){
        const x=h.x-cam; if (x<-20||x>cv.width+20) continue;
        const bob=Math.sin(Date.now()/200+x)*3;
        ctx.fillStyle='#e8f6ef'; ctx.fillRect(x-7, h.y-7+bob, 14, 14);
        ctx.fillStyle='#e23b3b'; ctx.fillRect(x-2, h.y-5+bob, 4, 10); ctx.fillRect(x-5, h.y-2+bob, 10, 4);
    }

    // soldados
    for (const s of soldiers){
        const x=s.x-cam; if (x>cv.width||x+40<0) continue;
        if (s.dead){
            // destello de eliminación
            ctx.save(); ctx.globalAlpha=Math.max(0,1-s.deadT/700);
            ctx.fillStyle='#ffd24a'; ctx.beginPath(); ctx.arc(x+19,s.y+30,16,0,Math.PI*2); ctx.fill(); ctx.restore();
            continue;
        }
        ctx.fillStyle='rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(x+19, s.y+62, 15,4,0,0,Math.PI*2); ctx.fill();
        if (s.warn){ ctx.fillStyle='#ff5a5a'; ctx.font='bold 13px monospace'; ctx.textAlign='center'; ctx.fillText('!', x+19, s.y-6); }
        drawSprite(soldierImg, (Math.floor(s.f)%4)*23,0,23,38, x, s.y, 38, 62, s.dir>0);
    }

    // balas enemigas
    for (const b of bullets){
        const x=b.x-cam; if (x<-20||x>cv.width+20) continue;
        ctx.save(); ctx.shadowBlur=12; ctx.shadowColor='#ff7a3d';
        ctx.fillStyle='#ffb24a'; ctx.beginPath(); ctx.arc(x,b.y,7,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ff5a2d'; ctx.beginPath(); ctx.arc(x,b.y,3.5,0,Math.PI*2); ctx.fill(); ctx.restore();
    }
    // balas del jugador
    for (const pb of pBullets){
        const x=pb.x-cam; if (x<-20||x>cv.width+20) continue;
        ctx.save(); ctx.shadowBlur=10; ctx.shadowColor='#8fe3ff';
        ctx.fillStyle='#d8fbff'; ctx.fillRect(x-6, pb.y-2, 12, 4);
        ctx.fillStyle='#45d4ff'; ctx.fillRect(x-2, pb.y-1, 8, 2); ctx.restore();
    }
    // partículas
    for (const p of fx){
        const x=p.x-cam; ctx.globalAlpha=Math.max(0,1-p.t/p.life);
        ctx.fillStyle=p.c; ctx.fillRect(x-2,p.y-2,4,4); ctx.globalAlpha=1;
    }

    // Fabiancho
    let list=sprites.idle, fcount=4;
    if (player.jumping){ list=sprites.jump; fcount=4; }
    else if (player.vx!==0){ list=sprites.walk; fcount=6; }
    const img=list[Math.floor(player.animFrame)%fcount]||sprites.idle[0];
    const dx=player.x-cam-(PSIZE-PW)/2, dy=player.y-(PSIZE-PH);
    const blink = player.invuln>0 && Math.floor(player.invuln/90)%2===0;
    if (img&&img.complete&&img.naturalWidth && !blink){
        if (player.facing==='left'){ ctx.save(); ctx.translate(dx+PSIZE,dy); ctx.scale(-1,1); ctx.drawImage(img,0,0,PSIZE,PSIZE); ctx.restore(); }
        else ctx.drawImage(img, dx, dy, PSIZE, PSIZE);
    }
    // fogonazo del disparo
    if (player.muzzle>0){
        const dir=player.facing==='right'?1:-1;
        const mx=player.x-cam+PW/2+dir*20, my=player.y+22;
        ctx.save(); ctx.shadowBlur=10; ctx.shadowColor='#8fe3ff';
        ctx.fillStyle='#eafcff'; ctx.beginPath(); ctx.arc(mx,my,4,0,Math.PI*2); ctx.fill(); ctx.restore();
    }

    drawHUD();

    if (gameOverT>0){
        ctx.fillStyle='rgba(0,0,0,.72)'; ctx.fillRect(0,0,cv.width,cv.height);
        ctx.fillStyle='#ff5a5a'; ctx.font='bold 30px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('BASE PERDIDA', cv.width/2, cv.height/2-12);
        ctx.fillStyle='#e6edf3'; ctx.font='bold 13px monospace';
        ctx.fillText('Reagrupando…', cv.width/2, cv.height/2+18);
    }
}

function drawHUD(){
    // título
    ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(cv.width/2-150,5,300,26);
    ctx.fillStyle='#ffb454'; ctx.font='bold 14px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('NIVEL 2  ·  CONTRA', cv.width/2, 19);

    // vidas
    for(let i=0;i<3;i++) heart(16+i*20, 12, 1.4, i<player.hp);

    // intel / pistas
    const n=foundCount();
    ctx.fillStyle='rgba(0,0,0,.62)'; ctx.fillRect(12, 34, 150, 22);
    ctx.strokeStyle='rgba(120,210,120,.8)'; ctx.lineWidth=1; ctx.strokeRect(12.5,34.5,149,21);
    ctx.fillStyle=n===PISTAS.length?'#9fe39b':'#d6ead0'; ctx.font='bold 12px monospace'; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText('🗂️ INTEL '+n+'/'+PISTAS.length+'  [Q]', 18, 45);

    // ayuda disparo
    ctx.fillStyle='rgba(0,0,0,.55)'; ctx.fillRect(cv.width-150,34,138,22);
    ctx.fillStyle='#bfe0ff'; ctx.font='bold 11px monospace'; ctx.textAlign='left';
    ctx.fillText('[J] Disparar', cv.width-142, 45);

    // toast
    if (msgT>0 && msg){
        ctx.font='bold 13px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
        const w=ctx.measureText(msg).width+24;
        ctx.fillStyle='rgba(8,16,30,.92)'; ctx.fillRect(cv.width/2-w/2, 60, w, 24);
        ctx.strokeStyle='#ffd23f'; ctx.lineWidth=1.5; ctx.strokeRect(cv.width/2-w/2+.75,60.75,w-1.5,22.5);
        ctx.fillStyle='#ffe98a'; ctx.fillText(msg, cv.width/2, 72);
    }
}

let last=performance.now();
function loop(t){ const dt=Math.min(t-last,50); last=t; updatePlayer(dt); updateSoldiers(dt); draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);

function openChallenge(){ challengeOpen=true; keys.left=keys.right=keys.up=false;
    unlockPista('puesto'); dismissPop(); renderPistas();
    document.getElementById('challenge').classList.add('show'); }
function closeChallenge(){ challengeOpen=false; document.getElementById('challenge').classList.remove('show'); }
window._closeChallenge = closeChallenge;

renderPistas();
