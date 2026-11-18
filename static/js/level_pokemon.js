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
function islandRatio(gx,gy){
    const dx=(gx+.5-MW/2)/(MW*.525);
    const dy=(gy+.5-MH/2)/(MH*.53125);
    return dx*dx+dy*dy;
}
function tile(gx,gy){
    if(gx<0||gy<0||gx>=MW||gy>=MH||islandRatio(gx,gy)>1) return 'W';
    const terrain=MAP[gy][gx];
    return terrain==='G'&&islandRatio(gx,gy)>.82?'S':terrain;
}
function solid(gx,gy){ const t=tile(gx,gy); return t==='W'||t==='B'||t==='L'; }

let spawn={x:5,y:9};
for (let y=0;y<MH;y++) for (let x=0;x<MW;x++){ if (MAP[y][x]==='S'){ spawn={x,y}; MAP[y][x]='P'; } }
const player = { gx:spawn.x+0.5, gy:spawn.y+0.5, facing:'right', moving:false, animFrame:0, animTimer:0 };
const cam = { x:0, y:0 };
let viewAngle=0;
let draggingMap=false;
let lastDragX=0;
let leagueRevealed=false;
let leagueRevealTimer=0;

cv.style.cursor='grab';
cv.addEventListener('pointerdown',e=>{
    if(currentHome||e.pointerType!=='mouse'||e.button!==0) return;
    draggingMap=true;
    lastDragX=e.clientX;
    cv.setPointerCapture(e.pointerId);
    cv.style.cursor='grabbing';
    e.preventDefault();
});
cv.addEventListener('pointermove',e=>{
    if(!draggingMap) return;
    const delta=e.clientX-lastDragX;
    viewAngle=Math.atan2(Math.sin(viewAngle+delta*.01),Math.cos(viewAngle+delta*.01));
    lastDragX=e.clientX;
});
function stopMapDrag(){
    draggingMap=false;
    cv.style.cursor='grab';
}
cv.addEventListener('pointerup',stopMapDrag);
cv.addEventListener('pointercancel',stopMapDrag);

// Aldeanos (personajes ORIGINALES variados) y carteles con frases
const npcs = [
    { gx:2.5, gy:1.5,  kind:'villager', robe:'#e85d5d', hat:'#b03030', say:"¡Bienvenido a la Liga, retador!" },
    { gx:15.5, gy:1.5, kind:'sprite', sprite:'bomberman', say:"Los administradores dejaron una copia de respaldo; busca un archivo terminado en .bak." },
    { gx:2.5, gy:6.5,  kind:'wizard',   c1:'#5a3ea8', c2:'#ffd24a', say:"La copia olvidada está en /level/pokemon/config.bak. Ábrela para encontrar las credenciales." },
    { gx:16.5, gy:6.5,  kind:'sprite', sprite:'contra', say:"El soldado de Contra despejó el camino hasta la Liga." },
    { gx:3.5, gy:11.5, kind:'merchant', c1:'#c98a3e', c2:'#e8c04d', say:"Usa el usuario y la contraseña del respaldo en el panel del Centro de la Liga." },
    { gx:16.5, gy:11.5,kind:'sprite', sprite:'cacodemon', say:"¡El cacodemonio custodia la Liga!" },
    { gx:6.5, gy:13.5, kind:'villager', robe:'#ff9a4d', hat:'#c06a20', say:"Si entras como admin, la Liga es tuya." },
    { gx:15.5, gy:14.5,kind:'robot',    c1:'#6a74a6', c2:'#ff7ad6', say:"BIP. Credenciales filtradas = puertas abiertas." },
    { gx:9.5, gy:1.5, kind:'sprite', sprite:'megaman', say:"Mega Man llegó a la Liga. ¡Misión cumplida!" },
    { gx:12.5, gy:2.5, kind:'sprite', sprite:'trainer', say:"Cuando consigas entrar como administrador, revisa el mensaje del panel para obtener la clave del reto." },
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
    {id:'casa-ladrillo',label:'CASA LADRILLO',x:2,y:2,w:2,h:2,palette:'brick',floors:2,
        roomSize:{width:13,depth:8},
        room:{wall:'#f0dcc7',floor:'#956d55',accent:'#3f7581',rug:'#c79b70',
            props:[{type:'sofa',x:3.4,y:2.8},{type:'tv',x:9.4,y:3},{type:'table',x:6.2,y:4.8},{type:'plant',x:1.8,y:4.5}]}},
    {id:'casa-blanca',label:'CASA BLANCA',x:10,y:2,w:2,h:2,palette:'white',floors:1,
        roomSize:{width:11,depth:7},
        room:{wall:'#dce8ef',floor:'#849eaa',accent:'#6d8b63',rug:'#c6b995',
            props:[{type:'bookshelf',x:2.1,y:2.8},{type:'table',x:5.2,y:4.6},{type:'tv',x:8,y:3.8},{type:'plant',x:1.8,y:5.2}]}},
    {id:'casa-gris',label:'CASA GRIS',x:17,y:2,w:1,h:2,palette:'gray',floors:2,
        roomSize:{width:9,depth:6},
        room:{wall:'#e8ddd3',floor:'#826e67',accent:'#627c9a',rug:'#a59383',
            props:[{type:'bed',x:2.5,y:2.5},{type:'bookshelf',x:2,y:4.6},{type:'table',x:6.4,y:4.3}]}},
    {id:'casa-oscura',label:'CASA OSCURA',x:3,y:7,w:2,h:2,palette:'dark',floors:1,
        roomSize:{width:14,depth:9},
        room:{wall:'#b8c5d4',floor:'#586a7d',accent:'#916c9b',rug:'#777184',
            props:[{type:'sofa',x:3,y:2.8},{type:'tv',x:10.5,y:2.9},{type:'table',x:6.8,y:5.2},{type:'plant',x:1.8,y:6.2}]}},
    {id:'casa-roja',label:'CASA ROJA',x:17,y:8,w:1,h:2,palette:'brick',floors:1,
        roomSize:{width:9,depth:6},
        room:{wall:'#f2dfd0',floor:'#9d6a5a',accent:'#a96869',rug:'#d5b08a',
            props:[{type:'bed',x:2.5,y:2.5},{type:'table',x:6.4,y:4.3},{type:'plant',x:1.8,y:4.8}]}},
    {id:'casa-verde',label:'CASA VERDE',x:2,y:12,w:1,h:2,palette:'white',floors:2,
        roomSize:{width:13,depth:8},
        room:{wall:'#d9ead5',floor:'#77a37e',accent:'#b77e45',rug:'#a9c49a',
            props:[{type:'table',x:6.3,y:4.8},{type:'tv',x:9.8,y:2.9},{type:'plant',x:1.8,y:2.8},{type:'bookshelf',x:10.7,y:5.7}]}},
    {id:'casa-violeta',label:'CASA VIOLETA',x:10,y:12,w:2,h:2,palette:'gray',floors:1,
        roomSize:{width:11,depth:7},
        room:{wall:'#e0d9eb',floor:'#7c7592',accent:'#9a628f',rug:'#b6a2c6',
            props:[{type:'sofa',x:3,y:2.7},{type:'bookshelf',x:2,y:4.8},{type:'table',x:6.2,y:4.7}]}},
    {id:'liga',label:'CENTRO DE LA LIGA',x:10,y:8,w:2,h:2,league:true,floors:2},
];
const houseNpcAssignments=[
    ['casa-ladrillo',[0,1]],['casa-blanca',[2,3]],['casa-gris',[4]],
    ['casa-oscura',[5,7]],['casa-roja',[9,10]],['casa-verde',[11,12]],
    ['casa-violeta',[13]],
];
for(const [homeId,indexes] of houseNpcAssignments){
    const home=buildings.find(building=>building.id===homeId);
    indexes.forEach((npcIndex,slot)=>{
        npcs[npcIndex].homeId=homeId;
        npcs[npcIndex].roomX=home.roomSize.width*(slot===0?.28:.72);
        npcs[npcIndex].roomY=home.roomSize.depth*(slot===0?.42:.62);
    });
}
npcs.forEach((npc,index)=>{ npc.id=`npc-${index+1}`; });
const trees = [
    [5.5,1.5],[15.5,1.5],[4.5,14.5],[17.5,12.5],[5.5,8.5],
    [16.5,3.5],[8.5,14.5],[13.5,2.5],[1.5,8.5],[7.5,2.5],[14.5,14.5],
];
const lamps = [ [7.5,3.5],[7.5,9.5],[14.5,5.5],[14.5,12.5] ];
const flowerBeds = [
    [2.5,5.5,'#ff7096'],[3.5,5.5,'#ffd166'],[4.5,5.5,'#f8f5a6'],
    [15.5,10.5,'#ff7096'],[16.5,10.5,'#ffd166'],[17.5,10.5,'#f8f5a6'],
    [6.5,13.5,'#f8f5a6'],[7.5,13.5,'#ff7096'],[8.5,13.5,'#ffd166'],
];
const bushes=[[8.5,4.5],[13.5,7.5],[8.5,11.5],[18.5,6.5],[18.5,11.5]];
const rocks=[[1.5,6.5],[4.5,12.5],[16.5,14.5],[17.5,6.5]];
const benches=[[8.5,11.5],[15.5,11.5]];
function canDrawScenery(gx,gy,npcClearance=1.4){
    const terrain=tile(Math.floor(gx),Math.floor(gy));
    if(terrain!=='G'&&terrain!=='S') return false;
    if(npcs.some(npc=>!npc.homeId&&Math.hypot(npc.gx-gx,npc.gy-gy)<npcClearance)) return false;
    if(signs.some(sign=>Math.hypot(sign.gx-gx,sign.gy-gy)<1.2)) return false;
    if(buildings.some(building=>{
        const dx=Math.max(building.x-gx,0,gx-(building.x+building.w));
        const dy=Math.max(building.y-gy,0,gy-(building.y+building.h));
        return Math.hypot(dx,dy)<.9;
    })) return false;
    if(trees.some(([x,y])=>Math.hypot(x-gx,y-gy)<1.2)) return false;
    if(lamps.some(([x,y])=>Math.hypot(x-gx,y-gy)<1.1)) return false;
    if(flowerBeds.some(([x,y])=>Math.hypot(x-gx,y-gy)<1)) return false;
    return true;
}

const keys = {};
let challengeOpen = false;
let activeDialogue = null;
let currentHome = null;
let returnPosition = null;
let returnViewAngle = 0;
const spokenNpcs = new Set();
let rotationHintUnlocked = false;
function typing(e){ const t=e.target||document.activeElement; return t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable); }
window.addEventListener('keydown', e=>{
    if (typing(e)||challengeOpen) return;
    if (e.key==='e'||e.key==='E'){
        const nearby=nearestNpc();
        if(currentHome){
            if(nearInteriorExit()) exitHome();
            else if(nearby.distance<2.1) talkToNearbyNpc();
            else activeDialogue=null;
        }else{
            const door=nearbyDoor();
            if(door&&door.building.league&&door.distance<2.2){
                openChallenge();
            }else if(door&&door.distance<.95&&(!nearby.npc||nearby.distance>1.3)){
                if(door.building.league) openChallenge();
                else enterHome(door.building);
            }else if(nearby.distance<2.1) talkToNearbyNpc();
            else if(door&&door.distance<.95){
                if(door.building.league) openChallenge();
                else enterHome(door.building);
            }else activeDialogue=null;
        }
        return;
    }
    keys[e.key.toLowerCase()]=true;
    if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault();
});
window.addEventListener('keyup', e=>{ if (typing(e)) return; keys[e.key.toLowerCase()]=false; });
window.addEventListener('blur', ()=>{ for (const k in keys) keys[k]=false; });

function nearestNpc(){
    let best=null, distance=Infinity;
    const candidates=currentHome?npcs.filter(npc=>npc.homeId===currentHome.id):npcs.filter(npc=>!npc.homeId);
    for (const npc of candidates){
        const nx=currentHome?npc.roomX:npc.gx,ny=currentHome?npc.roomY:npc.gy;
        const d=Math.hypot(player.gx-nx,player.gy-ny);
        if (d<distance){ best=npc; distance=d; }
    }
    return { npc:best, distance };
}
function talkToNearbyNpc(){
    const nearby=nearestNpc();
    if(nearby.distance>=2.1||!nearby.npc){ activeDialogue=null; return; }
    const npc=nearby.npc;
    let say=npc.say;
    if(!spokenNpcs.has(npc.id)){
        spokenNpcs.add(npc.id);
        if(spokenNpcs.size===npcs.length&&!rotationHintUnlocked){
            rotationHintUnlocked=true;
            say+=' No todo es lo que parece. Algunas cosas tienen otra cara.';
        }
    }
    activeDialogue={...npc,say};
}
function isDefaultPerspective(){ return Math.abs(viewAngle)<.12; }
function doorPosition(building){ return {gx:building.x+building.w/2,gy:building.y+building.h+.5}; }
function backDoorPosition(building){ return {gx:building.x+building.w/2,gy:building.y-.5}; }
function nearbyDoor(){
    if(currentHome) return null;
    let nearest=null;
    for(const building of buildings){
        if(building.league&&!leagueRevealed) continue;
        if(!building.league&&!isDefaultPerspective()) continue;
        const interactionRange=building.league?2.2:1.6;
        const positions=building.league?[doorPosition(building),backDoorPosition(building)]:[doorPosition(building)];
        for(const position of positions){
            const distance=Math.hypot(player.gx-position.gx,player.gy-position.gy);
            if(distance<interactionRange&&(!nearest||distance<nearest.distance)) nearest={building,position,distance};
        }
    }
    return nearest;
}
function getRoomSize(home=currentHome){
    return home?home.roomSize:{width:10,depth:6};
}
function roomExitPosition(home=currentHome){
    const size=getRoomSize(home);
    return {gx:size.width-.65,gy:size.depth*.68};
}
function nearInteriorExit(){
    if(!currentHome) return false;
    const exit=roomExitPosition();
    return Math.hypot(player.gx-exit.gx,player.gy-exit.gy)<1.1;
}
function enterHome(building){
    returnPosition={gx:player.gx,gy:player.gy};
    returnViewAngle=viewAngle;
    currentHome=building;
    player.gx=building.roomSize.width*.5;
    player.gy=building.roomSize.depth*.48;
    player.moving=false;
    viewAngle=0;
    activeDialogue=null;
}
function exitHome(){
    if(!returnPosition) return;
    currentHome=null;
    player.gx=returnPosition.gx; player.gy=returnPosition.gy;
    viewAngle=returnViewAngle;
    returnPosition=null;
    activeDialogue=null;
}
function isoToScreenBase(gx,gy){
    return {x:(gx-gy)*TW/2-cam.x+cv.width/2,y:(gx+gy)*TH/2-cam.y+cv.height/2};
}
function transformScreenPoint(point){
    const dx=point.x-cv.width/2,dy=point.y-cv.height/2;
    const cos=Math.cos(viewAngle),sin=Math.sin(viewAngle);
    return {
        x:cv.width/2+cos*dx-(TW/TH)*sin*dy,
        y:cv.height/2+(TH/TW)*sin*dx+cos*dy,
    };
}
function isoToScreen(gx,gy){ return transformScreenPoint(isoToScreenBase(gx,gy)); }
function viewDepth(gx,gy){
    const cos=Math.cos(viewAngle),sin=Math.sin(viewAngle);
    return gx*(cos+sin)+gy*(cos-sin);
}

function update(dt){
    if (challengeOpen){ player.moving=false; return; }
    if(currentHome){
        if(activeDialogue&&Math.hypot(player.gx-activeDialogue.roomX,player.gy-activeDialogue.roomY)>2.3) activeDialogue=null;
        const roomSize=getRoomSize();
        let dx=0,dy=0;
        if(keys['w']||keys['arrowup']) dy-=1;
        if(keys['s']||keys['arrowdown']) dy+=1;
        if(keys['a']||keys['arrowleft']) dx-=1;
        if(keys['d']||keys['arrowright']) dx+=1;
        player.moving=(dx||dy)!==0;
        if(dx<0) player.facing='left'; else if(dx>0) player.facing='right';
        const frameScale=Math.min(dt,50)/16.67;
        if(dx&&dy){ dx*=.707; dy*=.707; }
        const nx=player.gx+dx*.075*frameScale,ny=player.gy+dy*.075*frameScale;
        if(nx>.6&&nx<roomSize.width-.35) player.gx=nx;
        if(ny>.6&&ny<roomSize.depth-.35) player.gy=ny;
        player.animTimer+=dt;
        if(player.animTimer>(player.moving?90:180)){ player.animFrame++; player.animTimer=0; }
        return;
    }
    leagueRevealTimer=Math.max(0,leagueRevealTimer-dt);
    if(!leagueRevealed&&rotationHintUnlocked&&Math.abs(Math.sin(viewAngle))>.94){
        leagueRevealed=true;
        leagueRevealTimer=900;
    }
    if (activeDialogue && Math.hypot(player.gx-activeDialogue.gx,player.gy-activeDialogue.gy)>2.3) activeDialogue=null;
    let dx=0, dy=0;
    if (keys['w']||keys['arrowup']) dy-=1;
    if (keys['s']||keys['arrowdown']) dy+=1;
    if (keys['a']||keys['arrowleft']) dx-=1;
    if (keys['d']||keys['arrowright']) dx+=1;
    player.moving=(dx||dy)!==0;
    if (dx<0) player.facing='left'; else if (dx>0) player.facing='right';
    const frameScale=Math.min(dt,50)/16.67;
    const sp=0.075*frameScale; if (dx&&dy){ dx*=0.707; dy*=0.707; }
    const moveX=(dx*Math.cos(viewAngle)+dy*Math.sin(viewAngle))*sp;
    const moveY=(-dx*Math.sin(viewAngle)+dy*Math.cos(viewAngle))*sp;
    const nx=player.gx+moveX, ny=player.gy+moveY, r=0.28;
    if (!solid(Math.floor(nx+(moveX>0?r:-r)), Math.floor(player.gy))) player.gx=nx;
    if (!solid(Math.floor(player.gx), Math.floor(ny+(moveY>0?r:-r)))) player.gy=ny;
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
    targetCtx.fillStyle=t==='W'?'#1768a1':t==='P'?'#ad8050':t==='S'?'#c9b17c':'#34763d'; targetCtx.fill();
    let gradient;
    if(t==='W'){
        gradient=targetCtx.createLinearGradient(s.x-TW/2,s.y-TH/2,s.x+TW/2,s.y+TH/2);
        gradient.addColorStop(0,'#52d4e6'); gradient.addColorStop(1,'#2184c1');
    }else if(t==='P'){
        gradient=targetCtx.createLinearGradient(s.x-TW/2,s.y-TH/2,s.x+TW/2,s.y+TH/2);
        gradient.addColorStop(0,'#f3d89a'); gradient.addColorStop(1,'#cfaa69');
    }else if(t==='S'){
        gradient=targetCtx.createLinearGradient(s.x-TW/2,s.y-TH/2,s.x+TW/2,s.y+TH/2);
        gradient.addColorStop(0,'#f0d99c'); gradient.addColorStop(1,'#c7ae73');
    }else{
        gradient=targetCtx.createLinearGradient(s.x-TW/2,s.y-TH/2,s.x+TW/2,s.y+TH/2);
        gradient.addColorStop(0,(gx+gy)%2?'#79c95b':'#86d363');
        gradient.addColorStop(1,(gx+gy)%2?'#62b84d':'#73c455');
    }
    targetCtx.beginPath(); targetCtx.moveTo(s.x,s.y-TH/2); targetCtx.lineTo(s.x+TW/2,s.y); targetCtx.lineTo(s.x,s.y+TH/2); targetCtx.lineTo(s.x-TW/2,s.y); targetCtx.closePath();
    targetCtx.fillStyle=gradient; targetCtx.fill();
    targetCtx.strokeStyle=t==='W'?'rgba(207,250,255,.28)':t==='P'||t==='S'?'rgba(255,241,199,.36)':'rgba(31,91,42,.16)';
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
    }else if(t==='S'){
        targetCtx.fillStyle='rgba(255,249,217,.46)';
        targetCtx.beginPath(); targetCtx.ellipse(s.x-13,s.y-4,3,1.5,-.3,0,Math.PI*2); targetCtx.fill();
        targetCtx.beginPath(); targetCtx.ellipse(s.x+16,s.y+8,2,1.2,.3,0,Math.PI*2); targetCtx.fill();
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
const HOUSE_STYLES={
    brick:{walls:['#9f5c43','#c17a5b'],roof:['#b9473d','#ec6a51','#db5546','#922f35']},
    white:{walls:['#d5d0c4','#f1e8d8'],roof:['#518b78','#74b39a','#4e9a87','#3c6b67']},
    gray:{walls:['#68737e','#89939d'],roof:['#4b596c','#72839a','#596d85','#38475c']},
    dark:{walls:['#3e4650','#5b6673'],roof:['#45424f','#6b6376','#51495f','#302e3a']},
};
function drawBuilding(building,doorTarget){
    const {x,y,w,h,league}=building;
    if(league&&!leagueRevealed) return;
    ctx.save();
    if(league&&leagueRevealTimer>0) ctx.globalAlpha=Math.min(1,1-leagueRevealTimer/900);
    const wallHeight=BUILD_H*(building.floors||1);
    const corners=[
        {gx:x,gy:y},
        {gx:x+w,gy:y},
        {gx:x+w,gy:y+h},
        {gx:x,gy:y+h},
    ].map(point=>({
        ...point,
        screen:isoToScreen(point.gx,point.gy),
        depth:viewDepth(point.gx,point.gy),
    }));
    const edges=corners.map((a,index)=>{
        const b=corners[(index+1)%corners.length];
        return {a,b,index,depth:(a.depth+b.depth)/2};
    }).sort((a,b)=>a.depth-b.depth);
    const visibleEdges=edges.slice(-2);
    const center=isoToScreen(x+w/2,y+h/2);
    const roofPeak={x:center.x,y:center.y-wallHeight-32};
    const houseStyle=HOUSE_STYLES[building.palette]||HOUSE_STYLES.brick;
    const wallColors=league?['#7147a6','#8f5bc1']:houseStyle.walls;
    const roofColors=league?['#df258d','#fb459e','#f62b89','#b91468']:houseStyle.roof;
    const edgePoint=(edge,t,height=0)=>({
        x:edge.a.screen.x+(edge.b.screen.x-edge.a.screen.x)*t,
        y:edge.a.screen.y+(edge.b.screen.y-edge.a.screen.y)*t-height,
    });
    const clipWall=edge=>{
        ctx.beginPath();
        ctx.moveTo(edge.a.screen.x,edge.a.screen.y);
        ctx.lineTo(edge.b.screen.x,edge.b.screen.y);
        ctx.lineTo(edge.b.screen.x,edge.b.screen.y-wallHeight);
        ctx.lineTo(edge.a.screen.x,edge.a.screen.y-wallHeight);
        ctx.closePath();
        ctx.clip();
    };

    visibleEdges.forEach((edge,index)=>{
        const isFront=index===visibleEdges.length-1;
        const wallTopA={x:edge.a.screen.x,y:edge.a.screen.y-wallHeight};
        const wallTopB={x:edge.b.screen.x,y:edge.b.screen.y-wallHeight};
        ctx.fillStyle=wallColors[isFront?0:1];
        ctx.strokeStyle='rgba(65,42,38,.68)'; ctx.lineWidth=2;
        ctx.beginPath();
        ctx.moveTo(edge.a.screen.x,edge.a.screen.y);
        ctx.lineTo(edge.b.screen.x,edge.b.screen.y);
        ctx.lineTo(wallTopB.x,wallTopB.y);
        ctx.lineTo(wallTopA.x,wallTopA.y);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        ctx.save();
        clipWall(edge);
        ctx.strokeStyle='rgba(255,236,191,.36)'; ctx.lineWidth=1.5;
        for(let row=1;row<5;row++){
            const height=wallHeight*row/5;
            const a=edgePoint(edge,0,height),b=edgePoint(edge,1,height);
            ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
        }

        if(edge.index===2||edge.index===0){
            const doorTop=BUILD_H*.56, doorStart=.37, doorEnd=.63;
            const a=edgePoint(edge,doorStart),b=edgePoint(edge,doorEnd);
            const at=edgePoint(edge,doorStart,doorTop),bt=edgePoint(edge,doorEnd,doorTop);
            ctx.fillStyle='#49313a'; ctx.strokeStyle='#f0c77c'; ctx.lineWidth=2;
            if(doorTarget&&doorTarget.building===building){
                ctx.shadowColor='#ffe36b'; ctx.shadowBlur=14;
            }
            ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
            ctx.lineTo(bt.x,bt.y); ctx.lineTo(at.x,at.y); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.shadowBlur=0;
            ctx.fillStyle='#ffd76a';
            const handle=edgePoint(edge,doorEnd-.045,doorTop*.45);
            ctx.beginPath(); ctx.arc(handle.x,handle.y,2.5,0,Math.PI*2); ctx.fill();
            if(edge.index===2){
                ctx.fillStyle='#f8edc2'; ctx.strokeStyle='#523a53'; ctx.lineWidth=1.5;
                const signA=edgePoint(edge,.38,BUILD_H*.78),signB=edgePoint(edge,.62,BUILD_H*.78);
                const signTopA={x:signA.x,y:signA.y-12},signTopB={x:signB.x,y:signB.y-12};
                ctx.beginPath(); ctx.moveTo(signA.x,signA.y); ctx.lineTo(signB.x,signB.y);
                ctx.lineTo(signTopB.x,signTopB.y); ctx.lineTo(signTopA.x,signTopA.y);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.fillStyle=league?'#7542a5':'#3e5b68'; ctx.font='bold 8px monospace';
                ctx.textAlign='center'; ctx.textBaseline='middle';
                ctx.fillText(league?'LIGA':'POKÉ',(signA.x+signB.x)/2,(signA.y+signTopA.y)/2);
            }
        }else if(edge.index===1||edge.index===3){
            for(const centerT of [.32,.68]){
                for(let floor=0;floor<(building.floors||1);floor++){
                    const halfSpan=.085,height=18,bottom=floor*BUILD_H+BUILD_H*.48;
                    const a=edgePoint(edge,centerT-halfSpan,bottom);
                    const b=edgePoint(edge,centerT+halfSpan,bottom);
                    const at=edgePoint(edge,centerT-halfSpan,bottom+height);
                    const bt=edgePoint(edge,centerT+halfSpan,bottom+height);
                    ctx.fillStyle='#b8f5ff'; ctx.strokeStyle='#fff0bb'; ctx.lineWidth=2;
                    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
                    ctx.lineTo(bt.x,bt.y); ctx.lineTo(at.x,at.y); ctx.closePath(); ctx.fill(); ctx.stroke();
                    ctx.strokeStyle='rgba(40,108,151,.65)'; ctx.lineWidth=1.5;
                    const middle=edgePoint(edge,centerT,bottom);
                    ctx.beginPath(); ctx.moveTo(middle.x,middle.y); ctx.lineTo(middle.x,middle.y-height); ctx.stroke();
                }
            }
        }
        ctx.restore();
    });

    const roofEdges=edges.slice().sort((a,b)=>a.depth-b.depth);
    roofEdges.forEach((edge,index)=>{
        const a={x:edge.a.screen.x,y:edge.a.screen.y-wallHeight};
        const b={x:edge.b.screen.x,y:edge.b.screen.y-wallHeight};
        ctx.save();
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
        ctx.lineTo(roofPeak.x,roofPeak.y); ctx.closePath(); ctx.clip();
        const gradient=ctx.createLinearGradient(roofPeak.x,roofPeak.y,a.x,a.y);
        gradient.addColorStop(0,roofColors[(index+1)%roofColors.length]);
        gradient.addColorStop(1,roofColors[index]);
        const minX=Math.min(a.x,b.x,roofPeak.x), minY=Math.min(a.y,b.y,roofPeak.y);
        const maxX=Math.max(a.x,b.x,roofPeak.x), maxY=Math.max(a.y,b.y,roofPeak.y);
        ctx.fillStyle=gradient; ctx.fillRect(minX,minY,maxX-minX,maxY-minY);
        ctx.strokeStyle=league?'rgba(104,24,71,.52)':'rgba(99,43,39,.48)';
        ctx.lineWidth=2;
        for(let row=1;row<6;row++){
            const ratio=row/6;
            const start={x:roofPeak.x+(a.x-roofPeak.x)*ratio,y:roofPeak.y+(a.y-roofPeak.y)*ratio};
            const end={x:roofPeak.x+(b.x-roofPeak.x)*ratio,y:roofPeak.y+(b.y-roofPeak.y)*ratio};
            ctx.beginPath(); ctx.moveTo(start.x,start.y); ctx.lineTo(end.x,end.y); ctx.stroke();
        }
        ctx.restore();
        ctx.strokeStyle=league?'#ff9bd1':'#ffad7c'; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(roofPeak.x,roofPeak.y);
        ctx.lineTo(b.x,b.y); ctx.stroke();
    });
    ctx.strokeStyle=league?'#ff9bd1':'#ffad7c'; ctx.lineWidth=4;
    ctx.beginPath();
    for(let i=0;i<corners.length;i++){
        const point=corners[i].screen;
        if(i===0) ctx.moveTo(point.x,point.y-wallHeight);
        else ctx.lineTo(point.x,point.y-wallHeight);
    }
    ctx.closePath(); ctx.stroke();
    if(doorTarget&&doorTarget.building===building){
        const position=isoToScreen(doorTarget.position.gx,doorTarget.position.gy);
        drawInteractionPrompt('E PARA ENTRAR',position.x,position.y-28);
    }
    ctx.restore();
}
function drawInteractionPrompt(text,x,y){
    ctx.save();
    ctx.font='bold 14px monospace';
    const width=ctx.measureText(text).width+24;
    ctx.fillStyle='rgba(12,21,32,.92)'; ctx.strokeStyle='#ffe36b'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.roundRect(x-width/2,y-14,width,28,8); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#fff5cf'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(text,x,y);
    ctx.restore();
}
function drawFountain(building){
    if(leagueRevealed) return;
    const center=isoToScreen(building.x+building.w/2,building.y+building.h/2);
    ctx.save();
    ctx.fillStyle='rgba(20,54,46,.3)';
    ctx.beginPath(); ctx.ellipse(center.x,center.y+12,58,26,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#d2cbb8'; ctx.strokeStyle='#716c65'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.ellipse(center.x,center.y+2,57,25,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#35b6d2'; ctx.strokeStyle='#bbf5eb'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.ellipse(center.x,center.y-1,45,17,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#e7e0cb'; ctx.fillRect(center.x-9,center.y-26,18,28);
    ctx.fillStyle='#65d8e6'; ctx.beginPath(); ctx.ellipse(center.x,center.y-27,8,4,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(184,250,255,.9)'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(center.x,center.y-27); ctx.quadraticCurveTo(center.x-4,center.y-43,center.x,center.y-48); ctx.stroke();
    ctx.restore();
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
function drawBush(gx,gy){
    const s=isoToScreen(gx,gy);
    ctx.fillStyle='rgba(20,54,33,.3)';
    ctx.beginPath(); ctx.ellipse(s.x,s.y+3,23,7,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#28663d';
    ctx.beginPath(); ctx.ellipse(s.x,s.y-7,18,12,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#3d8a4c';
    ctx.beginPath(); ctx.arc(s.x-10,s.y-12,9,0,Math.PI*2);
    ctx.arc(s.x+1,s.y-17,11,0,Math.PI*2);
    ctx.arc(s.x+12,s.y-10,9,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#80c95b';
    ctx.beginPath(); ctx.arc(s.x-8,s.y-15,3,0,Math.PI*2);
    ctx.arc(s.x+2,s.y-20,3,0,Math.PI*2);
    ctx.arc(s.x+11,s.y-12,2.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#f7d880';
    ctx.beginPath(); ctx.arc(s.x-2,s.y-9,2,0,Math.PI*2); ctx.arc(s.x+8,s.y-19,2,0,Math.PI*2); ctx.fill();
}
function drawRock(gx,gy){
    const s=isoToScreen(gx,gy);
    ctx.fillStyle='rgba(30,48,42,.25)';
    ctx.beginPath(); ctx.ellipse(s.x,s.y+3,19,6,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#747f7c';
    ctx.beginPath(); ctx.ellipse(s.x-5,s.y-4,9,7,-.3,Math.PI,0);
    ctx.ellipse(s.x+5,s.y-5,10,8,.2,Math.PI,0); ctx.fill();
    ctx.fillStyle='#aab4aa';
    ctx.beginPath(); ctx.ellipse(s.x-7,s.y-9,4,2,-.4,0,Math.PI*2);
    ctx.ellipse(s.x+4,s.y-11,4,2,.2,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(51,64,59,.55)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(s.x-13,s.y-3); ctx.lineTo(s.x-6,s.y-8);
    ctx.moveTo(s.x+1,s.y-3); ctx.lineTo(s.x+7,s.y-9); ctx.stroke();
}
function drawBench(gx,gy){
    const s=isoToScreen(gx,gy);
    ctx.fillStyle='rgba(24,49,35,.28)';
    ctx.beginPath(); ctx.ellipse(s.x,s.y+4,29,8,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#68462f'; ctx.fillRect(s.x-19,s.y-18,4,19); ctx.fillRect(s.x+15,s.y-18,4,19);
    ctx.fillStyle='#965d37'; ctx.fillRect(s.x-23,s.y-26,46,6);
    ctx.fillStyle='#b97c4a'; ctx.fillRect(s.x-22,s.y-34,44,6);
    ctx.fillStyle='#d5a26a'; ctx.fillRect(s.x-21,s.y-33,42,2);
    ctx.fillStyle='#70482f'; ctx.fillRect(s.x-21,s.y-25,42,2);
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
function drawNpc(n,project=isoToScreen,gx=n.gx,gy=n.gy,groundOffset=TH/2){
    const s=project(gx,gy), x=s.x, y=s.y;
    const bob=Math.sin(Date.now()/400 + gx)*1.5;
    const k=n.kind||'villager';
    if (k==='sprite'){
        const sprite=npcSprites[n.sprite];
        const groundY=y+groundOffset;
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
        const sq=Math.sin(Date.now()/250+gx)*2;
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
function drawPlayer(project=isoToScreen,size=150){
    const s=project(player.gx,player.gy), PSIZE=size;
    ctx.fillStyle='rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(s.x,s.y+6,16,7,0,0,Math.PI*2); ctx.fill();
    const list=player.moving?sprites.walk:sprites.idle;
    const img=list[Math.floor(player.animFrame)%list.length]||sprites.idle[0];
    const dx=s.x-PSIZE/2, dy=s.y+8-PSIZE;
    if (img&&img.complete&&img.naturalWidth){
        if (player.facing==='left'){ ctx.save(); ctx.translate(dx+PSIZE,dy); ctx.scale(-1,1); ctx.drawImage(img,0,0,PSIZE,PSIZE); ctx.restore(); }
        else ctx.drawImage(img,dx,dy,PSIZE,PSIZE);
    }
}
function drawDialogueCard(text){
    const panelWidth=Math.min(980,cv.width-40), panelX=(cv.width-panelWidth)/2;
    const textWidth=panelWidth-44, lines=[];
    ctx.font='20px monospace';
    let line='';
    for(const word of text.split(/\s+/)){
        const candidate=line?`${line} ${word}`:word;
        if(line&&ctx.measureText(candidate).width>textWidth){ lines.push(line); line=word; }
        else line=candidate;
    }
    if(line) lines.push(line);
    const lineHeight=28, panelHeight=52+lines.length*lineHeight;
    const panelY=cv.height-panelHeight-14;
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,.5)'; ctx.shadowBlur=14;
    ctx.fillStyle='rgba(8,18,31,.96)'; ctx.strokeStyle='#f8e4a6'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.roundRect(panelX,panelY,panelWidth,panelHeight,14); ctx.fill(); ctx.stroke();
    ctx.shadowBlur=0;
    ctx.fillStyle='#ffd76a'; ctx.font='bold 16px monospace';
    ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText('PISTA DEL HABITANTE',panelX+22,panelY+23);
    ctx.fillStyle='#fff5cf'; ctx.font='20px monospace'; ctx.textBaseline='top';
    lines.forEach((message,index)=>ctx.fillText(message,panelX+22,panelY+42+index*lineHeight,textWidth));
    ctx.restore();
}

function roomToScreen(x,y,height=0){
    const size=getRoomSize();
    const tileX=34,tileY=16;
    const left=cv.width/2-(size.width-size.depth)*tileX/2;
    const top=(cv.height-(size.width+size.depth)*tileY)/2+50;
    return {x:left+(x-y)*tileX,y:top+(x+y)*tileY-height};
}
function drawRoomProp(prop){
    const p=roomToScreen(prop.x,prop.y);
    const accent=currentHome.room.accent||'#7550a4';
    const shadowWidth=prop.type==='bed'?38:prop.type==='sofa'?37:prop.type==='plant'?15:30;
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,.22)';
    ctx.beginPath(); ctx.ellipse(p.x,p.y+5,shadowWidth,11,0,0,Math.PI*2); ctx.fill();
    if(prop.type==='sofa'){
        ctx.fillStyle='#59443a'; ctx.fillRect(p.x-25,p.y-9,6,12); ctx.fillRect(p.x+19,p.y-9,6,12);
        ctx.fillStyle=accent; ctx.fillRect(p.x-28,p.y-22,56,22);
        ctx.fillStyle='#fff'; ctx.globalAlpha=.14; ctx.fillRect(p.x-24,p.y-18,48,3); ctx.globalAlpha=1;
        ctx.fillStyle=accent; ctx.fillRect(p.x-30,p.y-36,60,17);
        ctx.fillStyle='rgba(255,255,255,.2)'; ctx.fillRect(p.x-26,p.y-33,24,11); ctx.fillRect(p.x+3,p.y-33,24,11);
        ctx.fillStyle='#513971'; ctx.fillRect(p.x-34,p.y-25,8,21); ctx.fillRect(p.x+26,p.y-25,8,21);
    }else if(prop.type==='tv'){
        ctx.fillStyle='#6b4c37'; ctx.fillRect(p.x-29,p.y-20,58,18);
        ctx.fillStyle='#503a2e'; ctx.fillRect(p.x-25,p.y-2,5,8); ctx.fillRect(p.x+20,p.y-2,5,8);
        ctx.fillStyle='#202a37'; ctx.fillRect(p.x-24,p.y-61,48,38);
        ctx.strokeStyle='#c4e7e9'; ctx.lineWidth=2; ctx.strokeRect(p.x-24,p.y-61,48,38);
        ctx.fillStyle='#53b7cf'; ctx.fillRect(p.x-19,p.y-56,38,27);
        ctx.fillStyle='rgba(255,255,255,.34)'; ctx.fillRect(p.x-15,p.y-52,14,2);
    }else if(prop.type==='table'){
        ctx.fillStyle='#70472f'; ctx.fillRect(p.x-22,p.y-18,5,20); ctx.fillRect(p.x+17,p.y-18,5,20);
        ctx.fillStyle='#b9814e'; ctx.fillRect(p.x-27,p.y-28,54,10);
        ctx.fillStyle='rgba(255,230,184,.32)'; ctx.fillRect(p.x-22,p.y-26,42,2);
        ctx.fillStyle='#f0d7a4'; ctx.beginPath(); ctx.arc(p.x,p.y-33,5,0,Math.PI*2); ctx.fill();
    }else if(prop.type==='plant'){
        ctx.fillStyle='#b85c48'; ctx.fillRect(p.x-12,p.y-20,24,17);
        ctx.fillStyle='#38834e'; ctx.beginPath(); ctx.arc(p.x,p.y-34,12,0,Math.PI*2); ctx.arc(p.x-10,p.y-27,9,0,Math.PI*2); ctx.arc(p.x+10,p.y-27,9,0,Math.PI*2); ctx.fill();
    }else if(prop.type==='bookshelf'){
        ctx.fillStyle='#694733'; ctx.fillRect(p.x-23,p.y-60,46,59);
        const colors=['#d15c4b','#edbd56','#5e91bc','#64a879'];
        for(let i=0;i<8;i++){
            ctx.fillStyle=colors[i%colors.length]; ctx.fillRect(p.x-18+(i%4)*10,p.y-53+Math.floor(i/4)*24,7,18);
        }
        ctx.fillStyle='#c38d5e'; ctx.fillRect(p.x-23,p.y-32,46,4);
    }else if(prop.type==='bed'){
        ctx.fillStyle='#70472f'; ctx.fillRect(p.x-32,p.y-20,64,22);
        ctx.fillStyle=accent; ctx.fillRect(p.x-31,p.y-18,62,17);
        ctx.fillStyle='#f0e9da'; ctx.fillRect(p.x-27,p.y-34,54,17);
        ctx.fillStyle=accent; ctx.fillRect(p.x-27,p.y-34,17,17);
        ctx.fillStyle='rgba(255,255,255,.25)'; ctx.fillRect(p.x-6,p.y-16,30,3);
    }
    ctx.restore();
}
function drawRoomRug(){
    const room=currentHome.room;
    const size=getRoomSize();
    const cx=size.width*.5,cy=size.depth*.62;
    const halfWidth=Math.min(2.4,size.width*.22),halfDepth=Math.min(1.05,size.depth*.18);
    const corners=[
        roomToScreen(cx-halfWidth,cy-halfDepth),roomToScreen(cx+halfWidth,cy-halfDepth),
        roomToScreen(cx+halfWidth,cy+halfDepth),roomToScreen(cx-halfWidth,cy+halfDepth),
    ];
    ctx.save();
    ctx.fillStyle=room.rug||'rgba(220,205,172,.38)';
    ctx.globalAlpha=.72;
    ctx.strokeStyle='rgba(54,39,43,.32)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(corners[0].x,corners[0].y);
    corners.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));
    ctx.closePath(); ctx.fill(); ctx.stroke();
    const inset=corners.map((point,index)=>{
        const centerX=corners.reduce((sum,p)=>sum+p.x,0)/corners.length;
        const centerY=corners.reduce((sum,p)=>sum+p.y,0)/corners.length;
        return {x:point.x+(centerX-point.x)*.18,y:point.y+(centerY-point.y)*.18};
    });
    ctx.strokeStyle='rgba(255,245,219,.48)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(inset[0].x,inset[0].y);
    inset.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));
    ctx.closePath(); ctx.stroke();
    ctx.restore();
}
function drawRoomWallDecor(){
    const room=currentHome.room;
    const size=getRoomSize();
    const centerX=size.width*.34;
    const frame=[
        roomToScreen(centerX-.8,0,54),roomToScreen(centerX+.8,0,54),
        roomToScreen(centerX+.8,0,82),roomToScreen(centerX-.8,0,82),
    ];
    const canvas=[
        roomToScreen(centerX-.62,0,58),roomToScreen(centerX+.62,0,58),
        roomToScreen(centerX+.62,0,78),roomToScreen(centerX-.62,0,78),
    ];
    ctx.save();
    ctx.fillStyle='#594336'; ctx.strokeStyle='rgba(40,31,29,.7)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(frame[0].x,frame[0].y);
    frame.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle=room.accent||'#6d8b63';
    ctx.beginPath(); ctx.moveTo(canvas[0].x,canvas[0].y);
    canvas.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));
    ctx.closePath(); ctx.fill();
    const sun=roomToScreen(centerX+.22,0,72);
    ctx.fillStyle='#f0d7a4'; ctx.beginPath(); ctx.arc(sun.x,sun.y,4,0,Math.PI*2); ctx.fill();
    const clock=roomToScreen(0,size.depth*.36,72);
    ctx.fillStyle='#efe2c9'; ctx.strokeStyle='#594336'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(clock.x,clock.y,10,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='#594336'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(clock.x,clock.y); ctx.lineTo(clock.x,clock.y-6);
    ctx.moveTo(clock.x,clock.y); ctx.lineTo(clock.x+4,clock.y+2); ctx.stroke();
    ctx.restore();
}
function drawInterior(){
    const room=currentHome.room;
    const size=getRoomSize();
    ctx.fillStyle='#1f2c3a'; ctx.fillRect(0,0,cv.width,cv.height);
    const corners=[[0,0],[size.width,0],[size.width,size.depth],[0,size.depth]].map(([x,y])=>roomToScreen(x,y));
    ctx.fillStyle=room.floor; ctx.strokeStyle='#443a3a'; ctx.lineWidth=4;
    ctx.beginPath(); ctx.moveTo(corners[0].x,corners[0].y); corners.slice(1).forEach(p=>ctx.lineTo(p.x,p.y)); ctx.closePath(); ctx.fill(); ctx.stroke();
    drawRoomRug();
    const wallHeight=116;
    ctx.fillStyle=room.wall; ctx.strokeStyle='rgba(48,43,47,.8)'; ctx.lineWidth=4;
    ctx.beginPath();
    ctx.moveTo(corners[0].x,corners[0].y); ctx.lineTo(corners[1].x,corners[1].y);
    ctx.lineTo(corners[1].x,corners[1].y-wallHeight); ctx.lineTo(corners[0].x,corners[0].y-wallHeight);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle=room.wall; ctx.beginPath();
    ctx.moveTo(corners[0].x,corners[0].y); ctx.lineTo(corners[3].x,corners[3].y);
    ctx.lineTo(corners[3].x,corners[3].y-wallHeight); ctx.lineTo(corners[0].x,corners[0].y-wallHeight);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    drawRoomWallDecor();
    const doorT=.68,doorHalf=.095,doorHeight=74;
    const wallPoint=(t,height=0)=>({
        x:corners[1].x+(corners[2].x-corners[1].x)*t,
        y:corners[1].y+(corners[2].y-corners[1].y)*t-height,
    });
    const wallSection=(from,to,bottom=0,topHeight=wallHeight)=>{
        const a=wallPoint(from,bottom),b=wallPoint(to,bottom);
        const c=wallPoint(to,topHeight),d=wallPoint(from,topHeight);
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
        ctx.lineTo(c.x,c.y); ctx.lineTo(d.x,d.y); ctx.closePath();
        ctx.fill(); ctx.stroke();
    };
    ctx.fillStyle=room.wall; ctx.strokeStyle='rgba(48,43,47,.8)'; ctx.lineWidth=4;
    wallSection(0,doorT-doorHalf);
    wallSection(doorT+doorHalf,1);
    wallSection(doorT-doorHalf,doorT+doorHalf,doorHeight,wallHeight);
    const doorA=wallPoint(doorT-doorHalf),doorB=wallPoint(doorT+doorHalf);
    const doorTopA=wallPoint(doorT-doorHalf,doorHeight),doorTopB=wallPoint(doorT+doorHalf,doorHeight);
    ctx.fillStyle='#382c35'; ctx.strokeStyle='#dfbd82'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(doorA.x,doorA.y); ctx.lineTo(doorB.x,doorB.y);
    ctx.lineTo(doorTopB.x,doorTopB.y); ctx.lineTo(doorTopA.x,doorTopA.y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='rgba(244,215,164,.45)'; ctx.lineWidth=1.5;
    ctx.beginPath();
    ctx.moveTo(doorA.x+(doorB.x-doorA.x)*.18,doorA.y+(doorB.y-doorA.y)*.18);
    ctx.lineTo(doorTopA.x+(doorTopB.x-doorTopA.x)*.18,doorTopA.y+(doorTopB.y-doorTopA.y)*.18);
    ctx.stroke();
    const knob=wallPoint(doorT+doorHalf*.58,32);
    ctx.fillStyle='#ffd76a'; ctx.beginPath(); ctx.arc(knob.x,knob.y,3.2,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(255,239,197,.34)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(corners[0].x+8,corners[0].y-24); ctx.lineTo(corners[1].x-8,corners[1].y-24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(corners[0].x+18,corners[0].y-56); ctx.lineTo(corners[1].x-18,corners[1].y-56); ctx.stroke();
    const homeNpcs=npcs.filter(npc=>npc.homeId===currentHome.id)
        .map(npc=>({depth:npc.roomX+npc.roomY,draw:()=>drawNpc(npc,roomToScreen,npc.roomX,npc.roomY,0)}));
    const roomObjects=room.props.map(prop=>({
        depth:prop.x+prop.y,
        draw:()=>drawRoomProp(prop),
    }));
    roomObjects.push(...homeNpcs);
    roomObjects.push({depth:player.gx+player.gy,draw:()=>drawPlayer(roomToScreen,112)});
    roomObjects.sort((a,b)=>a.depth-b.depth);
    roomObjects.forEach(object=>object.draw());
    const exit=roomToScreen(size.width,doorT*size.depth);
    if(nearInteriorExit()) drawInteractionPrompt('E PARA SALIR',exit.x,exit.y-96);
    const nearby=nearestNpc();
    if(nearby.npc&&nearby.distance<2.1){
        const p=roomToScreen(nearby.npc.roomX,nearby.npc.roomY);
        ctx.strokeStyle='rgba(255,231,105,.9)'; ctx.lineWidth=3;
        ctx.beginPath(); ctx.ellipse(p.x,p.y,25,9,0,0,Math.PI*2); ctx.stroke();
        drawInteractionPrompt('E PARA HABLAR',p.x,p.y-74);
    }
    if(activeDialogue&&!challengeOpen) drawDialogueCard(activeDialogue.say);
}
function draw(){
    if(currentHome){
        drawInterior();
        ctx.fillStyle='rgba(31,67,69,.9)'; ctx.strokeStyle='#f8e4a6'; ctx.lineWidth=3;
        ctx.beginPath(); ctx.roundRect(cv.width/2-230,12,460,48,14); ctx.fill(); ctx.stroke();
        ctx.fillStyle='#fff5cf'; ctx.font='bold 17px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(currentHome.label,cv.width/2,36);
        return;
    }
    const g=ctx.createLinearGradient(0,0,0,cv.height); g.addColorStop(0,'#b8e9f1'); g.addColorStop(.58,'#daf5dc'); g.addColorStop(1,'#8dcf87');
    ctx.fillStyle=g; ctx.fillRect(0,0,cv.width,cv.height);
    const cos=Math.cos(viewAngle), sin=Math.sin(viewAngle);
    ctx.save();
    ctx.translate(cv.width/2,cv.height/2);
    ctx.transform(cos,sin*TH/TW,-sin*TW/TH,cos,0,0);
    ctx.translate(-cv.width/2,-cv.height/2);
    const terrainX=cv.width/2-cam.x-TERRAIN_OFFSET_X;
    const terrainY=cv.height/2-cam.y-TERRAIN_OFFSET_Y;
    const reachX=Math.abs(cos)*cv.width/2+Math.abs(sin*TW/TH)*cv.height/2;
    const reachY=Math.abs(sin*TH/TW)*cv.width/2+Math.abs(cos)*cv.height/2;
    const centerX=cv.width/2-terrainX, centerY=cv.height/2-terrainY;
    const sourceX=Math.max(0,Math.floor(centerX-reachX));
    const sourceY=Math.max(0,Math.floor(centerY-reachY));
    const sourceRight=Math.min(terrainCanvas.width,Math.ceil(centerX+reachX));
    const sourceBottom=Math.min(terrainCanvas.height,Math.ceil(centerY+reachY));
    const sourceW=sourceRight-sourceX, sourceH=sourceBottom-sourceY;
    if(sourceW>0&&sourceH>0){
        ctx.drawImage(terrainCanvas,sourceX,sourceY,sourceW,sourceH,
            terrainX+sourceX,terrainY+sourceY,sourceW,sourceH);
    }
    ctx.restore();

    // objetos ordenados por profundidad desde la perspectiva actual
    const objs=[];
    const nearest=nearestNpc();
    const nearby=nearbyDoor();
    const doorTarget=nearby&&nearby.distance<(nearby.building.league?2.2:.95)
        &&(nearby.building.league||!nearest.npc||nearest.distance>1.3)?nearby:null;
    for(const building of buildings) objs.push({d:viewDepth(building.x+building.w/2,building.y+building.h/2), f:()=>drawBuilding(building,doorTarget)});
    const league=buildings.find(building=>building.league);
    if(league) objs.push({d:viewDepth(league.x+league.w/2,league.y+league.h/2),f:()=>drawFountain(league)});
    for (const [x,y] of trees) objs.push({d:viewDepth(x,y), f:()=>drawTree(x,y)});
    for (const [x,y] of bushes) if(canDrawScenery(x,y,1.5)) objs.push({d:viewDepth(x,y),f:()=>drawBush(x,y)});
    for (const [x,y] of rocks) if(canDrawScenery(x,y,1.2)) objs.push({d:viewDepth(x,y),f:()=>drawRock(x,y)});
    for (const [x,y] of benches) if(canDrawScenery(x,y,1.8)) objs.push({d:viewDepth(x,y),f:()=>drawBench(x,y)});
    for (const [x,y] of lamps) objs.push({d:viewDepth(x,y), f:()=>drawLamp(x,y)});
    for (const [x,y,color] of flowerBeds) objs.push({d:viewDepth(x,y), f:()=>drawFlowerBed(x,y,color)});
    for (const n of npcs.filter(npc=>!npc.homeId)) objs.push({d:viewDepth(n.gx,n.gy), f:()=>drawNpc(n)});
    for (const sg of signs) objs.push({d:viewDepth(sg.gx,sg.gy), f:()=>drawSign(sg)});
    objs.push({d:viewDepth(player.gx,player.gy), f:drawPlayer});
    objs.sort((a,b)=>a.d-b.d);
    for (const o of objs) o.f();

    if (activeDialogue && !challengeOpen){
        drawDialogueCard(activeDialogue.say);
    }

    ctx.fillStyle='rgba(31,67,69,.82)'; ctx.strokeStyle='#f8e4a6'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.roundRect(cv.width/2-230,12,460,48,14); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#fff5cf'; ctx.font='bold 18px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('PUEBLO LIGA  ·  NIVEL 14', cv.width/2,32);
    ctx.fillStyle='#e2f6d5'; ctx.font='12px monospace';
    if(nearest.npc&&nearest.distance<2.1){
        const s=isoToScreen(nearest.npc.gx,nearest.npc.gy);
        ctx.strokeStyle='rgba(255,231,105,.9)'; ctx.lineWidth=3;
        ctx.beginPath(); ctx.ellipse(s.x,s.y+TH/2,23,8,0,0,Math.PI*2); ctx.stroke();
        drawInteractionPrompt('E PARA HABLAR',s.x,s.y-76);
    }
    ctx.fillText(nearest.distance<2.1?'Pulsa E para hablar con el personaje':
        (leagueRevealed?'E para la Liga · arrastra para girar':'Habla con todos los habitantes · E para entrar'),
        cv.width/2,49);
}

let last=performance.now();
function loop(t){ const dt=t-last; last=t; update(dt); draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);

function openChallenge(){ challengeOpen=true; for (const k in keys) keys[k]=false;
    document.getElementById('challenge').classList.add('show'); }
function closeChallenge(){ challengeOpen=false; document.getElementById('challenge').classList.remove('show'); }
window._closeChallenge = closeChallenge;
