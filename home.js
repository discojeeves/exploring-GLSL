import * as three                   from 'three';
import { OrbitControls }            from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls }      from 'three/addons/controls/PointerLockControls.js'
import { Text }                     from 'troika-three-text'
// import GUI                     from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';
// import { plane, ReflectorForSSRPass }               from 'three/addons/Addons.js';

// ─── Class ────────────────────────────────────────────────────────────────────
class Card extends three.Mesh {
    constructor(geometry, material) {
        super(geometry, material);
        
        this.currentX = 0;
        this.currentY = 0;
    }

    updateTilt(targetX, targetY, easingSpeed, rotLerpThreshold) {
        if (Math.abs(targetX - this.currentX) >= rotLerpThreshold) {
            this.currentX += (targetX - this.currentX) * easingSpeed; 
            this.rotation.x = -three.MathUtils.degToRad(this.currentX);
        }
        if (Math.abs(targetY - this.currentY) >= rotLerpThreshold) {
            this.currentY += (targetY - this.currentY) * easingSpeed; 
            this.rotation.y = three.MathUtils.degToRad(this.currentY);
        }
    }

}


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
    const cardA = new Card(cardAGeom, cardAMat);

    cardA.position.set(0, 0, 0);
    scene.add(cardA);

    const light = new three.DirectionalLight(0xffffff, 1);
    light.position.set(-5, 10, 8);
    scene.add(light);

    const cardArray = [cardA];
    
    return { scene, backgroundColor, cardArray };
}


function setupListeners() {
    const mouse = new three.Vector2();
    const raycaster = new three.Raycaster();
    
    window.addEventListener('mousemove', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
    

    return { mouse, raycaster };
}


// ─── Render loop ──────────────────────────────────────────────────────────────

function startRenderLoop(renderer, sceneReturn, camera, controls, listenerReturn) {
    const { orbit } = controls;
    const { mouse, raycaster } = listenerReturn;
    const {scene, backgroundColor, cardArray} = sceneReturn;
    const focusCard = cardArray[0];
    //keep intersection point static so card rotates like I want :)
    const focusGhost = focusCard.clone();

    const easingSpeed = 0.08;
    const rotLerpThreshold = 0.01; 
    const maxAngleDeg = 17.5;

    function render() {
        requestAnimationFrame(render);
        orbit.update(); 

        raycaster.setFromCamera(mouse, camera);
        const intersect = raycaster.intersectObject(focusGhost);

        //if intersecting, store X,Y coords of intersection (with 0,0 at the center of face)
        const interX = intersect.length > 0 ? intersect[0].uv.x * 2 - 1: null;
        const interY = intersect.length > 0 ? intersect[0].uv.y * 2 - 1: null;

        //if not intersecting, target angle is back to 0
        const targetX = intersect.length !== 0 ? maxAngleDeg * interY : 0;
        const targetY = intersect.length !== 0 ? maxAngleDeg * interX : 0;

        focusCard.updateTilt(targetX, targetY, easingSpeed, rotLerpThreshold);

        

        renderer.render(scene, camera);
    }

    render();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const renderer                   = setupRenderer();
const camera                     = setupCamera();
const controls                   = setupControls(camera, renderer);
const sceneReturn                = setupScene(renderer);
const listenerReturn             = setupListeners();


startRenderLoop(renderer, sceneReturn, camera, controls, listenerReturn);

