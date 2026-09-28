import * as three                   from 'three';
import { OrbitControls }            from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls }      from 'three/addons/controls/PointerLockControls.js'
import { Text }                     from 'troika-three-text'
// import GUI                     from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';
// import { plane, ReflectorForSSRPass }               from 'three/addons/Addons.js';


// ─── Setup ────────────────────────────────────────────────────────────────────

function setupRenderer() {
    const renderer = new three.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);
    return renderer;
}

function setupCamera() {
    const camera = new three.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;
    return camera;
}

function setupControls(camera, renderer) {
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;

    const fp = new PointerLockControls(camera, document.body);
    const params = { moveSpeed: 5.0 };

    let isFirstPerson = false;

    fp.addEventListener('unlock', () => {
        isFirstPerson = false;
        orbit.enabled = true;
    });

    const keys = { w: false, a: false, s: false, d: false, e: false, q: false };

    window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'c') {
            isFirstPerson = !isFirstPerson;
            orbit.enabled = !isFirstPerson;
            if (isFirstPerson) fp.lock(); else fp.unlock();
        }
        if (e.key === 'h' || e.key === 'H') resetCamera();

        if (e.code === 'KeyW') keys.w = true;
        if (e.code === 'KeyA') keys.a = true;
        if (e.code === 'KeyS') keys.s = true;
        if (e.code === 'KeyD') keys.d = true;
        if (e.code === 'KeyE') keys.e = true;
        if (e.code === 'KeyQ') keys.q = true;
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'KeyW') keys.w = false;
        if (e.code === 'KeyA') keys.a = false;
        if (e.code === 'KeyS') keys.s = false;
        if (e.code === 'KeyD') keys.d = false;
        if (e.code === 'KeyE') keys.e = false;
        if (e.code === 'KeyQ') keys.q = false;
    });

    function resetCamera() {
        orbit.enableDamping = false;
        orbit.update();
        orbit.reset();
        orbit.enableDamping = true;
        orbit.enableZoom = false;
        setTimeout(() => { orbit.enableZoom = true; }, 500);
    }

    return { orbit, fp, params, keys, isFirstPerson: () => isFirstPerson };
}
// ─── Scene ────────────────────────────────────────────────────────────────────

function setupTextures() {
    const textureLoader = new three.TextureLoader();
    const previewTexture = textureLoader.load('projects/basic-raymarching/preview.png');
    
    return previewTexture;
}

function setupScene(renderer) {
    const scene = new three.Scene();
    const backgroundColor = new three.Color(0.01, 0.01, 0.01);
    renderer.setClearColor(backgroundColor, 1);

    const previewTexture = setupTextures();

    const cardMat = new three.MeshPhysicalMaterial({ map: previewTexture, roughness: 0.5, metalness: 0.2, side: three.DoubleSide });
    const cardGeom = new three.PlaneGeometry(6, 4);
    const card = new three.Mesh(cardGeom, cardMat);

    card.position.set(0, 0, 0);
    scene.add(card);

    const light = new three.DirectionalLight(0xffffff, 1);
    light.position.set(-5, 10, 8);
    scene.add(light);

    return { scene, backgroundColor };
}






// ─── Render loop ──────────────────────────────────────────────────────────────

function startRenderLoop(renderer, scene, camera, controls) {
    const { orbit, fp, params, keys, isFirstPerson } = controls;
    const clock     = new three.Clock();
    const startTime = performance.now();

    function render() {
        requestAnimationFrame(render);
        const delta = clock.getDelta();
        if (isFirstPerson() && fp.isLocked) {
            if (keys.w) fp.moveForward( params.moveSpeed * delta);
            if (keys.s) fp.moveForward(-params.moveSpeed * delta);
            if (keys.d) fp.moveRight(   params.moveSpeed * delta);
            if (keys.a) fp.moveRight(  -params.moveSpeed * delta);
            if (keys.e) camera.position.y += params.moveSpeed * delta;
            if (keys.q) camera.position.y -= params.moveSpeed * delta;
        } else {
            orbit.update();
        }

        renderer.render(scene, camera);

    }

    render();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const renderer                   = setupRenderer();
const camera                     = setupCamera();
const controls                   = setupControls(camera, renderer);
const { scene, backgroundColor } = setupScene(renderer);

startRenderLoop(renderer, scene, camera, controls);


