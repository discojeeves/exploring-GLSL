import * as three              from 'three';
import { OrbitControls }       from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from '/node_modules/three/examples/jsm/controls/PointerLockControls.js';
import GUI                     from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

//————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

async function loadShaders() {
    return Promise.all([
        fetch('shaders/vert.glsl').then(r => r.text()),
        fetch('shaders/frag.glsl').then(r => r.text()),
    ]);
}

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

function setupScene(renderer) {
    const scene = new three.Scene();
    const backgroundColor = new three.Color(0x000000);
    renderer.setClearColor(backgroundColor, 1);

    const light = new three.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1);
    scene.add(light);

    return { scene, backgroundColor };
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

    document.getElementById('reset').addEventListener('click', resetCamera);

    return { orbit, fp, params, keys, isFirstPerson: () => isFirstPerson };
}

function buildUniforms(camera, backgroundColor, materials) {
    const MAX_MATERIALS = 8;

    return {
        u_hitThresh:        { value: 0.001 },
        u_maxDist:          { value: 50 },
        u_maxSteps:         { value: 200 },

        u_clearColor:       { value: backgroundColor },
        u_resolution:       { value: new three.Vector2() },

        u_camPos:           { value: camera.position },
        u_camToWorldMat:    { value: camera.matrixWorld },
        u_camInvProjMat:    { value: camera.projectionMatrixInverse },

        u_diffIntensity:    { value: 5 },
        u_ambientIntensity: { value: 0.15 },

        u_lightColor:       { value: new three.Color(1, 1, 1) },
        u_lightDir:         { value: new three.Vector3(0.5, 0.65, 0.85) },
        u_maxMaterials:     { value: MAX_MATERIALS },

        // u_matColors:        { value: Array.from({ length: MAX_MATERIALS }, (_, i) =>
        //                         i < materials.length ? new three.Color(materials[i].color) : new three.Color(0, 0, 0)) },
        // u_matRoughness:     { value: Array.from({ length: MAX_MATERIALS }, (_, i) =>
        //                         i < materials.length ? materials[i].roughness : 0) },

        u_time:             { value: 0 },
    };
}

function buildRaymarchPlane(camera, scene, vert, frag, uniforms) {
    const geometry = new three.PlaneGeometry();
    const material = new three.ShaderMaterial( { vertexShader : vert, fragmentShader: frag, uniforms } );

    const nearPlaneWidth  = camera.near * Math.tan(three.MathUtils.degToRad(camera.fov / 2)) * camera.aspect * 2;
    const nearPlaneHeight = nearPlaneWidth / camera.aspect;
    const plane = new three.Mesh(geometry, material);
    plane.position.set(0, 0, -camera.near);
    plane.scale.set(nearPlaneWidth, nearPlaneHeight, 1);

    scene.add(camera);
    camera.add(plane);
}








function startRenderLoop(renderer, scene, camera, controls, uniforms) {
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

        uniforms.u_time.value = (performance.now() - startTime) / 1000;
        renderer.render(scene, camera);
    }
    render();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const [vert, frag] = await loadShaders();

const renderer              = setupRenderer();
const camera                = setupCamera();
const { scene, backgroundColor } = setupScene(renderer);
const controls              = setupControls(camera, renderer);
const uniforms              = buildUniforms(camera, backgroundColor);

buildRaymarchPlane(camera, scene, vert, frag, uniforms);
startRenderLoop(renderer, scene, camera, controls, uniforms);
