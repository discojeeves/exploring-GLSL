import * as three                   from 'three';
import { OrbitControls }            from 'three/addons/controls/OrbitControls.js';


// ─── Config ────────────────────────────────────────────────────────────────────
const projects =
    [
        { title: "raymarching", link: "projects/basic-raymarching/index.html",   texture: "assets/textures/rm_prev.png" },
        { title: "fractal", link: "projects/fractal/index.html", texture: "assets/textures/letterB.png", },
        { title: "proj3",  link: "https://www.enovate.co.uk/blog/html5-placeholder-links", texture: ""},
    ]

const CARD_W = 6;
const CARD_H = 4;
const CARD_GAP = 0.1;
const TILT_EASE = 0.1;
const TILT_THRESH = 0.01;
const MAX_TILT = 8;

// ─── Classes ────────────────────────────────────────────────────────────────────
class Card extends three.Mesh {
    tiltX = 0;
    tiltY = 0;
    link = 'https://en.wikipedia.org/wiki/Software_bug'; //default link for debug

    constructor(geometry, material, name) {
        super(geometry, material);
        this.name = name;

        this.ghost = new three.Mesh(geometry);
    }

    updateTilt(targetX, targetY) {
        if (Math.abs(targetX - this.tiltX) >= TILT_THRESH) {
            this.tiltX += (targetX - this.tiltX) * TILT_EASE;
            this.rotation.x = -three.MathUtils.degToRad(this.tiltX);
        }
        if (Math.abs(targetY - this.tiltY) >= TILT_THRESH) {
            this.tiltY += (targetY - this.tiltY) * TILT_EASE;
            this.rotation.y = three.MathUtils.degToRad(this.tiltY);
        }
    }
    syncGhost() {
        if (!this.position.equals(this.ghost.position)) {
            this.ghost.position.copy(this.position);
            this.ghost.updateMatrixWorld();
        }
    }
}
// ─── edge highlighting ────────────────────────────────────────────────────────
// —— want to replace this with better graphics eventually, too flat 
const edgeEl = document.querySelector('.edge-glow');
const distThresh = 300;

window.addEventListener('mousemove', (e) => {
    const distLeft = e.clientX;
    const distRight = window.innerWidth - e.clientX;

    const glowIntensity = (dist) => {
        if (dist > distThresh) return 0;

        //normalize val from 0 -> 0.5 by div by (2*thresh) 
        return (Math.abs(dist - distThresh)) / (2 * distThresh);
    }
    edgeEl.style.setProperty('--left-glow', glowIntensity(distLeft));
    edgeEl.style.setProperty('--right-glow', glowIntensity(distRight));
});

// ─── Setup ────────────────────────────────────────────────────────────────────

function createState() {
    return {
        renderer: null,
        camera: null,
        orbit: null,
        scene: null,
        backgroundColor: null,
        currIndex : 0,
        cardArr: [],
        mouse: new three.Vector2(),
        raycaster: new three.Raycaster(),
    };
}

function initRenderer(state) {
    state.renderer = new three.WebGLRenderer({ antialias: true });
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.renderer.setPixelRatio(window.devicePixelRatio);
    state.backgroundColor = new three.Color(0.01, 0.01, 0.01);
    state.renderer.setClearColor(state.backgroundColor, 1);
    document.body.appendChild(state.renderer.domElement);
}

function initCamera(state) {
    state.camera = new three.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    state.camera.position.z = 5;
}

function initControls(state) {
    const camera = state.camera;
    const renderer = state.renderer;
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    state.orbit = orbit;
    
}

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
        const clickIntersect = state.raycaster.intersectObject(state.cardArr[state.currIndex].ghost);
        if (clickIntersect.length !== 0) {
            window.open(state.cardArr[state.currIndex].link, '_blank');
        }
    });

    //CYCLE L/R
    const cycleL = document.getElementById("leftEdge");
    const cycleR = document.getElementById("rightEdge");

    //left
    cycleL.addEventListener('click', (e) => {
        state.currIndex = (state.currIndex - 1 + state.cardArr.length) % state.cardArr.length;

        // state.currIndex =(state.currIndex + 1) % state.cardArr.length;
    });
    //right
    cycleR.addEventListener('click', (e) => {
        // state.currIndex = (state.currIndex - 1 + state.cardArr.length) % state.cardArr.length;
        state.currIndex =(state.currIndex + 1) % state.cardArr.length;
    });
}

// ─── Scene ────────────────────────────────────────────────────────────────────


function initCards(state) {
    const geo = new three.PlaneGeometry(CARD_W, CARD_H);
    const textureLoader = new three.TextureLoader();

    projects.forEach((proj, i) => {
        const mat = new three.MeshPhysicalMaterial({ roughness: 0.5, metalness: 0.2, side: three.DoubleSide });
        textureLoader.load(
            proj.texture,
            // onLoad
            (loadedTexture) => {
                console.log('Texture loaded successfully!');
                if (loadedTexture.image && loadedTexture.image.width > 0) {
                    loadedTexture.colorSpace = three.SRGBColorSpace;
                    mat.map = loadedTexture;
                    mat.needsUpdate = true;
                }
            },
            undefined, // dont need an onProgress callback
            // onError
            (err) => {
                console.warn(`Had trouble loading the texture for card "${proj.title}", defaulting to fallback.`);
                const canvas = Object.assign(document.createElement('canvas'), { width: 512, height: 512 });
                const ctx = Object.assign(canvas.getContext('2d'), {
                    fillStyle: '#FBFAF5',
                    font: 'bold 48px sans-serif',
                    textAlign: 'center',
                });
                ctx.fillText(proj.title, 256, 256);
                const fallbackTexture = new three.CanvasTexture(canvas);
                fallbackTexture.colorSpace = three.SRGBColorSpace;
                mat.map = fallbackTexture;
                mat.needsUpdate = true;
            }
        );

        state.cardArr[i] = new Card(geo, mat, proj.title);
    });
}


function initScene(state) {
    state.scene = new three.Scene();
    const light = new three.DirectionalLight(0xffffff, 1);
    light.position.set(-5, 10, 8);
    state.scene.add(light);

    initCards(state);

    state.cardArr.forEach((card, i) => {
        card.position.x = (10 * i) - 10;
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

function grid(state) {
    const size = 100;
    const divisions = 100;
    const gridHelper = new three.GridHelper(size, divisions);
    gridHelper.position.y = -2;
    state.scene.add(gridHelper);

    const axes = new three.AxesHelper(50);
    state.scene.add(axes);
}
// ─── Render funcs ─────────────────────────────────────────────────────────────
function raycast(state) {
    const focusCard = state.cardArr[state.currIndex];
    state.raycaster.setFromCamera(state.mouse, state.camera);
    return state.raycaster.intersectObject(focusCard.ghost);
}

// ─── Render loop ──────────────────────────────────────────────────────────────

function initRenderLoop(state) {
    function render() {
        requestAnimationFrame(render);
        state.orbit.update();
        const focusCard = state.cardArr[state.currIndex];

        const intersect = raycast(state);
        const isHit = (intersect.length > 0);

        //if intersecting, store X,Y coords of intersection (with 0,0 at the center of face)
        const interX = isHit ? intersect[0].uv.x * 2 - 1: null;
        const interY = isHit ? intersect[0].uv.y * 2 - 1: null;

        //calc target angle to rotate by if hit, else target is 0
        const targetX = isHit ? MAX_TILT * interY : 0;
        const targetY = isHit ? MAX_TILT * interX : 0;

        // console.log("---------------------");
        state.cardArr.forEach((card, i) => {
            //if card is not focus card, ease back to 0 rot
            if (i != state.currIndex) card.updateTilt(0, 0);
            // console.log(`
            //     card name: ${card.name}
            //     card pos: (${card.position.x}, ${card.position.y}, ${card.position.z})
            //     currindex: ${state.currIndex}
            //     `);
        });


        focusCard.updateTilt(targetX, targetY);

        state.renderer.render(state.scene, state.camera);
    }

    render();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const state = createState();
initRenderer(state);
initCamera(state);
initControls(state);

initListeners(state);

initScene(state);
grid(state);


initRenderLoop(state);

