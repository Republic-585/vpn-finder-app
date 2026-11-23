import * as THREE from "https://esm.sh/three@0.170.0";
import { RoundedBoxGeometry } from "https://esm.sh/three@0.170.0/examples/jsm/geometries/RoundedBoxGeometry.js";
(() => {
const screen=document.getElementById("screen-owner-promo"), host=document.getElementById("owner-gift-canvas");
if(!screen||!host)return;
const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(32,1,.1,50);
camera.position.set(4.2,3.1,5.7); camera.lookAt(0,1.4,0);
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6)); renderer.setSize(host.clientWidth||360,host.clientHeight||330,false);
renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.15;
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; host.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xc9e4ff,0x10234a,2.1));
const key=new THREE.DirectionalLight(0xffffff,4.2); key.position.set(-3.8,7,5); key.castShadow=true; key.shadow.mapSize.set(1024,1024); scene.add(key);
const rim=new THREE.PointLight(0x4b9dff,38,12,2); rim.position.set(3.5,3.4,-2.8); scene.add(rim);
const glow=new THREE.PointLight(0xffc64d,0,7,2); glow.position.set(0,2.2,1.5); scene.add(glow);
const blue=new THREE.MeshPhysicalMaterial({color:0x1262cf,metalness:.22,roughness:.19,clearcoat:1,clearcoatRoughness:.12});
const side=new THREE.MeshPhysicalMaterial({color:0x07347e,metalness:.28,roughness:.24,clearcoat:.9});
const lidMat=new THREE.MeshPhysicalMaterial({color:0x287fe5,metalness:.2,roughness:.16,clearcoat:1});
const gold=new THREE.MeshPhysicalMaterial({color:0xf5b82e,metalness:.92,roughness:.2,clearcoat:1});
const goldHi=new THREE.MeshPhysicalMaterial({color:0xffdf79,metalness:.84,roughness:.16,clearcoat:1});
const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.ShadowMaterial({opacity:.22})); floor.rotation.x=-Math.PI/2; floor.position.y=-.04; floor.receiveShadow=true; scene.add(floor);
const gift=new THREE.Group(); scene.add(gift);
const body=new THREE.Mesh(new RoundedBoxGeometry(2.72,1.78,1.96,7,.12),blue); body.position.y=.91; body.castShadow=true; body.receiveShadow=true; gift.add(body);
const front=new THREE.Mesh(new RoundedBoxGeometry(.38,1.8,.04,4,.018),gold); front.position.set(0,.91,1); gift.add(front);
const sideRibbon=new THREE.Mesh(new RoundedBoxGeometry(.04,1.8,.38,4,.018),gold); sideRibbon.position.set(1.37,.91,0); gift.add(sideRibbon);
const topRibbon=new THREE.Mesh(new RoundedBoxGeometry(.38,.04,1.99,4,.018),goldHi); topRibbon.position.set(0,1.81,0); gift.add(topRibbon);
const hinge=new THREE.Group(); hinge.position.set(0,1.83,-.91); gift.add(hinge);
const lid=new THREE.Mesh(new RoundedBoxGeometry(2.98,.38,2.18,7,.105),lidMat); lid.position.set(0,.19,.91); lid.castShadow=true; hinge.add(lid);
const lidRibbon=new THREE.Mesh(new RoundedBoxGeometry(.4,.4,2.19,5,.025),gold); lidRibbon.position.set(0,.19,.91); hinge.add(lidRibbon);
const bow=new THREE.Group(); bow.position.set(0,.43,.92); hinge.add(bow);
function loop(sideSign){const pts=[[0,0,0],[sideSign*.2,.18,.02],[sideSign*.55,.34,.03],[sideSign*.88,.25,.02],[sideSign*.84,.02,0],[sideSign*.45,-.03,-.02]];const curve=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)),true,"catmullrom",.45);const m=new THREE.Mesh(new THREE.TubeGeometry(curve,56,.105,12,true),goldHi);m.castShadow=true;bow.add(m);}
loop(1); loop(-1);
const knot=new THREE.Mesh(new RoundedBoxGeometry(.39,.3,.3,6,.11),gold); knot.position.set(0,.01,.11); bow.add(knot);
const tailShape=new THREE.Shape(); tailShape.moveTo(-.12,.08);tailShape.bezierCurveTo(-.25,-.16,-.4,-.48,-.38,-.68);tailShape.lineTo(-.12,-.56);tailShape.lineTo(.05,-.72);tailShape.bezierCurveTo(.12,-.43,.1,-.14,.12,.08);tailShape.closePath();
const tailGeo=new THREE.ExtrudeGeometry(tailShape,{depth:.055,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.035,bevelThickness:.035});
const tail=new THREE.Mesh(tailGeo,gold);tail.position.set(-.38,-.05,-.03);tail.castShadow=true;bow.add(tail);
const tail2=new THREE.Mesh(tailGeo,goldHi);tail2.position.set(.38,-.05,-.03);tail2.rotation.y=Math.PI;tail2.castShadow=true;bow.add(tail2);
const token=new THREE.Group();gift.add(token);token.position.set(0,1.32,.12);token.scale.setScalar(.001);
const coin=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,.13,64),gold);coin.rotation.x=Math.PI/2;coin.castShadow=true;token.add(coin);
const face=new THREE.Mesh(new THREE.CircleGeometry(.405,64),new THREE.MeshPhysicalMaterial({color:0x0d4caa,metalness:.42,roughness:.22,clearcoat:1}));face.position.z=.071;token.add(face);
const shieldShape=new THREE.Shape();shieldShape.moveTo(0,.29);shieldShape.quadraticCurveTo(.2,.2,.27,.17);shieldShape.lineTo(.25,-.08);shieldShape.quadraticCurveTo(.2,-.28,0,-.37);shieldShape.quadraticCurveTo(-.2,-.28,-.25,-.08);shieldShape.lineTo(-.27,.17);shieldShape.quadraticCurveTo(-.2,.2,0,.29);
const shield=new THREE.Mesh(new THREE.ExtrudeGeometry(shieldShape,{depth:.035,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.018,bevelThickness:.018}),goldHi);shield.position.z=.09;token.add(shield);
const sparks=new THREE.Group();scene.add(sparks);const sparkMat=new THREE.MeshBasicMaterial({color:0xffd56a});
for(let i=0;i<18;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(.02,8,8),sparkMat);const a=i*2.399;s.position.set(Math.cos(a)*(1.8+(i%4)*.2),.6+(i%6)*.42,Math.sin(a)*(1.6+(i%3)*.2));s.userData.p=i*.7;sparks.add(s);}
let active=false,raf=0,opened=false,startAt=0;
const ease=t=>1-Math.pow(1-t,3);
function begin(){opened=false;startAt=performance.now();active=true;if(!raf)raf=requestAnimationFrame(draw);}
function draw(now){raf=0;if(!active)return;const t=(now-startAt)/1000,arrival=ease(Math.min(1,t/.82));
gift.position.y=-.28*(1-arrival)+Math.sin(t*1.25)*.025*arrival;gift.rotation.y=-.2+Math.sin(t*.62)*.055;gift.rotation.z=Math.sin(t*.9)*.012;
const lt=Math.max(0,Math.min(1,(t-.8)/1.08));hinge.rotation.x=-1.95*ease(lt)+(lt>0?Math.sin(lt*Math.PI)*-.11:0);
const rt=ease(Math.max(0,Math.min(1,(t-1.28)/.92)));token.scale.setScalar(rt);token.position.y=1.2+rt*1.28;token.rotation.y=t*1.1;glow.intensity=rt*34;
sparks.visible=t>1.05;sparks.children.forEach(s=>s.scale.setScalar(.55+.45*Math.abs(Math.sin(t*2+s.userData.p))));
renderer.render(scene,camera);raf=requestAnimationFrame(draw);if(t>7)opened=true;}
function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}
new ResizeObserver(resize).observe(host);
new IntersectionObserver(entries=>{const visible=entries.some(e=>e.isIntersecting);active=visible&&screen.classList.contains("active");if(active&&!raf){if(!opened)begin();else raf=requestAnimationFrame(draw);}if(!active&&raf){cancelAnimationFrame(raf);raf=0;}},{threshold:.05}).observe(screen);
new MutationObserver(()=>{if(screen.classList.contains("active"))begin();else{active=false;if(raf)cancelAnimationFrame(raf);raf=0;}}).observe(screen,{attributes:true,attributeFilter:["class"]});
document.addEventListener("visibilitychange",()=>{if(document.hidden){active=false;if(raf)cancelAnimationFrame(raf);raf=0;}else if(screen.classList.contains("active"))begin();});
resize();renderer.render(scene,camera);
})();