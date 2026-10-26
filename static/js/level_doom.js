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

const player = { x:spawn.x, y:spawn.y, ang:0, speed:0.055, rot:0.045 };
const FOV = Math.PI/3;
const zbuf = new Float32Array(W);

// Enemigos: centinelas (orbe con ojo) — diseño propio
const sentinels = [
    { x:7.5, y:7.5, hue:'#ff5a5a' },
    { x:11.5, y:3.5, hue:'#ff8a3d' },
    { x:3.5, y:11.5, hue:'#ff5a5a' },
];

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

function tryMove(nx, ny){
    const r=0.18;
    if (!isWall(Math.floor(nx+ (nx>player.x?r:-r)), Math.floor(player.y))) player.x=nx;
    if (!isWall(Math.floor(player.x), Math.floor(ny+ (ny>player.y?r:-r)))) player.y=ny;
}
function update(){
    if (challengeOpen) return;
    let fwd=0, turn=0, strafe=0;
    if (keys['w']||keys['arrowup']) fwd+=1;
    if (keys['s']||keys['arrowdown']) fwd-=1;
    if (keys['arrowleft']) turn-=1;
    if (keys['arrowright']) turn+=1;
    if (keys['a']) strafe-=1;
    if (keys['d']) strafe+=1;
    player.ang += turn*player.rot;
    const nx = player.x + Math.cos(player.ang)*fwd*player.speed - Math.sin(player.ang)*strafe*player.speed;
    const ny = player.y + Math.sin(player.ang)*fwd*player.speed + Math.cos(player.ang)*strafe*player.speed;
    tryMove(nx, ny);

    // centinelas flotan hacia el jugador lentamente y molestan al contacto
    for (const s of sentinels){
        const dx=player.x-s.x, dy=player.y-s.y, d=Math.hypot(dx,dy)||1;
        if (d<6){ s.x+=(dx/d)*0.012; s.y+=(dy/d)*0.012; }
        if (d<0.7){ // empuja al jugador hacia atrás
            tryMove(player.x-(dx/d)*0.08, player.y-(dy/d)*0.08);
        }
    }
}

function render(){
    // techo y suelo
    const gC=ctx.createLinearGradient(0,0,0,H/2); gC.addColorStop(0,'#1a1016'); gC.addColorStop(1,'#2a1a22');
    ctx.fillStyle=gC; ctx.fillRect(0,0,W,H/2);
    const gF=ctx.createLinearGradient(0,H/2,0,H); gF.addColorStop(0,'#241c18'); gF.addColorStop(1,'#120d0a');
    ctx.fillStyle=gF; ctx.fillRect(0,H/2,W,H/2);

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
        // color de pared: piedra/tech, sombreado por lado y distancia
        let base = side===1 ? 90 : 120;
        const sh = Math.max(0.25, 1 - corr/9);
        const r=Math.floor(base*sh*0.55), g=Math.floor(base*sh*0.7), b=Math.floor(base*sh*0.85);
        ctx.fillStyle=`rgb(${r+30},${g+20},${b})`;
        ctx.fillRect(col, y0, 1, lh);
        // líneas horizontales tipo paneles
        ctx.fillStyle='rgba(0,0,0,0.15)';
        if (Math.floor(y0)%2===0) ctx.fillRect(col, y0+lh*0.5, 1, 1);
    }

    // consola (terminal) como billboard
    drawBillboard(term.x, term.y, 'terminal');
    // centinelas
    for (const s of sentinels) drawBillboard(s.x, s.y, 'sentinel', s.hue);

    // mira
    ctx.strokeStyle='rgba(255,255,255,.5)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(W/2-6,H/2); ctx.lineTo(W/2+6,H/2); ctx.moveTo(W/2,H/2-6); ctx.lineTo(W/2,H/2+6); ctx.stroke();

    // HUD
    ctx.fillStyle='rgba(0,0,0,.55)'; ctx.fillRect(W/2-120,6,240,22);
    ctx.fillStyle='#ff5a5a'; ctx.font='bold 13px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('NIVEL 8 · DOOM', W/2, 17);
    if (nearTerm() && !challengeOpen){
        ctx.fillStyle='#fff'; ctx.font='bold 14px monospace';
        ctx.fillText('CONSOLA — pulsa [E]', W/2, H-24);
    }
}

function drawBillboard(wx, wy, kind, hue){
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
        const w=size*0.5, h=size*0.6;
        ctx.fillStyle='#0a0d14'; ctx.fillRect(sx-w/2, y-h*0.1, w, h*0.6);
        ctx.fillStyle='#1b2433'; ctx.fillRect(sx-w/2, y-h/2, w, h*0.45);
        ctx.fillStyle=(Math.floor(Date.now()/400)%2)?'#3ddc84':'#2ea968'; ctx.fillRect(sx-w/2+4, y-h/2+4, w-8, h*0.45-8);
    } else {
        // centinela: orbe con ojo (diseño propio)
        const rad=size*0.22;
        ctx.save();
        ctx.shadowBlur=18; ctx.shadowColor=hue;
        ctx.fillStyle=hue; ctx.beginPath(); ctx.arc(sx, y, rad, 0, Math.PI*2); ctx.fill();
        ctx.restore();
        ctx.fillStyle='#120000'; ctx.beginPath(); ctx.arc(sx, y, rad*0.55, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(sx, y, rad*0.26, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(sx+rad*0.08, y, rad*0.12, 0, Math.PI*2); ctx.fill();
    }
}

function loop(){ update(); render(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);

function openChallenge(){ challengeOpen=true; for (const k in keys) keys[k]=false;
    document.getElementById('challenge').classList.add('show'); document.getElementById('cmd')?.focus(); }
function closeChallenge(){ challengeOpen=false; document.getElementById('challenge').classList.remove('show'); }
window._closeChallenge = closeChallenge;
