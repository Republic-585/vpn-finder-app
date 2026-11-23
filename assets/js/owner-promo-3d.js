(() => {
  const screen = document.getElementById("screen-owner-promo");
  const host = document.getElementById("owner-gift-canvas");
  const stage = document.getElementById("owner-gift-stage");
  if (!screen || !host || !stage || host.dataset.webglInit === "1") return;
  host.dataset.webglInit = "1";

  const fallback = () => {
    if (host.querySelector("canvas,img")) return;
    const image = document.createElement("img");
    image.className = "gift-reference-image";
    image.src = "./assets/images/glossy-blue-gift-reference.png";
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    image.decoding = "async";
    host.replaceChildren(image);
    host.dataset.ready = "fallback";
  };
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = n => Math.max(0, Math.min(1, n));
  const out = n => 1 - Math.pow(1 - clamp(n), 3);
  const smooth = n => { n = clamp(n); return n * n * (3 - 2 * n); };

  import("https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js").then(THREE => {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true, powerPreference:"high-performance" });
    } catch (error) {
      console.warn("[VPN Finder] WebGL unavailable; showing approved gift artwork.", error);
      fallback(); return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.8));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-hidden","true");
    renderer.domElement.tabIndex = -1;
    host.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34,1,.1,60);
    camera.position.set(4.25,3.05,5.7);
    camera.lookAt(0,1.15,0);

    const blue = new THREE.MeshPhysicalMaterial({color:0x0879ef,metalness:.2,roughness:.19,clearcoat:1,clearcoatRoughness:.12});
    const blueDark = new THREE.MeshPhysicalMaterial({color:0x0751ad,metalness:.18,roughness:.27,clearcoat:.85});
    const gold = new THREE.MeshPhysicalMaterial({color:0xf4bd3b,metalness:.9,roughness:.2,clearcoat:1});
    const goldLight = new THREE.MeshPhysicalMaterial({color:0xffe18a,metalness:.92,roughness:.16,clearcoat:1});
    const innerMat = new THREE.MeshStandardMaterial({color:0x08234b,roughness:.7,metalness:.1});

    function roundedBox(w,h,d,r,mat) {
      const s = new THREE.Shape(), x=-w/2, y=-d/2, q=Math.min(r,w/2,d/2);
      s.moveTo(x+q,y); s.lineTo(x+w-q,y); s.quadraticCurveTo(x+w,y,x+w,y+q);
      s.lineTo(x+w,y+d-q); s.quadraticCurveTo(x+w,y+d,x+w-q,y+d);
      s.lineTo(x+q,y+d); s.quadraticCurveTo(x,y+d,x,y+d-q);
      s.lineTo(x,y+q); s.quadraticCurveTo(x,y,x+q,y);
      const g = new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:true,bevelSegments:4,steps:1,bevelSize:.025,bevelThickness:.025,curveSegments:8});
      g.rotateX(-Math.PI/2); g.translate(0,-h/2,0); g.computeVertexNormals();
      return new THREE.Mesh(g,mat);
    }
    function bar(parent,w,h,d,mat,pos,rot=[0,0,0]) {
      const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
      m.position.set(...pos); m.rotation.set(...rot); m.castShadow=true; m.receiveShadow=true; parent.add(m); return m;
    }

    const key=new THREE.DirectionalLight(0xffffff,4.2);
    key.position.set(-3.8,6.5,5); key.castShadow=true; key.shadow.mapSize.set(1024,1024);
    key.shadow.camera.left=-5; key.shadow.camera.right=5; key.shadow.camera.top=5; key.shadow.camera.bottom=-5; scene.add(key);
    const fill=new THREE.DirectionalLight(0x8fc5ff,2.2); fill.position.set(4,3.2,-4); scene.add(fill);
    const rim=new THREE.PointLight(0xffd36c,32,8,2); rim.position.set(-2.2,3.8,-2.4); scene.add(rim);
    scene.add(new THREE.AmbientLight(0xffffff,1.1));

    const ground=new THREE.Mesh(new THREE.CircleGeometry(2.5,64),new THREE.MeshBasicMaterial({color:0x287be6,transparent:true,opacity:.12,depthWrite:false}));
    ground.rotation.x=-Math.PI/2; ground.position.y=-.04; scene.add(ground);
    const shadow=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.ShadowMaterial({opacity:.17}));
    shadow.rotation.x=-Math.PI/2; shadow.position.y=-.05; shadow.receiveShadow=true; scene.add(shadow);

    const box=new THREE.Group(); scene.add(box);
    // Hollow construction: four glossy walls and a deep-blue inner floor.
    const floor=roundedBox(2.48,.16,1.62,.14,blueDark); floor.position.y=.12; floor.castShadow=true; box.add(floor);
    const front=roundedBox(2.55,1.2,.16,.1,blue); front.position.set(0,.76,.78); front.castShadow=true; box.add(front);
    const back=roundedBox(2.55,1.2,.16,.1,blue); back.position.set(0,.76,-.78); back.castShadow=true; box.add(back);
    const left=roundedBox(.16,1.2,1.5,.1,blue); left.position.set(-1.2,.76,0); left.castShadow=true; box.add(left);
    const right=roundedBox(.16,1.2,1.5,.1,blue); right.position.set(1.2,.76,0); right.castShadow=true; box.add(right);
    const inside=roundedBox(2.27,.035,1.39,.1,innerMat); inside.position.set(0,.215,0); box.add(inside);

    // Gold wrapping band around the body, aligned with the bow.
    bar(box,.34,1.22,.055,gold,[0,.76,.875]);
    bar(box,.055,1.22,.34,goldLight,[1.285,.76,0]);
    bar(box,.055,1.22,.34,gold,[-1.285,.76,0]);
    bar(box,2.48,.055,.34,gold,[0,.16,.875]);

    // Hinged lid, pivoted at the rear edge so it opens as one solid object.
    const hinge=new THREE.Group(); hinge.position.set(0,1.39,-.78); box.add(hinge);
    const lid=roundedBox(2.72,.36,1.82,.19,blue); lid.position.set(0,.18,.78); lid.castShadow=true; hinge.add(lid);
    bar(hinge,.38,.05,1.78,goldLight,[0,.385,.78]);
    bar(hinge,2.68,.05,.36,gold,[0,.386,.78]);

    // Large satin loops and ribbon tails echo the exact glossy-blue / gold reference.
    const bow=new THREE.Group(); bow.position.set(0,.48,.78); hinge.add(bow);
    function loop(z,x) {
      const a=new THREE.Mesh(new THREE.TorusGeometry(.34,.078,18,64),gold);
      a.scale.set(1.22,.76,.72); a.rotation.set(.18,0,z); a.position.set(x,.04,0); a.castShadow=true; bow.add(a);
      const shine=new THREE.Mesh(new THREE.TorusGeometry(.27,.018,8,48),goldLight);
      shine.scale.copy(a.scale); shine.rotation.copy(a.rotation); shine.position.copy(a.position); bow.add(shine);
    }
    loop(-.56,-.29); loop(.56,.29);
    bar(bow,.25,.2,.22,goldLight,[0,-.01,.04],[0,0,.12]);
    bar(bow,.22,.055,.58,gold,[-.24,-.18,.24],[ -.15,0,-.42]);
    bar(bow,.22,.055,.58,goldLight,[.24,-.18,.24],[-.15,0,.42]);

    // Token face artwork is rendered onto a real beveled gold coin.
    const face=document.createElement("canvas"); face.width=512; face.height=512;
    const ctx=face.getContext("2d");
    const grad=ctx.createRadialGradient(190,150,20,256,256,270);
    grad.addColorStop(0,"#fff4c2"); grad.addColorStop(.38,"#f7cf65"); grad.addColorStop(1,"#a86612");
    ctx.fillStyle=grad; ctx.fillRect(0,0,512,512);
    ctx.strokeStyle="rgba(255,255,255,.72)"; ctx.lineWidth=13; ctx.beginPath(); ctx.arc(256,256,218,0,Math.PI*2); ctx.stroke();
    ctx.strokeStyle="rgba(115,65,8,.72)"; ctx.lineWidth=7; ctx.beginPath(); ctx.arc(256,256,184,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle="#6e430b"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.font="900 112px Arial"; ctx.fillText("VPN",256,236); ctx.font="700 34px Arial"; ctx.fillText("FINDER",256,328);
    const texture=new THREE.CanvasTexture(face); texture.colorSpace=THREE.SRGBColorSpace;
    const coin=new THREE.Group();
    const coinMesh=new THREE.Mesh(new THREE.CylinderGeometry(.31,.31,.085,64),[
      gold,new THREE.MeshStandardMaterial({map:texture,metalness:.78,roughness:.23}),
      new THREE.MeshStandardMaterial({map:texture,metalness:.78,roughness:.23})
    ]);
    coinMesh.rotation.x=Math.PI/2; coinMesh.castShadow=true; coin.add(coinMesh);
    coin.position.set(-.52,2.78,.32); scene.add(coin);

    const sparkles=new THREE.Group(); scene.add(sparkles);
    for(let i=0;i<20;i++){
      const p=new THREE.Mesh(new THREE.SphereGeometry(.018+(i%3)*.009,8,8),new THREE.MeshBasicMaterial({color:i%3?0xffdc83:0xffffff,transparent:true,opacity:.8}));
      const a=i*2.399, r=1.25+(i%5)*.13; p.position.set(Math.cos(a)*r,.65+(i%7)*.28,Math.sin(a)*r*.65); sparkles.add(p);
    }

    function resize(){
      const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
      renderer.setSize(w,h,false); camera.aspect=w/h;
      camera.position.set(w<360?4.65:4.25,w<360?3.25:3.05,w<360?6.2:5.7);
      camera.lookAt(0,1.18,0); renderer.render(scene,camera);
    }
    const ro=new ResizeObserver(resize); ro.observe(host); window.addEventListener("resize",resize,{passive:true}); resize();

    let raf=0,started=0,playing=false,dead=false;
    function reset(){
      box.position.set(0,-.2,0); box.rotation.set(0,-.07,0); hinge.rotation.set(0,0,0);
      coin.visible=true; coin.position.set(-.52,2.78,.32); coin.rotation.set(.18,0,-.35);
      sparkles.visible=false;
    }
    function tick(now){
      if(dead||!screen.classList.contains("active")){playing=false;raf=0;return;}
      const t=(now-started)/1000; raf=requestAnimationFrame(tick);
      const arrive=out(t/.72);
      box.position.y=-.2+.2*arrive+(t>.72?Math.sin(t*1.8)*.014:0);
      box.rotation.y=-.07+.07*arrive+Math.sin(t*.65)*.014;
      const lidProgress=smooth((t-1.05)/1.05);
      hinge.rotation.x=-.02-1.72*lidProgress;
      if(t>2.1) hinge.rotation.x=-1.72+Math.sin(t*1.5)*.009;
      if(t<2.25){
        coin.position.set(-.52,2.78+Math.sin(t*2.5)*.03,.32);
        coin.rotation.z=-.35+Math.sin(t*1.7)*.04;
      }else{
        const drop=clamp((t-2.25)/.95),fall=smooth(drop);
        const bounce=drop>.78?Math.sin((drop-.78)*Math.PI*5)*.07*(1-drop):0;
        coin.position.set(-.52+.62*fall,2.78-2.35*fall+bounce,.32-.13*fall);
        coin.rotation.set(Math.PI/2+fall*.18,fall*1.3,-.35+fall*3.6);
        if(drop>=1){coin.position.y=.37+Math.sin(t*1.7)*.008;coin.rotation.set(Math.PI/2,0,.12);}
      }
      sparkles.visible=t>2.65; sparkles.rotation.y+=.0015;
      sparkles.children.forEach((p,i)=>p.material.opacity=.3+.55*Math.abs(Math.sin(t*2+i)));
      renderer.render(scene,camera);
      if(t>8.5){cancelAnimationFrame(raf);raf=0;playing=false;hinge.rotation.x=-1.72;coin.position.y=.37;}
    }
    function play(){
      if(dead||playing)return;
      if(raf)cancelAnimationFrame(raf);
      reset(); started=performance.now(); playing=true;
      if(reducedMotion){hinge.rotation.x=-1.72;coin.visible=false;renderer.render(scene,camera);playing=false;return;}
      raf=requestAnimationFrame(tick);
    }
    const mo=new MutationObserver(()=>{
      if(screen.classList.contains("active"))play();
      else if(raf){cancelAnimationFrame(raf);raf=0;playing=false;}
    });
    mo.observe(screen,{attributes:true,attributeFilter:["class"]});
    const io=new IntersectionObserver(entries=>{
      if(entries.some(e=>e.isIntersecting)&&screen.classList.contains("active"))play();
    },{threshold:.08});
    io.observe(screen);
    host.dataset.ready="1";
    if(screen.classList.contains("active"))play();
    window.addEventListener("pagehide",()=>{
      dead=true;if(raf)cancelAnimationFrame(raf);ro.disconnect();io.disconnect();mo.disconnect();renderer.dispose();
    },{once:true});
  }).catch(error=>{
    console.error("[VPN Finder] Three.js failed to load; showing approved gift artwork.",error);
    fallback();
  });
})();