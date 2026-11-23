(() => {
  const screen = document.getElementById("screen-owner-promo");
  const host = document.getElementById("owner-gift-canvas");
  const stage = document.getElementById("owner-gift-stage");
  if (!screen || !host || !stage || host.dataset.webglInit === "1") return;
  host.dataset.webglInit = "1";
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = n => { n = clamp(n); return 1 - Math.pow(1 - n, 3); };
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  Promise.all([
    import("https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js"),
    import("https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js")
  ]).then(([THREE, { GLTFLoader }]) => {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.8));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.tabIndex = -1;
    host.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, .1, 50);
    camera.position.set(2.75, 2.15, 3.6);
    camera.lookAt(0, .72, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 1.35));
    const key = new THREE.DirectionalLight(0xffffff, 3.6);
    key.position.set(-3.5, 5.5, 4.5); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); scene.add(key);
    const fill = new THREE.DirectionalLight(0x8fc5ff, 2.1);
    fill.position.set(4, 2.5, -3); scene.add(fill);
    const rim = new THREE.PointLight(0xffd36c, 17, 7, 2);
    rim.position.set(-2, 2.8, -2.2); scene.add(rim);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(1.65, 64),
      new THREE.MeshBasicMaterial({ color: 0x287be6, transparent: true, opacity: .13, depthWrite: false })
    );
    ground.rotation.x = -Math.PI / 2; ground.position.y = -.025; scene.add(ground);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: .2 }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -.03; shadow.receiveShadow = true; scene.add(shadow);

    const coinGold = new THREE.MeshPhysicalMaterial({ color: 0xf4bd3b, metalness: .9, roughness: .18, clearcoat: 1 });
    const coinFace = new THREE.MeshPhysicalMaterial({ color: 0xffdf83, metalness: .82, roughness: .2, clearcoat: 1 });
    const coin = new THREE.Group();
    const coinBody = new THREE.Mesh(new THREE.CylinderGeometry(.19, .19, .055, 64), [coinGold, coinFace, coinFace]);
    coinBody.rotation.x = Math.PI / 2; coinBody.castShadow = true; coin.add(coinBody);
    const coinRing = new THREE.Mesh(new THREE.TorusGeometry(.145, .012, 10, 64), coinGold);
    coinRing.position.y = .03; coin.add(coinRing);
    coin.visible = false; scene.add(coin);

    const sparkles = new THREE.Group(); scene.add(sparkles);
    for (let i = 0; i < 18; i++) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(.012 + (i % 3) * .006, 8, 8),
        new THREE.MeshBasicMaterial({ color: i % 3 ? 0xffdc83 : 0xffffff, transparent: true, opacity: .8 })
      );
      const a = i * 2.399, r = .95 + (i % 4) * .12;
      dot.position.set(Math.cos(a) * r, .5 + (i % 6) * .2, Math.sin(a) * r * .65);
      sparkles.add(dot);
    }

    let root, lidPivot, raf = 0, started = 0, dead = false, running = false;
    const loader = new GLTFLoader();
    loader.load("./assets/models/VPN_Finder_Gift_Box.glb?v=20261123-cad-v1", gltf => {
      root = gltf.scene;
      root.rotation.x = -Math.PI / 2; // CAD source is Z-up; Three.js scene is Y-up.
      root.scale.setScalar(.018);
      root.traverse(node => {
        if (node.isMesh) {
          node.castShadow = true; node.receiveShadow = true;
          if (node.material) {
            node.material.metalness = node.name.includes("Ribbon") || node.name.includes("Bow") ? .68 : .16;
            node.material.roughness = node.name.includes("Ribbon") || node.name.includes("Bow") ? .23 : .2;
            node.material.clearcoat = .85;
          }
        }
      });
      scene.add(root);

      const lidParts = [];
      root.traverse(node => {
        if (node.isMesh && /^(Lid_|Bow_)/.test(node.name)) lidParts.push(node);
      });
      lidPivot = new THREE.Group();
      lidPivot.position.set(0, 40.5, 68);
      root.add(lidPivot);
      lidParts.forEach(part => lidPivot.attach(part));

      host.dataset.ready = "1";
      resize();
      if (screen.classList.contains("active")) play();
    }, undefined, error => {
      console.error("[VPN Finder] CAD gift model could not be loaded.", error);
      const image = document.createElement("img");
      image.className = "gift-reference-image";
      image.src = "./assets/images/glossy-blue-gift-reference.png";
      image.alt = ""; image.setAttribute("aria-hidden", "true");
      host.replaceChildren(image);
      host.dataset.ready = "fallback";
    });

    function resize() {
      const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.set(w < 360 ? 2.95 : 2.75, w < 360 ? 2.25 : 2.15, w < 360 ? 3.85 : 3.6);
      camera.lookAt(0, .72, 0);
      renderer.render(scene, camera);
    }
    const ro = new ResizeObserver(resize); ro.observe(host);
    window.addEventListener("resize", resize, { passive: true });

    function reset() {
      if (!root || !lidPivot) return;
      root.position.set(0, -.12, 0);
      root.rotation.set(-Math.PI / 2, 0, -.035);
      lidPivot.rotation.set(0, 0, 0);
      coin.visible = false; coin.position.set(-.25, 2.05, .12);
      coin.rotation.set(.2, 0, -.3); sparkles.visible = false;
    }
    function tick(now) {
      if (dead || !screen.classList.contains("active") || !root) { running = false; raf = 0; return; }
      const t = (now - started) / 1000;
      raf = requestAnimationFrame(tick);
      const arrive = ease(t / .72);
      root.position.y = -.12 + .12 * arrive + (t > .72 ? Math.sin(t * 1.8) * .008 : 0);
      const opening = ease((t - 1.05) / 1.05);
      lidPivot.rotation.x = -.02 - 1.55 * opening;
      if (t > 2.1) lidPivot.rotation.x = -1.57 + Math.sin(t * 1.4) * .008;
      if (t > 2.05) {
        coin.visible = true;
        const drop = ease((t - 2.05) / .9);
        coin.position.set(-.25 + .42 * drop, 2.05 - 1.35 * drop + (drop > .78 ? Math.sin((drop - .78) * 15) * .035 * (1-drop) : 0), .12 - .1 * drop);
        coin.rotation.set(Math.PI / 2 + drop * .18, drop * 1.2, -.3 + drop * 3.2);
      }
      sparkles.visible = t > 2.45;
      sparkles.rotation.y += .0014;
      sparkles.children.forEach((p, i) => p.material.opacity = .25 + .6 * Math.abs(Math.sin(t * 2 + i)));
      renderer.render(scene, camera);
      if (t > 7.5) { cancelAnimationFrame(raf); raf = 0; running = false; lidPivot.rotation.x = -1.57; }
    }
    function play() {
      if (dead || running || !root) return;
      if (raf) cancelAnimationFrame(raf);
      reset();
      if (reducedMotion) {
        lidPivot.rotation.x = -1.57;
        renderer.render(scene, camera);
        return;
      }
      started = performance.now(); running = true; raf = requestAnimationFrame(tick);
    }
    const mo = new MutationObserver(() => {
      if (screen.classList.contains("active") && stage.classList.contains("is-opening")) play();
      else if (raf) { cancelAnimationFrame(raf); raf = 0; running = false; }
    });
    mo.observe(screen, { attributes: true, attributeFilter: ["class"] });
    mo.observe(stage, { attributes: true, attributeFilter: ["class"] });
    if (screen.classList.contains("active") && stage.classList.contains("is-opening")) play();
    window.addEventListener("pagehide", () => {
      dead = true; if (raf) cancelAnimationFrame(raf);
      ro.disconnect(); mo.disconnect(); renderer.dispose();
    }, { once: true });
  }).catch(error => {
    console.error("[VPN Finder] Three.js could not start.", error);
    host.dataset.ready = "error";
  });
})();