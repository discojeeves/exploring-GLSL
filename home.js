import * as three              from 'three';
        import { OrbitControls }       from 'three/addons/controls/OrbitControls.js';
        import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
        import GUI                     from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

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
    // camera.position.z = 5;
    return camera;
}

function setupControls(camera, renderer) {
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    return orbit;
}

function setupScene(renderer) {
    const scene = new three.Scene();
    const backgroundColor = new three.Color(0.1, 0.1, 0.1);
    renderer.setClearColor(backgroundColor, 1);


    const box1Geom = new three.BoxGeometry(1, 1, 1);
    const box1Mat = new three.MeshBasicMaterial({ color: new three.Color(0., 0.2, 0.7) })
    const box1 = new three.Mesh(box1Geom, box1Mat);

    box1.position.set(0, 0, 0);
    scene.add(box1);

    const sphereGeom = new three.SphereGeometry(1);
    const sphereMat = new three.MeshBasicMaterial({ color: new three.Color(0.4, 0.4, 0.0) })
    const sphere = new three.Mesh(sphereGeom, sphereMat);

    sphere.position.set(4, 0, 7);
    scene.add(sphere);


    return { scene, backgroundColor };
}

function setupGUI() {
    const gui = new GUI({title: 'Debug'});

    const controls = {
        orbit: false
    }
    
}

// ─── Camera Stuff ────────────────────────────────────────────────────────────────────

function waypointCam(camera) {
    const stops = [
        { position: new three.Vector3(0, 0, 2), lookAt: new three.Vector3(0, 0, 0) },

        { position: new three.Vector3(2, 0, 9), lookAt: new three.Vector3(4, 0, 7) },
    ]

    let stopIndex = 0;
    let currentLookAt = stops[stopIndex].lookAt.clone();

    camera.position.copy( stops[stopIndex].position );
    camera.lookAt( currentLookAt );
    
    const screenFifth = window.innerWidth / 5;
    window.addEventListener('click', (event) => {
        
        if (event.clientX > screenFifth * 4) {
            stopIndex = Math.min(stopIndex + 1, stops.length - 1);

            console.log('right side');
            console.log(`
                camera position: (${camera.position.x}, ${camera.position.y}, ${camera.position.z})
                stopIndex: ${stopIndex}
                stop position: (${ stops[stopIndex].position.x }, ${ stops[stopIndex].position.y }, ${ stops[stopIndex].position.z })
                stop lookAt: (${ stops[stopIndex].lookAt.x }, ${ stops[stopIndex].lookAt.y }, ${ stops[stopIndex].lookAt.z })
            `);
        }

        if (event.clientX < screenFifth) {

            stopIndex = Math.max(stopIndex - 1, 0);
            
            console.log('left side');
            console.log(`
                camera position: (${camera.position.x}, ${camera.position.y}, ${camera.position.z})
                stopIndex: ${stopIndex}
                stop position: (${ stops[stopIndex].position.x }, ${ stops[stopIndex].position.y }, ${ stops[stopIndex].position.z })
                stop lookAt: (${ stops[stopIndex].lookAt.x }, ${ stops[stopIndex].lookAt.y }, ${ stops[stopIndex].lookAt.z })
            `);
        }
    });
    function update() {
        const target = stops[stopIndex].position;
        const lookAtTarget = stops[stopIndex].lookAt;
        // console.log(`
        //     -------------UPDATE RAN-------------
        //     stopIndex: ${stopIndex}
        //     camera pos: (${camera.position.x}, ${camera.position.y}, ${camera.position.z})
        //     target pos: (${target.x}, ${target.y}, ${target.z})
        //     currentLookAt: (${currentLookAt.x}, ${currentLookAt.y}, ${currentLookAt.z})
        //     lookAtTarget: (${lookAtTarget.x}, ${lookAtTarget.y}, ${lookAtTarget.z})
        // `)
        
        if (camera.position.distanceTo(target) > 0.01) { 
            // console.log(`
            //     PRE LERP +++++++++++
            //     stopIndex: ${stopIndex}
            //     camera pos: (${camera.position.x}, ${camera.position.y}, ${camera.position.z})
            //     target: (${target.x}, ${target.y}, ${target.z})
            //     ++++++++++++++++++++
            // `)
            camera.position.lerp(target, 0.1);
            // console.log(`
            //     POST LERP ----------
            //     stopIndex: ${stopIndex}
            //     camera pos: (${camera.position.x}, ${camera.position.y}, ${camera.position.z})
            //     target: (${target.x}, ${target.y}, ${target.z})
            //     --------------------
            // `)
        }
        if (currentLookAt.distanceTo(lookAtTarget) > 0.01) {
            // console.log(`
            //     PRE LERP +++++++++++
            //     stopIndex: ${stopIndex}
            //     currentLookAt: (${currentLookAt.x}, ${currentLookAt.y}, ${currentLookAt.z})
            //     lookAtTarget: (${lookAtTarget.x}, ${lookAtTarget.y}, ${lookAtTarget.z})
            //     ++++++++++++++++++++
            //`)
            currentLookAt.lerp(lookAtTarget, 0.1);
            camera.lookAt(currentLookAt);
            // console.log(`
            //     POST LERP ----------
            //     stopIndex: ${stopIndex}
            //     currentLookAt: (${currentLookAt.x}, ${currentLookAt.y}, ${currentLookAt.z})
            //     lookAtTarget: (${lookAtTarget.x}, ${lookAtTarget.y}, ${lookAtTarget.z})
            //     --------------------`)
        }
    }
    return update;
}


// camera.position.copy( stops[stopIndex].position );
// camera.lookAt( stops[stopIndex].lookAt );
// controls.target.copy( stops[stopIndex].lookAt );

// ─── Render loop ──────────────────────────────────────────────────────────────

function startRenderLoop(renderer, scene, camera, controls, updateCamera) {

    function render() {
        requestAnimationFrame(render);

        updateCamera();
        renderer.render(scene, camera);

    }

    render();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const renderer              = setupRenderer();
const camera                = setupCamera();
// const controls              = setupControls(camera, renderer);
const { scene, backgroundColor } = setupScene(renderer);
const updateCamera = waypointCam(camera);
startRenderLoop(renderer, scene, camera, null, updateCamera);


