import * as three                   from 'three';
import { OrbitControls }            from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls }      from 'three/addons/controls/PointerLockControls.js'
import { Text }                     from 'troika-three-text'
// import GUI                     from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';
// import { plane, ReflectorForSSRPass }               from 'three/addons/Addons.js';

// ─── Classes ────────────────────────────────────────────────────────────────────
class Card extends three.Mesh {
    static #currIndex = 0;
    rotX = 0;
    rotY = 0;
    link = 'https://en.wikipedia.org/wiki/Software_bug'; //default link for debug

    constructor(geometry, material, name) {
        super(geometry, material);
        this.ghost = new three.Mesh(geometry, material);
        this.name = name;
    }

    static get currentIndex() {
        return Card.#currIndex;
    }

    static set currentIndex(value) {
        Card.#currIndex = value;
    }

    updateTilt(targetX, targetY, easingSpeed, rotLerpThreshold) {
        if (Math.abs(targetX - this.rotX) >= rotLerpThreshold) {
            this.rotX += (targetX - this.rotX) * easingSpeed; 
            this.rotation.x = -three.MathUtils.degToRad(this.rotX);
        }
        if (Math.abs(targetY - this.rotY) >= rotLerpThreshold) {
            this.rotY += (targetY - this.rotY) * easingSpeed; 
            this.rotation.y = three.MathUtils.degToRad(this.rotY);
        }
    }
    syncGhost(){
        if (!this.position.equals(this.ghost.position))  {
            this.ghost.position.copy(this.position);
            this.ghost.updateMatrixWorld();
        }
    }

    // updateTrackPos(curve, currentIndex, length, tOffset) {

    // }

}


// ─── Setup ────────────────────────────────────────────────────────────────────
//CSS LOGIC//
const edgeEl = document.querySelector('.edge-glow');
const distThresh = 300;

window.addEventListener('mousemove', (e) => {
    const { clientX: x, clientY: y } = e;
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    const distLeft = x;
    const distRight = w - x;

    const glowIntensity = (dist) => {
        if (dist > distThresh) return 0;
        //normalize val from 0 -> 0.5 by div by 600 (2*thresh) 
        const result = (Math.abs(dist - distThresh)) / 600;
        return result;
    }
    edgeEl.style.setProperty('--left-glow', glowIntensity(distLeft));
    edgeEl.style.setProperty('--right-glow', glowIntensity(distRight));
});
//—————————//

function createState() {
    return {
        renderer: null,
        camera: null,
        orbit: null,
        scene: null,
        backgroundColor: null,
        cardArr: [],
        mouse: new three.Vector2(),
        raycaster: new three.Raycaster(),
    };
}
//basics//
function initRenderer(state) {
    state.renderer = new three.WebGLRenderer({ antialias: true });
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(state.renderer.domElement);
}

function initCamera(state) {
    state.camera = new three.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    state.camera.position.z = 5;
}

// function initControls(camera, renderer) {
//     const orbit = new OrbitControls(camera, renderer.domElement);
//     orbit.enableDamping = true;
//     return { orbit };
// }
//——————//


function initListeners(state) {
    
    //RESIZE LISTENER
    window.addEventListener('resize', () => {
        state.camera.aspect = window.innerWidth / window.innerHeight;
        state.camera.updateProjectionMatrix();
        state.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    //MOUSE POSITION
    window.addEventListener('mousemove', (e) => {
        state.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        state.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    });

    //LINK LOGIC
    window.addEventListener('click',(e) => {
        state.raycaster.setFromCamera(state.mouse, state.camera);
        const clickIntersect = state.raycaster.intersectObject(state.cardArr[Card.currentIndex].ghost);
        if (clickIntersect.length !== 0) {
            window.open(state.cardArr[Card.currentIndex].link, '_blank');
        }
    });

    //CYCLE L/R
    const cycleL = document.getElementById("leftEdge");
    const cycleR = document.getElementById("rightEdge");

    //left
    cycleL.addEventListener('click', (e) => {
        Card.currentIndex =(Card.currentIndex + 1) % state.cardArr.length;
    });
    //right
    cycleR.addEventListener('click', (e) => {
        Card.currentIndex = (Card.currentIndex - 1 + state.cardArr.length) % state.cardArr.length;
    });
}

// ─── Scene ────────────────────────────────────────────────────────────────────

function initTextures() {
    const textureLoader = new three.TextureLoader();
    const rmPrev = textureLoader.load('projects/basic-raymarching/preview.png');
    // const fracPrev = textureLoader.load('');
    return { rmPrev };
}

function initCards() {
    const { rmPrev } = initTextures();

    const rmCardGeo = new three.PlaneGeometry(6, 4);
    const rmCardMat = new three.MeshPhysicalMaterial({ map: rmPrev, roughness: 0.5, metalness: 0.2, side: three.DoubleSide });
    const rmCard = new Card(rmCardGeo, rmCardMat, "rm");
    rmCard.position.set(0, 0, 0);

    const fracCardGeo = new three.PlaneGeometry(6, 4);
    const fracCardMat = new three.MeshPhysicalMaterial({ roughness: 0.1, metalness: 0.8, side: three.DoubleSide });
    const fracCard = new Card(fracCardGeo, fracCardMat, "frac");
    fracCard.position.set(-8, 0, 0);

    const thirdCardGeo = new three.PlaneGeometry(6, 4);
    const thirdCardMat = new three.MeshPhysicalMaterial({ roughness: 0.1, metalness: 0.8, side: three.DoubleSide });
    const thirdCard = new Card(thirdCardGeo, thirdCardMat, "third");
    thirdCard.position.set(8, 0, 0);

    const cardArr = [rmCard, fracCard, thirdCard];
    return cardArr;
}

function initScene(state) {
    state.scene = new three.Scene();
    state.backgroundColor = new three.Color(0.01, 0.01, 0.01);
    state.renderer.setClearColor(state.backgroundColor, 1);

    const light = new three.DirectionalLight(0xffffff, 1);
    light.position.set(-5, 10, 8);

    state.scene.add(light);

    // const creationPoints = [];
    // const curve = new three.CatmullRomCurve3(creationPoints);

    state.cardArr = initCards();
    const N = state.cardArr.length;

    state.cardArr.forEach(card => {
        card.syncGhost();
        state.scene.add(card);

        // debug
        //see ghosts
        // scene.add(element.ghost);
        // console.log(`${element.name}: (${element.position.x}, ${element.position.y}, ${element.position.z})`);
        // console.log("ghosts:");
        // console.log(`${element.name}: (${element.ghost.position.x}, ${element.ghost.position.y}, ${element.ghost.position.z})`);

    });

}

// ─── Render loop ──────────────────────────────────────────────────────────────

function initRenderLoop(state) {
    const easingSpeed = 0.1;
    const rotLerpThreshold = 0.01; 
    const maxAngleDeg = 8;

    function render() {
        requestAnimationFrame(render);
        const focusCard = state.cardArr[Card.currentIndex];

        state.raycaster.setFromCamera(state.mouse, state.camera);
        const intersect = state.raycaster.intersectObject(focusCard.ghost);
        const isHit = (intersect.length > 0);

        //if intersecting, store X,Y coords of intersection (with 0,0 at the center of face)
        
        const interX = isHit ? intersect[0].uv.x * 2 - 1: null;
        const interY = isHit ? intersect[0].uv.y * 2 - 1: null;

        //calc target angle to rotate by if hit, else target is 0
        const targetX = isHit ? maxAngleDeg * interY : 0;
        const targetY = isHit ? maxAngleDeg * interX : 0;

        
        state.cardArr.forEach((card, i) => {
            //if card is not focus card, ease back to 0 rot
            if (i != Card.currentIndex) card.updateTilt(0, 0, easingSpeed, rotLerpThreshold);
        });


        focusCard.updateTilt(targetX, targetY, easingSpeed, rotLerpThreshold);

        state.renderer.render(state.scene, state.camera);
    }

    render();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const state = createState();
initRenderer(state);
initCamera(state);
initScene(state);
initListeners(state);

initRenderLoop(state);

