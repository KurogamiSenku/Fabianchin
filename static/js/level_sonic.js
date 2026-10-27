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
const terrainCanvas = document.createElement('canvas');
terrainCanvas.width = WORLD_W;
terrainCanvas.height = cv.height;
const terrainCtx = terrainCanvas.getContext('2d');

function loadImg(src){ const i = new Image(); i.src = src; return i; }
const sprites = { idle:[], walk:[], jump:[] };
for (let i=1;i<=4;i++) sprites.idle.push(loadImg(`/static/img/skeli_fixed/idle/idle${i}.png`));
for (let i=1;i<=6;i++) sprites.walk.push(loadImg(`/static/img/skeli_fixed/walk/walk${i}.png`));
for (let i=1;i<=4;i++) sprites.jump.push(loadImg(`/static/img/skeli_fixed/jump/jump${i}.png`));
const ringImg = loadImg('/static/img/markers/sonic_ring.png');   // 8 frames 64x64

// Small ledges stay above both routes as optional ring-jump platforms.
const plats = [
    {x:300,  y:255, w:110, h:18},
    {x:1590, y:255, w:140, h:18},
    {x:3020, y:250, w:140, h:18},
];
const groundProfile = [
    {x:0, y:330}, {x:470, y:330}, {x:560, y:326}, {x:660, y:318},
    {x:760, y:310}, {x:980, y:310}, {x:1060, y:312}, {x:1110, y:307},
    {x:1160, y:300}, {x:1200, y:314}, {x:1240, y:321}, {x:1280, y:314},
    {x:1320, y:300}, {x:1380, y:304}, {x:1440, y:318}, {x:1500, y:326},
    {x:1560, y:330},
    {x:1760, y:330}, {x:1860, y:324}, {x:1960, y:318}, {x:2080, y:318},
    {x:2180, y:324}, {x:2280, y:315}, {x:2420, y:300},
    {x:2640, y:300}, {x:2760, y:306}, {x:2880, y:315},
    {x:3040, y:306}, {x:3200, y:300}, {x:3600, y:300},
];
const upperRoutes = [
    [
        {x:520,y:328},{x:620,y:298},{x:740,y:260},{x:850,y:238},
        {x:980,y:220},{x:1060,y:182},{x:1120,y:136},{x:1180,y:112},
        {x:1300,y:112},{x:1380,y:142},{x:1450,y:205},{x:1500,y:260},
        {x:1600,y:300},{x:1760,y:324},
    ],
    [
        {x:1840,y:324},{x:1960,y:290},{x:2070,y:250},{x:2200,y:220},
        {x:2320,y:205},{x:2440,y:220},{x:2580,y:245},{x:2700,y:270},
        {x:2860,y:315},
    ],
];
const WATER_Y = 388;

// Anillos para recoger (decorativos, suman al marcador)
const rings = [];
[[300,290],[430,210],[520,290],[760,220],[940,205],[1130,190],[1260,160],
 [1450,220],[1740,210],[1990,190],[2200,170],[2390,180],[2600,205],[2810,150],
 [3060,170],[3300,260],[3450,260]]
 .forEach(([x,y])=>rings.push({x,y,got:false}));
let ringCount = 0;

const PW=40, PH=66, PSIZE=100;
const player = { x:40, y:250, vx:0, vy:0, facing:'right', onGround:false,
    jumping:false, onTerrain:false, routeIndex:-1, looping:false, loopAngle:0,
    loopRotation:0, animFrame:0, animTimer:0, bvx:0 };
let lastSafe = { x:40, y:250 };

const LOOP = { x:1240, y:234, rx:105, ry:95, entryAngle:2.35, exitAngle:0.8 };
const GOAL = { x:3380, y:220 };   // meta al final

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

function groundY(x){
    const px=Math.max(0,Math.min(WORLD_W,x));
    for(let i=1;i<groundProfile.length;i++){
        const a=groundProfile[i-1], b=groundProfile[i];
        if(px<=b.x) return a.y+(b.y-a.y)*(px-a.x)/(b.x-a.x);
    }
    return groundProfile[groundProfile.length-1].y;
}

function profileY(profile,x){
    if(x<profile[0].x||x>profile[profile.length-1].x) return null;
    for(let i=1;i<profile.length;i++){
        const a=profile[i-1], b=profile[i];
        if(x<=b.x) return a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x);
    }
    return profile[profile.length-1].y;
}

function updateLoop(dt){
    const circumferenceRadius=(LOOP.rx+LOOP.ry)/2;
    player.loopAngle-=SPEED*(dt/(1000/60))/circumferenceRadius;
    if(player.loopAngle<=LOOP.exitAngle-Math.PI*2){
        player.looping=false;
        player.loopRotation=0;
        player.x=LOOP.x+LOOP.rx*Math.cos(LOOP.exitAngle)-PW/2;
        player.y=groundY(player.x+PW/2)-PH;
        player.onGround=true;
        player.onTerrain=true;
        return;
    }
    player.x=LOOP.x+LOOP.rx*Math.cos(player.loopAngle)-PW/2;
    player.y=LOOP.y+LOOP.ry*Math.sin(player.loopAngle)-PH;
    player.loopRotation=Math.atan2(
        -LOOP.ry*Math.cos(player.loopAngle),
        LOOP.rx*Math.sin(player.loopAngle)
    );
    player.vy=0;
    player.onGround=true;
    player.onTerrain=false;
    player.routeIndex=-1;
    player.jumping=false;
    player.vx=SPEED;
}

function collectRingsAndAnimate(dt){
    const pcx=player.x+PW/2, pcy=player.y+PH/2;
    for (const r of rings){ if (!r.got && Math.hypot(pcx-r.x,pcy-r.y)<42){ r.got=true; ringCount++; } }
    const moving=player.vx!==0; player.animTimer+=dt;
    if (player.animTimer>(moving?80:170)){ player.animFrame++; player.animTimer=0; }
}

function updatePlayer(dt){
    if (challengeOpen) return;
    if(player.looping){
        updateLoop(dt);
        collectRingsAndAnimate(dt);
        return;
    }
    const wasOnTerrain=player.onTerrain;
    const wasOnRoute=player.routeIndex;
    const previousCenterX=player.x+PW/2;
    player.vx=0;
    if (keys.left){ player.vx=-SPEED; player.facing='left'; }
    if (keys.right){ player.vx=SPEED; player.facing='right'; }
    let tvx=player.vx+player.bvx; player.x+=tvx;
    player.bvx*=0.85;
    if (player.x<0) player.x=0; if (player.x>WORLD_W-PW) player.x=WORLD_W-PW;

    const loopEntryX=LOOP.x+LOOP.rx*Math.cos(LOOP.entryAngle);
    if(wasOnTerrain && keys.right && !keys.up &&
        previousCenterX<loopEntryX && player.x+PW/2>=loopEntryX){
        player.looping=true;
        player.loopAngle=LOOP.entryAngle;
        player.loopRotation=0;
        player.x=loopEntryX-PW/2;
        player.y=LOOP.y+LOOP.ry*Math.sin(LOOP.entryAngle)-PH;
        updateLoop(dt);
        collectRingsAndAnimate(dt);
        return;
    }

    if (keys.up && player.onGround){ player.vy=JUMP; player.onGround=false; player.jumping=true; }
    else if(wasOnTerrain){ player.y=groundY(player.x+PW/2)-PH; }
    else if(wasOnRoute>=0){
        const routeSurface=profileY(upperRoutes[wasOnRoute],player.x+PW/2);
        if(routeSurface!==null) player.y=routeSurface-PH;
    }
    const previousBottom=player.y+PH;
    player.vy+=GRAV; if (player.vy>16) player.vy=16; player.y+=player.vy;
    player.onGround=false; player.onTerrain=false; player.routeIndex=-1;
    for (const p of plats){ if (overlap(player.x,player.y,PW,PH,p.x,p.y,p.w,p.h)){
        if (player.vy>0 && previousBottom<=p.y){ player.y=p.y-PH; player.vy=0; player.onGround=true; player.jumping=false; }
        else if (player.vy<0){ player.y=p.y+p.h; player.vy=0; } } }
    if(player.vy>=0){
        for(let i=0;i<upperRoutes.length;i++){
            const routeSurface=profileY(upperRoutes[i],player.x+PW/2);
            if(routeSurface!==null && previousBottom<=routeSurface && player.y+PH>=routeSurface){
                player.y=routeSurface-PH; player.vy=0; player.onGround=true;
                player.routeIndex=i; player.jumping=false;
                break;
            }
        }
    }
    const surface=groundY(player.x+PW/2);
    if(!player.onGround && player.vy>=0 && previousBottom<=surface && player.y+PH>=surface){
        player.y=surface-PH; player.vy=0; player.onGround=true;
        player.onTerrain=true; player.jumping=false;
    }
    if (player.onGround) lastSafe={x:player.x,y:player.y-2};
    if (player.y>cv.height+80){ player.x=lastSafe.x; player.y=lastSafe.y; player.vy=0; player.bvx=0; }

    player.loopRotation=0;
    collectRingsAndAnimate(dt);
}

function hill(cam,par,base,amp,step,color){
    ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(0,cv.height);
    const off=(cam*par)%step;
    for (let x=-off;x<=cv.width+step;x+=step){
        ctx.lineTo(x,base-amp*.58); ctx.lineTo(x+step*.28,base-amp);
        ctx.lineTo(x+step*.52,base-amp*.82); ctx.lineTo(x+step,base);
    }
    ctx.lineTo(cv.width,cv.height); ctx.closePath(); ctx.fill();
}
function drawBg(cam){
    ctx.fillStyle='#06178f'; ctx.fillRect(0,0,cv.width,cv.height);
    hill(cam,0.12,310,78,210,'#1550c5');
    hill(cam,0.24,334,70,150,'#168a42');
    hill(cam,0.4,360,83,115,'#29ad36');
    // Pixel clouds sit low above the hills like the Green Hill horizon.
    for(let i=-1;i<8;i++){
        const nx=i*150-(cam*0.28)%150, ny=267+(i%3)*15;
        ctx.fillStyle='#9ddcff';
        ctx.fillRect(nx,ny+8,45,11); ctx.fillRect(nx+7,ny,13,12);
        ctx.fillRect(nx+18,ny-5,16,18); ctx.fillRect(nx+31,ny+3,12,14);
        ctx.fillStyle='#fff';
        ctx.fillRect(nx+3,ny+7,36,8); ctx.fillRect(nx+10,ny,10,9);
        ctx.fillRect(nx+21,ny-3,11,12); ctx.fillRect(nx+33,ny+4,8,10);
    }
}
function drawPlat(p,target=ctx){
    const x=p.x, y=p.y;
    const bottom=Math.min(cv.height,y+p.h);
    target.fillStyle='#9c4c20'; target.fillRect(x,y,p.w,bottom-y);
    for(let ty=y+12;ty<bottom;ty+=12){
        for(let tx=x;tx<x+p.w;tx+=12){
            const checker=(Math.floor(tx/12)+Math.floor(ty/12))%2;
            target.fillStyle=checker?'#c8762b':'#b96526';
            target.fillRect(tx,ty,12,12);
            if((Math.floor(tx/12)*7+Math.floor(ty/12)*11)%5===0){
                target.fillStyle='#773b1d'; target.fillRect(tx+3,ty+4,5,3);
                target.fillStyle='#e49a39'; target.fillRect(tx+8,ty+8,3,2);
            }
        }
    }
    target.fillStyle='#238b1c'; target.fillRect(x,y,p.w,16);
    target.fillStyle='#39c52b'; target.fillRect(x,y,p.w,8);
    for(let i=0;i<p.w;i+=12){
        const shade=(Math.floor((x+i)/12)%2)?'#2eaa22':'#47d52b';
        target.fillStyle=shade; target.fillRect(x+i,y+8,12,8);
        target.fillStyle='#8bf64b'; target.fillRect(x+i+2,y+2,4,3);
        target.fillStyle='#176c1b'; target.fillRect(x+i+7,y+10,3,3);
    }
    target.fillStyle='#1f8d25'; target.fillRect(x,y+14,p.w,2);
}

function drawTrack(profile,depth){
    const topY=x=>profileY(profile,x);
    const first=profile[0], last=profile[profile.length-1];
    terrainCtx.beginPath();
    terrainCtx.moveTo(first.x,first.y);
    for(const point of profile) terrainCtx.lineTo(point.x,point.y);
    for(let i=profile.length-1;i>=0;i--){
        const point=profile[i];
        terrainCtx.lineTo(point.x,Math.min(cv.height,point.y+depth));
    }
    terrainCtx.closePath();
    terrainCtx.fillStyle='#773b1d'; terrainCtx.fill();
    terrainCtx.save();
    terrainCtx.clip();
    for(let y=Math.max(0,first.y);y<Math.min(cv.height,last.y+depth);y+=12){
        for(let x=first.x;x<last.x;x+=12){
            const checker=(Math.floor(x/12)+Math.floor(y/12))%2;
            terrainCtx.fillStyle=checker?'#c8762b':'#b96526';
            terrainCtx.fillRect(x,y,12,12);
            if((Math.floor(x/12)*7+Math.floor(y/12)*11)%5===0){
                terrainCtx.fillStyle='#773b1d'; terrainCtx.fillRect(x+3,y+4,5,3);
                terrainCtx.fillStyle='#e49a39'; terrainCtx.fillRect(x+8,y+8,3,2);
            }
        }
    }
    terrainCtx.restore();

    terrainCtx.beginPath();
    terrainCtx.moveTo(first.x,first.y);
    for(const point of profile) terrainCtx.lineTo(point.x,point.y);
    terrainCtx.strokeStyle='#633018'; terrainCtx.lineWidth=20; terrainCtx.lineJoin='round';
    terrainCtx.stroke();
    terrainCtx.strokeStyle='#24851d'; terrainCtx.lineWidth=13;
    terrainCtx.stroke();
    terrainCtx.strokeStyle='#43d52c'; terrainCtx.lineWidth=7;
    terrainCtx.stroke();
    terrainCtx.fillStyle='#8bf64b';
    for(let x=first.x;x<last.x;x+=12){
        const y=topY(x);
        terrainCtx.fillRect(x+2,y-2,4,3);
        terrainCtx.fillRect(x+7,y+3,3,3);
    }
}

function drawLoopTrack(){
    const {x:cx,y:cy,rx,ry}=LOOP;
    terrainCtx.save();
    terrainCtx.beginPath();
    terrainCtx.moveTo(0,0);
    terrainCtx.lineTo(WORLD_W,0);
    for(let i=groundProfile.length-1;i>=0;i--){
        const point=groundProfile[i];
        terrainCtx.lineTo(point.x,point.y);
    }
    terrainCtx.closePath();
    terrainCtx.clip();
    terrainCtx.beginPath();
    terrainCtx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);
    terrainCtx.strokeStyle='#45200e'; terrainCtx.lineWidth=54; terrainCtx.stroke();
    terrainCtx.beginPath();
    terrainCtx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);
    terrainCtx.strokeStyle='#8d481b'; terrainCtx.lineWidth=46; terrainCtx.stroke();
    for(let i=0;i<64;i++){
        const angle=(i/64)*Math.PI*2;
        const nextAngle=((i+1)/64)*Math.PI*2;
        const centerX=cx+Math.cos(angle)*rx;
        const centerY=cy+Math.sin(angle)*ry;
        const tangentX=-rx*Math.sin(angle), tangentY=ry*Math.cos(angle);
        const tangentLength=Math.hypot(tangentX,tangentY);
        const tx=tangentX/tangentLength, ty=tangentY/tangentLength;
        const nx=-ty, ny=tx;
        const segmentLength=Math.hypot(
            (Math.cos(nextAngle)-Math.cos(angle))*rx,
            (Math.sin(nextAngle)-Math.sin(angle))*ry
        )/2+2;
        for(let band=0;band<5;band++){
            const offset=(band-2)*9;
            const centerOffsetX=centerX+nx*offset;
            const centerOffsetY=centerY+ny*offset;
            terrainCtx.beginPath();
            terrainCtx.moveTo(centerOffsetX-tx*segmentLength+nx*4.5,
                centerOffsetY-ty*segmentLength+ny*4.5);
            terrainCtx.lineTo(centerOffsetX+tx*segmentLength+nx*4.5,
                centerOffsetY+ty*segmentLength+ny*4.5);
            terrainCtx.lineTo(centerOffsetX+tx*segmentLength-nx*4.5,
                centerOffsetY+ty*segmentLength-ny*4.5);
            terrainCtx.lineTo(centerOffsetX-tx*segmentLength-nx*4.5,
                centerOffsetY-ty*segmentLength-ny*4.5);
            terrainCtx.closePath();
            terrainCtx.fillStyle=(i+band)%2?'#713718':'#e0922e';
            terrainCtx.fill();
        }
    }
    terrainCtx.beginPath();
    terrainCtx.ellipse(cx,cy,rx-29,ry-29,0,0,Math.PI*2);
    terrainCtx.strokeStyle='#176f1b'; terrainCtx.lineWidth=15; terrainCtx.stroke();
    terrainCtx.beginPath();
    terrainCtx.ellipse(cx,cy,rx-29,ry-29,0,0,Math.PI*2);
    terrainCtx.strokeStyle='#48dc32'; terrainCtx.lineWidth=8; terrainCtx.stroke();
    terrainCtx.beginPath();
    terrainCtx.ellipse(cx,cy,rx+26,ry+26,0,0,Math.PI*2);
    terrainCtx.strokeStyle='#54250f'; terrainCtx.lineWidth=6; terrainCtx.stroke();
    terrainCtx.restore();
}

function drawLoopCrossings(){
    const {x:cx,y:cy,rx,ry}=LOOP;
    const leftX=cx-rx*.67, rightX=cx+rx*.67;
    const leftY=groundY(leftX)-5, rightY=groundY(rightX)-5;
    const drawConnector=()=>{
        terrainCtx.beginPath();
        terrainCtx.moveTo(leftX-24,leftY);
        terrainCtx.bezierCurveTo(leftX-8,leftY,leftX-14,cy+ry*.48,leftX,cy+ry*.48);
        terrainCtx.quadraticCurveTo(cx,cy+ry*.92,rightX,cy+ry*.48);
        terrainCtx.bezierCurveTo(rightX+14,cy+ry*.48,rightX+8,rightY,rightX+24,rightY);
    };
    terrainCtx.save();
    terrainCtx.lineCap='butt';
    terrainCtx.lineJoin='round';
    drawConnector();
    terrainCtx.strokeStyle='#4b210f'; terrainCtx.lineWidth=24; terrainCtx.stroke();
    drawConnector();
    terrainCtx.strokeStyle='#a95d21'; terrainCtx.lineWidth=18; terrainCtx.stroke();
    terrainCtx.setLineDash([7,6]);
    drawConnector();
    terrainCtx.strokeStyle='#e49a39'; terrainCtx.lineWidth=4; terrainCtx.stroke();
    terrainCtx.setLineDash([]);
    drawConnector();
    terrainCtx.strokeStyle='#176f1b'; terrainCtx.lineWidth=14; terrainCtx.stroke();
    drawConnector();
    terrainCtx.strokeStyle='#43d52c'; terrainCtx.lineWidth=8; terrainCtx.stroke();
    terrainCtx.restore();
}

function drawPalm(x,y,scale=1){
    terrainCtx.save();
    terrainCtx.translate(x,y);
    terrainCtx.scale(scale,scale);
    terrainCtx.fillStyle='#70401d';
    for(let i=0;i<8;i++){
        terrainCtx.fillRect(-3+(i%2),-i*7,7,8);
        terrainCtx.fillStyle=i%2?'#bd7229':'#8c4a20';
    }
    const top=-55;
    const fronds=[
        [-4,-60,-35,-82,-61,-78],[-2,-60,-24,-94,-41,-98],
        [2,-60,18,-94,37,-96],[4,-58,42,-78,62,-72],
        [0,-57,8,-75,5,-104],
    ];
    for(const frond of fronds){
        terrainCtx.fillStyle='#168c25';
        terrainCtx.beginPath();
        terrainCtx.moveTo(frond[0],top+4);
        terrainCtx.lineTo(frond[2],frond[3]);
        terrainCtx.lineTo(frond[4],frond[5]);
        terrainCtx.lineTo(frond[2]*.55,top+8);
        terrainCtx.closePath(); terrainCtx.fill();
        terrainCtx.strokeStyle='#62e43b'; terrainCtx.lineWidth=3;
        terrainCtx.beginPath(); terrainCtx.moveTo(frond[0],top+5);
        terrainCtx.lineTo(frond[2],frond[3]); terrainCtx.stroke();
    }
    terrainCtx.fillStyle='#ed9b27';
    terrainCtx.fillRect(-7,-64,6,7); terrainCtx.fillRect(2,-66,6,7);
    terrainCtx.restore();
}

function drawStagePlants(){
    drawPalm(190,groundY(190)-2,.66);
    drawPalm(680,profileY(upperRoutes[0],680)-2,.54);
    drawPalm(2250,profileY(upperRoutes[1],2250)-2,.58);
    drawPalm(3160,groundY(3160)-2,.66);
}

drawTrack(groundProfile,cv.height);
for(const route of upperRoutes) drawTrack(route,42);
for(const p of plats) drawPlat(p,terrainCtx);
drawLoopCrossings();
drawLoopTrack();
drawStagePlants();
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
    ctx.drawImage(terrainCanvas,cam,0,cv.width,cv.height,0,0,cv.width,cv.height);
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
        if(player.loopRotation){
            ctx.save();
            ctx.translate(player.x-cam+PW/2,player.y+PH);
            ctx.rotate(player.loopRotation);
            if(player.facing==='left') ctx.scale(-1,1);
            ctx.drawImage(img,-PSIZE/2,-PSIZE,PSIZE,PSIZE);
            ctx.restore();
        }else if (player.facing==='left'){ ctx.save(); ctx.translate(dx+PSIZE,dy); ctx.scale(-1,1); ctx.drawImage(img,0,0,PSIZE,PSIZE); ctx.restore(); }
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
