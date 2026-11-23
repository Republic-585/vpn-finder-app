(() => {
  const screen = document.getElementById("screen-owner-promo");
  const host = document.getElementById("owner-gift-canvas");
  const stage = document.getElementById("owner-gift-stage");
  if (!screen || !host || !stage || host.dataset.webglInit === "1") return;
  host.dataset.webglInit = "1";

  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = n => { n = clamp(n); return 1 - Math.pow(1 - n, 3); };
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const referenceUrl = "./assets/images/glossy-blue-gift-reference.png?v=20261123-reference-scene-v1";

  import("https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js").then(THREE => {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.tabIndex = -1;
    host.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, .1, 30);
    camera.position.set(0, .82, 6.6);
    camera.lookAt(0, .82, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const rim = new THREE.PointLight(0x72b8ff, 7, 8, 2);
    rim.position.set(2, 1.4, -2);
    scene.add(rim);

    // Soft pool of light beneath the exact approved artwork.
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = glowCanvas.height = 256;
    const ctx = glowCanvas.getContext("2d");
    const gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 124);
    gradient.addColorStop(0, "rgba(42,132,255,.34)");
    gradient.addColorStop(.42, "rgba(42,132,255,.13)");
    gradient.addColorStop(1, "rgba(42,132,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 2.25),
      new THREE.MeshBasicMaterial({ map: glowTexture, transparent: true, depthWrite: false, opacity: .85 })
    );
    glow.position.set(0, -.5, -.18);
    scene.add(glow);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.35, 64),
      new THREE.MeshBasicMaterial({ color: 0x347fe0, transparent: true, opacity: .055, depthWrite: false })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -.62, 0);
    scene.add(floor);

    const particles = new THREE.Group();
    scene.add(particles);
    for (let i = 0; i < 16; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: i % 4 === 0 ? 0xffffff : 0xffd878,
        transparent: true,
        opacity: .65
      });
      const dot = new THREE.Mesh(new THREE.SphereGeometry(.012 + (i % 3) * .006, 8, 8), material);
      const angle = i * 2.399;
      const radius = 1.45 + (i % 4) * .12;
      dot.position.set(Math.cos(angle) * radius, -.05 + (i % 5) * .34, -.15 + Math.sin(angle) * .18);
      particles.add(dot);
    }

    let gift = null;
    let raf = 0;
    let started = 0;
    let dead = false;
    let running = false;
    let pressUntil = 0;
    let targetX = 0;
    let targetY = 0;

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(referenceUrl, texture => {
      if (dead) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
      const aspect = texture.image.width / texture.image.height;
      const height = 2.65;
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: .012,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false
      });
      gift = new THREE.Mesh(new THREE.PlaneGeometry(height * aspect, height), material);
      gift.position.set(0, .84, .08);
      gift.renderOrder = 3;
      scene.add(gift);
      host.dataset.ready = "1";
      resize();
      if (screen.classList.contains("active")) play();
    }, undefined, error => {
      console.error("[VPN Finder] Approved gift artwork could not be loaded.", error);
      const image = document.createElement("img");
      image.className = "gift-reference-image";
      image.src = referenceUrl;
      image.alt = "";
      image.setAttribute("aria-hidden", "true");
      host.replaceChildren(image);
      host.dataset.ready = "fallback";
    });

    function resize() {
      const w = Math.max(1, host.clientWidth);
      const h = Math.max(1, host.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.z = w < 360 ? 7.05 : 6.6;
      camera.lookAt(0, .82, 0);
      renderer.render(scene, camera);
    }
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    window.addEventListener("resize", resize, { passive: true });

    stage.addEventListener("pointermove", event => {
      const rect = stage.getBoundingClientRect();
      targetY = ((event.clientX - rect.left) / rect.width - .5) * .22;
      targetX = ((event.clientY - rect.top) / rect.height - .5) * -.12;
    }, { passive: true });
    stage.addEventListener("pointerleave", () => { targetX = 0; targetY = 0; }, { passive: true });
    stage.addEventListener("pointerdown", () => { pressUntil = performance.now() + 520; }, { passive: true });

    function reset() {
      if (!gift) return;
      gift.rotation.set(0, 0, -.018);
      gift.scale.set(1, 1, 1);
      particles.visible = false;
      glow.material.opacity = .5;
    }
    function tick(now) {
      if (dead || !screen.classList.contains("active") || !gift) {
        running = false;
        raf = 0;
        return;
      }
      const t = (now - started) / 1000;
      raf = requestAnimationFrame(tick);
      const entrance = ease(t / .72);
      const idle = t > .72 ? Math.sin(t * 1.45) : 0;
      const tap = now < pressUntil ? 1 - (pressUntil - now) / 520 : 0;
      gift.position.y = .84 + (1 - entrance) * -.16 + idle * .035;
      gift.rotation.y += (targetY - gift.rotation.y) * .045;
      gift.rotation.x += (targetX - gift.rotation.x) * .045;
      gift.rotation.z = -.018 + Math.sin(t * .72) * .012;
      const squash = tap > 0 ? Math.sin(tap * Math.PI) * .035 : 0;
      const scale = 1 + Math.sin(t * 1.45) * .008 + squash;
      gift.scale.set(scale, scale, 1);
      glow.material.opacity = .52 + Math.sin(t * 1.2) * .09;
      particles.visible = t > .5;
      particles.rotation.y = Math.sin(t * .18) * .08;
      particles.children.forEach((dot, i) => {
        dot.material.opacity = .18 + .58 * Math.abs(Math.sin(t * 1.7 + i * .8));
      });
      renderer.render(scene, camera);
    }
    function play() {
      if (dead || running || !gift) return;
      if (raf) cancelAnimationFrame(raf);
      reset();
      if (reducedMotion) {
        renderer.render(scene, camera);
        return;
      }
      started = performance.now();
      running = true;
      raf = requestAnimationFrame(tick);
    }
    const mo = new MutationObserver(() => {
      if (screen.classList.contains("active") && stage.classList.contains("is-opening")) play();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
        running = false;
      }
    });
    mo.observe(screen, { attributes: true, attributeFilter: ["class"] });
    mo.observe(stage, { attributes: true, attributeFilter: ["class"] });
    if (screen.classList.contains("active") && stage.classList.contains("is-opening")) play();

    window.addEventListener("pagehide", () => {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      renderer.dispose();
      glowTexture.dispose();
      if (gift) {
        gift.geometry.dispose();
        gift.material.map.dispose();
        gift.material.dispose();
      }
    }, { once: true });
  }).catch(error => {
    console.error("[VPN Finder] Three.js could not start.", error);
    host.dataset.ready = "error";
  });
})();