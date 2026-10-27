// ====================================================================
//  Nivel 14 - Pokémon: "La Liga de los administradores" (isométrico 2.5D)
//  Fabiancho recorre un pueblo isométrico hasta el CENTRO DE LA LIGA (E).
//  Aldeanos y carteles sueltan frases al acercarte. Todo arte propio.
// ====================================================================
const cv = document.getElementById('arena');
const ctx = cv.getContext('2d');
cv.width = 1256; cv.height = 530;

const TW = 112, TH = 56, BUILD_H = 88;

function loadImg(src){ const i=new Image(); i.src=src; return i; }
const sprites = { idle:[], walk:[] };
for (let i=1;i<=4;i++) sprites.idle.push(loadImg(`/static/img/skeli_fixed/idle/idle${i}.png`));
for (let i=1;i<=6;i++) sprites.walk.push(loadImg(`/static/img/skeli_fixed/walk/walk${i}.png`));
const npcSprites = {
    cacodemon: { image:loadImg('/static/img/markers/doom.png'), frames:7, width:88, height:88, speed:120 },
    contra: { image:loadImg('/static/img/markers/contra.png'), frames:4, width:58, height:88, speed:160 },
    bomberman: { image:loadImg('/static/img/markers/bomberman.png'), frames:3, width:64, height:84, speed:200 },
    megaman: { image:loadImg('/static/img/markers/megaman_walk.png'), frames:3, frameWidth:25, frameHeight:28, width:70, height:78, speed:140 },
    trainer: { image:loadImg('/static/img/markers/pokemon.png'), frames:4, cols:4, frameWidth:49, frameHeight:67, row:0, width:70, height:96, speed:180 },
    enemy: { image:loadImg('/static/img/enemies/enemy_idle.png'), frames:19, cols:20, frameWidth:100, frameHeight:100, row:2, crop:{x:40,y:26,width:20,height:53}, width:70, height:92, speed:140 },
    rat: { image:loadImg('/static/img/rats/rat_run.png'), frames:6, cols:4, frameWidth:64, frameHeight:64, crop:{x:24,y:34,width:18,height:15}, width:64, height:54, speed:150 },
};

// Mapa 20x16 (más amplio): G césped, P camino, W agua, B/L edificio, S spawn
const MAPSTR = [
    "WWWWWWWWWWWWWWWWWWWW",
    "WGGGGGGPGGGGGGPGGGGW",
    "WGBBGGGPGGBBGGPGGBGW",
    "WGBBGGGPGGBBGGPGGBGW",
    "WGGGGGGPGGGGGGPGGGGW",
    "WPPPPPPPPPPPPPPPPPGW",
    "WGGGGGGPGGGGGGPGGGGW",
    "WGGBBGGPGGGGGGPGGGGW",
    "WGGBBGGPGGLLGGPGGBGW",
    "WGGGGGGPGGLLGGPGGBGW",
    "WPPPPPPPPPPPPPPGGGGW",
    "WGGGGGGPGGGGGGGGGGGW",
    "WGBGGGGPGGBBGGGGGGGW",
    "WGBGGGGSGGBBGGGGGGGW",
    "WGGGGGGGGGGGGGGGGGGW",
    "WWWWWWWWWWWWWWWWWWWW",
];
const MAP = MAPSTR.map(r=>r.split(""));
const MH = MAP.length, MW = MAP[0].length;
function tile(gx,gy){ if (gx<0||gy<0||gx>=MW||gy>=MH) return 'W'; return MAP[gy][gx]; }
function solid(gx,gy){ const t=tile(gx,gy); return t==='W'||t==='B'||t==='L'; }

let spawn={x:5,y:9}, liga={x:8,y:7};
for (let y=0;y<MH;y++) for (let x=0;x<MW;x++){ if (MAP[y][x]==='S'){ spawn={x,y}; MAP[y][x]='P'; } }
const player = { gx:spawn.x+0.5, gy:spawn.y+0.5, facing:'right', moving:false, animFrame:0, animTimer:0 };
const cam = { x:0, y:0 };

// Aldeanos (personajes ORIGINALES variados) y carteles con frases
const npcs = [
    { gx:2.5, gy:1.5,  kind:'villager', robe:'#e85d5d', hat:'#b03030', say:"¡Bienvenido a la Liga, retador!" },
    { gx:15.5, gy:1.5, kind:'sprite', sprite:'bomberman', say:"¡Bomberman también encontró el respaldo .bak!" },
    { gx:2.5, gy:6.5,  kind:'wizard',   c1:'#5a3ea8', c2:'#ffd24a', say:"Correlaciona lo que encuentres. Nada es casualidad." },
    { gx:16.5, gy:6.5,  kind:'sprite', sprite:'contra', say:"El soldado de Contra despejó el camino hasta la Liga." },
    { gx:3.5, gy:11.5, kind:'merchant', c1:'#c98a3e', c2:'#e8c04d', say:"Un buen hacker lee hasta los archivos .bak." },
    { gx:16.5, gy:11.5,kind:'sprite', sprite:'cacodemon', say:"¡El cacodemonio custodia la Liga!" },
    { gx:5.5, gy:14.5, kind:'villager', robe:'#ff9a4d', hat:'#c06a20', say:"Si entras como admin, la Liga es tuya." },
    { gx:15.5, gy:14.5,kind:'robot',    c1:'#6a74a6', c2:'#ff7ad6', say:"BIP. Credenciales filtradas = puertas abiertas." },
    { gx:9.5, gy:1.5, kind:'sprite', sprite:'megaman', say:"Mega Man llegó a la Liga. ¡Misión cumplida!" },
    { gx:12.5, gy:2.5, kind:'sprite', sprite:'trainer', say:"El entrenador Pokémon está listo para el desafío final." },
    { gx:6.5, gy:4.5, kind:'sprite', sprite:'enemy', say:"Un enemigo ronda el pueblo. ¡Mantén la guardia!" },
    { gx:11.5, gy:10.5, kind:'sprite', sprite:'enemy', say:"Otro enemigo vigila el camino a la Liga." },
    { gx:4.5, gy:4.5, kind:'sprite', sprite:'rat', say:"Una rata corretea entre la hierba." },
    { gx:13.5, gy:9.5, kind:'sprite', sprite:'rat', say:"¡Otra rata se escabulle por el camino!" },
];
const signs = [
    { gx:8.5, gy:6.5,  say:"CARTEL: Torneo de la Liga — solo administradores autorizados." },
    { gx:12.5, gy:6.5, say:"CARTEL: Config del servidor en mantenimiento. No tocar." },
    { gx:6.5, gy:11.5, say:"CARTEL: Rota tus credenciales. (nadie lo hace)" },
    { gx:13.5, gy:13.5,say:"CARTEL: ¿Perdido? El respaldo .bak quedó accesible." },
];
const buildings = [
    {x:2,y:2,w:2,h:2}, {x:10,y:2,w:2,h:2}, {x:17,y:2,w:1,h:2},
    {x:3,y:7,w:2,h:2}, {x:17,y:8,w:1,h:2}, {x:2,y:12,w:1,h:2},
    {x:10,y:12,w:2,h:2}, {x:10,y:8,w:2,h:2,league:true},
];
const trees = [
    [1.5,1.5],[18.5,1.5],[1.5,14.5],[18.5,14.5],[5.5,8.5],
    [16.5,3.5],[8.5,14.5],[13.5,2.5],[1.5,8.5],[7.5,2.5],[14.5,14.5],
];
const lamps = [ [7.5,3.5],[7.5,9.5],[14.5,5.5],[14.5,12.5] ];
const flowerBeds = [
    [2.5,5.5,'#ff7096'],[3.5,5.5,'#ffd166'],[4.5,5.5,'#f8f5a6'],
    [15.5,10.5,'#ff7096'],[16.5,10.5,'#ffd166'],[17.5,10.5,'#f8f5a6'],
    [6.5,13.5,'#f8f5a6'],[7.5,13.5,'#ff7096'],[8.5,13.5,'#ffd166'],
];

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
    const frameScale=Math.min(dt,50)/16.67;
    const sp=0.075*frameScale; if (dx&&dy){ dx*=0.707; dy*=0.707; }
    const nx=player.gx+dx*sp, ny=player.gy+dy*sp, r=0.28;
    if (!solid(Math.floor(nx+(dx>0?r:-r)), Math.floor(player.gy))) player.gx=nx;
    if (!solid(Math.floor(player.gx), Math.floor(ny+(dy>0?r:-r)))) player.gy=ny;
    const cameraEase=1-Math.pow(0.9,frameScale);
    cam.x += ((player.gx-player.gy)*TW/2 - cam.x)*cameraEase;
    cam.y += ((player.gx+player.gy)*TH/2 - cam.y)*cameraEase;
    player.animTimer+=dt;
    if (player.animTimer>(player.moving?90:180)){ player.animFrame++; player.animTimer=0; }
}

function diamond(cx,cy,fill){
    ctx.beginPath(); ctx.moveTo(cx,cy-TH/2); ctx.lineTo(cx+TW/2,cy); ctx.lineTo(cx,cy+TH/2); ctx.lineTo(cx-TW/2,cy); ctx.closePath();
    ctx.fillStyle=fill; ctx.fill();
}
function drawTileTop(gx,gy,targetCtx=ctx,project=isoToScreen){
    const s=project(gx+0.5,gy+0.5), t=tile(gx,gy);
    const seed=(gx*37+gy*61)%17;
    targetCtx.beginPath(); targetCtx.moveTo(s.x,s.y+3-TH/2); targetCtx.lineTo(s.x+TW/2,s.y+3); targetCtx.lineTo(s.x,s.y+3+TH/2); targetCtx.lineTo(s.x-TW/2,s.y+3); targetCtx.closePath();
    targetCtx.fillStyle=t==='W'?'#1768a1':t==='P'?'#ad8050':'#34763d'; targetCtx.fill();
    let gradient;
    if(t==='W'){
        gradient=targetCtx.createLinearGradient(s.x-TW/2,s.y-TH/2,s.x+TW/2,s.y+TH/2);
        gradient.addColorStop(0,'#52d4e6'); gradient.addColorStop(1,'#2184c1');
    }else if(t==='P'){
        gradient=targetCtx.createLinearGradient(s.x-TW/2,s.y-TH/2,s.x+TW/2,s.y+TH/2);
        gradient.addColorStop(0,'#f3d89a'); gradient.addColorStop(1,'#cfaa69');
    }else{
        gradient=targetCtx.createLinearGradient(s.x-TW/2,s.y-TH/2,s.x+TW/2,s.y+TH/2);
        gradient.addColorStop(0,(gx+gy)%2?'#79c95b':'#86d363');
        gradient.addColorStop(1,(gx+gy)%2?'#62b84d':'#73c455');
    }
    targetCtx.beginPath(); targetCtx.moveTo(s.x,s.y-TH/2); targetCtx.lineTo(s.x+TW/2,s.y); targetCtx.lineTo(s.x,s.y+TH/2); targetCtx.lineTo(s.x-TW/2,s.y); targetCtx.closePath();
    targetCtx.fillStyle=gradient; targetCtx.fill();
    targetCtx.strokeStyle=t==='W'?'rgba(207,250,255,.28)':t==='P'?'rgba(255,241,199,.36)':'rgba(31,91,42,.16)';
    targetCtx.lineWidth=1.5; targetCtx.stroke();
    if(t==='P'){
        targetCtx.fillStyle='rgba(255,255,255,.32)';
        targetCtx.beginPath(); targetCtx.ellipse(s.x-TW*.17,s.y-TH*.08,3,2,-.4,0,Math.PI*2); targetCtx.fill();
        targetCtx.beginPath(); targetCtx.ellipse(s.x+TW*.16,s.y+TH*.12,2.4,1.7,-.4,0,Math.PI*2); targetCtx.fill();
    }else if(t==='G'){
        for(let i=0;i<3;i++){
            const x=s.x+(((seed+i*7)%13)-6)*4;
            const y=s.y+(((seed+i*5)%7)-3)*3;
            targetCtx.strokeStyle=i===0?'rgba(32,112,48,.42)':'rgba(220,255,178,.48)';
            targetCtx.lineWidth=1.5; targetCtx.beginPath(); targetCtx.moveTo(x,y+3); targetCtx.lineTo(x-2,y-2); targetCtx.moveTo(x,y+3); targetCtx.lineTo(x+2,y-1); targetCtx.stroke();
        }
    }
}
const TERRAIN_OFFSET_X=MH*TW/2+TW;
const TERRAIN_OFFSET_Y=TH;
const terrainCanvas=document.createElement('canvas');
terrainCanvas.width=(MW+MH)*TW/2+3*TW;
terrainCanvas.height=(MW+MH)*TH/2+4*TH;
const terrainCtx=terrainCanvas.getContext('2d');
function terrainToCanvas(gx,gy){
    return {x:(gx-gy)*TW/2+TERRAIN_OFFSET_X,y:(gx+gy)*TH/2+TERRAIN_OFFSET_Y};
}
for(let gy=0;gy<MH;gy++) for(let gx=0;gx<MW;gx++) drawTileTop(gx,gy,terrainCtx,terrainToCanvas);
function drawBuilding(building){
    const {x,y,w,h,league}=building;
    const s=isoToScreen(x+w/2,y+h/2), cx=s.x, cy=s.y;
    const halfX=(w+h)*TW/4, halfY=(w+h)*TH/4;
    const left={x:cx-halfX,y:cy}, front={x:cx,y:cy+halfY}, right={x:cx+halfX,y:cy};
    const wallTop=cy-BUILD_H;
    ctx.fillStyle='#928e70'; ctx.strokeStyle='#d5c79a'; ctx.lineWidth=3;
    ctx.beginPath();
    ctx.moveTo(cx,cy-halfY-3); ctx.lineTo(cx+halfX+5,cy); ctx.lineTo(cx,cy+halfY+3);
    ctx.lineTo(cx-halfX-5,cy); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='rgba(65,74,58,.42)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(cx-halfX*.55,cy); ctx.lineTo(cx,cy+halfY*.55); ctx.lineTo(cx+halfX*.55,cy); ctx.stroke();
    ctx.fillStyle=league?'#7147a6':'#b56c47';
    ctx.beginPath(); ctx.moveTo(left.x,left.y); ctx.lineTo(front.x,front.y); ctx.lineTo(front.x,front.y-BUILD_H); ctx.lineTo(left.x,wallTop); ctx.closePath(); ctx.fill();
    ctx.fillStyle=league?'#8f5bc1':'#d18b5c';
    ctx.beginPath(); ctx.moveTo(right.x,right.y); ctx.lineTo(front.x,front.y); ctx.lineTo(front.x,front.y-BUILD_H); ctx.lineTo(right.x,wallTop); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(255,236,191,.5)'; ctx.lineWidth=2;
    for(let i=1;i<5;i++){
        const yy=wallTop+i*BUILD_H/5;
        ctx.beginPath(); ctx.moveTo(left.x+8,yy); ctx.lineTo(cx-4,yy+halfY*.12); ctx.moveTo(cx+4,yy+halfY*.12); ctx.lineTo(right.x-8,yy); ctx.stroke();
    }
    const doorH=BUILD_H*.43, doorStart=.34, doorEnd=.62;
    const doorBaseStart={x:left.x+(front.x-left.x)*doorStart,y:left.y+(front.y-left.y)*doorStart-3};
    const doorBaseEnd={x:left.x+(front.x-left.x)*doorEnd,y:left.y+(front.y-left.y)*doorEnd-3};
    ctx.fillStyle='#49313a'; ctx.strokeStyle='#f0c77c'; ctx.lineWidth=3;
    ctx.beginPath();
    ctx.moveTo(doorBaseStart.x,doorBaseStart.y);
    ctx.lineTo(doorBaseEnd.x,doorBaseEnd.y);
    ctx.lineTo(doorBaseEnd.x,doorBaseEnd.y-doorH);
    ctx.lineTo(doorBaseStart.x,doorBaseStart.y-doorH);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#ffd76a';
    ctx.beginPath();
    ctx.arc(doorBaseStart.x+(doorBaseEnd.x-doorBaseStart.x)*.78,doorBaseStart.y-doorH*.48,2.5,0,Math.PI*2);
    ctx.fill();
    for(const t of [.34,.65]){
        const halfSpan=.055, height=18;
        const verticalOffset=(BUILD_H-height)/2;
        const windowStart={x:right.x+(front.x-right.x)*(t-halfSpan),y:right.y+(front.y-right.y)*(t-halfSpan)-3-verticalOffset};
        const windowEnd={x:right.x+(front.x-right.x)*(t+halfSpan),y:right.y+(front.y-right.y)*(t+halfSpan)-3-verticalOffset};
        ctx.fillStyle='#b8f5ff'; ctx.strokeStyle='#fff0bb'; ctx.lineWidth=3;
        ctx.beginPath();
        ctx.moveTo(windowStart.x,windowStart.y);
        ctx.lineTo(windowEnd.x,windowEnd.y);
        ctx.lineTo(windowEnd.x,windowEnd.y-height);
        ctx.lineTo(windowStart.x,windowStart.y-height);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle='rgba(40,108,151,.55)'; ctx.lineWidth=2;
        const middleX=(windowStart.x+windowEnd.x)/2;
        const middleY=(windowStart.y+windowEnd.y)/2;
        ctx.beginPath(); ctx.moveTo(middleX,middleY-1); ctx.lineTo(middleX,middleY-height+1); ctx.stroke();
        ctx.strokeStyle='#fff0bb'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(windowStart.x+1,windowStart.y-height*.52); ctx.lineTo(windowEnd.x-1,windowEnd.y-height*.52); ctx.stroke();
    }
    const roofBack={x:cx,y:cy-halfY-BUILD_H};
    const roofLeft={x:left.x-5,y:wallTop};
    const roofFront={x:cx,y:front.y-BUILD_H+3};
    const roofRight={x:right.x+5,y:wallTop};
    const roofPeak={x:cx,y:wallTop-halfY*.58};
    const colors=league
        ? {faces:['#df258d','#fb459e','#f62b89','#b91468'],edge:'#ff9bd1',seam:'rgba(104,24,71,.52)',tile:'rgba(255,209,235,.58)'}
        : {faces:['#c9493e','#ed6750','#e55348','#a93637'],edge:'#ffad7c',seam:'rgba(99,43,39,.48)',tile:'rgba(255,220,170,.56)'};
    const facets=[
        {a:roofBack,b:roofLeft,color:colors.faces[0]},
        {a:roofLeft,b:roofFront,color:colors.faces[1]},
        {a:roofFront,b:roofRight,color:colors.faces[2]},
        {a:roofRight,b:roofBack,color:colors.faces[3]},
    ];
    for(const facet of facets){
        ctx.save();
        ctx.beginPath(); ctx.moveTo(facet.a.x,facet.a.y); ctx.lineTo(facet.b.x,facet.b.y);
        ctx.lineTo(roofPeak.x,roofPeak.y); ctx.closePath(); ctx.clip();
        const roofGradient=ctx.createLinearGradient(facet.a.x,facet.a.y,roofPeak.x,roofPeak.y);
        roofGradient.addColorStop(0,facet.color); roofGradient.addColorStop(1,colors.faces[0]);
        ctx.fillStyle=roofGradient;
        ctx.fillRect(cx-halfX-12,roofPeak.y-4,2*halfX+24,cy+halfY-roofPeak.y+8);
        ctx.strokeStyle=colors.seam; ctx.lineWidth=2;
        for(let row=1;row<6;row++){
            const ratio=row/6;
            const ax=roofPeak.x+(facet.a.x-roofPeak.x)*ratio;
            const ay=roofPeak.y+(facet.a.y-roofPeak.y)*ratio;
            const bx=roofPeak.x+(facet.b.x-roofPeak.x)*ratio;
            const by=roofPeak.y+(facet.b.y-roofPeak.y)*ratio;
            ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
            ctx.strokeStyle=colors.tile; ctx.lineWidth=1;
            const count=3;
            for(let tile=1;tile<count;tile++){
                const u=tile/count, px=ax+(bx-ax)*u, py=ay+(by-ay)*u;
                ctx.beginPath(); ctx.moveTo(px,py-2); ctx.lineTo(px,py+2); ctx.stroke();
            }
            ctx.strokeStyle=colors.seam; ctx.lineWidth=2;
        }
        ctx.restore();
        ctx.strokeStyle=colors.edge; ctx.lineWidth=4; ctx.lineJoin='round';
        ctx.beginPath(); ctx.moveTo(facet.a.x,facet.a.y); ctx.lineTo(roofPeak.x,roofPeak.y);
        ctx.lineTo(facet.b.x,facet.b.y); ctx.stroke();
    }
    ctx.strokeStyle=colors.edge; ctx.lineWidth=6; ctx.lineJoin='round';
    ctx.beginPath(); ctx.moveTo(roofBack.x,roofBack.y); ctx.lineTo(roofLeft.x,roofLeft.y);
    ctx.lineTo(roofFront.x,roofFront.y); ctx.lineTo(roofRight.x,roofRight.y);
    ctx.closePath(); ctx.stroke();
    ctx.fillStyle='#f8edc2'; ctx.strokeStyle='#523a53'; ctx.lineWidth=2;
    ctx.fillRect(cx-halfX*.2,wallTop+BUILD_H*.57,halfX*.4,18); ctx.strokeRect(cx-halfX*.2,wallTop+BUILD_H*.57,halfX*.4,18);
    ctx.fillStyle=league?'#7542a5':'#3e5b68'; ctx.font='bold 10px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(league?'LIGA':'POKÉ',cx,wallTop+BUILD_H*.57+9);
    if(league && nearLiga() && !challengeOpen){
        ctx.fillStyle='#fff3a6'; ctx.font='bold 15px monospace';         ctx.fillText('[ E ] ENTRAR',cx,roofPeak.y-16);
    }
}
function drawTree(gx,gy){
    const s=isoToScreen(gx,gy);
    ctx.fillStyle='rgba(19,54,33,.32)'; ctx.beginPath(); ctx.ellipse(s.x,s.y+3,22,8,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#765037'; ctx.fillRect(s.x-5,s.y-22,10,25);
    ctx.fillStyle='#367844'; ctx.beginPath(); ctx.arc(s.x,s.y-33,22,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#4b9d4e'; ctx.beginPath(); ctx.arc(s.x-12,s.y-39,15,0,Math.PI*2); ctx.arc(s.x+10,s.y-42,16,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#82d65e'; ctx.beginPath(); ctx.arc(s.x-8,s.y-47,9,0,Math.PI*2); ctx.arc(s.x+9,s.y-36,8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#e35156'; ctx.beginPath(); ctx.arc(s.x-13,s.y-32,3.5,0,Math.PI*2); ctx.arc(s.x+13,s.y-48,3.5,0,Math.PI*2); ctx.fill();
}
function drawLamp(gx,gy){
    const s=isoToScreen(gx,gy);
    ctx.fillStyle='rgba(16,45,38,.22)'; ctx.beginPath(); ctx.ellipse(s.x,s.y+3,10,4,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#56616b'; ctx.fillRect(s.x-3,s.y-42,6,45);
    ctx.fillStyle='#bbc8bc'; ctx.fillRect(s.x-7,s.y-48,14,9);
    ctx.fillStyle=Math.floor(Date.now()/600)%2?'#fff5b0':'#ffce61';
    ctx.beginPath(); ctx.arc(s.x,s.y-49,5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,215,105,.17)';
    ctx.beginPath(); ctx.arc(s.x,s.y-43,21,0,Math.PI*2); ctx.fill();
}
function drawFlowerBed(gx,gy,color){
    const s=isoToScreen(gx,gy);
    for(let i=0;i<5;i++){
        const x=s.x+(i-2)*11, y=s.y+((i%2)*5);
        ctx.strokeStyle='#397a43'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(x,y+5); ctx.lineTo(x,y-2); ctx.stroke();
        ctx.fillStyle='#71c963'; ctx.beginPath(); ctx.ellipse(x-3,y+2,4,2,-.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x,y-3,3.8,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#fff4bc'; ctx.beginPath(); ctx.arc(x,y-3,1.3,0,Math.PI*2); ctx.fill();
    }
}
function drawNpc(n){
    const s=isoToScreen(n.gx,n.gy), x=s.x, y=s.y;
    const bob=Math.sin(Date.now()/400 + n.gx)*1.5;
    const k=n.kind||'villager';
    if (k==='sprite'){
        const sprite=npcSprites[n.sprite];
        const groundY=y+TH/2;
        const frame=Math.floor(Date.now()/sprite.speed);
        const frameIndex=frame%sprite.frames;
        const img=sprite.image;
        if (img.complete&&img.naturalWidth){
            const frameWidth=sprite.frameWidth||img.naturalWidth/sprite.frames;
            const frameHeight=sprite.frameHeight||img.naturalHeight;
            const crop=sprite.crop||{x:0,y:0,width:frameWidth,height:frameHeight};
            const sx=(sprite.cols ? (frameIndex%sprite.cols)*frameWidth : frameIndex*frameWidth)+crop.x;
            const sy=(sprite.row!==undefined ? sprite.row*frameHeight
                : (sprite.cols ? Math.floor(frameIndex/sprite.cols)*frameHeight : 0))+crop.y;
            const scale=Math.min(sprite.width/crop.width,sprite.height/crop.height);
            const drawWidth=crop.width*scale, drawHeight=crop.height*scale;
            ctx.fillStyle='rgba(0,0,0,.3)';
            ctx.beginPath(); ctx.ellipse(x,groundY+1,Math.max(12,drawWidth*.22),5,0,0,Math.PI*2); ctx.fill();
            ctx.drawImage(img,sx,sy,crop.width,crop.height,
                x-drawWidth/2,groundY-drawHeight+bob,drawWidth,drawHeight);
        }
    } else {
        ctx.fillStyle='rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x,y+4,12,5,0,0,Math.PI*2); ctx.fill();
    }
    if (k==='villager'){
        ctx.fillStyle=n.robe; ctx.beginPath(); ctx.moveTo(x-10,y+2); ctx.lineTo(x+10,y+2); ctx.lineTo(x+7,y-18); ctx.lineTo(x-7,y-18); ctx.closePath(); ctx.fill();
        ctx.fillStyle='#f1c9a5'; ctx.beginPath(); ctx.arc(x,y-23+bob,8,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=n.hat; ctx.beginPath(); ctx.moveTo(x-10,y-26+bob); ctx.lineTo(x+10,y-26+bob); ctx.lineTo(x,y-39+bob); ctx.closePath(); ctx.fill();
        ctx.fillStyle='#000'; ctx.fillRect(x-3,y-24+bob,2,2); ctx.fillRect(x+2,y-24+bob,2,2);
    } else if (k==='robot'){
        ctx.fillStyle=n.c1; ctx.fillRect(x-10,y-18,20,20);                 // cuerpo
        ctx.fillStyle='#5b6473'; ctx.fillRect(x-12,y-12,4,10); ctx.fillRect(x+8,y-12,4,10); // brazos
        ctx.fillStyle=n.c1; ctx.fillRect(x-9,y-34+bob,18,16);              // cabeza
        ctx.strokeStyle='#30363d'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x,y-34+bob); ctx.lineTo(x,y-40+bob); ctx.stroke();
        ctx.fillStyle=n.c2; ctx.fillRect(x-6,y-30+bob,12,5);               // visor
        ctx.fillStyle='#fff'; ctx.fillRect(x-4,y-29+bob,3,3);
    } else if (k==='wizard'){
        ctx.fillStyle=n.c1; ctx.beginPath(); ctx.moveTo(x-11,y+2); ctx.lineTo(x+11,y+2); ctx.lineTo(x+6,y-20); ctx.lineTo(x-6,y-20); ctx.closePath(); ctx.fill();
        ctx.fillStyle='#f1c9a5'; ctx.beginPath(); ctx.arc(x,y-24+bob,7,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#d8d8d8'; ctx.fillRect(x-7,y-20,14,4);              // barba
        ctx.fillStyle=n.c1; ctx.beginPath(); ctx.moveTo(x-10,y-27+bob); ctx.lineTo(x+10,y-27+bob); ctx.lineTo(x+3,y-48+bob); ctx.closePath(); ctx.fill(); // gorro largo
        ctx.fillStyle=n.c2; ctx.beginPath(); ctx.arc(x+3,y-48+bob,2.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#6b4a28'; ctx.fillRect(x+11,y-30,2,32); ctx.fillStyle=n.c2; ctx.beginPath(); ctx.arc(x+12,y-32,4,0,Math.PI*2); ctx.fill(); // báculo
    } else if (k==='guard'){
        ctx.fillStyle=n.c1; ctx.fillRect(x-9,y-18,18,20);                 // armadura
        ctx.fillStyle=n.c2; ctx.fillRect(x-9,y-18,18,4);
        ctx.fillStyle=n.c1; ctx.beginPath(); ctx.arc(x,y-26+bob,8,Math.PI,0); ctx.fill(); // casco
        ctx.fillRect(x-8,y-26+bob,16,6);
        ctx.fillStyle='#1a1f28'; ctx.fillRect(x-6,y-24+bob,12,3);         // visera
        ctx.fillStyle='#8f6b3a'; ctx.fillRect(x+10,y-36,3,38);            // lanza
        ctx.fillStyle='#c0c8d2'; ctx.beginPath(); ctx.moveTo(x+11.5,y-42); ctx.lineTo(x+8,y-36); ctx.lineTo(x+15,y-36); ctx.closePath(); ctx.fill();
    } else if (k==='merchant'){
        ctx.fillStyle=n.c1; ctx.fillRect(x-10,y-16,20,18);               // delantal
        ctx.fillStyle=n.c2; ctx.fillRect(x-10,y-10,20,3);
        ctx.fillStyle='#f1c9a5'; ctx.beginPath(); ctx.arc(x,y-22+bob,7,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=n.c2; ctx.fillRect(x-9,y-26+bob,18,4);              // gorro plano
        ctx.fillStyle='#000'; ctx.fillRect(x-3,y-23+bob,2,2); ctx.fillRect(x+2,y-23+bob,2,2);
        ctx.fillStyle='#8f5330'; ctx.fillRect(x-16,y-2,8,6);             // cajita de venta
    } else if (k==='slime'){
        const sq=Math.sin(Date.now()/250+n.gx)*2;
        ctx.fillStyle=n.c2; ctx.beginPath(); ctx.ellipse(x,y-2,13,10+sq,0,Math.PI,0); ctx.fill();
        ctx.fillStyle=n.c1; ctx.beginPath(); ctx.ellipse(x,y-6-sq,12,11+sq,0,Math.PI,0); ctx.fill();
        ctx.fillRect(x-12,y-6-sq,24,6);
        ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(x-4,y-9,2.5,0,Math.PI*2); ctx.arc(x+4,y-9,2.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(x-4,y-9,1.2,0,Math.PI*2); ctx.arc(x+4,y-9,1.2,0,Math.PI*2); ctx.fill();
    }
}
function drawSign(sg){
    const s=isoToScreen(sg.gx,sg.gy);
    ctx.fillStyle='#6b4a28'; ctx.fillRect(s.x-2,s.y-20,4,20);
    ctx.fillStyle='#caa26a'; ctx.fillRect(s.x-14,s.y-34,28,16);
    ctx.strokeStyle='#5b3a22'; ctx.lineWidth=2; ctx.strokeRect(s.x-14,s.y-34,28,16);
    ctx.fillStyle='#5b3a22'; for (let i=0;i<3;i++) ctx.fillRect(s.x-10,s.y-31+i*4,20,1);
}
function drawPlayer(){
    const s=isoToScreen(player.gx,player.gy), PSIZE=150;
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
    const g=ctx.createLinearGradient(0,0,0,cv.height); g.addColorStop(0,'#b8e9f1'); g.addColorStop(.58,'#daf5dc'); g.addColorStop(1,'#8dcf87');
    ctx.fillStyle=g; ctx.fillRect(0,0,cv.width,cv.height);
    const terrainX=cv.width/2-cam.x-TERRAIN_OFFSET_X;
    const terrainY=cv.height/2-cam.y-TERRAIN_OFFSET_Y;
    const sourceX=Math.max(0,-terrainX), sourceY=Math.max(0,-terrainY);
    const sourceW=Math.min(terrainCanvas.width-sourceX,cv.width);
    const sourceH=Math.min(terrainCanvas.height-sourceY,cv.height);
    if(sourceW>0&&sourceH>0){
        ctx.drawImage(terrainCanvas,sourceX,sourceY,sourceW,sourceH,
            terrainX+sourceX,terrainY+sourceY,sourceW,sourceH);
    }

    // objetos ordenados por profundidad (gx+gy)
    const objs=[];
    for(const building of buildings) objs.push({d:building.x+building.y+building.w+building.h, f:()=>drawBuilding(building)});
    for (const [x,y] of trees) objs.push({d:x+y, f:()=>drawTree(x,y)});
    for (const [x,y] of lamps) objs.push({d:x+y, f:()=>drawLamp(x,y)});
    for (const [x,y,color] of flowerBeds) objs.push({d:x+y, f:()=>drawFlowerBed(x,y,color)});
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

    ctx.fillStyle='rgba(31,67,69,.82)'; ctx.strokeStyle='#f8e4a6'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.roundRect(cv.width/2-230,12,460,48,14); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#fff5cf'; ctx.font='bold 18px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('PUEBLO LIGA  ·  NIVEL 14', cv.width/2,32);
    ctx.fillStyle='#e2f6d5'; ctx.font='12px monospace';
    ctx.fillText('Encuentra el Centro Pokémon y pulsa E',cv.width/2,49);
}

let last=performance.now();
function loop(t){ const dt=t-last; last=t; update(dt); draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);

function openChallenge(){ challengeOpen=true; for (const k in keys) keys[k]=false;
    document.getElementById('challenge').classList.add('show'); }
function closeChallenge(){ challengeOpen=false; document.getElementById('challenge').classList.remove('show'); }
window._closeChallenge = closeChallenge;
