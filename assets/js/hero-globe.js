/**
 * Hero globe
 * ----------
 * A WebGL network globe behind the hero, built from the things on this site:
 * the four projects and the tools they run on are the labelled nodes, the
 * links between them are the real "built with" relationships, and packets run
 * along those links. Colours come from the live palette tokens.
 *
 * Loaded by hero.js with a dynamic import() after the page has finished
 * loading, so three.js never competes with first paint. Until the scene is
 * ready, and for anyone without WebGL, the CSS poster in .hero-globe stands in.
 */

import * as THREE from "../vendor/three/three.module.min.js";

// Colours are handed straight through as the CSS tokens define them, so the
// globe matches the rest of the page exactly instead of being re-graded.
THREE.ColorManagement.enabled = false;

const R = 1;

// lat/lon in degrees. Projects sit on the face that starts toward the camera.
const NODES = [
  { id: "nooklook", label: "Nook Look", project: true, lat: 22, lon: -32 },
  { id: "vancobab", label: "Vanco Bab", project: true, lat: -14, lon: 24 },
  { id: "termeh", label: "Termeh Cafe", project: true, lat: 40, lon: 52 },
  { id: "taskmate", label: "TaskMate", project: true, lat: -40, lon: -18 },
  { id: "js", label: "JavaScript", lat: -6, lon: -72 },
  { id: "react", label: "React", lat: 54, lon: 8 },
  { id: "node", label: "Node.js", lat: 22, lon: 102 },
  { id: "php", label: "PHP", lat: 52, lon: -78 },
  { id: "wordpress", label: "WordPress", lat: 12, lon: -124 },
  { id: "firebase", label: "Firebase", lat: -58, lon: 38 },
  { id: "sqlite", label: "SQLite", lat: -8, lon: 142 },
  { id: "tcpip", label: "TCP/IP", lat: 58, lon: 164 },
  { id: "python", label: "Python", lat: -34, lon: -146 },
  { id: "cpp", label: "C++", lat: -62, lon: -96 },
  { id: "linux", label: "Linux", lat: 28, lon: -168 },
  { id: "sql", label: "SQL", lat: -32, lon: 84 },
];

// Every link is a true relationship from the case studies and the skills list.
const LINKS = [
  ["nooklook", "wordpress"],
  ["nooklook", "php"],
  ["vancobab", "js"],
  ["termeh", "react"],
  ["termeh", "node"],
  ["termeh", "sqlite"],
  ["taskmate", "firebase"],
  ["taskmate", "js"],
  ["node", "js"],
  ["sql", "sqlite"],
  ["tcpip", "linux"],
  ["python", "tcpip"],
  ["cpp", "linux"],
];

function toVec(lat, lon, r) {
  const a = THREE.MathUtils.degToRad(lat);
  const b = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(
    r * Math.cos(a) * Math.sin(b),
    r * Math.sin(a),
    r * Math.cos(a) * Math.cos(b),
  );
}

function readTokens() {
  const s = getComputedStyle(document.documentElement);
  const get = (name) => s.getPropertyValue(name).trim();
  return {
    accent: get("--color-accent"),
    text: get("--color-text"),
    subtle: get("--color-text-subtle"),
    bg: get("--color-background"),
    dark: document.documentElement.getAttribute("data-theme") === "dark",
  };
}

// A soft round dot, drawn once and shared by the packets.
function dotTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.3, "rgba(255,255,255,0.85)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
}

const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function mount(host, { reduced = false } = {}) {
  // Bail out before building anything if WebGL is unavailable; the poster
  // stays as the hero backdrop.
  const probe = document.createElement("canvas");
  if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) return null;

  const small = window.matchMedia("(max-width: 859px)").matches;
  const showLabels = !small;

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.dataset.cursor = "drag";
  host.appendChild(canvas);

  const labelLayer = document.createElement("div");
  labelLayer.className = "globe-labels";
  host.appendChild(labelLayer);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 5.4);

  const globe = new THREE.Group();
  globe.rotation.x = 0.32;
  scene.add(globe);

  let tokens = readTokens();

  // ---- core: an opaque ball in the page colour. It hides the far side, so
  // the dots, arcs and packets behind the globe are occluded like a real
  // planet's, and it vanishes into the page in every palette.
  const coreMat = new THREE.MeshBasicMaterial({ color: tokens.bg });
  const core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.992, 64, 48), coreMat);
  globe.add(core);

  // ---- surface dots
  const COUNT = small ? 1100 : 2200;
  const pos = new Float32Array(COUNT * 3);
  const seed = new Float32Array(COUNT);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < COUNT; i++) {
    const y = 1 - (i / (COUNT - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    pos[i * 3] = Math.cos(th) * r * R;
    pos[i * 3 + 1] = y * R;
    pos[i * 3 + 2] = Math.sin(th) * r * R;
    seed[i] = Math.random();
  }
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  dotGeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  const dotMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(tokens.text) },
      uOpacity: { value: tokens.dark ? 0.7 : 0.6 },
      uSize: { value: small ? 3 : 3.4 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uReveal: { value: 0 },
    },
    vertexShader: `
      uniform float uSize;
      uniform float uPixelRatio;
      uniform float uReveal;
      attribute float aSeed;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normalize(position));
        float facing = n.z;
        float reveal = smoothstep(aSeed * 0.7, aSeed * 0.7 + 0.3, uReveal);
        vAlpha = smoothstep(-0.1, 0.6, facing) * (0.45 + 0.55 * aSeed) * reveal;
        gl_PointSize = uSize * uPixelRatio * (0.55 + 0.45 * facing) * (5.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        gl_FragColor = vec4(uColor, smoothstep(0.5, 0.1, d) * vAlpha * uOpacity);
      }
    `,
  });
  globe.add(new THREE.Points(dotGeo, dotMat));

  // ---- atmosphere: a back-facing shell whose glow fades out toward its rim.
  const glowMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    uniforms: {
      uColor: { value: new THREE.Color(tokens.accent) },
      uIntensity: { value: 0 },
    },
    vertexShader: `
      varying vec3 vN;
      void main() {
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec3 vN;
      void main() {
        float a = pow(clamp(-vN.z / 0.52, 0.0, 1.0), 2.4);
        gl_FragColor = vec4(uColor, a * uIntensity);
      }
    `,
  });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(R * 1.16, 64, 48), glowMat);
  scene.add(glow); // not in the group: the halo should not wobble with the tilt

  // ---- nodes
  const byId = {};
  const nodeGeoProject = new THREE.SphereGeometry(0.034, 16, 12);
  const nodeGeoSkill = new THREE.SphereGeometry(0.022, 12, 10);
  const ringGeo = new THREE.RingGeometry(0.047, 0.052, 48);
  const projectMat = new THREE.MeshBasicMaterial({ color: tokens.accent, transparent: true, opacity: 0 });
  const skillMat = new THREE.MeshBasicMaterial({ color: tokens.text, transparent: true, opacity: 0 });
  const rings = [];

  NODES.forEach((n, i) => {
    const p = toVec(n.lat, n.lon, R * 1.004);
    const mesh = new THREE.Mesh(n.project ? nodeGeoProject : nodeGeoSkill, n.project ? projectMat : skillMat);
    mesh.position.copy(p);
    globe.add(mesh);

    if (n.project) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: tokens.accent,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(p.clone().multiplyScalar(1.002));
      ring.lookAt(p.clone().multiplyScalar(2));
      ring.userData.phase = i * 0.37;
      globe.add(ring);
      rings.push(ring);
    }

    let el = null;
    if (showLabels) {
      el = document.createElement("span");
      el.className = "globe-label" + (n.project ? " is-project" : "");
      el.textContent = n.label;
      labelLayer.appendChild(el);
    }
    byId[n.id] = { ...n, p, mesh, el, shown: -1 };
  });

  // ---- links and packets
  const tex = dotTexture();
  const arcs = LINKS.map(([a, b], i) => {
    const A = byId[a].p;
    const B = byId[b].p;
    const angle = A.angleTo(B);
    const mid = A.clone().add(B).normalize().multiplyScalar(R * (1.08 + angle * 0.2));
    const curve = new THREE.QuadraticBezierCurve3(A, mid, B);
    const pts = curve.getPoints(72);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    geo.setDrawRange(0, 0);
    const mat = new THREE.LineBasicMaterial({
      color: tokens.accent,
      transparent: true,
      opacity: tokens.dark ? 0.55 : 0.6,
    });
    const line = new THREE.Line(geo, mat);
    globe.add(line);

    const spriteMat = new THREE.SpriteMaterial({
      map: tex,
      color: tokens.accent,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const packet = new THREE.Sprite(spriteMat);
    packet.scale.setScalar(0.042);
    globe.add(packet);

    return {
      curve,
      geo,
      mat,
      packet,
      count: pts.length,
      speed: 0.16 + ((i * 37) % 10) / 70,
      offset: (i * 0.29) % 1,
      // links from a project start drawing first
      delay: byId[a].project ? 0 : 0.35,
    };
  });

  // ---- colours follow the palette and the theme
  function applyTokens() {
    tokens = readTokens();
    coreMat.color.set(tokens.bg);
    dotMat.uniforms.uColor.value.set(tokens.text);
    dotMat.uniforms.uOpacity.value = tokens.dark ? 0.7 : 0.6;
    glowMat.uniforms.uColor.value.set(tokens.accent);
    // Additive light only reads on a dark ground; on a light one it washes
    // out to nothing, so the light theme blends normally.
    const blend = tokens.dark ? THREE.AdditiveBlending : THREE.NormalBlending;
    glowMat.blending = blend;
    glowMat.needsUpdate = true;
    projectMat.color.set(tokens.accent);
    skillMat.color.set(tokens.subtle);
    rings.forEach((r) => r.material.color.set(tokens.accent));
    arcs.forEach((a) => {
      a.mat.color.set(tokens.accent);
      a.mat.opacity = tokens.dark ? 0.55 : 0.6;
      a.packet.material.color.set(tokens.accent);
      a.packet.material.blending = blend;
      a.packet.material.needsUpdate = true;
    });
    requestRender();
  }
  new MutationObserver(() => requestAnimationFrame(applyTokens)).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "data-palette"],
  });

  // ---- sizing
  let W = 0;
  let H = 0;
  function resize() {
    W = host.clientWidth;
    H = host.clientHeight;
    if (!W || !H) return;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    requestRender();
  }
  new ResizeObserver(resize).observe(host);

  // ---- input: the globe leans toward the pointer and can be spun by drag
  let leanX = 0;
  let leanY = 0;
  let targetLeanX = 0;
  let targetLeanY = 0;
  let spin = 0;
  let spinVel = 0;
  let dragging = null;

  if (!reduced && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    window.addEventListener(
      "pointermove",
      (e) => {
        targetLeanY = (e.clientX / window.innerWidth - 0.5) * 0.5;
        targetLeanX = (e.clientY / window.innerHeight - 0.5) * 0.3;
        if (dragging) {
          const dx = e.clientX - dragging.x;
          dragging.x = e.clientX;
          spinVel = dx * 0.006;
          spin += spinVel;
        }
      },
      { passive: true },
    );
    canvas.addEventListener("pointerdown", (e) => {
      dragging = { x: e.clientX };
      canvas.setPointerCapture(e.pointerId);
    });
    const end = () => {
      dragging = null;
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
  }

  // ---- render loop
  const v = new THREE.Vector3();
  const camDir = new THREE.Vector3();
  const start = performance.now();
  let last = start;
  let running = false;
  let visible = true;
  let frameQueued = false;

  function updateLabels() {
    if (!showLabels) return;
    for (const id in byId) {
      const n = byId[id];
      n.mesh.getWorldPosition(v);
      camDir.copy(camera.position).sub(v).normalize();
      const facing = v.clone().normalize().dot(camDir);
      const fade = smooth(0.26, 0.4, facing) * labelReveal;
      const o = Math.round(fade * 100) / 100;
      if (o <= 0) {
        if (n.shown !== 0) {
          n.el.style.opacity = "0";
          n.shown = 0;
        }
        continue;
      }
      v.project(camera);
      const x = ((v.x + 1) / 2) * W;
      const y = ((1 - v.y) / 2) * H;
      n.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(12px, -50%)`;
      if (n.shown !== o) {
        n.el.style.opacity = String(o);
        n.shown = o;
      }
    }
  }

  let labelReveal = reduced ? 1 : 0;

  function render(now) {
    const t = (now - start) / 1000;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // power on: the globe grows out of a point, the dots light up from the
    // seed outward, then the links draw and the packets set off
    const p = reduced ? 1 : easeOutExpo(Math.min(1, t / 1.6));
    globe.scale.setScalar(0.55 + 0.45 * p);
    dotMat.uniforms.uReveal.value = reduced ? 1 : Math.min(1, t / 1.3);
    glowMat.uniforms.uIntensity.value = (tokens.dark ? 0.55 : 0.28) * p;
    const nodeIn = reduced ? 1 : smooth(0.6, 1.3, t);
    projectMat.opacity = nodeIn;
    skillMat.opacity = nodeIn * 0.9;
    labelReveal = reduced ? 1 : smooth(1.5, 2.3, t);

    arcs.forEach((a) => {
      const k = reduced ? 1 : smooth(0.9 + a.delay, 2.1 + a.delay, t);
      a.geo.setDrawRange(0, Math.ceil(a.count * k));
      if (reduced || k < 1) {
        a.packet.material.opacity = 0;
      } else {
        const u = (t * a.speed + a.offset) % 1;
        a.curve.getPoint(u, a.packet.position);
        a.packet.material.opacity = Math.sin(u * Math.PI);
      }
    });

    rings.forEach((r) => {
      if (reduced) {
        r.material.opacity = 0.5 * nodeIn;
        r.scale.setScalar(1);
        return;
      }
      const u = (t * 0.55 + r.userData.phase) % 1;
      r.scale.setScalar(1 + u * 1.3);
      r.material.opacity = (1 - u) * (1 - u) * 0.9 * nodeIn;
    });

    if (!reduced) {
      if (!dragging) {
        spinVel *= 0.94;
        spin += spinVel;
      }
      leanX += (targetLeanX - leanX) * 0.05;
      leanY += (targetLeanY - leanY) * 0.05;
      globe.rotation.y = t * 0.09 + spin + leanY;
      globe.rotation.x = 0.32 + leanX;
    }

    renderer.render(scene, camera);
    updateLabels();
  }

  function loop(now) {
    if (!running) return;
    render(now);
    requestAnimationFrame(loop);
  }

  function setRunning(on) {
    if (reduced) return;
    if (on && !running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(loop);
    } else if (!on) {
      running = false;
    }
  }

  // Reduced motion gets a single still frame, redrawn only when something
  // that affects it (size, palette, theme) changes.
  function requestRender() {
    if (running || frameQueued) return;
    frameQueued = true;
    requestAnimationFrame((now) => {
      frameQueued = false;
      if (!running) render(now);
    });
  }

  // Only spend frames while the hero is on screen and the tab is in front.
  const hero = host.closest(".hero") || host;
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    setRunning(visible && !document.hidden);
  }).observe(hero);
  document.addEventListener("visibilitychange", () => {
    setRunning(visible && !document.hidden);
  });

  applyTokens();
  resize();
  host.classList.add("is-live");
  setRunning(true);
  return { renderer };
}
