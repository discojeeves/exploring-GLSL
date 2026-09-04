import * as three              from 'three';
        import { OrbitControls }       from 'three/addons/controls/OrbitControls.js';
        import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
        import GUI                     from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';
        import { plane }               from 'three/addons/Addons.js';

// ─── GUI Setup ────────────────────────────────────────────────────────────────────


const gui = new GUI({title: 'Debug'});
const guiElement = gui.domElement;



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
   

    const fp = new PointerLockControls(camera, document.body);
    const params = { moveSpeed: 5.0 };

    let isFirstPerson = false;

    fp.addEventListener('unlock', () => {
        isFirstPerson = false;
        if (guiThing.orbit) {
            orbit.enabled = true;
        }
    });

    const keys = { w: false, a: false, s: false, d: false, e: false, q: false, shift: false};

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
        if (e.code === 'ShiftLeft') keys.shift = true;
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'KeyW') keys.w = false;
        if (e.code === 'KeyA') keys.a = false;
        if (e.code === 'KeyS') keys.s = false;
        if (e.code === 'KeyD') keys.d = false;
        if (e.code === 'KeyE') keys.e = false;
        if (e.code === 'KeyQ') keys.q = false;
        if (e.code === 'ShiftLeft') keys.shift = false;

    });

    function resetCamera() {
        orbit.enableDamping = false;
        orbit.update();
        orbit.reset();
        orbit.enableDamping = true;
        orbit.enableZoom = false;
        setTimeout(() => { orbit.enableZoom = true; }, 500);
    }

    // document.getElementById('reset').addEventListener('click', resetCamera);

    return { orbit, fp, params, keys, isFirstPerson: () => isFirstPerson };
}



// ─── Scene ────────────────────────────────────────────────────────────────────

function setupScene(renderer) {
    const scene = new three.Scene();
    const backgroundColor = new three.Color(0.1, 0.1, 0.1);
    renderer.setClearColor(backgroundColor, 1);

//  -------------------- WALLS 
    // const nWallGeom = new three.PlaneGeometry(20, 10);
    // const nWallMat = new three.MeshBasicMaterial( { color: new three.Color(0.5, 0.0, 0.1), side: three.DoubleSide });
    // const nWall = new three.Mesh(nWallGeom, nWallMat);
    // scene.add(nWall);

    // const sWallGeom = new three.PlaneGeometry(20, 10);
    // const sWallMat = new three.MeshBasicMaterial( { color: new three.Color(0., 0.0, 0.5), side: three.DoubleSide });
    // const sWall = new three.Mesh(sWallGeom, sWallMat);
    // scene.add(sWall);

    // const eWallGeom = new three.PlaneGeometry(20, 10);
    // const eWallMat = new three.MeshBasicMaterial( { color: new three.Color(0., 0.5, 0.0), side: three.DoubleSide });
    // const eWall = new three.Mesh(eWallGeom, eWallMat);
    // scene.add(eWall);

    // const wWallGeom = new three.PlaneGeometry(20, 10);
    // const wWallMat = new three.MeshBasicMaterial( { color: new three.Color(0.5, 0.5, 0.0), side: three.DoubleSide });
    // const wWall = new three.Mesh(wWallGeom, wWallMat);
    // scene.add(wWall);


    // nWall.position.set(0, 0, -10);

    // sWall.position.set(0, 0, 10);
    // sWall.rotateY(3.14159);

    // eWall.position.set(10, 0, 0);
    // eWall.rotateY(-90*3.14159/180);

    // wWall.position.set(-10, 0, 0);
    // wWall.rotateY(90*3.14159/180);
//  WALLS --------------------

// Frame

    frameotron(scene, 3, 4, 0.2, 0.2);

   
    gridotron(scene);
    return { scene, backgroundColor };
}

function gridotron(scene) {
    const size = 100;
    const divisions = 100;
    const gridHelper = new three.GridHelper( size, divisions );
    scene.add( gridHelper );

    const axes = new three.AxesHelper(50);
    scene.add(axes);
}

function frameotron(scene, width, height, thickness, depth) {
    const frameMat = new three.MeshBasicMaterial({ color : new three.Color(1, 0.8, 0.015) });
    //top edge
    //pos is height / 2 above center 
    const topGeom = new three.BoxGeometry(width, thickness, depth);
    const topEdge = new three.Mesh(topGeom, frameMat);
    scene.add(topEdge);
    topEdge.position.set(0, height/2, 0);

    //bottom edge
    //pos is height / 2 below center 
    const bottomGeom = new three.BoxGeometry(width, thickness, depth);
    const bottomEdge = new three.Mesh(bottomGeom, frameMat);
    scene.add(bottomEdge);
    bottomEdge.position.set(0, -height/2, 0);


    //left edge
    //height should be height - thickness
    const leftGeom = new three.BoxGeometry(thickness, height - thickness, depth);
    const leftEdge = new three.Mesh(leftGeom, frameMat);
    scene.add(leftEdge);
    leftEdge.position.set(-width/2 + thickness/2, 0, 0);

    //right edge
    const rightGeom = new three.BoxGeometry(thickness, height - thickness, depth);
    const rightEdge = new three.Mesh(rightGeom, frameMat);
    scene.add(rightEdge);
    rightEdge.position.set(width/2 - thickness/2, 0, 0);
}


// ─── Camera Stuff ────────────────────────────────────────────────────────────────────

function waypointCam(camera) {
    const stops = [
        { position: new three.Vector3(0, 0, 10), lookAt: new three.Vector3(0, 0, 0) },

        { position: new three.Vector3(2, 0, 9), lookAt: new three.Vector3(7, 0, 7) },

        { position: new three.Vector3(-5, 6, 15), lookAt: new three.Vector3(0, 0, 0) },

    ]

    let stopIndex = 0;
    let currentLookAt = stops[stopIndex].lookAt.clone();

   
    
    const screenFifth = window.innerWidth / 5;
    camera.position.copy( stops[stopIndex].position );
    camera.lookAt( currentLookAt );
        window.addEventListener('click', (event) => {
            
            if ( (event.clientX > screenFifth * 4 && !guiElement.contains(event.target)) && !orbit.enabled ) {
                stopIndex = Math.min(stopIndex + 1, stops.length - 1);
                // console.log('right side');
                // console.log(`
                //     camera position: (${camera.position.x}, ${camera.position.y}, ${camera.position.z})
                //     stopIndex: ${stopIndex}
                //     stop position: (${ stops[stopIndex].position.x }, ${ stops[stopIndex].position.y }, ${ stops[stopIndex].position.z })
                //     stop lookAt: (${ stops[stopIndex].lookAt.x }, ${ stops[stopIndex].lookAt.y }, ${ stops[stopIndex].lookAt.z })
                // `);
            }

            if ( (event.clientX < screenFifth && !guiElement.contains(event.target)) && !orbit.enabled ) {
                stopIndex = Math.max(stopIndex - 1, 0);
                // console.log('left side');
                // console.log(`
                //     camera position: (${camera.position.x}, ${camera.position.y}, ${camera.position.z})
                //     stopIndex: ${stopIndex}
                //     stop position: (${ stops[stopIndex].position.x }, ${ stops[stopIndex].position.y }, ${ stops[stopIndex].position.z })
                //     stop lookAt: (${ stops[stopIndex].lookAt.x }, ${ stops[stopIndex].lookAt.y }, ${ stops[stopIndex].lookAt.z })
                // `);
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
    const { orbit, fp, params, keys, isFirstPerson } = controls;
    const clock     = new three.Clock();
    const startTime = performance.now();

    function render() {
        requestAnimationFrame(render);
        const delta = clock.getDelta();

        if (isFirstPerson() && fp.isLocked) {
            if (keys.shift)  params.moveSpeed = 25.0;
            if (!keys.shift) params.moveSpeed = 5.0;
            if (keys.w) fp.moveForward( params.moveSpeed * delta);
            if (keys.s) fp.moveForward(-params.moveSpeed * delta);
            if (keys.d) fp.moveRight(   params.moveSpeed * delta);
            if (keys.a) fp.moveRight(  -params.moveSpeed * delta);
            if (keys.e) camera.position.y += params.moveSpeed * delta;
            if (keys.q) camera.position.y -= params.moveSpeed * delta;
        } else {
            //if gui orbit true, dont call update camera and TURN ON ORBIT CONTROLS 
            if (!orbit.enabled) {
                updateCamera();
            }
            if (orbit.enabled) {
                orbit.update();
            }
        }

        renderer.render(scene, camera);

    }

    render();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const renderer              = setupRenderer();
const camera                = setupCamera();

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
gui.add(orbit, 'enabled');

const controls              = setupControls(camera, renderer);
const { scene, backgroundColor } = setupScene(renderer);
const updateCamera = waypointCam(camera);
startRenderLoop(renderer, scene, camera, controls, updateCamera);


