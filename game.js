import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9caeaa);
scene.fog = new THREE.FogExp2(0x839692, 0.021);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 150);
camera.position.set(0, 1.68, 8);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.14;

scene.add(new THREE.HemisphereLight(0xb9d8d1, 0x18272b, 1.8));
const moon = new THREE.DirectionalLight(0xd8f0df, 2.25);
moon.position.set(-7, 13, 7); moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024); moon.shadow.camera.left = -25; moon.shadow.camera.right = 25; moon.shadow.camera.top = 24; moon.shadow.camera.bottom = -24;
moon.shadow.bias = -0.0004; scene.add(moon);
const cyanLight = new THREE.PointLight(0x36c8c0, 70, 27, 2); cyanLight.position.set(-10, 4, -11); scene.add(cyanLight);
const amberLight = new THREE.PointLight(0xff714b, 60, 25, 2); amberLight.position.set(10, 3, -23); scene.add(amberLight);

const mat = (color, roughness = .75, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const concrete = mat(0x52615d), darkConcrete = mat(0x27343a), floorMat = mat(0x303d3d, .87), metal = mat(0x18272c, .42, .65), paleMetal = mat(0x9aaba3, .46, .45), safety = mat(0xc5d04e, .6), black = mat(0x101a1d, .45, .35);
const glowCyan = new THREE.MeshBasicMaterial({ color: 0x63e1d0 });
const glowAmber = new THREE.MeshBasicMaterial({ color: 0xff8358 });
const box = (w,h,d,material,x,y,z,cast=true,receive=true) => {const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=cast;m.receiveShadow=receive;scene.add(m);return m;};

// Concrete training bay, high catwalk walls and marked firing lanes.
const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), floorMat); floor.rotation.x = -Math.PI/2; floor.position.y = -.08; floor.receiveShadow = true; scene.add(floor);
const grid = new THREE.GridHelper(80, 48, 0x70827a, 0x455650); grid.position.y = -.065; grid.material.transparent = true; grid.material.opacity = .24; scene.add(grid);
box(54, 7, 1, concrete, 0, 3.5, -31); box(1, 7, 65, darkConcrete, -27, 3.5, 0); box(1, 7, 65, darkConcrete, 27, 3.5, 0);
// architectural wall panels
for (let x=-24; x<=24; x+=6) {
  box(.12, 4.9, .18, metal, x, 3.1, -30.42, false);
  box(4.4, .16, .12, paleMetal, x, 5.85, -30.3, false);
  box(3.6, .045, .045, (x%12===0?glowCyan:glowAmber), x, 5.73, -30.18, false, false);
}
for (const x of [-25.5,25.5]) {
  for(let z=-26;z<20;z+=10){box(.22,6,.22,metal,x,3,z,false);box(.3,.08,5.5,safety,x*.98,.13,z,false);}
}
// overhanging segmented ceiling beams
for(let z=-28;z<2;z+=9){box(54,.22,.38,metal,0,6.45,z,false);box(2.4,.08,.42,glowCyan,-17,6.3,z,false,false);box(2.4,.08,.42,glowAmber,17,6.3,z,false,false);}
// Protective barriers and crates make the range feel dimensional without obstructing the opening lanes.
for (const [x,z,w,h,d] of [[-13,-4,4,1.3,1.3],[13,-7,4,1.2,1.3],[-19,-17,3.8,1.1,1.2],[19,-22,4,1.3,1.2],[-7,-23,3,1,1],[8,-13,3,1,1]]) {
  box(w,h,d,darkConcrete,x,h/2-.05,z); box(w*.86,.045,d*.82,safety,x,h-.02,z);
  box(.08,h+.02,d*.83,metal,x-w*.42,h/2,z); box(.08,h+.02,d*.83,metal,x+w*.42,h/2,z);
}
for(const x of [-22,-17,17,22]){
  const y=2.2;
  box(1.05,4.4,.7,concrete,x,y,-10); box(1.12,.11,.76,metal,x,y+2.25,-10); box(.78,.045,.04,glowCyan,x,y+2.1,-9.62,false,false);
  box(1.05,4.4,.7,concrete,x,y,-25); box(1.12,.11,.76,metal,x,y+2.25,-25);
}
// Backlit sign and concentric range markers.
box(8,1.5,.3,darkConcrete,0,5.4,-30.25,false);
const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.7,.95),new THREE.MeshBasicMaterial({color:0xc9f178})); sign.position.set(0,5.4,-30.04); scene.add(sign);
const signCanvas=document.createElement('canvas'); signCanvas.width=1024; signCanvas.height=144;
const ctx=signCanvas.getContext('2d');ctx.fillStyle='#c9f178';ctx.fillRect(0,0,1024,144);ctx.fillStyle='#17211e';ctx.font='bold 76px Arial';ctx.textAlign='center';ctx.fillText('NIGHT SHIFT  /  TRAINING BAY 07',512,96);
const signTex=new THREE.CanvasTexture(signCanvas);signTex.colorSpace=THREE.SRGBColorSpace;sign.material=new THREE.MeshBasicMaterial({map:signTex});
for(const [x,z] of [[0,-24],[-12,-29],[12,-29]]){
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.5,.035,8,48),new THREE.MeshBasicMaterial({color:0x9bb7a7,transparent:true,opacity:.38}));ring.position.set(x,2.4,z);scene.add(ring);
  const ring2=new THREE.Mesh(new THREE.TorusGeometry(.8,.025,8,40),new THREE.MeshBasicMaterial({color:0x9bb7a7,transparent:true,opacity:.25}));ring2.position.set(x,2.4,z-.01);scene.add(ring2);
}

// First-person weapon rig, parented to the view camera.
const gunRig=new THREE.Group(); camera.add(gunRig); scene.add(camera);
const gunBodies=[];
function makeGun(index){
  const g=new THREE.Group();gunRig.add(g);gunBodies.push(g);
  const bodyMat=mat(index===0?0x29363a:index===1?0x263936:0x39312b,.32,.74);
  const gunBox=(w,h,d,m,x,y,z)=>{const a=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);a.position.set(x,y,z);a.castShadow=true;g.add(a);return a;};
  const mainLen=index===2?.75:.62;
  gunBox(.18,.22,mainLen,bodyMat,0,0,0);
  gunBox(.13,.12,mainLen*.83,black,0,.115,-.015);
  gunBox(.08,.08,index===1?.7:.9,metal,0,.04,-mainLen*.57);
  gunBox(.06,.05,.22,glowCyan,0,.12,-mainLen*.43);
  gunBox(.15,.16,.17,black,0,-.17,.09);
  gunBox(.08,.23,.12,bodyMat,.015,-.31,.11);
  gunBox(.11,.04,.16,metal,0,-.42,.12);
  if(index===1){gunBox(.09,.15,.25,black,0,.16,.04);gunBox(.07,.04,.13,glowAmber,0,.25,.04);gunBox(.08,.09,.26,metal,0,-.08,.31);}
  if(index===2){gunBox(.12,.15,.2,black,0,.15,-.02);gunBox(.25,.12,.19,metal,0,-.14,.28);gunBox(.1,.2,.1,black,.19,-.02,.08);gunBox(.1,.2,.1,black,-.19,-.02,.08);}
  g.position.set(.35,-.3,-.65);g.rotation.set(-.03,-.08,-.035);
  return g;
}
makeGun(0);makeGun(1);makeGun(2);gunBodies.forEach((g,i)=>g.visible=i===0);
const muzzleLight=new THREE.PointLight(0xffcf76,0,3,2);camera.add(muzzleLight);muzzleLight.position.set(.35,-.19,-1.23);

const weapons=[
 {name:'VANTA 9',tag:'SIDEARM / 01',meta:'SEMIAUTO · 9×19 MM',mag:12,reserve:72,damage:1,rate:260,spread:.007,pellets:1,reload:1050},
 {name:'KESTREL 45',tag:'CARBINE / 02',meta:'FULL AUTO · 5.56 MM',mag:30,reserve:150,damage:1,rate:115,spread:.012,pellets:1,reload:1450},
 {name:'BULLDOG 12',tag:'SHOTGUN / 03',meta:'PUMP ACTION · 12 GA',mag:6,reserve:36,damage:1,pellets:8,rate:700,spread:.065,reload:1350}
].map(w=>({...w,ammo:w.mag}));

const targets=[];
const targetColors=[0xf1a64c,0x55d8c6,0xff7958,0xa7c86d];
function makeTarget(index){
 const group=new THREE.Group();scene.add(group);
 const shell=mat(targetColors[index%targetColors.length],.34,.3), dark=mat(0x263437,.5,.5), joint=mat(0x596b67,.5,.5), coreMat=new THREE.MeshStandardMaterial({color:0xffdd66,emissive:0xf28a2d,emissiveIntensity:2,roughness:.27,metalness:.2});
 const part=(geo,m,x,y,z,sx=1,sy=1,sz=1)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;group.add(o);return o;};
 const torso=part(new THREE.BoxGeometry(.8,.8,.42),shell,0,1.42,0,.9,1,1);
 part(new THREE.BoxGeometry(.83,.14,.45),dark,0,1.06,0);
 part(new THREE.SphereGeometry(.28,16,12),shell,0,2.04,0,1,1,.92);
 part(new THREE.BoxGeometry(.47,.1,.08),dark,0,2.05,-.247);
 const core=part(new THREE.SphereGeometry(.18,16,12),coreMat,0,1.52,-.235,1,1,.38);core.userData.core=true;
 part(new THREE.BoxGeometry(.055,.18,.04),glowCyan,0,1.52,-.305);
 for(const side of [-1,1]){
   part(new THREE.BoxGeometry(.28,.65,.3),shell,side*.57,1.43,0,.75,1,1);
   part(new THREE.SphereGeometry(.16,12,10),joint,side*.58,1.05,0);
   part(new THREE.BoxGeometry(.24,.56,.27),shell,side*.19,.68,0,.85,1,1);
   part(new THREE.BoxGeometry(.27,.12,.37),dark,side*.19,.38,-.035);
 }
 const target={group,core,parts:[],index,phase:Math.random()*6.28,baseX:0,baseZ:-20,active:true,hp:1,bob:0};
 group.traverse(o=>{if(o.isMesh){o.userData.target=target;target.parts.push(o);}});
 group.position.set(0,0,-20);group.scale.setScalar(1);
 return target;
}
for(let i=0;i<5;i++)targets.push(makeTarget(i));

let yaw=0,pitch=0,started=false,paused=false,gameOver=false,score=0,shots=0,hits=0,targetsDestroyed=0,wave=1,timeLeft=90,lastShot=0,reloading=false,reloadTimeout=null;
let moveForward=0,moveSide=0,sprint=false,lastTime=performance.now(),runTime=0,fireHeld=false,muzzleTimeout=null,soundOn=false;
let best=Number(localStorage.getItem('neon-range-best')||0);
$('best').textContent=String(best).padStart(4,'0');
const raycaster=new THREE.Raycaster();raycaster.far=75;
const clock=new THREE.Clock();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));}
addEventListener('resize',resize);

function updateWeaponHud(){const w=weapons[selected];$('weapon-name').textContent=w.name;$('weapon-tag').textContent=w.tag;$('weapon-meta').textContent=w.meta;$('ammo-current').textContent=String(w.ammo).padStart(2,'0');$('ammo-reserve').textContent=String(w.reserve).padStart(3,'0');$('ammo-caption').textContent=`${String(selected+1).padStart(2,'0')} / 06`;gunBodies.forEach((g,i)=>g.visible=i===selected);}
let selected=0;updateWeaponHud();
function showToast(text){const el=$('toast');el.textContent=text;el.classList.add('show');clearTimeout(showToast.timeout);showToast.timeout=setTimeout(()=>el.classList.remove('show'),900);}
function startGame(){
 if(started&&paused){paused=false;$('center-notice').classList.remove('visible');if(!matchMedia('(pointer:coarse)').matches)canvas.requestPointerLock?.();return;}
 if(gameOver){resetGame();}
 started=true;paused=false;gameOver=false;$('start-overlay').classList.add('hidden');$('result-overlay').classList.add('hidden');$('center-notice').classList.remove('visible');
 if(!matchMedia('(pointer:coarse)').matches)canvas.requestPointerLock?.();
 lastTime=performance.now();
}
function resetGame(){score=0;shots=0;hits=0;targetsDestroyed=0;wave=1;timeLeft=90;selected=0;yaw=0;pitch=0;camera.position.set(0,1.68,8);for(const w of weapons){w.ammo=w.mag;w.reserve=w.name==='VANTA 9'?72:w.name==='KESTREL 45'?150:36;}targets.forEach((t,i)=>{t.active=true;t.hp=1;t.group.visible=true;t.baseZ=-17-i*2.7;t.baseX=(i-2)*3.2;});$('score').textContent='0000';$('wave').textContent='01';$('timer').classList.remove('urgent');updateWeaponHud();}
function endGame(){gameOver=true;paused=false;document.exitPointerLock?.();$('result-overlay').classList.remove('hidden');$('final-score').textContent=String(score).padStart(4,'0');$('accuracy').innerHTML=`${shots?Math.round(hits/shots*100):0}<span>%</span>`;$('targets-hit').textContent=String(targetsDestroyed).padStart(2,'0');$('result-title').textContent=score>1500?'CAMPO DOMINADO.':'BUEN TRABAJO.';$('result-copy').textContent=score>1500?'Precisión impecable. El siguiente turno es tuyo.':'Cada disparo cuenta. El campo ya te espera otra vez.';}
function pickWeapon(i){if(i<0||i>2||selected===i)return;selected=i;reloading=false;clearTimeout(reloadTimeout);updateWeaponHud();showToast(`${weapons[i].name} EQUIPADA`);}
function reload(){const w=weapons[selected];if(reloading||w.ammo===w.mag||w.reserve===0||!started||paused||gameOver)return;reloading=true;showToast('RECARGANDO…');$('ammo-current').classList.add('reloading');reloadTimeout=setTimeout(()=>{const amount=Math.min(w.mag-w.ammo,w.reserve);w.ammo+=amount;w.reserve-=amount;reloading=false;$('ammo-current').classList.remove('reloading');updateWeaponHud();},w.reload);}
function shoot(){if(!started||paused||gameOver||reloading)return;const w=weapons[selected],now=performance.now();if(now-lastShot<w.rate)return;lastShot=now;shots++;
 if(w.ammo<=0){showToast('SIN MUNICIÓN — R PARA RECARGAR');return;}w.ammo--;updateWeaponHud();playShot();
 $('crosshair').classList.add('fire');setTimeout(()=>$('crosshair').classList.remove('fire'),90);
 muzzleLight.intensity=8;clearTimeout(muzzleTimeout);muzzleTimeout=setTimeout(()=>muzzleLight.intensity=0,55);
 gunRig.position.z=.055;setTimeout(()=>gunRig.position.z=0,65);
 raycaster.setFromCamera(new THREE.Vector2(0,0),camera);
 const meshes=[];for(const t of targets)if(t.active)meshes.push(...t.parts);
 const intersects=raycaster.intersectObjects(meshes,false);
 if(intersects.length){const object=intersects[0].object,t=object.userData.target;if(t?.active){hits++;const coreHit=object.userData.core===true;const points=coreHit?150:100;score+=points;targetsDestroyed++;t.active=false;t.group.visible=false;
   $('score').textContent=String(score).padStart(4,'0');$('score-plus').textContent=`+${points}`;setTimeout(()=>$('score-plus').textContent='',700);$('crosshair').classList.add('hit');setTimeout(()=>$('crosshair').classList.remove('hit'),180);const marker=$('hit-marker');marker.textContent=coreHit?'✦':'×';marker.classList.remove('show');void marker.offsetWidth;marker.classList.add('show');
   if(soundOn)playHit(coreHit);const remaining=targets.filter(x=>x.active).length;if(remaining===0){wave++;$('wave').textContent=String(wave).padStart(2,'0');targets.forEach((x,i)=>{x.active=true;x.hp=1;x.group.visible=true;x.baseZ=-17-i*2.7-(wave%3);x.baseX=(i-2)*3.2;});timeLeft=Math.min(90,timeLeft+8);showToast(`OLEADA ${String(wave).padStart(2,'0')} — +8 SEGUNDOS`);}
 }}
 if(w.ammo===0&&w.reserve>0)showToast('CARGADOR VACÍO — R PARA RECARGAR');
}

// Subtle procedural audio: no downloaded assets, only generated feedback tones/noise.
let audioContext=null;
function playHit(coreHit){if(!soundOn)return;try{audioContext??=new AudioContext();const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='triangle';osc.frequency.setValueAtTime(coreHit?940:560,audioContext.currentTime);osc.frequency.exponentialRampToValueAtTime(190,audioContext.currentTime+.12);gain.gain.setValueAtTime(.12,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.14);osc.connect(gain);gain.connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+.15);}catch{}}
function playShot(){if(!soundOn)return;try{audioContext??=new AudioContext();const length=Math.floor(audioContext.sampleRate*.075),buffer=audioContext.createBuffer(1,length,audioContext.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);const source=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter(),gain=audioContext.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=selected===2?500:1100;gain.gain.value=selected===2?.2:.1;source.connect(filter);filter.connect(gain);gain.connect(audioContext.destination);source.start();}catch{}}

canvas.addEventListener('click',()=>{if(!started){startGame();return;}if(!paused&&!gameOver&&document.pointerLockElement!==canvas&&!matchMedia('(pointer:coarse)').matches)canvas.requestPointerLock?.();});
$('start-button').addEventListener('click',startGame);
$('restart-button').addEventListener('click',()=>{resetGame();startGame();});
$('sound-toggle').addEventListener('click',()=>{soundOn=!soundOn;$('sound-toggle').style.color=soundOn?'var(--acid)':'';$('sound-toggle').setAttribute('aria-label',soundOn?'Silenciar sonido':'Activar sonido');document.querySelector('.sound-label b').textContent=soundOn?'ON':'OFF';if(soundOn){audioContext??=new AudioContext();audioContext.resume();}});
document.addEventListener('pointerlockchange',()=>{if(started&&!gameOver&&!document.pointerLockElement&&!matchMedia('(pointer:coarse)').matches){paused=true;$('center-notice').classList.add('visible');}});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&started&&!paused){yaw-=e.movementX*.0022;pitch-=e.movementY*.0019;pitch=clamp(pitch,-1.15,1.15);}});
document.addEventListener('keydown',e=>{
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
 if(e.code==='Escape'&&started&&!gameOver){if(paused)startGame();else{paused=true;document.exitPointerLock?.();$('center-notice').classList.add('visible');}return;}
 if(e.code==='KeyW'||e.code==='ArrowUp')moveForward=1;if(e.code==='KeyS'||e.code==='ArrowDown')moveForward=-1;
 if(e.code==='KeyA'||e.code==='ArrowLeft')moveSide=-1;if(e.code==='KeyD'||e.code==='ArrowRight')moveSide=1;
 if(e.code==='ShiftLeft'||e.code==='ShiftRight')sprint=true;
 if(e.code==='KeyR')reload();if(e.code==='Digit1')pickWeapon(0);if(e.code==='Digit2')pickWeapon(1);if(e.code==='Digit3')pickWeapon(2);
 if(e.code==='Space'){fireHeld=true;shoot();}
});
document.addEventListener('keyup',e=>{if(e.code==='KeyW'||e.code==='ArrowUp'||e.code==='KeyS'||e.code==='ArrowDown')moveForward=0;if(e.code==='KeyA'||e.code==='ArrowLeft'||e.code==='KeyD'||e.code==='ArrowRight')moveSide=0;if(e.code==='ShiftLeft'||e.code==='ShiftRight')sprint=false;if(e.code==='Space')fireHeld=false;});
canvas.addEventListener('mousedown',e=>{if(e.button===0&&started&&!paused&&!gameOver&&document.pointerLockElement===canvas)shoot();});
canvas.addEventListener('contextmenu',e=>e.preventDefault());

// Touch controls: left virtual stick moves, right-side drag aims, fire button supports hold-to-fire.
const movePad=$('move-pad'),stick=$('stick');let stickPointer=null,aimPointer=null,lastTouchX=0,lastTouchY=0;
movePad.addEventListener('pointerdown',e=>{e.preventDefault();stickPointer=e.pointerId;movePad.setPointerCapture(e.pointerId);updateStick(e);});
movePad.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer)updateStick(e);});
function updateStick(e){const r=movePad.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,len=Math.hypot(dx,dy),max=34,s=Math.min(1,max/(len||1));stick.style.transform=`translate(${dx*s}px,${dy*s}px)`;moveSide=clamp(dx/max,-1,1);moveForward=clamp(-dy/max,-1,1);}
function releaseStick(e){if(e.pointerId!==stickPointer)return;stickPointer=null;moveForward=0;moveSide=0;stick.style.transform='translate(0,0)';}
movePad.addEventListener('pointerup',releaseStick);movePad.addEventListener('pointercancel',releaseStick);
const aimZone=$('mobile-aim-zone');aimZone.addEventListener('pointerdown',e=>{if(!started||paused)return;aimPointer=e.pointerId;lastTouchX=e.clientX;lastTouchY=e.clientY;aimZone.setPointerCapture(e.pointerId);});
aimZone.addEventListener('pointermove',e=>{if(e.pointerId!==aimPointer)return;const dx=e.clientX-lastTouchX,dy=e.clientY-lastTouchY;lastTouchX=e.clientX;lastTouchY=e.clientY;yaw-=dx*.006;pitch=clamp(pitch-dy*.005,-1.1,1.1);});
function releaseAim(e){if(e.pointerId===aimPointer)aimPointer=null;}aimZone.addEventListener('pointerup',releaseAim);aimZone.addEventListener('pointercancel',releaseAim);
$('fire-button').addEventListener('pointerdown',e=>{e.preventDefault();fireHeld=true;shoot();});$('fire-button').addEventListener('pointerup',()=>fireHeld=false);$('fire-button').addEventListener('pointercancel',()=>fireHeld=false);$('mobile-reload').addEventListener('click',reload);

function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;runTime+=dt;
 if(started&&!paused&&!gameOver){timeLeft-=dt;if(timeLeft<=0){timeLeft=0;endGame();}const total=Math.floor(timeLeft),minutes=Math.floor(total/60),seconds=total%60;$('timer').textContent=`${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;if(timeLeft<16)$('timer').classList.add('urgent');if(fireHeld)shoot();}
 camera.rotation.order='YXZ';camera.rotation.y=yaw;camera.rotation.x=pitch;
 if(started&&!paused&&!gameOver){const speed=sprint?7.2:4.7;const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));camera.position.addScaledVector(forward,moveForward*speed*dt);camera.position.addScaledVector(right,moveSide*speed*dt);camera.position.x=clamp(camera.position.x,-22,22);camera.position.z=clamp(camera.position.z,-27,13);}
 const t=runTime;
 targets.forEach((target,i)=>{if(!target.active)return;const strafe=Math.sin(t*(.72+(i%3)*.14)+target.phase)*(2.1+(i%2)*.5);target.group.position.set(target.baseX+strafe,Math.sin(t*1.6+i)*.06,target.baseZ+Math.sin(t*.58+i*2)*.5);target.group.rotation.y=Math.sin(t*.8+i)*.15;});
 const sway=Math.sin(t*8)*.004*(Math.abs(moveForward)+Math.abs(moveSide));gunRig.position.x=.35+sway;gunRig.position.y=-.3+Math.abs(Math.cos(t*8))*.003*(Math.abs(moveForward)+Math.abs(moveSide));
 renderer.render(scene,camera);
}
resetGame();requestAnimationFrame(animate);
