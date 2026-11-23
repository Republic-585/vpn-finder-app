import * as THREE from "https://esm.sh/three@0.170.0";
import { RoundedBoxGeometry } from "https://esm.sh/three@0.170.0/examples/jsm/geometries/RoundedBoxGeometry.js";

(() => {
  const screen = document.getElementById("screen-owner-promo");
  const host = document.getElementById("owner-gift-canvas");
  if (!screen || !host || host.dataset.ready === "1") return;
  host.dataset.ready = "1";

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 60);
  camera.position.set(4.8, 3.35, 6.8);
  camera.lookAt(0, 1.38, 0);

  const renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true, powerPreference:"high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xdceaff, 0x18213b, 1.8));
  const key = new THREE.DirectionalLight(0xffffff, 4.4);
  key.position.set(-4, 7, 5); key.castShadow = true;
  key.shadow.mapSize.set(1536,1536);
  key.shadow.camera.left=-5; key.shadow.camera.right=5; key.shadow.camera.top=6; key.shadow.camera.bottom=-4;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x82baff, 2.2); fill.position.set(4,3,3); scene.add(fill);
  const rim = new THREE.PointLight(0x78baff, 24, 11, 2); rim.position.set(2.8,3.2,-3); scene.add(rim);
  const goldLight = new THREE.PointLight(0xffc65a, 0, 8, 2); goldLight.position.set(0,2.1,1); scene.add(goldLight);

  const blue = new THREE.MeshPhysicalMaterial({color:0x075fc8,metalness:.22,roughness:.16,clearcoat:1,clearcoatRoughness:.055});
  const blueTop = new THREE.MeshPhysicalMaterial({color:0x1679e8,metalness:.18,roughness:.14,clearcoat:1,clearcoatRoughness:.045});
  const blueSide = new THREE.MeshPhysicalMaterial({color:0x06469d,metalness:.3,roughness:.2,clearcoat:1});
  const inside = new THREE.MeshPhysicalMaterial({color:0x062d67,metalness:.12,roughness:.28});
  const gold = new THREE.MeshPhysicalMaterial({color:0xe9a91d,metalness:.94,roughness:.17,clearcoat:1});
  const goldBright = new THREE.MeshPhysicalMaterial({color:0xffd45b,metalness:.88,roughness:.13,clearcoat:1});
  const goldShadow = new THREE.MeshPhysicalMaterial({color:0x9b5b0a,metalness:.86,roughness:.22});
  const tokenFace = new THREE.MeshPhysicalMaterial({color:0xffc83e,metalness:.82,roughness:.16,clearcoat:1});
  const tokenInset = new THREE.MeshPhysicalMaterial({color:0x0b55ad,metalness:.45,roughness:.18,clearcoat:1});

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.ShadowMaterial({opacity:.22}));
  floor.rotation.x=-Math.PI/2; floor.position.y=-.05; floor.receiveShadow=true; scene.add(floor);

  const gift = new THREE.Group(); scene.add(gift);
  const body = new THREE.Group(); gift.add(body);
  function rounded(parent,w,h,d,mat,pos,r=.07) {
    const m=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,7,r),mat);
    m.position.set(...pos); m.castShadow=true; m.receiveShadow=true; parent.add(m); return m;
  }
  // Main rigid box: softly bevelled corners and a visible recessed inner cavity.
  rounded(body,2.72,1.62,2.02,blue,[0,.88,0],.12);
  rounded(body,2.48,.045,1.78,inside,[0,1.715,0],.045);
  // Front and side wrapping bands continue around the box, like real satin ribbon.
  rounded(body,.39,1.64,.035,goldBright,[0,.88,1.025],.018);
  rounded(body,.035,1.64,.39,gold,[1.375,.88,0],.018);
  rounded(body,.035,1.64,.39,goldShadow,[-1.375,.88,0],.018);
  rounded(body,.39,.035,2.02,goldBright,[0,1.695,0],.015);
  // Small metallic seam around the bottom edge.
  rounded(body,2.69,.045,.035,blueSide,[0,.105,1.01],.012);

  // Hinged, thick lid with a real pivot at the rear edge.
  const lidPivot=new THREE.Group(); lidPivot.position.set(0,1.68,-.94); gift.add(lidPivot);
  rounded(lidPivot,2.88,.32,2.14,blueTop,[0,.16,1.02],.105);
  rounded(lidPivot,.405,.045,2.04,goldBright,[0,.337,1.02],.018);
  rounded(lidPivot,.405,.29,.045,gold,[0,.16,2.095],.018);
  rounded(lidPivot,2.8,.045,.045,blueSide,[0,.025,1.02],.014);

  // Sculpted satin bow. Broad curved ribbon strips are extruded into volume, not wire loops.
  const bow=new THREE.Group(); bow.position.set(0,.43,1.02); lidPivot.add(bow);
  function ribbonLoop(side) {
    const s=side;
    const shape=new THREE.Shape();
    shape.moveTo(0,0);
    shape.bezierCurveTo(s*.22,.32,s*.72,.48,s*.92,.27);
    shape.bezierCurveTo(s*1.08,.08,s*.82,-.13,s*.57,-.10);
    shape.bezierCurveTo(s*.34,-.08,s*.18,.06,0,0);
    const geo=new THREE.ExtrudeGeometry(shape,{depth:.105,bevelEnabled:true,bevelSegments:4,steps:1,bevelSize:.035,bevelThickness:.035,curveSegments:18});
    const mesh=new THREE.Mesh(geo,goldBright);
    mesh.position.z=.04; mesh.castShadow=true; mesh.receiveShadow=true;
    mesh.rotation.y=side===1?-.08:.08; bow.add(mesh);
    // Highlighted fold on the upper satin surface.
    const fold=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(s*.12,.035,.16),new THREE.Vector3(s*.36,.20,.16),new THREE.Vector3(s*.66,.29,.16),new THREE.Vector3(s*.83,.23,.16)
    ]),28,.012,8,false),new THREE.MeshBasicMaterial({color:0xfff0ae}));
    bow.add(fold);
  }
  ribbonLoop(1); ribbonLoop(-1);
  const knot=rounded(bow,.34,.27,.31,gold,[0,.06,.13],.085);
  const tail1=rounded(bow,.19,.54,.09,goldBright,[-.18,-.28,.01],.035); tail1.rotation.z=-.28;
  const tail2=rounded(bow,.19,.54,.09,gold,[.18,-.28,.01],.035); tail2.rotation.z=.28;

  // Golden VPN medallion with concentric milled rim and raised blue insignia.
  const token=new THREE.Group(); gift.add(token);
  token.position.set(0,1.34,.1); token.scale.setScalar(.001);
  const coin=new THREE.Mesh(new THREE.CylinderGeometry(.59,.59,.17,96),gold); coin.rotation.x=Math.PI/2; coin.castShadow=true; token.add(coin);
  const face=new THREE.Mesh(new THREE.CircleGeometry(.535,96),tokenFace); face.position.z=.09; token.add(face);
  const innerRing=new THREE.Mesh(new THREE.RingGeometry(.465,.49,96),goldBright); innerRing.position.z=.102; token.add(innerRing);
  const shield=new THREE.Shape();
  shield.moveTo(0,.34); shield.quadraticCurveTo(.2,.25,.31,.2); shield.lineTo(.28,-.1);
  shield.quadraticCurveTo(.22,-.34,0,-.43); shield.quadraticCurveTo(-.22,-.34,-.28,-.1);
  shield.lineTo(-.31,.2); shield.quadraticCurveTo(-.2,.25,0,.34);
  const shieldMesh=new THREE.Mesh(new ExtrudeGeometry(shield,{depth:.06,bevelEnabled:true,bevelSegments:4,steps:1,bevelSize:.025,bevelThickness:.025}),tokenInset);
  shieldMesh.position.z=.112; shieldMesh.castShadow=true; token.add(shieldMesh);
  const glyphMat=new THREE.MeshPhysicalMaterial({color:0xffe28a,metalness:.72,roughness:.18});
  const slash1=rounded(token,.075,.37,.045,glyphMat,[-.095,-.015,.19],.025); slash1.rotation.z=-.48;
  const slash2=rounded(token,.075,.37,.045,glyphMat,[.095,-.015,.19],.025); slash2.rotation.z=.48;

  // Fine sparks, plus a few larger four-point glints.
  const particles=new THREE.Group(); scene.add(particles);
  const particleMat=new THREE.MeshBasicMaterial({color:0xffd66d});
  const sparkData=[];
  for(let i=0;i<34;i++){
    const size=i%6===0?.035:.014+(i%3)*.006;
    const p=new THREE.Mesh(new THREE.SphereGeometry(size,10,10),particleMat);
    const a=i*2.399, radius=1.35+(i%5)*.22;
    p.position.set(Math.cos(a)*radius,.5+(i%8)*.31,Math.sin(a)*radius);
    p.userData={phase:i*.63,base:p.position.clone()}; particles.add(p); sparkData.push(p);
  }
  const glints=new THREE.Group(); scene.add(glints);
  for(let i=0;i<5;i++){
    const g=new THREE.Mesh(new THREE.OctahedronGeometry(.055,0),goldBright);
    const a=i*2.4; g.position.set(Math.cos(a)*1.7,1.1+(i%3)*.6,Math.sin(a)*1.55); glints.add(g);
  }

  let active=false,raf=0,completed=false,startAt=0;
  const ease=t=>1-Math.pow(1-t,3);
  function start() {
    startAt=performance.now(); completed=false; active=true;
    if(!raf) raf=requestAnimationFrame(renderFrame);
  }
  function renderFrame(now) {
    raf=0; if(!active) return;
    const t=(now-startAt)/1000;
    const arrival=ease(Math.min(1,t/.9));
    gift.position.y=-.3*(1-arrival)+Math.sin(t*1.25)*.026*arrival;
    gift.rotation.y=-.18+Math.sin(t*.55)*.045;
    gift.rotation.z=Math.sin(t*.8)*.009;
    const open=ease(Math.max(0,Math.min(1,(t-.82)/1.08)));
    lidPivot.rotation.x=-2.02*open + (open>0?Math.sin(open*Math.PI)*-.10:0);
    const rise=ease(Math.max(0,Math.min(1,(t-1.38)/.95)));
    token.scale.setScalar(rise);
    token.position.y=1.22+rise*1.52;
    token.rotation.set(-.12, t*1.15, -.12);
    goldLight.intensity=rise*38;
    particles.visible=t>1.12;
    sparkData.forEach((p,i)=>{
      const phase=t*2.4+p.userData.phase;
      p.scale.setScalar(.35+.85*Math.max(0,Math.sin(phase)));
      p.position.y=p.userData.base.y+Math.sin(phase*.7)*.14;
    });
    glints.rotation.y=-t*.18;
    glints.children.forEach((g,i)=>{g.scale.setScalar(.55+.65*Math.abs(Math.sin(t*2+i)));g.rotation.x=t*(.6+i*.08);});
    renderer.render(scene,camera);
    if(t>7.5) completed=true;
    raf=requestAnimationFrame(renderFrame);
  }
  function resize(){
    const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
    camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h,false);
  }
  const resizeObserver=new ResizeObserver(resize); resizeObserver.observe(host);
  const intersection=new IntersectionObserver(entries=>{
    const visible=entries.some(e=>e.isIntersecting);
    if(visible&&screen.classList.contains("active")){if(!active){if(completed)start();else start();}}
    else {active=false;if(raf){cancelAnimationFrame(raf);raf=0;}}
  },{threshold:.05});
  intersection.observe(screen);
  const mutation=new MutationObserver(()=>{
    if(screen.classList.contains("active")) start();
    else {active=false;if(raf){cancelAnimationFrame(raf);raf=0;}}
  });
  mutation.observe(screen,{attributes:true,attributeFilter:["class"]});
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden){active=false;if(raf){cancelAnimationFrame(raf);raf=0;}}
    else if(screen.classList.contains("active")) start();
  });
  resize(); renderer.render(scene,camera);
})();