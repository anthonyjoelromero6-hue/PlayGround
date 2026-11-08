import * as THREE from './vendor/three.module.js';

const $ = (s) => document.querySelector(s);
const ui = { lobby: $('#lobby'), hud: $('#hud'), result: $('#result'), modal: $('#controlsModal'), death: $('#deathOverlay'), canvas: $('#game') };
const scene = new THREE.Scene();
scene.background = new THREE.Color('#10181b');
scene.fog = new THREE.FogExp2('#111b1c', .023);
const camera = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, .1, 150);
const renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
scene.add(new THREE.HemisphereLight('#b8e4df', '#18201b', 1.7));
const keyLight = new THREE.DirectionalLight('#f0f3db', 2.7); keyLight.position.set(-5, 12, 8); keyLight.castShadow = true; keyLight.shadow.mapSize.set(1024, 1024); scene.add(keyLight);
const fillLight = new THREE.PointLight('#67d9d4', 36, 27); fillLight.position.set(-7, 5, -2); scene.add(fillLight);
const warmLight = new THREE.PointLight('#e89a67', 22, 23); warmLight.position.set(8, 4, 2); scene.add(warmLight);
const mats = {};
function mat(color, rough=.62, metal=.16, extra={}) { return new THREE.MeshStandardMaterial({ color, roughness:rough, metalness:metal, ...extra }); }
mats.floor=mat('#202a29',.76,.18); mats.dark=mat('#111719',.46,.42); mats.steel=mat('#36413d',.46,.62); mats.light=mat('#c5d0c0',.35,.35); mats.lime=mat('#c8f169',.3,.28,{emissive:'#5c8221',emissiveIntensity:1.5}); mats.cyan=mat('#68dfe2',.3,.3,{emissive:'#127c87',emissiveIntensity:1.4}); mats.red=mat('#ff705e',.38,.22,{emissive:'#9d251b',emissiveIntensity:.75}); mats.orange=mat('#e8965e',.38,.25); mats.glass=mat('#18292a',.26,.55,{transparent:true,opacity:.83});
function box(parent,x,y,z,w,h,d,material,opts={}){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=opts.cast!==false;m.receiveShadow=true;parent.add(m);return m;}
function cylinder(parent,x,y,z,r1,r2,h,material,radial=12){const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,radial),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function glowBar(parent,x,y,z,w,h,d,material=mats.lime){const m=box(parent,x,y,z,w,h,d,material,{cast:false});return m;}
function makeLabel(text, sub='SELECCIONAR MODO', color='#c8f169'){
 const c=document.createElement('canvas');c.width=512;c.height=192;const x=c.getContext('2d');x.fillStyle='rgba(8,14,15,.92)';x.fillRect(0,0,512,192);x.strokeStyle=color;x.lineWidth=3;x.strokeRect(7,7,498,178);x.fillStyle='#edf4e8';x.textAlign='center';x.font='800 95px Arial';x.fillText(text,256,108);x.fillStyle=color;x.font='20px monospace';x.fillText(sub,256,151);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshBasicMaterial({map:t,transparent:true,side:THREE.DoubleSide});return new THREE.Mesh(new THREE.PlaneGeometry(2.15,.8),material);
}
function addGridFloor(size,divisions){const g=new THREE.GridHelper(size,divisions,'#52756a','#354741');g.position.y=.018;g.material.transparent=true;g.material.opacity=.25;world.add(g);}
const world = new THREE.Group(); scene.add(world);
let state='lobby', chosenMode=1, score=0, playerHealth=100, armor=75, kills=0, shots=0, hits=0, matchTarget=5, enemies=[], obstacles=[], effects=[], lastShot=0, reloadUntil=0, respawnAt=0, aiming=false, fireHeld=false, soundOn=false, gameTime=0;
const player={pos:new THREE.Vector3(0,0,9),vel:new THREE.Vector3(),yaw:0,pitch:0,onGround:true};
const keys=new Set(); const raycaster=new THREE.Raycaster(); const center=new THREE.Vector2(0,0); const clock=new THREE.Clock();
let gunGroup, muzzle, weaponIndex=0, lobbyPickables=[];
const weaponDefs=[
 {name:'VANTA K-7',type:'ASALTO',mag:30,reserve:120,damage:34,rate:115,reload:1.35,spread:.007,color:'#c8f169'},
 {name:'KITE 9',type:'SECUNDARIA',mag:16,reserve:96,damage:48,rate:255,reload:1.05,spread:.003,color:'#80dce5'},
 {name:'BREACH-12',type:'CERCA',mag:6,reserve:42,damage:19,rate:620,reload:1.65,spread:.055,color:'#ff9c6e',pellets:7},
 {name:'ARC-4',type:'ENERGÍA',mag:24,reserve:96,damage:25,rate:150,reload:1.4,spread:.004,color:'#bd96ff'}
];
let ammo=weaponDefs.map(w=>w.mag), reserves=weaponDefs.map(w=>w.reserve);
function addLobby(){
 world.clear();obstacles=[];scene.background=new THREE.Color('#152123');scene.fog=new THREE.FogExp2('#172324',.022);
 const floor=box(world,0,-.32,0,100,.6,100,mats.floor);floor.receiveShadow=true;
 addGridFloor(60,60);
 box(world,0,8,-12,34,18,.8,mats.dark);box(world,-17,5,-2,.7,12,30,mats.dark);box(world,17,5,-2,.7,12,30,mats.dark);
 for(let i=0;i<8;i++){const x=-14+i*4;box(world,x,7,-11,.14,13,.25,i%2?mats.steel:mats.dark);glowBar(world,x+.22,5,-10.52,.045,5,.06,i%2?mats.cyan:mats.lime);}
 for(const x of [-14,-10,-6,6,10,14]){box(world,x,2.3,-1,.48,4.6,.48,mats.steel);box(world,x,4.65,-1,.73,.14,.73,mats.lime);}
 // Long runway and twin team plinths anchor the three-dimensional lobby.
 box(world,0,.12,3,7,.25,20,mats.dark);box(world,0,.27,3,5.8,.08,18,mats.steel);
 for(const z of [-5,-1,3,7,11]){glowBar(world,0,.34,z,.07,.045,1.7,mats.lime);}
 const platforms=[{x:-5.15,ids:[1,2],accent:mats.cyan,name:'VANGUARD'},{x:5.15,ids:[3,4],accent:mats.red,name:'OUTRIDERS'}];
 for(const p of platforms){
  const group=new THREE.Group();world.add(group);group.position.set(p.x,0,-1.2);
  cylinder(group,0,.17,0,3.55,3.8,.32,mats.dark,8);cylinder(group,0,.34,0,3.32,3.55,.14,mats.steel,8);
  cylinder(group,0,.43,0,3.18,3.18,.06,p.accent,8);
  // Top surface darkens the emissive ring while keeping the platform geometry obvious.
  cylinder(group,0,.48,0,3.06,3.06,.08,mats.dark,8);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;const orb=cylinder(group,Math.cos(a)*3.29,.49,Math.sin(a)*3.29,.11,.11,.08,p.accent,8);orb.rotation.x=Math.PI/2;}
  const title=makeLabel(p.name,'PLATAFORMA DE COMBATE',p.accent===mats.cyan?'#68dfe2':'#ff705e');title.position.set(0,2.35,-1.4);group.add(title);
  p.ids.forEach((id,j)=>{
   const z=j===0?.85:-.95;const plate=box(group,j===0?-.92:.92,.72,z,1.55,.18,1.35,mats.steel);plate.material=mat('#34423e',.4,.4);plate.userData.mode=id;lobbyPickables.push(plate);
   const accent=box(group,j===0?-.92:.92,.83,z,1.34,.035,1.14,id<3?mats.cyan:mats.red,{cast:false});accent.material=mat(id<3?'#1e4648':'#4b302b',.4,.22,{emissive:id<3?'#0c7379':'#8c3424',emissiveIntensity:1.3});
   const label=makeLabel(`${id}v${id}`,`MODO 0${id}`,id<3?'#80e5e3':'#ff8975');label.scale.set(.73,.38,.73);label.position.set(j===0?-.92:.92,1.15,z);group.add(label);
   // Invisible, oversized interaction target attached to the raised plate.
   const hit=new THREE.Mesh(new THREE.BoxGeometry(1.8,.7,1.7),new THREE.MeshBasicMaterial({visible:false}));hit.position.set(j===0?-.92:.92,.88,z);hit.userData.mode=id;group.add(hit);lobbyPickables.push(hit);
  });
  for(let i=0;i<4;i++){const a=i*Math.PI/2;box(group,Math.cos(a)*2.1,.69,Math.sin(a)*2.1,.17,.48,.17,mats.steel);glowBar(group,Math.cos(a)*2.1,.95,Math.sin(a)*2.1,.24,.055,.24,p.accent);}
  // Small holographic columns and animated lights make each platform read as a real place.
  const holo=box(group,0,1.35,-2.55,2.5,1.8,.06,mats.glass,{cast:false});holo.material.transparent=true;holo.material.opacity=.44;
  glowBar(group,0,2.26,-2.53,2.52,.05,.1,p.accent);
  for(let i=0;i<3;i++){const bot=new THREE.Group();group.add(bot);bot.position.set(-.75+i*.75,.52,-2.25);cylinder(bot,0,.32,0,.16,.19,.64,i===1?mats.lime:mats.light,8);cylinder(bot,0,.78,0,.13,.14,.25,mats.dark,8);glowBar(bot,0,.76,.14,.2,.04,.05,p.accent);}
 }
 // Scattered neon lane markers, railings, and distant light pylons.
 for(const x of [-11,11]){box(world,x,.7,-3,.18,1.4,17,mats.steel);for(let z=-10;z<6;z+=2.2)glowBar(world,x,.85,z,.23,.09,.25,mats.lime);}
 for(const x of [-13,-9,9,13]){const lamp=cylinder(world,x,5,-8,.12,.16,10,mats.steel,8);glowBar(world,x,9,-8,.8,.12,.3,mats.cyan);}
 const back=box(world,0,14,-14,40,.16,.16,mats.lime);back.material=mat('#c8f169',.3,.2,{emissive:'#738e35',emissiveIntensity:1.3});
 // Atmospheric floating dust.
 const pts=[];for(let i=0;i<140;i++)pts.push((Math.random()-.5)*36,Math.random()*9,(Math.random()-.5)*29-2);
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));const dust=new THREE.Points(geo,new THREE.PointsMaterial({color:'#c7e9bc',size:.035,transparent:true,opacity:.65}));world.add(dust);world.userData.dust=dust;
 camera.fov=52;camera.position.set(0,5.9,19.5);camera.lookAt(0,2.25,-1);camera.updateProjectionMatrix();
}

function addArena(){
 world.clear();obstacles=[];scene.background=new THREE.Color('#101719');scene.fog=new THREE.FogExp2('#111a1b',.018);
 box(world,0,-.35,0,48,.7,42,mats.floor);
 const grid=new THREE.GridHelper(48,48,'#40665d','#293b37');grid.position.y=.016;grid.material.transparent=true;grid.material.opacity=.2;world.add(grid);
 // Perimeter walls, lit from above and lined with low neon trim.
 const wallMat=mat('#202a29',.62,.45);
 box(world,0,2.2,-21,48,4.4,.8,wallMat);box(world,0,2.2,21,48,4.4,.8,wallMat);box(world,-24,2.2,0,.8,4.4,42,wallMat);box(world,24,2.2,0,.8,4.4,42,wallMat);
 for(let x=-20;x<=20;x+=4){glowBar(world,x,.28,-20.56,2.2,.09,.08,mats.cyan);glowBar(world,x,.28,20.56,2.2,.09,.08,mats.red);}
 for(const x of [-21,21])for(let z=-16;z<=16;z+=4)glowBar(world,x,.26,z,.08,.08,2.2,mats.lime);
 // Industrial skyline, hanging lamps, and raised side structures.
 for(const x of [-18,-11,-4,4,11,18]){box(world,x,5,-20.45,.25,5,.25,mats.steel);glowBar(world,x,7.3,-20.25,.7,.12,.18,x<0?mats.cyan:mats.red);}
 for(const x of [-19,19]){box(world,x,2.1,0,5,.6,28,mats.dark);box(world,x,2.42,0,4.3,.07,26,mats.steel);for(let z=-11;z<=11;z+=4)glowBar(world,x,2.48,z,.12,.05,1.8,mats.lime);}
 // Central cover blocks and side lanes provide clear routes without trapping the player.
 const cover=(x,z,w,d,h=1.5,material=mats.steel)=>{const m=box(world,x,h/2,z,w,h,d,material);obstacles.push({x,z,w,d,h,mesh:m});return m;};
 cover(0,-5,7,1.35,1.55,mats.dark);cover(0,5,7,1.35,1.55,mats.dark);
 cover(-8,0,2,5.4,1.75);cover(8,0,2,5.4,1.75);
 cover(-14,-8,3.8,2,1.25,mats.dark);cover(14,-8,3.8,2,1.25,mats.dark);
 cover(-14,8,3.8,2,1.25,mats.dark);cover(14,8,3.8,2,1.25,mats.dark);
 cover(-4,-13,2.2,2.2,1.4);cover(4,-13,2.2,2.2,1.4);cover(-4,13,2.2,2.2,1.4);cover(4,13,2.2,2.2,1.4);
 for(const [x,z] of [[-8,-2],[8,2]]){cylinder(world,x,.35,z,.8,.8,.7,mats.dark,8);cylinder(world,x,.72,z,.61,.61,.08,mats.cyan,8);}
 for(const x of [-20,-12,0,12,20]){const p=cylinder(world,x,4.2,-18,.12,.16,8,mats.steel,8);glowBar(world,x,8.2,-18,.7,.14,.42,mats.lime);}
 const centerMark=cylinder(world,0,.025,0,2.4,2.4,.04,mats.dark,32);centerMark.material=mat('#202d2a',.65,.32);for(let i=0;i<8;i++){const a=i*Math.PI/4;glowBar(world,Math.cos(a)*2.05,.06,Math.sin(a)*2.05,.3,.04,.07,i%2?mats.cyan:mats.red);}
 for(const z of [-17,17]){box(world,0,.6,z,6,1.2,.24,mats.dark);glowBar(world,0,1.22,z,5.9,.05,.28,z<0?mats.red:mats.cyan);}
 camera.fov=aiming?48:68;camera.updateProjectionMatrix();
}

function buildGun(){
 gunGroup=new THREE.Group();camera.add(gunGroup);scene.add(camera);gunGroup.position.set(.34,-.29,-.58);gunGroup.rotation.set(-.04,-.04,0);
 const body=mat('#29322e',.32,.68), dark=mat('#111817',.34,.5), accent=mat('#c8f169',.27,.35,{emissive:'#5c8221',emissiveIntensity:1});
 box(gunGroup,0,0,0,.18,.16,.48,body);box(gunGroup,.015,.105,-.05,.13,.06,.27,dark);box(gunGroup,0,-.12,.08,.12,.14,.16,dark);box(gunGroup,0,.015,-.31,.08,.08,.33,dark);box(gunGroup,0,.065,-.46,.06,.05,.08,accent);
 box(gunGroup,-.03,-.01,.22,.11,.14,.17,dark);box(gunGroup,0,.09,.16,.05,.02,.1,accent);
 muzzle=new THREE.PointLight('#c8f169',0,3);muzzle.position.set(0,.01,-.5);gunGroup.add(muzzle);
}
function updateGun(){
 const d=weaponDefs[weaponIndex];const scale=weaponIndex===2?1.22:weaponIndex===1?.82:weaponIndex===3?1:1;
 gunGroup.scale.setScalar(scale);gunGroup.children.forEach((c)=>{if(c.isMesh&&c.material&&c.material.emissive){c.material.emissive.set(d.color);}});
 $('#weaponType').textContent=d.type;$('#weaponName').textContent=d.name;
 document.querySelectorAll('.weapon-slot').forEach(el=>el.classList.toggle('active',Number(el.dataset.slot)===weaponIndex+1));
 updateAmmo();
}

function makeEnemy(index){
 const group=new THREE.Group();const armorMat=mat(index%2?'#7b3730':'#963d32',.42,.42), dark=mat('#202522',.5,.4), visor=mat('#ff806a',.25,.25,{emissive:'#c33b29',emissiveIntensity:1.6});
 const torso=box(group,0,1.22,0,.72,.92,.4,armorMat);torso.userData.enemy=true;
 const chest=box(group,0,1.37,-.215,.38,.35,.035,mats.dark);chest.userData.enemy=true;
 const head=cylinder(group,0,1.94,0,.25,.26,.4,dark,8);head.userData.enemy=true;
 const face=box(group,0,1.99,-.21,.31,.12,.04,visor);face.userData.enemy=true;
 for(const x of [-.47,.47]){const arm=box(group,x,1.26,0,.22,.68,.24,armorMat);arm.userData.enemy=true;}
 for(const x of [-.2,.2]){const leg=box(group,x,.48,0,.25,.8,.29,dark);leg.userData.enemy=true;}
 const weapon=box(group,.35,1.02,-.31,.16,.13,.58,mats.dark);weapon.userData.enemy=true;
 const barBg=box(group,0,2.38,0,.88,.075,.05,mat('#111817',.5,.1),{cast:false});barBg.userData.bar=true;
 const bar=box(group,0,2.39,-.035,.82,.035,.025,mats.red,{cast:false});bar.userData.healthBar=true;
 group.traverse(o=>{if(o.isMesh){o.userData.owner=group;}});
 group.position.set((Math.random()-.5)*8,0,-12-index*1.3);world.add(group);
 return {group,health:100,maxHealth:100,attackAt:0,moveSpeed:1.45+Math.random()*.3,index,alive:true,respawnAt:0,bar};
}
function spawnEnemies(){
 enemies.forEach(e=>world.remove(e.group));enemies=[];
 for(let i=0;i<chosenMode;i++)enemies.push(makeEnemy(i));
}
function updateAmmo(){const d=weaponDefs[weaponIndex];$('#ammoCount').textContent=ammo[weaponIndex];$('#reserveCount').textContent=reserves[weaponIndex];$('#reloadNote').classList.toggle('show',performance.now()<reloadUntil);}
function updateHud(){
 $('#healthNum').textContent=Math.max(0,Math.ceil(playerHealth));$('#healthFill').style.width=`${Math.max(0,playerHealth)}%`;
 $('#armorNum').textContent=Math.max(0,Math.ceil(armor));$('#blueScore').textContent=score;$('#redScore').textContent=Math.max(0,Math.floor(gameTime/42));
 $('#scoreFill').style.width=`${Math.min(50,score/matchTarget*50)}%`;
 updateAmmo();
}
function showToast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>el.classList.remove('show'),1350);}
function setWeapon(i){if(i<0||i>3||state!=='game')return;weaponIndex=i;updateGun();}
function startReload(){const d=weaponDefs[weaponIndex];if(state!=='game'||performance.now()<reloadUntil||ammo[weaponIndex]>=d.mag||reserves[weaponIndex]<=0)return;reloadUntil=performance.now()+d.reload*1000;$('#reloadNote').classList.add('show');setTimeout(()=>{if(state!=='game')return;const take=Math.min(d.mag-ammo[weaponIndex],reserves[weaponIndex]);ammo[weaponIndex]+=take;reserves[weaponIndex]-=take;reloadUntil=0;updateAmmo();},d.reload*1000);}
function startGame(mode){
 chosenMode=mode;matchTarget=5;score=0;kills=0;shots=0;hits=0;playerHealth=100;armor=75;gameTime=0;weaponIndex=0;ammo=weaponDefs.map(w=>w.mag);reserves=weaponDefs.map(w=>w.reserve);aiming=false;fireHeld=false;state='game';
 ui.lobby.classList.add('hidden');ui.modal.classList.add('hidden');ui.result.classList.add('hidden');ui.hud.classList.remove('hidden');ui.death.classList.add('hidden');$('#hudMode').textContent=`${mode}v${mode}`;
 addArena();buildGun();spawnEnemies();player.pos.set(0,0,15);player.vel.set(0,0,0);player.yaw=0;player.pitch=0;player.onGround=true;camera.rotation.set(0,0,0);updateGun();updateHud();
 showToast(`${mode}v${mode} · ELIMINA 5 OBJETIVOS`);
 // Pointer lock is requested by the first deliberate canvas click, not the mode-selection click.
}
function returnToLobby(){state='lobby';aiming=false;fireHeld=false;ui.hud.classList.add('hidden');ui.result.classList.add('hidden');ui.death.classList.add('hidden');ui.lobby.classList.remove('hidden');if(document.pointerLockElement)document.exitPointerLock();addLobby();}
function finishMatch(){state='result';fireHeld=false;ui.result.classList.remove('hidden');$('#resultTitle').textContent=score>=matchTarget?'VICTORIA':'DERROTA';$('#resultSub').textContent=score>=matchTarget?'La arena es tuya.':'El equipo rojo domina esta ronda.';$('#resultKills').textContent=kills;$('#resultAccuracy').textContent=`${shots?Math.round(hits/shots*100):0}%`;$('#resultMode').textContent=`${chosenMode}v${chosenMode}`;if(document.pointerLockElement)document.exitPointerLock();}
function isTouchDevice(){return matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;}
function direction(){return new THREE.Vector3(Math.sin(player.yaw)*Math.cos(player.pitch),Math.sin(player.pitch),-Math.cos(player.yaw)*Math.cos(player.pitch)).normalize();}
function hitMarker(){const el=$('#hitMarker');el.classList.add('show');clearTimeout(hitMarker.timer);hitMarker.timer=setTimeout(()=>el.classList.remove('show'),110);}
function shoot(){
 if(state!=='game'||performance.now()<reloadUntil||performance.now()-lastShot<weaponDefs[weaponIndex].rate)return;
 const d=weaponDefs[weaponIndex];if(ammo[weaponIndex]<=0){startReload();return;}
 lastShot=performance.now();ammo[weaponIndex]--;shots++;updateAmmo();gunGroup.position.z=-.52;muzzle.intensity=4;setTimeout(()=>{muzzle.intensity=0;},55);
 const pellets=d.pellets||1;let hitAny=false;
 for(let i=0;i<pellets;i++){
  const dir=direction();dir.x+=(Math.random()-.5)*d.spread;dir.y+=(Math.random()-.5)*d.spread;dir.z+=(Math.random()-.5)*d.spread;dir.normalize();
  raycaster.set(camera.position,dir);raycaster.far=75;
  const enemyMeshes=[];for(const e of enemies)if(e.alive)e.group.traverse(o=>{if(o.isMesh&&!o.userData.bar&&!o.userData.healthBar)enemyMeshes.push(o);});
  const hitsNow=raycaster.intersectObjects([...world.children.filter(o=>o.isMesh),...enemyMeshes],true);
  let hitEnemy=null;
  for(const hit of hitsNow){let owner=hit.object.userData.owner;if(owner){hitEnemy=enemies.find(e=>e.group===owner);break;}if(hit.object.userData.enemy){hitEnemy=enemies.find(e=>e.group===hit.object.parent);if(hitEnemy)break;}if(hit.object.userData.bar||hit.object.userData.healthBar)continue;break;}
  if(hitEnemy){hitEnemy.health-=d.damage;hits++;hitAny=true;if(hitEnemy.health<=0){enemyDeath(hitEnemy);}else{hitEnemy.bar.scale.x=Math.max(.02,.82*hitEnemy.health/hitEnemy.maxHealth);hitEnemy.bar.position.x=-(.82-hitEnemy.bar.scale.x)/2;}}
 }
 if(hitAny){hitMarker();$('.crosshair').classList.add('hit');setTimeout(()=>$('.crosshair').classList.remove('hit'),120);}
}
function damagePlayer(amount){if(state!=='game')return;lastDamageAt=performance.now();const absorbed=Math.min(armor,amount*.65);armor-=absorbed;playerHealth-=amount-absorbed;updateHud();if(playerHealth<=0){playerHealth=0;state='respawning';respawnAt=performance.now()+1900;ui.death.classList.remove('hidden');fireHeld=false;updateHud();}}
function enemyDeath(enemy){enemy.alive=false;enemy.respawnAt=performance.now()+1500;world.remove(enemy.group);score++;kills++;updateHud();showToast('OBJETIVO ELIMINADO  +1');if(score>=matchTarget)finishMatch();}

const moveStick={x:0,y:0,active:false,id:null}, lookState={id:null,x:0,y:0}, gamepadState={jump:false};
let lastDamageAt=0;
function overlapsCover(x,z,r=.38){
 for(const o of obstacles){if(Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r)return true;}
 return false;
}
function movePlayer(dt){
 const gp=navigator.getGamepads?.()[0];let sx=0,sy=0;
 if(keys.has('w')||keys.has('arrowup'))sy-=1;if(keys.has('s')||keys.has('arrowdown'))sy+=1;if(keys.has('a')||keys.has('arrowleft'))sx-=1;if(keys.has('d')||keys.has('arrowright'))sx+=1;
 sx+=moveStick.x;sy+=moveStick.y;
 if(gp){const x=gp.axes?.[0]||0,y=gp.axes?.[1]||0;sx+=Math.abs(x)>.16?x:0;sy+=Math.abs(y)>.16?y:0;}
 const inputLen=Math.hypot(sx,sy);if(inputLen>1){sx/=inputLen;sy/=inputLen;}
 const forward=new THREE.Vector3(Math.sin(player.yaw),0,-Math.cos(player.yaw));const right=new THREE.Vector3(Math.cos(player.yaw),0,Math.sin(player.yaw));
 let speed=aiming?4.1:6.1;if(keys.has('shift'))speed*=1.28;
 const dx=(forward.x*(-sy)+right.x*sx)*speed*dt,dz=(forward.z*(-sy)+right.z*sx)*speed*dt;
 const nx=THREE.MathUtils.clamp(player.pos.x+dx,-22.3,22.3),nz=THREE.MathUtils.clamp(player.pos.z+dz,-19.2,19.2);
 if(!overlapsCover(nx,player.pos.z))player.pos.x=nx;
 if(!overlapsCover(player.pos.x,nz))player.pos.z=nz;
 const jumpPressed=keys.has(' ')||(gp?.buttons?.[0]?.pressed&&!gamepadState.jump);gamepadState.jump=!!gp?.buttons?.[0]?.pressed;
 if(jumpPressed&&player.onGround&&state==='game'){player.vel.y=5.1;player.onGround=false;}
 player.vel.y-=13.5*dt;player.pos.y+=player.vel.y*dt;if(player.pos.y<0){player.pos.y=0;player.vel.y=0;player.onGround=true;}
 camera.position.set(player.pos.x,player.pos.y+1.67,player.pos.z);camera.rotation.order='YXZ';camera.rotation.set(player.pitch,player.yaw,0);
 if(gp){const rx=gp.axes?.[2]||0,ry=gp.axes?.[3]||0;if(Math.abs(rx)>.12)player.yaw-=rx*dt*2.35;if(Math.abs(ry)>.12)player.pitch=THREE.MathUtils.clamp(player.pitch+ry*dt*1.9,-1.25,1.25);
  aiming=!!(gp.buttons?.[6]?.pressed||gp.buttons?.[6]?.value>.25);
  fireHeld=!!(gp.buttons?.[7]?.pressed||gp.buttons?.[7]?.value>.25);
  const pressed=(i)=>!!gp.buttons?.[i]?.pressed;
  if(pressed(12)&&!gamepadState[12])setWeapon(0);if(pressed(13)&&!gamepadState[13])setWeapon(1);if(pressed(14)&&!gamepadState[14])setWeapon(2);if(pressed(15)&&!gamepadState[15])setWeapon(3);
  if(pressed(9)&&!gamepadState[9])returnToLobby();
  for(const i of [9,12,13,14,15])gamepadState[i]=pressed(i);
 }
 $('.crosshair').classList.toggle('aiming',aiming);camera.fov=THREE.MathUtils.damp(camera.fov,aiming?48:68,10,dt);camera.updateProjectionMatrix();
}
function updateEnemies(dt,now){
 for(const e of enemies){
  if(!e.alive){if(now>=e.respawnAt&&state==='game'){e.health=e.maxHealth;e.bar.scale.x=.82;e.bar.position.x=0;e.alive=true;const lane=(e.index-(chosenMode-1)/2)*3.2;e.group.position.set(lane+(Math.random()-.5)*1.3,0,-13-Math.random()*4);world.add(e.group);}continue;}
  const g=e.group,dx=player.pos.x-g.position.x,dz=player.pos.z-g.position.z,dist=Math.hypot(dx,dz);
  if(dist>5.6){const nx=g.position.x+dx/dist*e.moveSpeed*dt,nz=g.position.z+dz/dist*e.moveSpeed*dt;if(!overlapsCover(nx,g.position.z,.48))g.position.x=nx;if(!overlapsCover(g.position.x,nz,.48))g.position.z=nz;}
  g.rotation.y=Math.atan2(-dx,-dz);
  const wobble=Math.sin(now*.004+e.index*2)*.025;g.position.y=wobble;
  if(dist<22&&now>e.attackAt){
   e.attackAt=now+850+Math.random()*800;const eye=new THREE.Vector3(g.position.x,g.position.y+1.45,g.position.z);const toPlayer=new THREE.Vector3(camera.position.x-eye.x,camera.position.y-eye.y,camera.position.z-eye.z);const len=toPlayer.length();toPlayer.normalize();raycaster.set(eye,toPlayer);raycaster.far=len;
   const coverMeshes=obstacles.map(o=>o.mesh);const wallHit=raycaster.intersectObjects(coverMeshes,false)[0];
   if(!wallHit){const chance=THREE.MathUtils.clamp(1.05-dist/35,.26,.78);if(Math.random()<chance){damagePlayer(7+Math.random()*6);if(state==='game')showToast('RECIBIENDO FUEGO');}}
  }
 }
}
function updateGame(dt,now){
 gameTime+=dt;movePlayer(dt);if(fireHeld)shoot();updateEnemies(dt,now);
 if(state==='respawning'&&now>=respawnAt){state='game';playerHealth=100;armor=Math.max(35,armor);player.pos.set((Math.random()-.5)*7,0,14);player.vel.set(0,0,0);player.yaw=0;player.pitch=0;ui.death.classList.add('hidden');showToast('REAPARECISTE');updateHud();}
 if(playerHealth<100&&now-lastDamageAt>5000&&state==='game'){playerHealth=Math.min(100,playerHealth+dt*4);armor=Math.min(75,armor+dt*2);updateHud();}
 if(gunGroup){gunGroup.position.y=THREE.MathUtils.damp(gunGroup.position.y,-.29+Math.sin(now*.012)*.004,8,dt);gunGroup.position.x=THREE.MathUtils.damp(gunGroup.position.x,aiming?.16:.34,8,dt);}
}
function updateLobby(dt,now){
 camera.position.x=Math.sin(now*.00014)*.45;camera.position.y=5.9+Math.sin(now*.00035)*.12;camera.lookAt(0,2.1,-1);
 if(world.userData.dust)world.userData.dust.rotation.y=now*.000025;
 for(const card of document.querySelectorAll('.mode-card'))card.classList.toggle('selected',Number(card.dataset.mode)===chosenMode&&state==='lobby'&&card.matches(':focus'));
}

function chooseMode(mode){chosenMode=mode;startGame(mode);}
function openControls(){ui.modal.classList.remove('hidden');}
function closeControls(){ui.modal.classList.add('hidden');}
function pointerLook(dx,dy){player.yaw-=dx*.0028;player.pitch=THREE.MathUtils.clamp(player.pitch-dy*.0025,-1.25,1.25);}

for(const card of document.querySelectorAll('.mode-card')){
 card.addEventListener('click',()=>chooseMode(Number(card.dataset.mode)));
 card.addEventListener('focus',()=>{chosenMode=Number(card.dataset.mode);});
 card.addEventListener('keydown',(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();chooseMode(Number(card.dataset.mode));}});
}
$('#controlsOpen').addEventListener('click',openControls);
$('#controlsClose').addEventListener('click',closeControls);
ui.modal.addEventListener('click',(event)=>{if(event.target===ui.modal)closeControls();});
$('#exitBtn').addEventListener('click',returnToLobby);
$('#rematchBtn').addEventListener('click',returnToLobby);
$('#soundBtn').addEventListener('click',(event)=>{soundOn=!soundOn;event.currentTarget.classList.toggle('active',soundOn);event.currentTarget.setAttribute('aria-label',soundOn?'Sonido activado':'Sonido desactivado');});

window.addEventListener('keydown',(event)=>{
 const key=event.key.toLowerCase();
 if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key))event.preventDefault();
 keys.add(key);
 if(key==='escape'){
  if(!ui.modal.classList.contains('hidden'))closeControls();
  else if(state==='game'||state==='respawning')returnToLobby();
 }
 if(key==='r')startReload();
 if(key>='1'&&key<='4')setWeapon(Number(key)-1);
});
window.addEventListener('keyup',(event)=>{keys.delete(event.key.toLowerCase());});
window.addEventListener('blur',()=>{keys.clear();fireHeld=false;aiming=false;});
window.addEventListener('mousemove',(event)=>{if(state==='game'&&document.pointerLockElement===ui.canvas)pointerLook(event.movementX,event.movementY);});
ui.canvas.addEventListener('click',(event)=>{
 if(state==='lobby'){
  const rect=ui.canvas.getBoundingClientRect();const mouse=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
  raycaster.setFromCamera(mouse,camera);const hit=raycaster.intersectObjects(lobbyPickables,false)[0];if(hit?.object.userData.mode)chooseMode(hit.object.userData.mode);
 }else if(state==='game'&&!isTouchDevice()&&!document.pointerLockElement&&ui.canvas.requestPointerLock){ui.canvas.requestPointerLock();}
});
ui.canvas.addEventListener('pointerdown',(event)=>{if(state!=='game'||isTouchDevice())return;if(event.button===0)fireHeld=true;if(event.button===2)aiming=true;});
window.addEventListener('pointerup',(event)=>{if(event.button===0)fireHeld=false;if(event.button===2)aiming=false;});
ui.canvas.addEventListener('contextmenu',(event)=>event.preventDefault());

const stickEl=$('#moveStick');
function capturePointer(element,event){try{if(element.setPointerCapture)element.setPointerCapture(event.pointerId);}catch{}}
 function updateStick(event){const rect=stickEl.getBoundingClientRect(),radius=Math.max(24,rect.width*.31),dx=event.clientX-(rect.left+rect.width/2),dy=event.clientY-(rect.top+rect.height/2),len=Math.hypot(dx,dy),scale=len>radius?radius/len:1;moveStick.x=dx*scale/radius;moveStick.y=dy*scale/radius;const dot=stickEl.querySelector('.stick-dot');dot.style.left=`${50+moveStick.x*35}%`;dot.style.top=`${50+moveStick.y*35}%`;}
stickEl.addEventListener('pointerdown',(event)=>{event.preventDefault();if(moveStick.active)return;moveStick.active=true;moveStick.id=event.pointerId;capturePointer(stickEl,event);updateStick(event);});
window.addEventListener('pointermove',(event)=>{if(moveStick.active&&event.pointerId===moveStick.id)updateStick(event);});
function releaseStick(event){if(event&&event.pointerId!==moveStick.id)return;moveStick.active=false;moveStick.id=null;moveStick.x=0;moveStick.y=0;const dot=stickEl.querySelector('.stick-dot');dot.style.left='50%';dot.style.top='50%';}
window.addEventListener('pointerup',releaseStick);window.addEventListener('pointercancel',releaseStick);
const lookZone=$('#lookZone');
lookZone.addEventListener('pointerdown',(event)=>{if(state!=='game'||lookState.id!==null)return;event.preventDefault();lookState.id=event.pointerId;lookState.x=event.clientX;lookState.y=event.clientY;capturePointer(lookZone,event);});
window.addEventListener('pointermove',(event)=>{if(event.pointerId!==lookState.id)return;pointerLook(event.clientX-lookState.x,event.clientY-lookState.y);lookState.x=event.clientX;lookState.y=event.clientY;});
function stopLook(event){if(event.pointerId===lookState.id)lookState.id=null;}
window.addEventListener('pointerup',stopLook);window.addEventListener('pointercancel',stopLook);
$('#touchAim').addEventListener('pointerdown',(event)=>{event.preventDefault();aiming=true;});
$('#touchAim').addEventListener('pointerup',()=>{aiming=false;});$('#touchAim').addEventListener('pointercancel',()=>{aiming=false;});
$('#touchJump').addEventListener('pointerdown',(event)=>{event.preventDefault();if(state==='game'&&player.onGround){player.vel.y=5.1;player.onGround=false;}});
$('#touchShoot').addEventListener('pointerdown',(event)=>{event.preventDefault();fireHeld=true;});
$('#touchShoot').addEventListener('pointerup',()=>{fireHeld=false;});$('#touchShoot').addEventListener('pointercancel',()=>{fireHeld=false;});

window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.setSize(innerWidth,innerHeight);});
addLobby();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),now=performance.now();if(state==='game'||state==='respawning')updateGame(dt,now);else if(state==='lobby')updateLobby(dt,now);renderer.render(scene,camera);}
animate();
