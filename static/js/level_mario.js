// ====================================================================
//  Nivel 1 - Super Mario Bros.: "El reino de las tuberías"
//  Fabiancho (esqueleto). Fondo = sprite real 1-1 (zoom 2x).
//  SQLi (llave) -> romper ? y juntar 3 power-ups -> META.
//  Enemigos: Goombas autónomos (caminan solos) + Plantas Piraña que
//  salen/entran de las tuberías cada ~5s. Pozos: caes y pierdes vida.
//  Hongo = más grande (+escudo); Estrella = más rápido e invencible.
// ====================================================================
const cv = document.getElementById('arena');
const ctx = cv.getContext('2d');
cv.width = 720; cv.height = 480;

function loadImg(src){ const i = new Image(); i.src = src; return i; }
const bg = loadImg('/static/img/mario_1_1_ref.png');
const IMG = {
  used:loadImg('/static/img/mario/qblock_used.png'), mush:loadImg('/static/img/mario/mushroom.png'),
  flower:loadImg('/static/img/mario/flower.png'), star:loadImg('/static/img/mario/star.png'),
  goomba1:loadImg('/static/img/mario/goomba1.png'), goomba2:loadImg('/static/img/mario/goomba2.png'),
  goomba_flat:loadImg('/static/img/mario/goomba_flat.png'),
  piranha1:loadImg('/static/img/mario/piranha1.png'), piranha2:loadImg('/static/img/mario/piranha2.png'),
  gameover:loadImg('/static/img/mario/gameover.png'),
};
const sprites = { idle:[], walk:[], jump:[], attack:[] };
for (let i=1;i<=4;i++) sprites.idle.push(loadImg(`/static/img/skeli_fixed/idle/idle${i}.png`));
for (let i=1;i<=6;i++) sprites.walk.push(loadImg(`/static/img/skeli_fixed/walk/walk${i}.png`));
for (let i=1;i<=4;i++) sprites.jump.push(loadImg(`/static/img/skeli_fixed/jump/jump${i}.png`));
for (let i=1;i<=4;i++) sprites.attack.push(loadImg(`/static/img/skeli_fixed/attack/attack${i}.png`));
const SRC_W=256, SRC_H=400;

const GRAV=0.6, GRAVMAX=14, JUMP_V=-9.6, MOVE_BASE=2.4, SCALE=2, SKY='#5c94fc';
const TOTAL_POWERUPS=3;

function Q(x,y,item){ return {x,y,w:16,h:16,type:'q',item,used:false,vanished:false,bumpT:0}; }
function Bk(x,y){ return {x,y,w:16,h:16,type:'brick',item:null,used:false,vanished:false,bumpT:0}; }

const OVER = {
  width:3376, floorY:208, scale:SCALE,
  // suelo con POZOS (huecos reales del 1-1)
  ground: [
    {x:0,y:208,w:1104,h:272},{x:1136,y:208,w:240,h:272},
    {x:1424,y:208,w:1024,h:272},{x:2480,y:208,w:896,h:272},
  ],
  pits: [[1104,1135],[1376,1423],[2448,2479]],
  pipes: [
    {x:448,y:176,w:32,h:64,entry:true},
    {x:608,y:160,w:32,h:80,piranha:true},
    {x:736,y:144,w:32,h:96,piranha:true},
    {x:912,y:144,w:32,h:96,piranha:true},
  ],
  terrain: [
    {x:2400,y:144,w:16,h:64},{x:2416,y:144,w:32,h:64},{x:2480,y:144,w:16,h:64},{x:2496,y:160,w:16,h:48},
    {x:2928,y:160,w:16,h:48},{x:2944,y:144,w:16,h:64},{x:2960,y:128,w:16,h:80},
    {x:2976,y:112,w:16,h:96},{x:2992,y:96,w:16,h:112},{x:3008,y:80,w:48,h:128},
  ],
  blocks: [
    Q(256,144,'coin'), Q(352,80,'mush'),
    Q(1248,144,'coin'), Q(1504,80,'flower'),
    Q(1696,144,'coin'), Q(1744,80,'star'), Q(1792,144,'coin'), Q(2720,144,'coin'),
    // ladrillos rompibles del cielo (se rompen, no sueltan nada)
    Bk(320,144),Bk(336,144),Bk(352,144),Bk(368,144),Bk(384,144),Bk(1232,144),Bk(1264,144),
    Bk(1280,80),Bk(1296,80),Bk(1312,80),Bk(1328,80),Bk(1344,80),Bk(1360,80),Bk(1376,80),Bk(1392,80),
    Bk(1456,80),Bk(1472,80),Bk(1488,80),Bk(1504,144),Bk(1600,144),Bk(1616,144),Bk(1744,144),Bk(1888,144),
    Bk(1936,80),Bk(1952,80),Bk(1968,80),Bk(2048,80),Bk(2064,80),Bk(2064,144),Bk(2080,80),Bk(2080,144),
    Bk(2096,80),Bk(2688,144),Bk(2704,144),Bk(2736,144),
  ],
  coins: [ {x:520,y:176},{x:600,y:176},{x:980,y:150},{x:1300,y:60},{x:1340,y:60},{x:1380,y:60},
           {x:1950,y:60},{x:2060,y:60},{x:2300,y:176},{x:2690,y:120} ],
  goalX:3140,
  enemiesInit: [ {x:520,vx:1.1},{x:980,vx:-1.1},{x:1600,vx:1.1},{x:1980,vx:-1.1},{x:2300,vx:1.1} ],
};

const UGY=416;
const UNDER = {
  width:960, floorY:UGY, scale:1,
  solids:[ {x:0,y:UGY,w:960,h:64},{x:0,y:0,w:32,h:cv.height},{x:928,y:0,w:32,h:cv.height},{x:300,y:356,w:150,h:24} ],
  exitPipe:{x:820,y:352,w:64,h:64}, terminal:{x:720,y:368,w:48,h:48},
  coins:[ {x:170,y:384},{x:230,y:384},{x:300,y:384},{x:360,y:322},{x:410,y:322},{x:560,y:384},{x:700,y:318},{x:770,y:318} ],
};

const SMALL_H=46, BIG_H=58;
const player = { x:48, y:208-SMALL_H, w:22, h:SMALL_H, vx:0, vy:0, onGround:false,
  facing:'right', state:'idle', animFrame:0, animTimer:0, attackTimer:0,
  big:false, hp:3, invuln:0, starT:0, safeX:48, safeY:208-SMALL_H };

let room='over', camX=0, challengeOpen=false, adminUnlocked=false, transition=null, won=false, gameOverT=0;
let hasKey=false, powerups=0, coinsGot=0, goalDone=false, msg='', msgT=0;
const floatItems=[]; let enemies=[]; let piranhas=[];
function cur(){ return room==='over'?OVER:UNDER; }
function toast(t){ msg=t; msgT=2200; }

function resetEnemies(){
  enemies = OVER.enemiesInit.map(e=>({x:e.x,y:208-24,w:24,h:24,vx:e.vx,dead:false,deadT:0,anim:0}));
  piranhas = OVER.pipes.filter(p=>p.piranha).map((p,i)=>({x:p.x+p.w/2-8, top:p.y, t:i*1250, risen:0}));
}
resetEnemies();

// --- Entrada ---
const keys={left:false,right:false,jump:false,down:false};
function typingInField(e){ const t=e.target||document.activeElement;
  return t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable); }
window.addEventListener('keydown', e=>{
  if (typingInField(e)||challengeOpen||transition||won||gameOverT>0) return;
  if (['a','A','ArrowLeft'].includes(e.key)) keys.left=true;
  if (['d','D','ArrowRight'].includes(e.key)) keys.right=true;
  if (['w','W','ArrowUp',' '].includes(e.key)) keys.jump=true;
  if (['s','S','ArrowDown'].includes(e.key)) keys.down=true;
  if (e.key==='f'||e.key==='F') startAttack();
  if (e.key==='e'||e.key==='E') tryOpenTerminal();
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
});
window.addEventListener('keyup', e=>{
  if (typingInField(e)) return;
  if (['a','A','ArrowLeft'].includes(e.key)) keys.left=false;
  if (['d','D','ArrowRight'].includes(e.key)) keys.right=false;
  if (['w','W','ArrowUp',' '].includes(e.key)) keys.jump=false;
  if (['s','S','ArrowDown'].includes(e.key)) keys.down=false;
});
window.addEventListener('blur', ()=>{ keys.left=keys.right=keys.jump=keys.down=false; });
function startAttack(){ if (player.attackTimer<=0){ player.attackTimer=300; player.animFrame=0; } }

function overlaps(a,s){ return a.x<s.x+s.w && a.x+a.w>s.x && a.y<s.y+s.h && a.y+a.h>s.y; }
function groundAt(x){ for (const g of OVER.ground) if (x>=g.x && x<g.x+g.w) return true; return false; }
function entryPipe(){ return OVER.pipes.find(p=>p.entry); }
function onEntryPipe(){ if (room!=='over') return false;
  const e=entryPipe(), cxp=player.x+player.w/2, feet=player.y+player.h;
  return player.onGround && Math.abs(feet-e.y)<6 && cxp>e.x && cxp<e.x+e.w; }
function onExitPipe(){ const p=UNDER.exitPipe, feet=player.y+player.h;
  return room==='under' && Math.abs(feet-p.y)<8 && player.x+player.w>p.x+6 && player.x<p.x+p.w-6; }
function nearTerminal(){ const t=UNDER.terminal, cxp=player.x+player.w/2, cxt=t.x+t.w/2;
  return room==='under' && Math.abs(cxp-cxt)<72 && (player.y+player.h)>t.y-50; }

function solidsForCollision(){
  if (room==='over') return [...OVER.ground, ...OVER.pipes, ...OVER.terrain, ...OVER.blocks.filter(b=>!b.vanished)];
  const s=UNDER.solids.concat([UNDER.terminal]); if (!adminUnlocked) s.push(UNDER.exitPipe); return s;
}
function hitBlock(b){
  if (b.used || !b.type) return;
  b.used=true; b.bumpT=180;
  if (b.type==='brick'){ b.vanished=true; }                 // se rompe, no suelta nada
  else if (b.item==='coin'){ coinsGot++; spawnItem(b,'coin'); }
  else { powerups++; spawnItem(b,b.item); applyPowerup(b.item); toast('¡POWER-UP! '+powerups+'/'+TOTAL_POWERUPS); }
}
function spawnItem(b,kind){ floatItems.push({x:b.x+2,y:b.y-2,kind,t:0}); }
function applyPowerup(kind){
  // "grande" es SOLO visual + escudo: NO se agranda la caja de colisión
  // (si creciera, la cabeza chocaría con el costado de los bloques flotantes = barrera invisible)
  if (kind==='mush' && !player.big){ player.big=true; }
  if (kind==='star'){ player.starT=8000; }
}
function hurtPlayer(){
  if (player.invuln>0 || player.starT>0) return;
  if (player.big){ player.big=false; player.invuln=1400; toast('¡Golpe! Perdiste el tamaño.'); return; }
  player.hp--; player.invuln=1400;
  if (player.hp<=0) gameOverT=2600; else toast('¡Golpe! Vidas: '+player.hp);
}
function fallInPit(){
  player.hp--; player.invuln=1200;
  if (player.hp<=0){ gameOverT=2600; return; }
  player.x=player.safeX; player.y=player.safeY-4; player.vx=0; player.vy=0; toast('¡Caíste! Vidas: '+player.hp);
}
function respawn(){
  player.x=48; player.y=OVER.floorY-SMALL_H; player.vx=0; player.vy=0; player.h=SMALL_H;
  player.big=false; player.hp=3; player.invuln=1400; player.starT=0; player.facing='right';
  player.safeX=48; player.safeY=OVER.floorY-SMALL_H; room='over'; camX=0; resetEnemies();
}

function updatePlayer(dt){
  if (gameOverT>0){ gameOverT-=dt; if (gameOverT<=0) respawn(); return; }
  if (challengeOpen||transition||won){ player.state='idle'; return; }
  if (player.invuln>0) player.invuln-=dt;
  if (player.starT>0) player.starT-=dt;
  const MOVE = MOVE_BASE*(player.starT>0?1.7:1);

  player.vx=0;
  if (keys.left){ player.vx=-MOVE; player.facing='left'; }
  if (keys.right){ player.vx=MOVE; player.facing='right'; }
  if (keys.jump && player.onGround){ player.vy=JUMP_V; player.onGround=false; }
  if (keys.down && onEntryPipe()){ startPipe('down'); return; }
  if (keys.jump && onExitPipe() && adminUnlocked){ startPipe('up'); return; }

  player.vy += GRAV; if (player.vy>GRAVMAX) player.vy=GRAVMAX;
  const solids=solidsForCollision();

  player.x += player.vx;
  for (const s of solids){ if (overlaps(player,s)){
    if (player.vx>0) player.x=s.x-player.w; else if (player.vx<0) player.x=s.x+s.w; } }
  if (player.x<0) player.x=0;
  if (player.x+player.w>cur().width) player.x=cur().width-player.w;

  player.onGround=false;
  player.y += player.vy;
  for (const s of solids){ if (overlaps(player,s)){
    if (player.vy>0){ player.y=s.y-player.h; player.vy=0; player.onGround=true; }
    else if (player.vy<0){ player.y=s.y+s.h; player.vy=0; if (s.type) hitBlock(s); } } }

  // caída por POZO (en overworld), descontar vida
  if (room==='over' && player.y > 300){ fallInPit(); }
  // guardar último punto seguro
  if (room==='over' && player.onGround && groundAt(player.x+player.w/2) && player.y+player.h<=OVER.floorY+1){
    player.safeX=player.x; player.safeY=player.y;
  }

  // monedas
  const coins = room==='over'?OVER.coins:UNDER.coins;
  for (const c of coins){ if (!c.got && overlaps(player,{x:c.x-15,y:c.y-16,w:30,h:32})){ c.got=true; coinsGot++; } }

  if (room==='over'){
    updateEnemies(dt); updatePiranhas(dt);
    if (!goalDone && (player.x+player.w/2) > OVER.goalX) reachGoal();
  }

  if (player.attackTimer>0){ player.attackTimer-=dt; player.state='attack'; }
  else if (!player.onGround) player.state='jump';
  else if (player.vx!==0) player.state='walk';
  else player.state='idle';
  player.animTimer+=dt;
  const period=player.state==='walk'?90:(player.state==='attack'?75:170);
  if (player.animTimer>period){ player.animFrame++; player.animTimer=0; }

  const sc=cur().scale, viewW=cv.width/sc;
  camX = Math.max(0, Math.min(player.x+player.w/2-viewW/2, cur().width-viewW));

  for (const it of floatItems){ it.t+=dt; it.y-=0.03*dt; }
  for (let i=floatItems.length-1;i>=0;i--) if (floatItems[i].t>700) floatItems.splice(i,1);
  for (const b of OVER.blocks) if (b.bumpT>0) b.bumpT-=dt;
  if (msgT>0) msgT-=dt;
}

// Goombas autónomos: caminan solos, giran en muros/tuberías/borde de pozo/mundo
function updateEnemies(dt){
  const step=dt/16;
  for (const e of enemies){
    if (e.dead){ e.deadT+=dt; continue; }
    e.anim+=dt;
    e.x += e.vx*step;
    let turn=false;
    if (e.x<0){ e.x=0; turn=true; } if (e.x+e.w>OVER.width){ e.x=OVER.width-e.w; turn=true; }
    for (const p of OVER.pipes){ if (overlaps(e,p)){ turn=true; e.x -= e.vx*step*2; } }
    for (const t of OVER.terrain){ if (overlaps(e,t)){ turn=true; e.x -= e.vx*step*2; } }
    // borde de pozo: si no hay suelo adelante, girar
    const ahead = e.x + (e.vx>0 ? e.w+3 : -3);
    if (!groundAt(ahead)) turn=true;
    if (turn) e.vx=-e.vx;
    // contacto con skeli
    if (overlaps(player,e)){
      const stomp = player.vy>0 && (player.y+player.h - e.y) < 18;
      if (player.starT>0 || stomp){ e.dead=true; e.deadT=0; if (stomp) player.vy=-6.5; }
      else hurtPlayer();
    }
  }
  enemies = enemies.filter(e=>!(e.dead && e.deadT>600));
}

// Plantas Piraña: salen/entran cada ~5s (2.5 arriba / 2.5 abajo)
function updatePiranhas(dt){
  for (const pl of piranhas){
    pl.t = (pl.t+dt) % 5000;
    const onThisPipe = Math.abs((player.x+player.w/2)-(pl.x+8)) < 26;  // no sale si skeli está encima
    const up = pl.t < 2500 && !onThisPipe;
    const target = up ? 28 : 0;
    pl.risen += (target - pl.risen) * Math.min(1, dt/160);
    if (pl.risen > 12){
      const box={x:pl.x, y:pl.top-pl.risen, w:16, h:pl.risen};
      if (overlaps(player,box)) hurtPlayer();
    }
  }
}

function reachGoal(){
  if (hasKey && powerups>=TOTAL_POWERUPS){ goalDone=true; window._openGoal(); }
  else { const f=[]; if(!hasKey)f.push('la LLAVE (SQLi)'); const p=TOTAL_POWERUPS-powerups; if(p>0)f.push(p+' power-up(s)');
    toast('META bloqueada · faltan: '+f.join(' y ')); player.x=OVER.goalX-player.w-2; }
}

function startPipe(dir){ transition={dir,t:0,phase:'in'}; keys.left=keys.right=keys.jump=keys.down=false; }
function updateTransition(dt){
  if (!transition) return; transition.t+=dt;
  if (transition.phase==='in'){
    player.y += (transition.dir==='down'?2.0:-2.0);
    if (transition.t>420){
      if (transition.dir==='down'){ room='under'; player.x=80; player.y=-player.h; player.vy=0; camX=0; }
      else { room='over'; const e=entryPipe(); player.x=e.x+4; player.y=e.y-player.h; player.vy=0;
             player.safeX=player.x; player.safeY=player.y; toast('¡Llave! Rompe los ? , junta los 3 power-ups y ve a la meta →'); }
      transition.phase='out'; transition.t=0;
    }
  } else if (transition.t>300){ transition=null; }
}

// --- Dibujo ---
function drawCoin(x,y){
  const bob=Math.sin(Date.now()/180 + x)*3;
  ctx.save(); ctx.shadowColor='#ffe98a'; ctx.shadowBlur=8;
  ctx.fillStyle='#fcc000'; ctx.beginPath(); ctx.ellipse(x,y+bob,7,10,0,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0; ctx.fillStyle='#ffe98a'; ctx.fillRect(x-2,y+bob-6,2,12);
  ctx.strokeStyle='#b8860b'; ctx.lineWidth=1; ctx.beginPath(); ctx.ellipse(x,y+bob,7,10,0,0,Math.PI*2); ctx.stroke();
  ctx.restore();
}
function drawPlayer(transformed){
  const list=(sprites[player.state]&&sprites[player.state].length)?sprites[player.state]:sprites.idle;
  const img=list[Math.floor(player.animFrame)%list.length]||sprites.idle[0];
  const sc=cur().scale, dh=(player.big?150:118)/sc, dw=dh*(SRC_W/SRC_H);
  const offX=transformed?0:camX, cx=player.x+player.w/2-offX, dx=cx-dw/2, dy=player.y+player.h-dh;
  ctx.fillStyle='rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(cx, player.y+player.h-2, dw*0.32, dh*0.045, 0,0,Math.PI*2); ctx.fill();
  if (!img||!img.complete||!img.naturalWidth) return;
  if (player.invuln>0 && Math.floor(player.invuln/80)%2===0) return;  // parpadeo
  ctx.save();
  if (player.starT>0) ctx.globalAlpha=0.6+0.4*Math.sin(Date.now()/60);
  if (player.facing==='left'){ ctx.translate(dx+dw,dy); ctx.scale(-1,1); ctx.drawImage(img,0,0,SRC_W,SRC_H,0,0,dw,dh); }
  else ctx.drawImage(img,0,0,SRC_W,SRC_H,dx,dy,dw,dh);
  ctx.restore();
}
function drawItemSprite(it){ const img=IMG[it.kind];
  if (img&&img.complete&&img.naturalWidth) ctx.drawImage(img,it.x,it.y,16,16);
  else { ctx.fillStyle=it.kind==='mush'?'#e52521':it.kind==='flower'?'#ff8c00':'#fcd500'; ctx.fillRect(it.x+2,it.y+2,12,12); } }
function drawGoomba(e){
  const x=e.x, y=e.y;   // ya estamos dentro del transform de cámara (no restar camX)
  if (e.dead){ if (IMG.goomba_flat.complete) ctx.drawImage(IMG.goomba_flat,x,y+e.w-8,e.w,8); return; }
  ctx.fillStyle='rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x+e.w/2,y+e.w-2,e.w*0.45,4,0,0,Math.PI*2); ctx.fill();
  const img = Math.floor(e.anim/180)%2 ? IMG.goomba2 : IMG.goomba1;
  if (img.complete&&img.naturalWidth){
    if (e.vx<0){ ctx.save(); ctx.translate(x+e.w,y); ctx.scale(-1,1); ctx.drawImage(img,0,0,e.w,e.w); ctx.restore(); }
    else ctx.drawImage(img,x,y,e.w,e.w);
  } else { ctx.fillStyle='#8b4a1a'; ctx.fillRect(x+2,y+4,e.w-4,e.w-6); }
}
function drawPiranha(pl){
  if (pl.risen<=2) return;
  const x=pl.x, img=Math.floor(Date.now()/250)%2?IMG.piranha2:IMG.piranha1;   // dentro del transform
  const h=28, y=pl.top-pl.risen;
  if (img.complete&&img.naturalWidth) ctx.drawImage(img,0,0,16,24, x, y, 16, Math.min(h,pl.risen+4));
  else { ctx.fillStyle='#2ea82e'; ctx.fillRect(x,y,16,pl.risen); }
}

function drawOverworld(){
  ctx.save(); ctx.imageSmoothingEnabled=false;
  ctx.setTransform(SCALE,0,0,SCALE,-camX*SCALE,0);
  if (bg.complete&&bg.naturalWidth) ctx.drawImage(bg,0,0);
  else { ctx.fillStyle=SKY; ctx.fillRect(camX,0,cv.width/SCALE,cv.height/SCALE); }
  for (const b of OVER.blocks){
    const oy=b.bumpT>0?-Math.sin((1-b.bumpT/180)*Math.PI)*4:0;
    if (b.vanished){ ctx.fillStyle=SKY; ctx.fillRect(b.x,b.y,b.w,b.h); }
    else if (b.used){ if (IMG.used.complete&&IMG.used.naturalWidth) ctx.drawImage(IMG.used,b.x,b.y+oy,16,16);
      else { ctx.fillStyle='#9c5a19'; ctx.fillRect(b.x,b.y+oy,16,16); } }
  }
  for (const c of OVER.coins){ if (!c.got) drawCoin(c.x,c.y); }
  for (const it of floatItems) drawItemSprite(it);
  for (const pl of piranhas) drawPiranha(pl);
  for (const e of enemies) drawGoomba(e);
  const gx=OVER.goalX, unlocked=hasKey&&powerups>=TOTAL_POWERUPS;
  ctx.fillStyle='#2a2a2a'; ctx.fillRect(gx,96,4,112);
  ctx.fillStyle='#e8e8e8'; ctx.beginPath(); ctx.arc(gx+2,94,5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=unlocked?'#3ddc84':'#ff5a5a';
  ctx.beginPath(); ctx.moveTo(gx+4,100); ctx.lineTo(gx+30,108); ctx.lineTo(gx+4,116); ctx.closePath(); ctx.fill();
  const e=entryPipe(), pulse=.5+.5*Math.sin(Date.now()/240);
  ctx.save(); ctx.globalAlpha=.55+.45*pulse; ctx.fillStyle='#fff100'; ctx.font='bold 10px monospace';
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('▼', e.x+e.w/2, e.y-20); ctx.restore();
  if (onEntryPipe()&&!transition) promptW(e.x+e.w/2, e.y, '[↓] BAJAR');
  drawPlayer(true);
  ctx.restore(); ctx.setTransform(1,0,0,1,0,0);
}
function promptW(cx,topY,label){ const y=topY-14; ctx.font='bold 7px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
  const w=ctx.measureText(label).width+8; ctx.fillStyle='rgba(4,14,24,.94)'; ctx.fillRect(cx-w/2,y-5,w,11);
  ctx.strokeStyle='#ffb454'; ctx.lineWidth=.6; ctx.strokeRect(cx-w/2+.3,y-4.7,w-.6,10.4); ctx.fillStyle='#ffe0a6'; ctx.fillText(label,cx,y+.5); }
function promptS(cx,topY,label){ const y=topY-28; ctx.font='bold 10px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
  const w=ctx.measureText(label).width+16; ctx.fillStyle='rgba(4,14,24,.94)'; ctx.fillRect(cx-w/2,y-8,w,17);
  ctx.strokeStyle='#ffb454'; ctx.lineWidth=1; ctx.strokeRect(cx-w/2+.5,y-7.5,w-1,16); ctx.fillStyle='#ffe0a6'; ctx.fillText(label,cx,y+1); }

function drawUnderground(){
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle='#000'; ctx.fillRect(0,0,cv.width,cv.height);
  for (const s of UNDER.solids){ const x=s.x-camX,y=s.y;
    for (let by=0;by<s.h;by+=32) for (let bx=0;bx<s.w;bx+=32){
      ctx.fillStyle='#2038c8'; ctx.fillRect(x+bx,y+by,32,32); ctx.fillStyle='#4a5cff'; ctx.fillRect(x+bx+2,y+by+2,28,4);
      ctx.strokeStyle='#0a0a4a'; ctx.lineWidth=2; ctx.strokeRect(x+bx+1,y+by+1,30,30); } }
  for (const c of UNDER.coins){ if (!c.got) drawCoin(c.x-camX, c.y); }
  const tm=UNDER.terminal, tx=tm.x-camX, pulse=.5+.5*Math.sin(Date.now()/260);
  ctx.save(); ctx.shadowColor=adminUnlocked?'#3ddc84':'#ffb454'; ctx.shadowBlur=10+12*pulse;
  ctx.fillStyle='#101d2c'; ctx.fillRect(tx,tm.y,tm.w,tm.h); ctx.shadowBlur=0;
  ctx.fillStyle='#263a4d'; ctx.fillRect(tx+5,tm.y+5,tm.w-10,20);
  ctx.fillStyle=adminUnlocked?'#66f2ce':'#ff5a5a'; ctx.fillRect(tx+8,tm.y+8,tm.w-16,14);
  ctx.fillStyle='#07131e'; ctx.font='bold 9px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(adminUnlocked?'ADMIN':'SQL', tx+tm.w/2, tm.y+15);
  ctx.strokeStyle='rgba(124,255,224,.8)'; ctx.lineWidth=1; ctx.strokeRect(tx+1.5,tm.y+1.5,tm.w-3,tm.h-3); ctx.restore();
  if (nearTerminal()&&!challengeOpen&&!adminUnlocked) promptS(tx+tm.w/2, tm.y, '[ E ] ACCESO');
  const p=UNDER.exitPipe, px=p.x-camX, body=adminUnlocked?'#1f7a1f':'#00a800';
  ctx.fillStyle=body; ctx.fillRect(px,p.y+18,p.w,p.h-18); ctx.fillRect(px-6,p.y,p.w+12,20);
  ctx.fillStyle='#7bd858'; ctx.fillRect(px+6,p.y+22,8,p.h-26); ctx.fillRect(px,p.y+4,8,12);
  ctx.strokeStyle='#0b3b12'; ctx.lineWidth=3; ctx.strokeRect(px+1,p.y+18,p.w-2,p.h-18); ctx.strokeRect(px-6,p.y,p.w+12,20);
  if (adminUnlocked){ ctx.fillStyle='#021002'; ctx.fillRect(px+6,p.y+3,p.w-12,14);
    if (onExitPipe()&&!transition) promptS(px+p.w/2,p.y,'[ ↑ ] SUBIR'); }
  else { ctx.fillStyle='#1a1a1a'; ctx.fillRect(px+p.w/2-9,p.y-18,18,16);
    ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(px+p.w/2,p.y-18,7,Math.PI,0); ctx.stroke();
    ctx.fillStyle='#ffd23f'; ctx.fillRect(px+p.w/2-2,p.y-14,4,8); }
  drawPlayer(false);
}

function drawHUD(){
  ctx.setTransform(1,0,0,1,0,0);
  const hudX=cv.width/2-174, hudY=6, hudW=348, hudH=34;
  ctx.fillStyle='rgba(5,13,24,.94)'; ctx.fillRect(hudX,hudY,hudW,hudH);
  ctx.strokeStyle='rgba(89,208,221,.75)'; ctx.lineWidth=1; ctx.strokeRect(hudX+.5,hudY+.5,hudW-1,hudH-1);
  ctx.fillStyle='#ffb454'; ctx.fillRect(hudX+7,hudY+7,3,hudH-14);
  ctx.fillStyle='#ffb454'; ctx.font='bold 12px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('MUNDO 1-1  /  SUPER MARIO', cv.width/2, hudY+12);
  ctx.fillStyle='#78b7c8'; ctx.font='bold 8px monospace';
  const sub=room==='under'?'ACCESO ADMIN (SQLi) PARA LA LLAVE':(hasKey?'JUNTA LOS 3 POWER-UPS Y LLEGA A LA META →':'BAJA POR LA PRIMERA TUBERÍA ↓');
  ctx.fillText(sub, cv.width/2, hudY+26);
  ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.font='bold 13px monospace';
  for (let i=0;i<3;i++){ ctx.fillStyle=i<player.hp?'#ff4d6d':'#3a2030'; heart(14+i*16,16); }
  ctx.fillStyle=hasKey?'#ffd23f':'#55606f'; ctx.fillText('🔑',66,18);
  ctx.fillStyle='#ff8c00'; ctx.fillText('★'+powerups+'/'+TOTAL_POWERUPS,88,18);
  if (player.starT>0){ ctx.fillStyle='#fcd500'; ctx.fillText('INVENCIBLE',150,18); }
  ctx.fillStyle='rgba(5,13,24,.9)'; ctx.fillRect(cv.width-96,6,90,24);
  ctx.strokeStyle='rgba(252,192,0,.8)'; ctx.strokeRect(cv.width-95.5,6.5,89,23);
  ctx.fillStyle='#fcc000'; ctx.beginPath(); ctx.ellipse(cv.width-80,18,6,8,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#ffd24a'; ctx.textAlign='left'; ctx.fillText('× '+coinsGot, cv.width-68, 19);
  if (msgT>0 && msg){ ctx.font='bold 11px monospace'; ctx.textAlign='center';
    const w=ctx.measureText(msg).width+20; ctx.fillStyle='rgba(8,16,30,.95)'; ctx.fillRect(cv.width/2-w/2,44,w,22);
    ctx.strokeStyle='#ffd23f'; ctx.strokeRect(cv.width/2-w/2+.5,44.5,w-1,21);
    ctx.fillStyle='#ffe98a'; ctx.textBaseline='middle'; ctx.fillText(msg,cv.width/2,55); }
}
function heart(x,y){ ctx.beginPath(); ctx.moveTo(x+5,y+9); ctx.bezierCurveTo(x-2,y+3,x+1,y-2,x+5,y+2);
  ctx.bezierCurveTo(x+9,y-2,x+12,y+3,x+5,y+9); ctx.fill(); }

function draw(){
  ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,cv.width,cv.height);
  if (room==='over') drawOverworld(); else drawUnderground();
  drawHUD();
  if (transition){ const a=transition.phase==='in'?Math.min(1,transition.t/420):Math.max(0,1-transition.t/300);
    ctx.fillStyle=`rgba(0,0,0,${0.85*a})`; ctx.fillRect(0,0,cv.width,cv.height); }
  if (gameOverT>0){ if (IMG.gameover.complete&&IMG.gameover.naturalWidth) ctx.drawImage(IMG.gameover,0,0,cv.width,cv.height);
    else { ctx.fillStyle='#000'; ctx.fillRect(0,0,cv.width,cv.height); ctx.fillStyle='#fff'; ctx.font='bold 28px monospace'; ctx.textAlign='center'; ctx.fillText('GAME OVER',cv.width/2,cv.height/2); } }
  ctx.strokeStyle='rgba(118,220,218,.7)'; ctx.lineWidth=2; ctx.strokeRect(1,1,cv.width-2,cv.height-2);
}
let last=performance.now();
function loop(t){ const dt=Math.min(t-last,50); last=t; updatePlayer(dt); updateTransition(dt); draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);

// --- Reto SQLi ---
function tryOpenTerminal(){ if (nearTerminal()&&!adminUnlocked) openChallenge(); }
function openChallenge(){ challengeOpen=true; keys.left=keys.right=keys.jump=keys.down=false; document.getElementById('challenge').classList.add('show'); }
function closeChallenge(){ challengeOpen=false; document.getElementById('challenge').classList.remove('show'); }
window._closeChallenge=closeChallenge;
window._setAdminUnlocked=function(){ adminUnlocked=true; hasKey=true; const n=document.getElementById('pipe-open-note'); if (n) n.style.display='block'; };
window._openGoal=function(){ challengeOpen=true; keys.left=keys.right=keys.jump=keys.down=false;
  document.getElementById('challenge').classList.add('show');
  const fw=document.getElementById('flagwrap'); if (fw) fw.hidden=false;
  const gb=document.getElementById('goalbanner'); if (gb) gb.style.display='block'; };
window._showWin=function(){ won=true; const w=document.getElementById('win'); if (w) w.classList.add('show'); };
