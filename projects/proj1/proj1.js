import * as THREE from 'three';
        import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';

        const VERT_SRC = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        async function initBlock(blockEl) {
            const glslFile = blockEl.dataset.src;
            const initialSrc = glslFile 
                ? await fetch(glslFile).then(r => r.text()) 
                : 'void main(){gl_FragColor = vec4(1.0); }';
            const canvas     = blockEl.querySelector('.shader-canvas');
            const editorEl   = blockEl.querySelector('.shader-editor');
            const errorEl    = blockEl.querySelector('.shader-error');
            const srcEl      = blockEl.querySelector('script[type="x-shader/x-fragment"]');
            
            // CodeMirror editor
            const editor = CodeMirror(editorEl, {
                value: initialSrc,
                mode: 'text/x-glsl',
                theme: 'dracula',
                lineNumbers: true,
                tabSize: 4,
                indentWithTabs: false,
                autofocus: false,
            });

            editor.setSize(null, canvas.offsetHeight);

            // Scene
            const renderer        = new THREE.WebGLRenderer({ canvas, antialias: true });
            const scene           = new THREE.Scene();
            const backgroundColor = new THREE.Color(0x3399ee);
            renderer.setClearColor(backgroundColor, 1);

            // Light
            const light = new THREE.DirectionalLight(0xffffff, 1);
            light.position.set(1, 1, 1);
            scene.add(light);

            // Camera
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.z = 5;

            // Orbit controls
            const controls = new OrbitControls(camera, renderer.domElement);
            controls.maxDistance   = 10;
            controls.minDistance   = 2;
            controls.enableDamping = true;

            // Near plane dimensions
            const nearPlaneWidth  = camera.near * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect * 2;
            const nearPlaneHeight = nearPlaneWidth / camera.aspect;

            // Uniforms — declared before ShaderMaterial so they're in scope
            const uniforms = {
                u_hitThresh:        { value: 0.001 },
                u_maxDist:          { value: 1000 },
                u_maxSteps:         { value: 120 },

                u_clearColor:       { value: backgroundColor },
                u_resolution:       { value: new THREE.Vector2() },

                u_camPos:           { value: camera.position },
                u_camToWorldMat:    { value: camera.matrixWorld },
                u_camInvProjMat:    { value: camera.projectionMatrixInverse },

                u_lightDir:         { value: light.position },
                u_lightColor:       { value: light.color },

                u_diffIntensity:    { value: 0.5 },
                u_specIntensity:    { value: 3 },
                u_ambientIntensity: { value: 0.15 },
                u_shininess:        { value: 16 },

                u_time:             { value: 0 },
            };

            // Raymarching plane
            const geometry = new THREE.PlaneGeometry();
            const material = new THREE.ShaderMaterial({
                vertexShader:   VERT_SRC,
                fragmentShader: initialSrc,
                uniforms:       uniforms,
            });

            const rayMarchPlane = new THREE.Mesh(geometry, material);
            rayMarchPlane.position.set(0, 0, -camera.near);
            rayMarchPlane.scale.set(nearPlaneWidth, nearPlaneHeight, 1);

            // Parent plane to camera so it tracks automatically — no manual update needed
            scene.add(camera);
            camera.add(rayMarchPlane);

            // Shader error handler (Three.js r150+)
            renderer.debug.onShaderError = (_gl, _program, _vs, fs) => {
                const gl  = renderer.getContext();
                const log = gl.getShaderInfoLog(fs) || 'Unknown shader error';
                errorEl.textContent = log;
                errorEl.classList.add('visible');
            };

            // Sync renderer and u_resolution to the canvas's CSS display size
            function resize() {
                const w = canvas.clientWidth;
                const h = canvas.clientHeight;
                if (canvas.width !== w || canvas.height !== h) {
                    renderer.setSize(w, h, false);
                    uniforms.u_resolution.value.set(w, h);
                    editor.setSize(null, h);
                }
            }

            const startTime = performance.now();

            function render() {
                requestAnimationFrame(render);
                resize();
                controls.update();
                uniforms.u_time.value = (performance.now() - startTime) / 1000;
                renderer.render(scene, camera);
            }
            render();

            // Recompile the shader from the editor contents
            function applyShader(src) {
                errorEl.textContent = '';
                errorEl.classList.remove('visible');
                material.fragmentShader = src;
                material.needsUpdate    = true;
            }



            let debounce;
            editor.on('change', () => {
                clearTimeout(debounce);
                debounce = setTimeout(() => applyShader(editor.getValue()), 600);
            });
        }

        document.querySelectorAll('.shader-block').forEach(initBlock);