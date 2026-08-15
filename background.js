//=============== CORE FUNCTIONS ===============
const canvas = document.querySelector("#gl-canvas");
const gl = canvas.getContext('webgl2');
let programInfo;
async function main() {

    const vsSource = await (await fetch('bg_shaders/bg_vert.glsl')).text();
    const fsSource = await (await fetch('bg_shaders/bg_frag.glsl')).text();
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    const buffer = bufferInator(gl);


    programInfo = {
        program: shaderProgram,
        attribLocations: {
            position: gl.getAttribLocation(shaderProgram, "position"),
        },
        uniformLocations: {
            resolution: gl.getUniformLocation(shaderProgram, 'u_resolution'),
            time: gl.getUniformLocation(shaderProgram, 'u_time'), 
        },
    };


    gl.uniform2f(programInfo.uniformLocations.resolution, canvas.width, canvas.height);

    gl.enableVertexAttribArray(programInfo.attribLocations.position);

    gl.vertexAttribPointer(
        programInfo.attribLocations.position, 
        2,
        gl.FLOAT,
        false,
        0,
        0
    );
    
    function render(timestamp) {
        const seconds = timestamp * 0.001;
        gl.uniform1f(programInfo.uniformLocations.time, seconds);
    
        drawScene(gl, programInfo, buffer);
    
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
     
}

//========== Create Shaders ==========
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);

    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(
            `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`
        );
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert(
          `Unable to initialize the shader program: ${gl.getProgramInfoLog(shaderProgram)}`
        );
        return null;
    }
    return shaderProgram;
}

//============ Buffer-ize ============
function bufferInator(gl) {
    const positionBuffer = gl.createBuffer(); 
    

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const positions = new Float32Array([
        -1, -1,
        3, -1,
        -1, 3,
    ]);

    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    return positionBuffer;
}
//============ Drawer-ize ============
function drawScene(gl, programInfo, buffer) {
    gl.useProgram(programInfo.program);
    gl.drawArrays(gl.TRIANGLES,0,3);
}


//==============================================

//---------------- HELPER STUFF ----------------

function resize() {
    const bodyRect = document.body.getBoundingClientRect();
    const width = bodyRect.width;
    const height = bodyRect.height;

    canvas.width = width;
    canvas.height = height;

    if (programInfo) {
        gl.uniform2f(programInfo.uniformLocations.resolution, width, height);
    }
    gl.viewport(0, 0, width, height);

    // console.log("resize ran");
    // console.log(`
    //     width: ${width}
    //     height: ${height}
    //     canvas.width: ${canvas.width}
    //     canvas.height: ${canvas.height}
    // `)
}

//----------------------------------------------

resize();

main();

window.addEventListener('resize', resize);