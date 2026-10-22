import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const canvas = document.getElementById("roses");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(0, 0.15, 6.8);

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

scene.add(new THREE.AmbientLight(0xffc4d4, 0.28));

const key = new THREE.DirectionalLight(0xfff2e8, 1.15);
key.position.set(2.8, 4.5, 3.5);
scene.add(key);

const fill = new THREE.DirectionalLight(0xff6b8a, 0.35);
fill.position.set(-3.5, 1.2, -1.5);
scene.add(fill);

const roseLight = new THREE.PointLight(0xff3355, 2.4, 12);
roseLight.position.set(0.4, 0.2, 2.2);
scene.add(roseLight);

const moonGroup = new THREE.Group();
moonGroup.position.set(0, 2.85, -1.2);
scene.add(moonGroup);

const textureLoader = new THREE.TextureLoader();

// Real photograph of the Moon as seen from Earth
const moonEarthMap = textureLoader.load("./assets/moon-earth.jpg");
moonEarthMap.colorSpace = THREE.SRGBColorSpace;
moonEarthMap.anisotropy = 8;

// Flat disk facing us — real Moon photo as seen from Earth
const moonMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  toneMapped: false,
  uniforms: {
    moonMap: { value: moonEarthMap },
    time: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D moonMap;
    uniform float time;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      vec3 albedo = texture2D(moonMap, uv).rgb;
      float luma = dot(albedo, vec3(0.299, 0.587, 0.114));

      // Cut out black space around the photographed disk
      if (luma < 0.04) discard;

      vec2 p = uv * 2.0 - 1.0;
      float r = length(p);
      if (r > 0.995) discard;

      // Reconstruct a sphere normal so lighting looks 3D on the photo
      float z = sqrt(max(0.0, 1.0 - r * r));
      vec3 n = normalize(vec3(p.x, p.y, z));

      // Sunlight from the left = first-quarter moon from Earth
      vec3 L = normalize(vec3(-1.0, 0.02, 0.08));
      float ndotl = dot(n, L);

      // Soft terminator like the real lunar night line
      float day = smoothstep(-0.025, 0.04, ndotl);
      float shade = clamp(ndotl, 0.0, 1.0);

      // Preserve real crater / maria detail from the photo
      vec3 surface = albedo * vec3(1.06, 1.03, 0.98);
      surface = mix(surface, vec3(luma), 0.08);

      // Bright sunlit face
      vec3 lit = surface * (0.7 + 0.55 * shade);
      lit += surface * pow(shade, 3.0) * 0.25;

      // Dark face with soft earthshine (as seen on real half moons)
      vec3 night = surface * vec3(0.05, 0.065, 0.1) + vec3(0.012, 0.016, 0.028);

      vec3 color = mix(night, lit, day);

      // Bright limb on the sunlit edge
      float edge = smoothstep(0.72, 0.99, r);
      color += vec3(0.65, 0.64, 0.58) * edge * day * 0.18;

      float alpha = smoothstep(0.04, 0.12, luma) * smoothstep(1.0, 0.9, r);
      color *= 0.98 + 0.02 * sin(time * 0.6);

      gl_FragColor = vec4(color, alpha);
    }
  `,
});

const moon = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), moonMaterial);
moon.renderOrder = 2;
moonGroup.add(moon);

// Soft silvery halo on the lit side
const moonHalo = new THREE.Mesh(
  new THREE.PlaneGeometry(2.4, 2.4),
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    uniforms: { time: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float litSide = smoothstep(0.45, -0.15, p.x);
        float glow = exp(-pow((r - 0.38) * 2.8, 2.0)) * 0.35;
        float wash = exp(-r * r * 2.4) * 0.16;
        float alpha = (glow + wash) * litSide;
        alpha *= 0.9 + 0.1 * sin(time * 0.8);
        gl_FragColor = vec4(0.9, 0.9, 0.82, alpha);
      }
    `,
  })
);
moonHalo.position.z = -0.03;
moonHalo.renderOrder = 1;
moonGroup.add(moonHalo);

const rosePivot = new THREE.Group();
rosePivot.position.set(0, -1.85, 0.35);
scene.add(rosePivot);

let roseModel = null;
let bloom = 0;

const loader = new GLTFLoader();
loader.load(
  "./assets/rose.glb",
  (gltf) => {
    roseModel = gltf.scene;
    let meshCount = 0;

    roseModel.traverse((child) => {
      if (child.isMesh) {
        meshCount += 1;
        child.castShadow = false;
        child.receiveShadow = false;
        child.frustumCulled = false;
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((mat) => {
            mat.side = THREE.DoubleSide;
            mat.transparent = false;
            mat.depthWrite = true;
            if ("metalness" in mat) mat.metalness = Math.min(mat.metalness ?? 0.1, 0.15);
            if ("roughness" in mat) mat.roughness = Math.min(Math.max(mat.roughness ?? 0.55, 0.4), 0.85);
            mat.needsUpdate = true;
          });
        }
      }
    });

    const box = new THREE.Box3().setFromObject(roseModel);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Guard against empty / invalid bounds
    if (!Number.isFinite(size.y) || size.y < 0.0001 || meshCount === 0) {
      roseModel = createFallbackRose();
      rosePivot.add(roseModel);
      return;
    }

    roseModel.position.set(-center.x, -center.y, -center.z);

    const targetHeight = 2.35;
    roseModel.userData.targetScale = targetHeight / size.y;
    roseModel.scale.setScalar(0);
    roseModel.rotation.y = Math.PI * 0.15;
    rosePivot.add(roseModel);

    window.__roseDebug = {
      meshes: meshCount,
      size: { x: size.x, y: size.y, z: size.z },
      targetScale: roseModel.userData.targetScale,
    };
  },
  undefined,
  (err) => {
    console.error("Rose model failed to load", err);
    roseModel = createFallbackRose();
    rosePivot.add(roseModel);
  }
);

function createFallbackRose() {
  const group = new THREE.Group();
  const petalMat = new THREE.MeshPhysicalMaterial({
    color: 0xb01030,
    roughness: 0.45,
    metalness: 0.05,
    sheen: 1,
    sheenColor: new THREE.Color(0xff6b8a),
    sheenRoughness: 0.4,
    side: THREE.DoubleSide,
  });

  for (let layer = 0; layer < 6; layer += 1) {
    const count = 5 + layer * 2;
    for (let i = 0; i < count; i += 1) {
      const geo = new THREE.SphereGeometry(0.28 + layer * 0.05, 16, 12, 0, Math.PI);
      const petal = new THREE.Mesh(geo, petalMat.clone());
      petal.material.color.offsetHSL(0, 0, (layer - 3) * 0.03);
      const angle = (i / count) * Math.PI * 2 + layer * 0.28;
      const radius = 0.08 + layer * 0.09;
      petal.scale.set(0.55, 1.05, 0.18);
      petal.position.set(Math.cos(angle) * radius, layer * 0.03, Math.sin(angle) * radius);
      petal.rotation.y = -angle;
      petal.rotation.x = -0.4 - layer * 0.18;
      group.add(petal);
    }
  }

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 1.8, 12),
    new THREE.MeshStandardMaterial({ color: 0x1f5c2e, roughness: 0.8 })
  );
  stem.position.y = -1.05;
  group.add(stem);
  group.userData.targetScale = 1;
  group.scale.setScalar(0);
  return group;
}

function petalShape(width, length) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(width * 0.55, length * 0.15, width * 0.7, length * 0.55, 0, length);
  shape.bezierCurveTo(-width * 0.7, length * 0.55, -width * 0.55, length * 0.15, 0, 0);
  return shape;
}

function makePetalMesh(width, length, color, bend = 0.35) {
  const geometry = new THREE.ExtrudeGeometry(petalShape(width, length), {
    depth: 0.015,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 12,
  });
  geometry.translate(0, 0, -0.008);

  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    const x = pos.getX(i);
    const t = Math.max(0, y / length);
    const curl = Math.sin(t * Math.PI) * bend;
    pos.setZ(i, pos.getZ(i) - curl - Math.abs(x) * t * bend * 0.5);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();

  return new THREE.Mesh(
    geometry,
    new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.48,
      metalness: 0.04,
      sheen: 0.8,
      sheenColor: new THREE.Color(0xff8aa0),
      side: THREE.DoubleSide,
    })
  );
}

function createFallingPetal() {
  const mesh = makePetalMesh(0.14, 0.22, 0xc41232, 0.28);
  mesh.scale.setScalar(0.45 + Math.random() * 0.4);
  mesh.userData = {
    speed: 0.3 + Math.random() * 0.5,
    drift: (Math.random() - 0.5) * 0.45,
    spinX: (Math.random() - 0.5) * 1.4,
    spinY: (Math.random() - 0.5) * 1.6,
    spinZ: (Math.random() - 0.5) * 1.1,
  };
  resetFallingPetal(mesh, true);
  return mesh;
}

function resetFallingPetal(mesh, randomY = false) {
  mesh.position.set(
    (Math.random() - 0.5) * 6.5,
    randomY ? Math.random() * 5 - 0.5 : 4.2 + Math.random() * 1.8,
    (Math.random() - 0.5) * 3.5 - 0.5
  );
  mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
}

const fallingPetals = [];
const blastPetals = [];
const petalColors = [0xc41232, 0xe11d48, 0x9f1239, 0xbe123c, 0xf43f5e, 0x881337];

const petalCount = reduceMotion ? 0 : Math.min(18, Math.floor(window.innerWidth / 55));
for (let i = 0; i < petalCount; i += 1) {
  const petal = createFallingPetal();
  scene.add(petal);
  fallingPetals.push(petal);
}

function createBlastPetal() {
  const color = petalColors[Math.floor(Math.random() * petalColors.length)];
  const mesh = makePetalMesh(0.16 + Math.random() * 0.08, 0.24 + Math.random() * 0.1, color, 0.32);
  mesh.scale.setScalar(0.55 + Math.random() * 0.7);
  return mesh;
}

function blastRosePetals(origin = { x: 0, y: -0.4, z: 0.5 }) {
  const mobile = window.innerWidth < 600 || window.innerHeight < 560;
  const count = reduceMotion ? 18 : mobile ? 48 : 90;

  for (let i = 0; i < count; i += 1) {
    const petal = createBlastPetal();
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const speed = 3.5 + Math.random() * 7.5;

    petal.position.set(origin.x, origin.y, origin.z);
    petal.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

    petal.userData = {
      vx: Math.sin(phi) * Math.cos(theta) * speed,
      vy: Math.cos(phi) * speed * 0.85 + 2.2,
      vz: Math.sin(phi) * Math.sin(theta) * speed,
      spinX: (Math.random() - 0.5) * 12,
      spinY: (Math.random() - 0.5) * 14,
      spinZ: (Math.random() - 0.5) * 12,
      life: 1,
      decay: 0.55 + Math.random() * 0.45,
    };

    scene.add(petal);
    blastPetals.push(petal);
  }

  // Extra upward burst of larger petals
  for (let i = 0; i < (reduceMotion ? 8 : 28); i += 1) {
    const petal = createBlastPetal();
    petal.scale.multiplyScalar(1.25);
    petal.position.set(origin.x, origin.y, origin.z);
    const angle = (i / 28) * Math.PI * 2 + Math.random() * 0.4;
    const speed = 4 + Math.random() * 5;
    petal.userData = {
      vx: Math.cos(angle) * speed,
      vy: 5 + Math.random() * 4,
      vz: Math.sin(angle) * speed * 0.6,
      spinX: (Math.random() - 0.5) * 10,
      spinY: (Math.random() - 0.5) * 10,
      spinZ: (Math.random() - 0.5) * 10,
      life: 1,
      decay: 0.4 + Math.random() * 0.35,
    };
    scene.add(petal);
    blastPetals.push(petal);
  }
}

window.blastRosePetals = blastRosePetals;

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

let moonBaseY = 2.85;
let roseBaseY = -1.85;
let moonScale = 1;
let roseScaleFactor = 1;

function layoutForViewport(w, h) {
  const aspect = w / Math.max(h, 1);
  const isTiny = w <= 360;
  const isShort = h < 560;
  const isNarrow = w < 480;
  const isTablet = w >= 600 && w <= 1024;
  const isLandscapePhone = aspect > 1.2 && h < 520;

  // Moon sits in the top band without covering the title
  if (isLandscapePhone) {
    moonBaseY = 1.45;
    moonScale = 0.5;
    roseBaseY = -1.05;
    roseScaleFactor = 0.5;
    camera.position.z = 7.8;
  } else if (isTiny) {
    moonBaseY = 2.35;
    moonScale = 0.68;
    roseBaseY = -2.05;
    roseScaleFactor = 0.68;
    camera.position.z = 7.5;
  } else if (isShort) {
    moonBaseY = 2.0;
    moonScale = 0.66;
    roseBaseY = -1.4;
    roseScaleFactor = 0.66;
    camera.position.z = 7.5;
  } else if (isNarrow) {
    moonBaseY = 2.5;
    moonScale = 0.76;
    roseBaseY = -1.95;
    roseScaleFactor = 0.76;
    camera.position.z = 7.25;
  } else if (isTablet) {
    moonBaseY = 2.65;
    moonScale = 0.9;
    roseBaseY = -1.8;
    roseScaleFactor = 0.9;
    camera.position.z = 7.0;
  } else {
    moonBaseY = Math.max(2.35, Math.min(3.2, 1.55 + h / w));
    moonScale = aspect < 0.7 ? 0.85 : 1;
    roseBaseY = -1.85;
    roseScaleFactor = aspect < 0.7 ? 0.88 : 1;
    camera.position.z = 6.8;
  }

  moonGroup.scale.setScalar(moonScale);
  moonGroup.position.y = moonBaseY;
  rosePivot.position.y = roseBaseY;
}

function resize() {
  const w = window.innerWidth;
  const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  camera.aspect = w / Math.max(h, 1);
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  layoutForViewport(w, h);
}

function animate(time) {
  const t = time * 0.001;

  moonMaterial.uniforms.time.value = reduceMotion ? 0 : t;
  moonHalo.material.uniforms.time.value = reduceMotion ? 0 : t;

  // Keep the Earth-view moon facing the camera
  moonGroup.quaternion.copy(camera.quaternion);

  if (!reduceMotion) {
    // Gentle drift — phase stays a true half moon
    moonGroup.position.x = Math.sin(t * 0.18) * 0.1;
    moonGroup.position.y = moonBaseY + Math.sin(t * 0.55) * 0.04;
  }

  if (roseModel) {
    if (bloom < 1) {
      bloom = Math.min(1, bloom + 0.008);
    }
    const target = (roseModel.userData.targetScale || 1) * roseScaleFactor;
    roseModel.scale.setScalar(easeOutCubic(bloom) * target);

    if (!reduceMotion) {
      roseModel.rotation.y += 0.0045;
      rosePivot.position.y = roseBaseY + Math.sin(t * 0.7) * 0.06;
      rosePivot.rotation.z = Math.sin(t * 0.45) * 0.04;
      rosePivot.rotation.x = Math.sin(t * 0.35) * 0.03;
    }
  }

  fallingPetals.forEach((petal) => {
    petal.position.y -= petal.userData.speed * 0.016;
    petal.position.x += Math.sin(t + petal.position.y) * petal.userData.drift * 0.01;
    petal.rotation.x += petal.userData.spinX * 0.016;
    petal.rotation.y += petal.userData.spinY * 0.016;
    petal.rotation.z += petal.userData.spinZ * 0.016;
    if (petal.position.y < -3.2) resetFallingPetal(petal);
  });

  for (let i = blastPetals.length - 1; i >= 0; i -= 1) {
    const petal = blastPetals[i];
    const d = petal.userData;
    const dt = 0.016;

    d.vy -= 9.2 * dt;
    petal.position.x += d.vx * dt;
    petal.position.y += d.vy * dt;
    petal.position.z += d.vz * dt;
    petal.rotation.x += d.spinX * dt;
    petal.rotation.y += d.spinY * dt;
    petal.rotation.z += d.spinZ * dt;

    d.life -= d.decay * dt;
    const fade = Math.max(0, d.life);
    petal.material.transparent = true;
    petal.material.opacity = fade;

    if (d.life <= 0 || petal.position.y < -5) {
      scene.remove(petal);
      petal.geometry.dispose();
      petal.material.dispose();
      blastPetals.splice(i, 1);
    }
  }

  camera.position.x = reduceMotion ? 0 : Math.sin(t * 0.12) * 0.2;
  camera.lookAt(0, -0.15, 0);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

resize();
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", () => {
  window.setTimeout(resize, 150);
});
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", resize);
}
requestAnimationFrame(animate);

window.addEventListener("pointermove", (event) => {
  if (reduceMotion || !roseModel) return;
  const x = (event.clientX / window.innerWidth - 0.5) * 0.35;
  const y = (event.clientY / window.innerHeight - 0.5) * 0.2;
  rosePivot.rotation.y += (x - rosePivot.rotation.y) * 0.05;
  rosePivot.rotation.x += (-y - rosePivot.rotation.x) * 0.05;
});
