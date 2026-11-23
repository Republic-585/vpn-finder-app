import * as THREE from "https://esm.sh/three@0.170.0";
import { RoundedBoxGeometry } from "https://esm.sh/three@0.170.0/examples/jsm/geometries/RoundedBoxGeometry.js";

(() => {
  const screen = document.getElementById("screen-owner-promo");
  const host = document.getElementById("owner-gift-canvas");
  if (!screen || !host) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(4.2, 3.1, 5.7);
  camera.lookAt(0, 1.25, 0);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
  renderer.setSize(host.clientWidth || 360, host.clientHeight || 330, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xe8dcff, 0x241044, 2.15));
  const key = new THREE.DirectionalLight(0xffffff, 4.1);
  key.position.set(-3.8, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);
  const rim = new THREE.PointLight(0x62b8ff, 28, 12, 2);
  rim.position.set(3.5, 3.4, -2.8);
  scene.add(rim);
  const warm = new THREE.PointLight(0xffc65a, 0, 7, 2);
  warm.position.set(0, 2.2, 1.5);
  scene.add(warm);

  const blue = new THREE.MeshPhysicalMaterial({ color: 0x0878ed, metalness: 0.2, roughness: 0.19, clearcoat: 1, clearcoatRoughness: 0.08 });
  const blueLight = new THREE.MeshPhysicalMaterial({ color: 0x258ff5, metalness: 0.16, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.07 });
  const blueDark = new THREE.MeshPhysicalMaterial({ color: 0x0648bd, metalness: 0.28, roughness: 0.22, clearcoat: 1 });
  const inner = new THREE.MeshPhysicalMaterial({ color: 0x063a92, metalness: 0.12, roughness: 0.3, clearcoat: 0.6 });
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xf5b82e, metalness: 0.92, roughness: 0.19, clearcoat: 1 });
  const goldHi = new THREE.MeshPhysicalMaterial({ color: 0xffdf79, metalness: 0.84, roughness: 0.15, clearcoat: 1 });
  const emblem = new THREE.MeshPhysicalMaterial({ color: 0x0878ed, metalness: 0.38, roughness: 0.2, clearcoat: 1 });
  const white = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.12, roughness: 0.22, clearcoat: 1 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.ShadowMaterial({ opacity: 0.2 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  scene.add(floor);

  const gift = new THREE.Group();
  scene.add(gift);

  const box = new THREE.Group();
  gift.add(box);
  const addBoxPart = (w, h, d, material, x, y, z, radius = 0.06) => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 6, radius), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    box.add(mesh);
    return mesh;
  };

  // Solid glossy cobalt-blue gift body with broad metallic-gold wrapping.
  addBoxPart(2.62, 1.58, 1.92, blue, 0, 0.91, 0, 0.12);
  addBoxPart(0.36, 1.58, 0.055, goldHi, 0, 0.91, 0.985, 0.025);
  addBoxPart(0.055, 1.58, 0.36, gold, 1.325, 0.91, 0, 0.025);
  addBoxPart(2.62, 0.07, 0.055, blueDark, 0, 0.12, 0.985, 0.025);
  addBoxPart(2.62, 0.07, 0.055, blueDark, 0, 1.70, 0.985, 0.025);

  // Hinged lid opens backward, exposing the box cavity.
  const hinge = new THREE.Group();
  hinge.position.set(0, 1.78, -0.86);
  gift.add(hinge);
  const lid = new THREE.Mesh(new RoundedBoxGeometry(2.82, 0.27, 2.05, 7, 0.1), blueLight);
  lid.position.set(0, 0.13, 0.96);
  lid.castShadow = true;
  lid.receiveShadow = true;
  hinge.add(lid);

  const lidTopBand = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.045, 1.96, 5, 0.02), goldHi);
  lidTopBand.position.set(0, 0.274, 0.96);
  hinge.add(lidTopBand);
  const lidFrontBand = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.25, 0.045, 5, 0.018), gold);
  lidFrontBand.position.set(0, 0.13, 1.98);
  hinge.add(lidFrontBand);

  // A restrained sculptural gold bow on the outside of the raised lid.
  const bow = new THREE.Group();
  bow.position.set(0, 0.38, 0.94);
  hinge.add(bow);
  function makeLoop(sign) {
    const points = [
      [0, 0, 0], [sign * 0.2, 0.18, 0.02], [sign * 0.55, 0.34, 0.03],
      [sign * 0.88, 0.25, 0.02], [sign * 0.84, 0.02, 0], [sign * 0.45, -0.03, -0.02]
    ];
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), true, "catmullrom", 0.45);
    const loop = new THREE.Mesh(new THREE.TubeGeometry(curve, 56, 0.09, 12, true), goldHi);
    loop.castShadow = true;
    bow.add(loop);
  }
  makeLoop(1);
  makeLoop(-1);
  const knot = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.26, 0.28, 6, 0.09), gold);
  knot.position.set(0, 0.01, 0.11);
  bow.add(knot);

  // VPN shield avatar: a glossy circular medallion with the shield mark and a star overlapping its lower-right edge.
  const token = new THREE.Group();
  gift.add(token);
  token.position.set(0, 1.22, 0.08);
  token.scale.setScalar(0.001);

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.57, 0.57, 0.16, 72), gold);
  disc.rotation.x = Math.PI / 2;
  disc.castShadow = true;
  token.add(disc);
  const discFace = new THREE.Mesh(new THREE.CircleGeometry(0.505, 72), emblem);
  discFace.position.z = 0.087;
  token.add(discFace);

  const shieldShape = new THREE.Shape();
  shieldShape.moveTo(0, 0.34);
  shieldShape.quadraticCurveTo(0.2, 0.25, 0.31, 0.2);
  shieldShape.lineTo(0.28, -0.1);
  shieldShape.quadraticCurveTo(0.22, -0.34, 0, -0.43);
  shieldShape.quadraticCurveTo(-0.22, -0.34, -0.28, -0.1);
  shieldShape.lineTo(-0.31, 0.2);
  shieldShape.quadraticCurveTo(-0.2, 0.25, 0, 0.34);
  const shieldMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shieldShape, { depth: 0.055, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.025, bevelThickness: 0.025 }),
    white
  );
  shieldMesh.position.set(0, 0, 0.105);
  shieldMesh.castShadow = true;
  token.add(shieldMesh);

  // Simple VPN glyph inside the shield.
  const glyph = new THREE.Group();
  glyph.position.set(0, -0.015, 0.17);
  token.add(glyph);
  const strokeMat = new THREE.MeshPhysicalMaterial({ color: 0x0754bd, metalness: 0.28, roughness: 0.2, clearcoat: 1 });
  const bar1 = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.36, 0.035, 5, 0.03), strokeMat);
  bar1.position.set(-0.095, 0, 0);
  bar1.rotation.z = -0.48;
  glyph.add(bar1);
  const bar2 = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.36, 0.035, 5, 0.03), strokeMat);
  bar2.position.set(0.095, 0, 0);
  bar2.rotation.z = 0.48;
  glyph.add(bar2);

  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + i * Math.PI / 5;
    const r = i % 2 === 0 ? 0.22 : 0.095;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) starShape.moveTo(x, y);
    else starShape.lineTo(x, y);
  }
  starShape.closePath();
  const star = new THREE.Mesh(
    new THREE.ExtrudeGeometry(starShape, { depth: 0.07, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.025, bevelThickness: 0.025 }),
    goldHi
  );
  star.position.set(0.38, -0.34, 0.16);
  star.castShadow = true;
  token.add(star);

  const sparks = new THREE.Group();
  scene.add(sparks);
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffd56a });
  for (let i = 0; i < 18; i++) {
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), sparkMat);
    const angle = i * 2.399;
    spark.position.set(Math.cos(angle) * (1.8 + (i % 4) * 0.2), 0.6 + (i % 6) * 0.42, Math.sin(angle) * (1.6 + (i % 3) * 0.2));
    spark.userData.phase = i * 0.7;
    sparks.add(spark);
  }

  let active = false, raf = 0, opened = false, startAt = 0;
  const ease = t => 1 - Math.pow(1 - t, 3);
  function begin() {
    opened = false;
    startAt = performance.now();
    active = true;
    if (!raf) raf = requestAnimationFrame(draw);
  }
  function draw(now) {
    raf = 0;
    if (!active) return;
    const t = (now - startAt) / 1000;
    const arrival = ease(Math.min(1, t / 0.82));
    gift.position.y = -0.28 * (1 - arrival) + Math.sin(t * 1.25) * 0.025 * arrival;
    gift.rotation.y = -0.2 + Math.sin(t * 0.62) * 0.055;
    gift.rotation.z = Math.sin(t * 0.9) * 0.012;

    const lidT = Math.max(0, Math.min(1, (t - 0.8) / 1.08));
    hinge.rotation.x = -1.95 * ease(lidT) + (lidT > 0 ? Math.sin(lidT * Math.PI) * -0.11 : 0);

    const rise = ease(Math.max(0, Math.min(1, (t - 1.28) / 0.92)));
    token.scale.setScalar(rise);
    token.position.y = 1.2 + rise * 1.28;
    token.rotation.set(-0.12, t * 1.1, -0.16);
    warm.intensity = rise * 34;
    sparks.visible = t > 1.05;
    sparks.children.forEach(s => s.scale.setScalar(0.55 + 0.45 * Math.abs(Math.sin(t * 2 + s.userData.phase))));

    renderer.render(scene, camera);
    raf = requestAnimationFrame(draw);
    if (t > 7) opened = true;
  }
  function resize() {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(entries => {
    const visible = entries.some(e => e.isIntersecting);
    active = visible && screen.classList.contains("active");
    if (active && !raf) {
      if (!opened) begin();
      else raf = requestAnimationFrame(draw);
    }
    if (!active && raf) { cancelAnimationFrame(raf); raf = 0; }
  }, { threshold: 0.05 }).observe(screen);
  new MutationObserver(() => {
    if (screen.classList.contains("active")) begin();
    else {
      active = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
  }).observe(screen, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      active = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    } else if (screen.classList.contains("active")) begin();
  });

  resize();
  renderer.render(scene, camera);
})();