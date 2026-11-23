(() => {
  const screen = document.getElementById("screen-owner-promo");
  const host = document.getElementById("owner-gift-canvas");
  const stage = document.getElementById("owner-gift-stage");
  if (!screen || !host || !stage || host.dataset.webglInit === "1") return;
  host.dataset.webglInit = "1";

  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
  const ADDON_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/geometries/RoundedBoxGeometry.js";
  const ENV_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/environments/RoomEnvironment.js";

  Promise.all([import(THREE_URL), import(ADDON_URL), import(ENV_URL)]).then(([THREE, rounded, env]) => {
    const { RoundedBoxGeometry } = rounded;
    const { RoomEnvironment } = env;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.13;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.tabIndex = -1;
    host.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(31, 1, .1, 40);
    camera.position.set(0, 2.15, 7.6);
    camera.lookAt(0, 1.12, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
    scene.environment = environment;

    scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x23344d, 1.45));
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(-3.8, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = .5;
    key.shadow.camera.far = 16;
    key.shadow.bias = -.00025;
    key.shadow.normalBias = .025;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9bcaff, 1.8);
    fill.position.set(4, 2.7, 3);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 2.4);
    rim.position.set(1.5, 4, -4);
    scene.add(rim);

    const blue = new THREE.MeshPhysicalMaterial({
      color: 0x1687f5, metalness: .18, roughness: .22,
      clearcoat: 1, clearcoatRoughness: .13, envMapIntensity: 1.25
    });
    const blueSide = blue.clone();
    blueSide.color.set(0x0872df);
    const gold = new THREE.MeshPhysicalMaterial({
      color: 0xf5bd35, metalness: .88, roughness: .2,
      clearcoat: .85, clearcoatRoughness: .16, envMapIntensity: 1.6, side: THREE.DoubleSide
    });
    const goldLight = gold.clone();
    goldLight.color.set(0xffd96a);

    const gift = new THREE.Group();
    gift.position.y = .12;
    scene.add(gift);

    const base = new THREE.Group();
    gift.add(base);
    const body = new THREE.Mesh(new RoundedBoxGeometry(1.9, 1.48, 1.55, 8, .16), blue);
    body.position.y = .82;
    body.castShadow = true;
    body.receiveShadow = true;
    base.add(body);

    // Gold wrap: two continuous-looking bands across the front, sides and top.
    const bandFront = new THREE.Mesh(new RoundedBoxGeometry(.25, 1.51, 1.585, 5, .035), gold);
    bandFront.position.set(0, .82, .005);
    bandFront.castShadow = true;
    base.add(bandFront);
    const bandTop = new THREE.Mesh(new RoundedBoxGeometry(1.94, .075, .25, 5, .035), goldLight);
    bandTop.position.set(0, 1.565, 0);
    base.add(bandTop);
    const sideBandL = new THREE.Mesh(new RoundedBoxGeometry(.035, 1.5, 1.57, 4, .016), gold);
    sideBandL.position.set(-.94, .82, 0);
    base.add(sideBandL);
    const sideBandR = sideBandL.clone();
    sideBandR.position.x = .94;
    base.add(sideBandR);

    // Lid has its own pivot so it can rise and rotate during the reveal.
    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 1.56, -.74);
    gift.add(lidPivot);
    const lid = new THREE.Mesh(new RoundedBoxGeometry(2.02, .43, 1.68, 8, .14), blue);
    lid.position.set(0, .19, .74);
    lid.castShadow = true;
    lid.receiveShadow = true;
    lidPivot.add(lid);
    const lidBand = new THREE.Mesh(new RoundedBoxGeometry(.265, .445, 1.71, 5, .035), gold);
    lidBand.position.set(0, .19, .74);
    lidPivot.add(lidBand);
    const lidTopBand = new THREE.Mesh(new RoundedBoxGeometry(2.03, .055, .27, 5, .025), goldLight);
    lidTopBand.position.set(0, .405, .74);
    lidPivot.add(lidTopBand);

    // Bow loops are volumetric satin ribbons, not flat image planes.
    function ribbonLoop(points, width, material, parent) {
      const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), true, "centripetal");
      const divisions = 100;
      const vertices = [];
      const uvs = [];
      const indices = [];
      for (let i = 0; i <= divisions; i++) {
        const t = i / divisions;
        const point = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t).normalize();
        let across = new THREE.Vector3(0, 0, 1).cross(tangent).normalize();
        if (across.lengthSq() < .01) across.set(1, 0, 0);
        const flutter = Math.sin(t * Math.PI * 8) * .018;
        across.multiplyScalar(1 + flutter);
        const half = width * .5;
        const normal = new THREE.Vector3().crossVectors(tangent, across).normalize();
        for (let side = -1; side <= 1; side += 2) {
          const p = point.clone().addScaledVector(across, half * side);
          p.addScaledVector(normal, Math.sin(t * Math.PI * 4) * .012);
          vertices.push(p.x, p.y, p.z);
          uvs.push(side === -1 ? 0 : 1, t);
        }
        if (i < divisions) {
          const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
          indices.push(a, c, b, b, c, d);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }

    const bow = new THREE.Group();
    bow.position.set(0, 1.91, .02);
    gift.add(bow);
    ribbonLoop([
      [0,0,0],[.12,.2,.08],[.43,.34,.03],[.69,.27,-.04],
      [.72,.1,-.08],[.48,-.02,-.12],[.19,.02,-.08],[-.02,.14,0]
    ], .22, goldLight, bow);
    ribbonLoop([
      [0,0,0],[-.13,.2,.08],[-.44,.35,.02],[-.7,.27,-.05],
      [-.73,.1,-.09],[-.49,-.02,-.12],[-.2,.02,-.08],[-.02,.14,0]
    ], .22, goldLight, bow);
    ribbonLoop([
      [0,0,.015],[.1,.17,.16],[.23,.29,.2],[.3,.22,.16],
      [.27,.08,.12],[.12,.04,.08],[0,.1,.04]
    ], .16, gold, bow);
    ribbonLoop([
      [0,0,.015],[-.1,.17,.16],[-.23,.29,.2],[-.3,.22,.16],
      [-.27,.08,.12],[-.12,.04,.08],[0,.1,.04]
    ], .16, gold, bow);
    const knot = new THREE.Mesh(new RoundedBoxGeometry(.34, .24, .29, 6, .09), gold);
    knot.position.set(0, .13, .16);
    knot.rotation.z = -.12;
    knot.castShadow = true;
    bow.add(knot);

    // Two short satin tails drape over the lid.
    ribbonLoop([[0,.02,.16],[.12,-.12,.32],[.17,-.3,.42],[.1,-.45,.48],[.02,-.51,.52]], .19, goldLight, bow, false);
    ribbonLoop([[0,.02,.16],[-.12,-.12,.32],[-.17,-.3,.42],[-.1,-.45,.48],[-.02,-.51,.52]], .19, goldLight, bow, false);

    // Grounding shadow and restrained light pool.
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: .18 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = .055;
    ground.receiveShadow = true;
    scene.add(ground);
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = glowCanvas.height = 256;
    const gctx = glowCanvas.getContext("2d");
    const grad = gctx.createRadialGradient(128,128,8,128,128,124);
    grad.addColorStop(0,"rgba(42,132,255,.25)");
    grad.addColorStop(.5,"rgba(42,132,255,.1)");
    grad.addColorStop(1,"rgba(42,132,255,0)");
    gctx.fillStyle = grad; gctx.fillRect(0,0,256,256);
    const glowTex = new THREE.CanvasTexture(glowCanvas);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.2,2.6),new THREE.MeshBasicMaterial({map:glowTex,transparent:true,depthWrite:false,opacity:.8}));
    glow.rotation.x = -Math.PI/2;
    glow.position.set(0,.065,0);
    scene.add(glow);

    const sparkles = new THREE.Group();
    scene.add(sparkles);
    for(let i=0;i<18;i++){
      const dot=new THREE.Mesh(new THREE.SphereGeometry(.012+(i%3)*.005,8,8),new THREE.MeshBasicMaterial({color:i%4===0?0xffffff:0xffd878,transparent:true,opacity:.5}));
      const a=i*2.399, r=1.55+(i%4)*.13;
      dot.position.set(Math.cos(a)*r,.45+(i%5)*.32,Math.sin(a)*.45);
      sparkles.add(dot);
    }

    let raf=0, running=false, dead=false, startAt=0, openingAt=0;
    let drag=false, moved=false, lastX=0, lastY=0, targetYaw=-.16, targetPitch=.04, yaw=-.16, pitch=.04;
    let openProgress=0, openRequested=false, pointerDownAt=0;
    const initialYaw=-.16;
    const lookAt = new THREE.Vector3(0,1.13,0);

    function resize(){
      const w=Math.max(1,host.clientWidth), h=Math.max(1,host.clientHeight);
      renderer.setSize(w,h,false);
      camera.aspect=w/h;
      camera.position.z=w<360?8.25:7.6;
      camera.position.y=w<360?2.28:2.15;
      camera.lookAt(lookAt);
      renderer.render(scene,camera);
    }
    const ro=new ResizeObserver(resize); ro.observe(host);
    window.addEventListener("resize",resize,{passive:true});

    function beginOpen(){
      if(openRequested || reducedMotion) return;
      openRequested=true;
      openingAt=performance.now();
    }
    stage.addEventListener("pointerdown",e=>{
      if(e.pointerType==="mouse" && e.button!==0) return;
      drag=true; moved=false; lastX=e.clientX; lastY=e.clientY; pointerDownAt=performance.now();
      try{stage.setPointerCapture(e.pointerId)}catch(_){}
    });
    stage.addEventListener("pointermove",e=>{
      if(!drag)return;
      const dx=e.clientX-lastX,dy=e.clientY-lastY;
      if(Math.abs(dx)+Math.abs(dy)>2)moved=true;
      targetYaw+=dx*.008;
      targetPitch=clamp(targetPitch+dy*.005,-.32,.32);
      lastX=e.clientX;lastY=e.clientY;
    },{passive:true});
    const release=e=>{
      if(!drag)return;
      drag=false;
      if(!moved && performance.now()-pointerDownAt<380){\n        if(openRequested && openProgress >= .98) reset();\n        beginOpen();\n      }
    };
    stage.addEventListener("pointerup",release);
    stage.addEventListener("pointercancel",()=>{drag=false});
    stage.addEventListener("dblclick",beginOpen);

    function reset(){
      openProgress=0;openRequested=false;openingAt=0;
      lidPivot.rotation.set(0,0,0);
      lidPivot.position.set(0,1.56,-.74);
      bow.position.set(0,1.91,.02);
      gift.position.y=.12;
      sparkles.visible=false;
    }
    function renderFrame(now){
      if(dead || !screen.classList.contains("active")){
        running=false;raf=0;return;
      }
      const elapsed=(now-startAt)/1000;
      yaw+=(targetYaw-yaw)*.075;
      pitch+=(targetPitch-pitch)*.075;
      gift.rotation.y=yaw;
      gift.rotation.x=pitch;
      const idle=reducedMotion?0:Math.sin(elapsed*1.25)*.018;
      gift.position.y=.12+idle;
      gift.rotation.z=Math.sin(elapsed*.7)*.006;

      if(openRequested){
        const p=clamp((now-openingAt)/1750);
        openProgress=smooth(p);
        const lift=smooth(clamp(p/.42));
        const tilt=smooth(clamp((p-.28)/.62));
        lidPivot.position.y=1.56+lift*.48;
        lidPivot.rotation.x=-tilt*.92;
        lidPivot.rotation.z=-tilt*.16;
        bow.position.y=1.91+lift*.9;
        bow.position.z=.02+lift*.14;
        bow.rotation.x=tilt*.18;
        sparkles.visible=p>.25;
      }
      glow.material.opacity=.64+Math.sin(elapsed*1.15)*.08;
      sparkles.rotation.y=Math.sin(elapsed*.22)*.08;
      sparkles.children.forEach((d,i)=>d.material.opacity=.12+.48*Math.abs(Math.sin(elapsed*1.8+i*.75)));
      renderer.render(scene,camera);
      raf=requestAnimationFrame(renderFrame);
    }
    function play(){
      if(dead||running)return;
      if(raf)cancelAnimationFrame(raf);
      reset();
      if(reducedMotion){renderer.render(scene,camera);return}
      startAt=performance.now();running=true;raf=requestAnimationFrame(renderFrame);
    }
    const mo=new MutationObserver(()=>{
      if(screen.classList.contains("active")&&stage.classList.contains("is-opening"))play();
      else if(raf){cancelAnimationFrame(raf);raf=0;running=false}
    });
    mo.observe(screen,{attributes:true,attributeFilter:["class"]});
    mo.observe(stage,{attributes:true,attributeFilter:["class"]});
    resize();
    if(screen.classList.contains("active")&&stage.classList.contains("is-opening"))play();

    window.addEventListener("pagehide",()=>{
      dead=true;if(raf)cancelAnimationFrame(raf);
      ro.disconnect();mo.disconnect();
      renderer.dispose();pmrem.dispose();environment.dispose();glowTex.dispose();
      scene.traverse(obj=>{
        if(obj.isMesh){obj.geometry?.dispose();if(Array.isArray(obj.material))obj.material.forEach(m=>m.dispose());else obj.material?.dispose()}
      });
    },{once:true});
    host.dataset.ready="1";
  }).catch(error=>{
    console.error("[VPN Finder] 3D gift scene could not start.",error);
    host.dataset.ready="error";
  });
})();
