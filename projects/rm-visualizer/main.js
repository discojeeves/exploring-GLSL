import * as THREE from 'three';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';

// ---- Renderer ----
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
renderer.setClearColor(0x0a0a0a, 1);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.01, 200);
camera.position.set(2, 5, 10);
camera.lookAt(0, 0, 0);

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.target.set(-1, 0, 0);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- Constants ----
const SPHERE_CENTER = new THREE.Vector3(0, 0, 0);
const SPHERE_RADIUS = 1.2;
const RAY_ORIGIN    = new THREE.Vector3(-6, 0, 0);
const MAX_STEPS     = 40;
const MAX_DIST      = 20;
const HIT_THRESH    = 0.01;

function sdSphere(pos) {
    return pos.distanceTo(SPHERE_CENTER) - SPHERE_RADIUS;
}

// ---- Static scene objects ----

// SDF sphere fill
const sphereFill = new THREE.Mesh(
    new THREE.SphereGeometry(SPHERE_RADIUS, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xff5533, transparent: true, opacity: 0.12, depthWrite: false })
);
sphereFill.position.copy(SPHERE_CENTER);
scene.add(sphereFill);

// SDF sphere wireframe
const sdfWire = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.SphereGeometry(SPHERE_RADIUS, 16, 16)),
    new THREE.LineBasicMaterial({ color: 0xff5533, transparent: true, opacity: 0.3 })
);
sdfWire.position.copy(SPHERE_CENTER);
scene.add(sdfWire);

// Ray origin marker
const originDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
);
originDot.position.copy(RAY_ORIGIN);
scene.add(originDot);

// Grid
scene.add(new THREE.GridHelper(24, 24, 0x1a1a1a, 0x141414));

// ---- Dynamic objects ----

// Ray line
const rayLineGeo = new THREE.BufferGeometry();
const rayLine = new THREE.Line(
    rayLineGeo,
    new THREE.LineBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.7 })
);
scene.add(rayLine);

// Pool: step dots + radius spheres
const dotPool  = [];
const ringPool = [];

for (let i = 0; i < MAX_STEPS; i++) {
    const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.003, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x2266cc })
    );
    dot.visible = false;
    scene.add(dot);
    dotPool.push(dot);

    const ring = new THREE.Mesh(
        new THREE.SphereGeometry(1, 14, 14),
        new THREE.MeshBasicMaterial({ color: 0x2255aa, wireframe: true, transparent: true, opacity: 0.07 })
    );
    ring.visible = false;
    scene.add(ring);
    ringPool.push(ring);
}

// Current step highlight ring
const curRingMat = new THREE.MeshBasicMaterial({ color: 0xffff44, wireframe: true, transparent: true, opacity: 0.55 });
const curRing = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), curRingMat);
curRing.visible = false;
scene.add(curRing);

// ---- Step computation ----
let steps = [];
let currentStep = 0;
let aimX = 0, aimY = 0;

function computeSteps() {
    const target = new THREE.Vector3(
        SPHERE_CENTER.x,
        SPHERE_CENTER.y + aimY,
        SPHERE_CENTER.z + aimX
    );
    const dir = target.clone().sub(RAY_ORIGIN).normalize();

    steps = [];
    let t = 0;
    for (let i = 0; i < MAX_STEPS; i++) {
        const pos  = RAY_ORIGIN.clone().addScaledVector(dir, t);
        const dist = sdSphere(pos);
        const hit  = dist < HIT_THRESH;
        const miss = t > MAX_DIST;
        steps.push({ pos, dist, t, hit, miss, dir: dir.clone() });
        if (hit || miss) break;
        t += dist;
    }

    currentStep = 0;
    updateViz();
}

// ---- Update visualization ----
function updateViz() {
    dotPool.forEach(d  => d.visible = false);
    ringPool.forEach(r => r.visible = false);
    curRing.visible = false;

    if (steps.length === 0) return;

    const cur = steps[currentStep];

    for (let i = 0; i <= currentStep; i++) {
        const s     = steps[i];
        const isCur = i === currentStep;

        dotPool[i].position.copy(s.pos);
        dotPool[i].visible = true;
        dotPool[i].material.color.set(isCur ? 0xffffff : 0x2266cc);

        if (!isCur && Math.abs(s.dist) > 0.02) {
            ringPool[i].position.copy(s.pos);
            ringPool[i].scale.setScalar(Math.abs(s.dist));
            ringPool[i].visible = true;
        }
    }

    // Current step ring — color by state
    curRing.position.copy(cur.pos);
    curRing.scale.setScalar(Math.max(Math.abs(cur.dist), 0.02));
    curRing.visible = true;

    if (cur.hit) {
        curRingMat.color.set(0x44ff44);
    } else if (cur.miss) {
        curRingMat.color.set(0xff4444);
    } else if (Math.abs(cur.dist) / SPHERE_RADIUS < 0.25) {
        curRingMat.color.set(0xff9900);
    } else {
        curRingMat.color.set(0xffff44);
    }

    // Ray line: origin → current pos, extended slightly further
    const ext = cur.pos.clone().addScaledVector(cur.dir, Math.max(Math.abs(cur.dist) * 0.5, 0.4));
    rayLineGeo.setFromPoints([RAY_ORIGIN.clone(), ext]);

    // Info panel
    document.getElementById('i-step').textContent = currentStep;
    document.getElementById('i-dist').textContent = cur.dist.toFixed(4);
    document.getElementById('i-t').textContent    = cur.t.toFixed(4);

    const statusEl = document.getElementById('i-status');
    if (cur.hit)       statusEl.innerHTML = 'status &nbsp;: <span class="hit">HIT</span>';
    else if (cur.miss) statusEl.innerHTML = 'status &nbsp;: <span class="miss">MISS</span>';
    else               statusEl.innerHTML = '';

    document.getElementById('step-counter').textContent =
        `step ${currentStep + 1} / ${steps.length}`;
}

// ---- Playback ----
let playTimer = null;
const btnPlay = document.getElementById('btn-play');

function stopPlay() {
    if (playTimer) { clearInterval(playTimer); playTimer = null; }
    btnPlay.textContent = '▶ play';
    btnPlay.classList.remove('active');
}

function startPlay() {
    btnPlay.textContent = '⏸ pause';
    btnPlay.classList.add('active');
    playTimer = setInterval(() => {
        if (currentStep < steps.length - 1) { currentStep++; updateViz(); }
        else stopPlay();
    }, 550);
}

document.getElementById('btn-prev').addEventListener('click', () => {
    stopPlay();
    if (currentStep > 0) { currentStep--; updateViz(); }
});

document.getElementById('btn-next').addEventListener('click', () => {
    stopPlay();
    if (currentStep < steps.length - 1) { currentStep++; updateViz(); }
});

btnPlay.addEventListener('click', () => {
    if (playTimer) { stopPlay(); return; }
    if (currentStep >= steps.length - 1) currentStep = 0;
    startPlay();
});

window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowRight') {
        stopPlay();
        if (currentStep < steps.length - 1) { currentStep++; updateViz(); }
    }
    if (e.code === 'ArrowLeft') {
        stopPlay();
        if (currentStep > 0) { currentStep--; updateViz(); }
    }
    if (e.code === 'Space') {
        e.preventDefault();
        if (playTimer) { stopPlay(); return; }
        if (currentStep >= steps.length - 1) currentStep = 0;
        startPlay();
    }
});

// ---- Aim sliders ----
document.getElementById('aim-x').addEventListener('input', (e) => {
    aimX = parseFloat(e.target.value);
    document.getElementById('aim-x-val').textContent = aimX.toFixed(2);
    stopPlay();
    computeSteps();
});

document.getElementById('aim-y').addEventListener('input', (e) => {
    aimY = parseFloat(e.target.value);
    document.getElementById('aim-y-val').textContent = aimY.toFixed(2);
    stopPlay();
    computeSteps();
});

// ---- Render loop ----
function animate() {
    requestAnimationFrame(animate);
    orbit.update();
    renderer.render(scene, camera);
}

computeSteps();
animate();
