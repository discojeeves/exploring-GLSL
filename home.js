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

    function resetCamera() {
        orbit.enableDamping = false;
        orbit.update();
        orbit.reset();
        orbit.enableDamping = true;
        orbit.enableZoom = false;
        setTimeout(() => { orbit.enableZoom = true; }, 500);
    }

    return { orbit };
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

    const cardAMat = new three.MeshPhysicalMaterial({ map: previewTexture, roughness: 0.5, metalness: 0.2, side: three.DoubleSide });
    const cardAGeom = new three.PlaneGeometry(6, 4);
    const cardA = new three.Mesh(cardAGeom, cardAMat);
    cardA.name = "cardA";

    cardA.position.set(0, 0, 0);
    scene.add(cardA);

    const light = new three.DirectionalLight(0xffffff, 1);
    light.position.set(-5, 10, 8);
    scene.add(light);
    
    return { scene, backgroundColor };
}


function setupListeners(scene) {
    const mouse = new three.Vector2();
    const raycaster = new three.Raycaster();
    const cardA = scene.getObjectByName("cardA");
    
    window.addEventListener('mousemove', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
    

    return { mouse, raycaster };
}




// ─── Render loop ──────────────────────────────────────────────────────────────

function startRenderLoop(renderer, scene, camera, controls, listenerReturn) {
    const { orbit } = controls;
    const { mouse, raycaster } = listenerReturn;
    const cardA = scene.getObjectByName("cardA");
        const cardGhost = cardA.clone();
    let currentX = 0;
    let currentY = 0;
    let logged = 0;

    // const clock     = new three.Clock();
    // const startTime = performance.now();


    function render() {
        requestAnimationFrame(render);

        orbit.update();
        raycaster.setFromCamera(mouse, camera);

        const intersect = raycaster.intersectObject(cardGhost);

        // if (logged <= 10) {console.log(intersect); console.log(intersect.length == 0); logged += 1;}


        if (intersect.length !== 0) { 


            const interX = intersect[0].uv.x * 2 - 1;
            const interY = intersect[0].uv.y * 2 - 1;

            const maxAngle = 15;
            const targetY  = maxAngle * interX;
            const targetX = maxAngle * interY;
            
            //LEFT-RIGHT ROTATION
            if (Math.abs(targetY - currentY) >= 0.01) {
                currentY += ((targetY - currentY) * 0.05);
                const radY = three.MathUtils.degToRad(currentY);

                cardA.rotation.y = radY;
            }
            //UP-DOWN ROTATION
            if (Math.abs(targetX - currentX) >= 0.01) {
                currentX += ((targetX - currentX) * 0.05);
                const radX = three.MathUtils.degToRad(currentX);
                cardA.rotation.x = -radX;
            }
        }
        //RESET ROTATION
        if (intersect.length == 0) {

            //LEFT-RIGHT RESET
            if (Math.abs(0 - currentY) >= 0.01) {
                currentY += ((0 - currentY) * 0.05);
                const radY = three.MathUtils.degToRad(currentY);
                cardA.rotation.y = radY;
            }
            //UP-DOWN RESET
            if (Math.abs(0 - currentX) >= 0.01) {
                currentX += ((0 - currentX) * 0.05);
                const radX = three.MathUtils.degToRad(currentX);
                cardA.rotation.x = -radX;
            }
            
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
const listenerReturn             = setupListeners(scene);


startRenderLoop(renderer, scene, camera, controls, listenerReturn);

