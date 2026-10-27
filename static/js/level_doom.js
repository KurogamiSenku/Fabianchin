// ====================================================================
//  Nivel 8 - DOOM: "Las profundidades del sistema" (pseudo-3D / raycaster)
//  Recorre el laberinto en primera persona hasta la CONSOLA y pulsa E.
//  Reto: SSH/Linux/permisos (escalada por sudo mal configurado).
//  Motor, paredes y enemigos (centinelas) son diseño propio.
// ====================================================================
const cv = document.getElementById('arena');
const ctx = cv.getContext('2d');
const W = 480, H = 300;
cv.width = W; cv.height = H;

// Mapa del laberinto: # pared, . suelo, T consola (terminal), S spawn
const MAPSTR = [
    "################",
    "#S...#.....#...#",
    "#.##.#.###.#.#.#",
    "#.#..........#.#",
    "#.#.####.##.##.#",
    "#...#......#...#",
    "###.#.####.#.###",
    "#.....#..#.....#",
    "#.###.#..#.###.#",
    "#...#......#..T#",
    "#.#.#.####.#.#.#",
    "#.#..........#.#",
    "#.######.####.##",
    "#..............#",
    "################",
];
const MAP = MAPSTR.map(r => r.split(""));
const MH = MAP.length, MW = MAP[0].length;
function cell(mx,my){ if (mx<0||my<0||mx>=MW||my>=MH) return '#'; return MAP[my][mx]; }
function isWall(mx,my){ return cell(mx,my)==='#'; }

// posiciones de spawn, terminal
let spawn={x:1.5,y:1.5}, term={x:0,y:0};
for (let y=0;y<MH;y++) for (let x=0;x<MW;x++){
    if (MAP[y][x]==='S') spawn={x:x+0.5,y:y+0.5};
    if (MAP[y][x]==='T'){ term={x:x+0.5,y:y+0.5}; MAP[y][x]='.'; }
}

const player = { x:spawn.x, y:spawn.y, ang:0, speed:0.055, rot:0.045, kx:0, ky:0 };
const FOV = Math.PI/3;
const zbuf = new Float32Array(W);
const cacodemon = new Image();
cacodemon.src = '/static/img/markers/doom.png';
const wallTextures = [
    makeWallTexture('#582c2a', '#24151b', '#a34c3a', 'brick'),
    makeWallTexture('#353541', '#161821', '#87909a', 'metal'),
    makeWallTexture('#4d2028', '#21121a', '#d15a37', 'hell'),
];
const shadedWallTextures = wallTextures.map(texture=>Array.from({length:7},(_,level)=>{
    const shaded=document.createElement('canvas');
    shaded.width=shaded.height=64;
    const shadeCtx=shaded.getContext('2d');
    shadeCtx.drawImage(texture,0,0);
    shadeCtx.fillStyle=`rgba(5,5,10,${level/6*.82})`;
    shadeCtx.fillRect(0,0,64,64);
    return shaded;
}));

function makeWallTexture(base, seam, highlight, style){
    const texture=document.createElement('canvas');
    texture.width=texture.height=64;
    const t=texture.getContext('2d');
    t.fillStyle=base; t.fillRect(0,0,64,64);
    if(style==='brick'){
        for(let row=0;row<4;row++){
            const y=row*16, offset=row%2?0:32;
            for(let x=-32+offset;x<64;x+=32){
                t.fillStyle=seam; t.fillRect(x,y,31,15);
                t.fillStyle=base; t.fillRect(x+1,y+1,29,13);
                t.fillStyle=highlight; t.globalAlpha=.2; t.fillRect(x+2,y+2,27,2);
                t.globalAlpha=1;
            }
        }
    }else{
        for(let y=2;y<64;y+=20){
            t.fillStyle=seam; t.fillRect(3,y,58,18);
            t.fillStyle=base; t.fillRect(5,y+2,54,14);
            t.fillStyle=highlight; t.globalAlpha=.28; t.fillRect(6,y+2,52,2);
            t.globalAlpha=1;
            for(const x of [8,56]){
                t.fillStyle=highlight; t.fillRect(x,y+7,2,2);
            }
            if(style==='hell'){
                t.fillStyle='#dd633b'; t.globalAlpha=.55;
                t.fillRect(30,y+5,3,7); t.fillRect(27,y+8,9,2);
                t.globalAlpha=1;
            }
        }
    }
    return texture;
}

// Enemigos: centinelas (orbe con ojo) — diseño propio
const sentinels = [
    { x:7.5, y:7.5, r:.28, hue:'#ff5a5a', frameOffset:0 },
    { x:11.5, y:3.5, r:.28, hue:'#ff8a3d', frameOffset:2 },
    { x:3.5, y:11.5, r:.28, hue:'#ff5a5a', frameOffset:4 },
    { x:8.5, y:1.5, r:.28, hue:'#ff8a3d', frameOffset:1 },
    { x:3.5, y:3.5, r:.28, hue:'#ff5a5a', frameOffset:3 },
    { x:12.5, y:5.5, r:.28, hue:'#ff8a3d', frameOffset:5 },
    { x:5.5, y:7.5, r:.28, hue:'#ff5a5a', frameOffset:6 },
    { x:12.5, y:11.5, r:.28, hue:'#ff8a3d', frameOffset:2 },
];
player.r=.18;

const keys = {};
let challengeOpen = false;
function typing(e){ const t=e.target||document.activeElement; return t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable); }
window.addEventListener('keydown', e=>{
    if (typing(e)||challengeOpen) return;
    keys[e.key.toLowerCase()]=true;
    if ((e.key==='e'||e.key==='E') && nearTerm()) openChallenge();
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
});
window.addEventListener('keyup', e=>{ if (typing(e)) return; keys[e.key.toLowerCase()]=false; });
window.addEventListener('blur', ()=>{ for (const k in keys) keys[k]=false; });

function nearTerm(){ return Math.hypot(player.x-term.x, player.y-term.y) < 1.1; }

function canOccupy(x,y,r,blockers=[]){
    for(let mx=Math.floor(x-r);mx<=Math.floor(x+r);mx++){
        for(let my=Math.floor(y-r);my<=Math.floor(y+r);my++){
            if(!isWall(mx,my)) continue;
            const nearestX=Math.max(mx,Math.min(x,mx+1));
            const nearestY=Math.max(my,Math.min(y,my+1));
            if(Math.hypot(x-nearestX,y-nearestY)<r) return false;
        }
    }
    return blockers.every(other=>
        Math.hypot(x-other.x,y-other.y)>=r+other.r+.01
    );
}

function moveActor(actor,nx,ny,blockers=[]){
    if(canOccupy(nx,actor.y,actor.r,blockers)) actor.x=nx;
    if(canOccupy(actor.x,ny,actor.r,blockers)) actor.y=ny;
}

function tryMove(nx, ny){
    moveActor(player,nx,ny,sentinels);
}
function update(){
    if (challengeOpen){ player.kx=0; player.ky=0; return; }   // consola: todo congelado
    let fwd=0, turn=0, strafe=0;
    if (keys['w']||keys['arrowup']) fwd+=1;
    if (keys['s']||keys['arrowdown']) fwd-=1;
    if (keys['arrowleft']) turn-=1;
    if (keys['arrowright']) turn+=1;
    if (keys['a']) strafe-=1;
    if (keys['d']) strafe+=1;
    player.ang += turn*player.rot;
    // movimiento de teclas + rebote (knockback) sumados -> SIEMPRE puedes dirigirte
    const mvx = Math.cos(player.ang)*fwd*player.speed - Math.sin(player.ang)*strafe*player.speed + player.kx;
    const mvy = Math.sin(player.ang)*fwd*player.speed + Math.cos(player.ang)*strafe*player.speed + player.ky;
    tryMove(player.x+mvx, player.y+mvy);
    player.kx*=0.8; player.ky*=0.8;

    // Los Cacodemonios persiguen sin cruzar paredes ni atravesarse entre ellos.
    for (let i=0;i<sentinels.length;i++){
        const s=sentinels[i];
        const dx=player.x-s.x, dy=player.y-s.y, d=Math.hypot(dx,dy)||1;
        if (d<6){
            const stepX=(dx/d)*0.012, stepY=(dy/d)*0.012;
            const blockers=[player,...sentinels.filter((other,index)=>index!==i)];
            moveActor(s,s.x+stepX,s.y+stepY,blockers);
        }
        if (d<player.r+s.r+.08){
            player.kx += (dx/d)*0.06; player.ky += (dy/d)*0.06;   // impulso corto
        }
    }
}

function render(){
    // Techo y suelo en perspectiva, con iluminación tenue al fondo.
    const gC=ctx.createLinearGradient(0,0,0,H/2); gC.addColorStop(0,'#08070d'); gC.addColorStop(.72,'#211119'); gC.addColorStop(1,'#35181d');
    ctx.fillStyle=gC; ctx.fillRect(0,0,W,H/2);
    const gF=ctx.createLinearGradient(0,H/2,0,H); gF.addColorStop(0,'#33201c'); gF.addColorStop(.4,'#211714'); gF.addColorStop(1,'#09090d');
    ctx.fillStyle=gF; ctx.fillRect(0,H/2,W,H/2);
    const backGlow=ctx.createRadialGradient(W/2,H/2,2,W/2,H/2,H*.55);
    backGlow.addColorStop(0,'rgba(255,87,42,.16)'); backGlow.addColorStop(1,'rgba(255,87,42,0)');
    ctx.fillStyle=backGlow; ctx.fillRect(0,H/2,W,H/2);
    ctx.lineWidth=1;
    for(let i=1;i<=12;i++){
        const depth=i/12, y=H/2+depth*depth*(H/2);
        ctx.strokeStyle=`rgba(231,112,62,${.04+depth*.12})`;
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
    }
    for(let x=-W;x<=W*2;x+=48){
        ctx.strokeStyle='rgba(231,112,62,.09)';
        ctx.beginPath(); ctx.moveTo(W/2,H/2); ctx.lineTo(x,H); ctx.stroke();
    }
    for(let x=-80;x<W+100;x+=80){
        ctx.fillStyle='rgba(0,0,0,.2)';
        ctx.beginPath(); ctx.moveTo(W/2+(x-W/2)*.08,H/2); ctx.lineTo(x,0); ctx.lineTo(x+8,0); ctx.lineTo(W/2+(x-W/2)*.08+3,H/2); ctx.fill();
    }

    // raycasting de paredes (DDA)
    for (let col=0; col<W; col++){
        const rayAng = player.ang - FOV/2 + (col/W)*FOV;
        const rdx=Math.cos(rayAng), rdy=Math.sin(rayAng);
        let mx=Math.floor(player.x), my=Math.floor(player.y);
        const ddx=Math.abs(1/rdx), ddy=Math.abs(1/rdy);
        let sx,sy,stepx,stepy;
        if (rdx<0){ stepx=-1; sx=(player.x-mx)*ddx; } else { stepx=1; sx=(mx+1-player.x)*ddx; }
        if (rdy<0){ stepy=-1; sy=(player.y-my)*ddy; } else { stepy=1; sy=(my+1-player.y)*ddy; }
        let hit=false, side=0, dist=0;
        for (let i=0;i<64 && !hit;i++){
            if (sx<sy){ sx+=ddx; mx+=stepx; side=0; } else { sy+=ddy; my+=stepy; side=1; }
            if (isWall(mx,my)) hit=true;
        }
        if (side===0) dist=(mx-player.x+(1-stepx)/2)/rdx; else dist=(my-player.y+(1-stepy)/2)/rdy;
        const corr = dist*Math.cos(rayAng-player.ang);
        zbuf[col]=corr;
        const lh = Math.min(H, H/corr);
        const y0 = (H-lh)/2;
        let wallX=side===0 ? player.y+dist*rdy : player.x+dist*rdx;
        wallX-=Math.floor(wallX);
        if((side===0&&rdx>0)||(side===1&&rdy<0)) wallX=1-wallX;
        const textureX=Math.min(63,Math.floor(wallX*64));
        const darkness=Math.min(.82,corr*.065+(side?.17:.04));
        const textureSet=shadedWallTextures[Math.abs(mx*7+my*11)%shadedWallTextures.length];
        const texture=textureSet[Math.min(6,Math.round(darkness/.82*6))];
        ctx.drawImage(texture,textureX,0,1,64,col,y0,1,lh);
        if(wallX<.035||wallX>.965){
            ctx.fillStyle=`rgba(10,8,13,${Math.max(.25,.68-corr*.035)})`;
            ctx.fillRect(col,y0,1,lh);
        }
    }

    // consola (terminal) como billboard
    drawBillboard(term.x, term.y, 'terminal');
    // centinelas
    for (const s of sentinels) drawBillboard(s.x, s.y, 'sentinel', s.hue, s.frameOffset);

    // Mira y viñeta con acento de alarma.
    ctx.strokeStyle='rgba(255,210,177,.8)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(W/2-8,H/2); ctx.lineTo(W/2-3,H/2); ctx.moveTo(W/2+3,H/2); ctx.lineTo(W/2+8,H/2);
    ctx.moveTo(W/2,H/2-8); ctx.lineTo(W/2,H/2-3); ctx.moveTo(W/2,H/2+3); ctx.lineTo(W/2,H/2+8); ctx.stroke();
    const vignette=ctx.createRadialGradient(W/2,H/2,H*.28,W/2,H/2,H*.8);
    vignette.addColorStop(0,'rgba(0,0,0,0)'); vignette.addColorStop(1,'rgba(0,0,0,.55)');
    ctx.fillStyle=vignette; ctx.fillRect(0,0,W,H);

    // HUD
    ctx.fillStyle='rgba(5,5,9,.78)'; ctx.fillRect(W/2-132,5,264,24);
    ctx.fillStyle='#751e25'; ctx.fillRect(W/2-132,5,3,24); ctx.fillRect(W/2+129,5,3,24);
    ctx.fillStyle='#ff6848'; ctx.font='bold 13px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('UAC  //  SECTOR 08  //  DOOM', W/2, 17);
    ctx.textAlign='left'; ctx.font='bold 10px monospace'; ctx.fillStyle='#ff8b67';
    ctx.fillText('ARMOR  100',10,H-12);
    ctx.textAlign='right'; ctx.fillStyle='#8c8a93';
    ctx.fillText('LOWER FACILITY',W-10,H-12);
    if (nearTerm() && !challengeOpen){
        ctx.fillStyle='#fff'; ctx.font='bold 14px monospace';
        ctx.fillText('CONSOLA — pulsa [E]', W/2, H-24);
    }
}

function drawBillboard(wx, wy, kind, hue, frameOffset=0){
    const dx=wx-player.x, dy=wy-player.y;
    const dist=Math.hypot(dx,dy);
    let ang=Math.atan2(dy,dx)-player.ang;
    while (ang<-Math.PI) ang+=2*Math.PI; while (ang>Math.PI) ang-=2*Math.PI;
    if (Math.abs(ang)>FOV/1.5 || dist<0.3) return;
    const sx=(0.5 + ang/FOV)*W;
    const size=Math.min(H*1.2, H/dist);
    const y=H/2;
    // ocultar si hay pared más cerca en esa columna
    const col=Math.floor(sx);
    if (col<0||col>=W || dist > zbuf[col]) return;
    if (kind==='terminal'){
        const w=size*.58, h=size*.78, pulse=(Math.sin(Date.now()/240)+1)/2;
        ctx.fillStyle='#18141a'; ctx.fillRect(sx-w*.36,y+h*.08,w*.72,h*.42);
        ctx.fillStyle='#4b2824'; ctx.fillRect(sx-w/2,y-h*.42,w,h*.58);
        ctx.fillStyle='#160f13'; ctx.fillRect(sx-w*.42,y-h*.34,w*.84,h*.4);
        ctx.save(); ctx.shadowBlur=12+pulse*10; ctx.shadowColor='#ff633d';
        ctx.fillStyle=`rgba(255,${90+Math.floor(pulse*60)},55,.9)`; ctx.fillRect(sx-w*.34,y-h*.27,w*.68,h*.25);
        ctx.restore();
        ctx.fillStyle='#ffe0a0'; ctx.font=`bold ${Math.max(4,size*.07)}px monospace`; ctx.textAlign='center';
        ctx.fillText('UAC',sx,y-h*.13);
        ctx.fillStyle='#ff4a38'; ctx.fillRect(sx-w*.22,y+h*.11,w*.44,h*.035);
    } else {
        if(cacodemon.complete && cacodemon.naturalWidth){
            const frameWidth=cacodemon.naturalWidth/7;
            const frame=(Math.floor(Date.now()/130)+frameOffset)%7;
            const spriteSize=Math.min(H*1.35,size*.9);
            const pulse=(Math.sin(Date.now()/180+frameOffset)+1)/2;
            ctx.save();
            ctx.shadowBlur=8+pulse*10; ctx.shadowColor=hue;
            ctx.drawImage(cacodemon,frame*frameWidth,0,frameWidth,cacodemon.naturalHeight,
                sx-spriteSize/2,y-spriteSize*.55,spriteSize,spriteSize);
            ctx.restore();
        }else{
        // Fallback si el sprite no está disponible.
        const rad=size*.23, pulse=(Math.sin(Date.now()/180)+1)/2;
        ctx.save();
        ctx.shadowBlur=12+pulse*14; ctx.shadowColor=hue;
        ctx.fillStyle='#32141a';
        ctx.beginPath(); ctx.moveTo(sx-rad*.8,y-rad*.35); ctx.lineTo(sx-rad*1.35,y-rad*1.15);
        ctx.lineTo(sx-rad*.28,y-rad*.8); ctx.lineTo(sx,y-rad*1.1); ctx.lineTo(sx+rad*.28,y-rad*.8);
        ctx.lineTo(sx+rad*1.35,y-rad*1.15); ctx.lineTo(sx+rad*.8,y-rad*.35); ctx.closePath(); ctx.fill();
        ctx.fillStyle=hue; ctx.beginPath(); ctx.arc(sx,y,rad,0,Math.PI*2); ctx.fill();
        ctx.restore();
        ctx.fillStyle='#19090c'; ctx.beginPath(); ctx.ellipse(sx,y+rad*.12,rad*.66,rad*.42,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ffe9b0'; ctx.beginPath(); ctx.ellipse(sx-rad*.3,y,rad*.18,rad*.12,-.12,0,Math.PI*2);
        ctx.ellipse(sx+rad*.3,y,rad*.18,rad*.12,.12,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ffed70'; ctx.beginPath(); ctx.arc(sx-rad*.3,y,rad*.07,0,Math.PI*2);
        ctx.arc(sx+rad*.3,y,rad*.07,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ff8e72'; ctx.beginPath(); ctx.moveTo(sx-rad*.42,y+rad*.43);
        ctx.lineTo(sx-rad*.25,y+rad*.28); ctx.lineTo(sx-rad*.08,y+rad*.45);
        ctx.lineTo(sx+.08*rad,y+rad*.28); ctx.lineTo(sx+rad*.28,y+rad*.43); ctx.closePath(); ctx.fill();
        }
    }
}

function loop(){ update(); render(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);

function openChallenge(){ challengeOpen=true; for (const k in keys) keys[k]=false;
    player.kx=0; player.ky=0;
    document.getElementById('challenge').classList.add('show');
    setTimeout(()=>{ try{ document.getElementById('cmd').focus(); }catch(e){} }, 50); }
function closeChallenge(){ challengeOpen=false; document.getElementById('challenge').classList.remove('show'); }
window._closeChallenge = closeChallenge;
