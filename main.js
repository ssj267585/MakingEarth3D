const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl", { antialias: true });

let program;
let positionBuffer;
let normalBuffer;
let elevationBuffer;
let indexBuffer;
let indexCount = 0;

let rotation = 0;
let previousTime = 0;
let elevationData;

async function loadText(path) {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(path + " 파일을 불러오지 못했습니다.");
    }
    return response.text();
}

function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
}

function createProgram(vertexSource, fragmentSource) {
    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    const result = gl.createProgram();

    gl.attachShader(result, vertexShader);
    gl.attachShader(result, fragmentShader);
    gl.linkProgram(result);

    if (!gl.getProgramParameter(result, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(result));
    }
    return result;
}

function createBuffer(target, values) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, values, gl.STATIC_DRAW);
    return buffer;
}

function createEarth() {
    const width = elevationData.width;
    const height = elevationData.height;

    const positions = [];
    const normals = [];
    const elevations = [];
    const indices = [];

    for (let row = 0; row < height; row++) {
        const latitude = (90 - row) * Math.PI / 180;

        for (let col = 0; col < width; col++) {
            const longitude = (-180 + col) * Math.PI / 180;

            const x = Math.cos(latitude) * Math.cos(longitude);
            const y = Math.sin(latitude);
            const z = Math.cos(latitude) * Math.sin(longitude);

            positions.push(x, y, z);
            normals.push(x, y, z);
            elevations.push(Number(elevationData.data[row][col]));
        }
    }

    for (let row = 0; row < height - 1; row++) {
        for (let col = 0; col < width - 1; col++) {
            const a = row * width + col;
            const b = a + 1;
            const c = (row + 1) * width + col;
            const d = c + 1;

            indices.push(a, b, c);
            indices.push(b, d, c);
        }
    }

    positionBuffer = createBuffer(
        gl.ARRAY_BUFFER,
        new Float32Array(positions)
    );
    normalBuffer = createBuffer(
        gl.ARRAY_BUFFER,
        new Float32Array(normals)
    );
    elevationBuffer = createBuffer(
        gl.ARRAY_BUFFER,
        new Float32Array(elevations)
    );
    indexBuffer = createBuffer(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(indices)
    );

    indexCount = indices.length;
}

function setAttribute(name, buffer, size) {
    const location = gl.getAttribLocation(program, name);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(location);
}

function perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    const d = 1 / (near - far);

    return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (near + far) * d, -1,
        0, 0, 2 * near * far * d, 0
    ]);
}

function translationMatrix(z) {
    return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, z, 1
    ]);
}

function resizeCanvas() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.floor(canvas.clientWidth * ratio);
    const height = Math.floor(canvas.clientHeight * ratio);

    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
}

function setLighting() {
    gl.uniform4f(
        gl.getUniformLocation(program, "ambientProduct"),
        0.20, 0.20, 0.24, 1.0
    );
    gl.uniform4f(
        gl.getUniformLocation(program, "diffuseProduct"),
        0.95, 0.95, 0.90, 1.0
    );
    gl.uniform4f(
        gl.getUniformLocation(program, "specularProduct"),
        0.25, 0.28, 0.32, 1.0
    );
    gl.uniform1f(
        gl.getUniformLocation(program, "shininess"),
        24.0
    );

    // 광원은 지구의 회전과 관계없이 고정된 위치에 둡니다.
    gl.uniform3f(
        gl.getUniformLocation(program, "lightPosition"),
        -3.0, 2.5, 4.0
    );
}

function render(time) {
    resizeCanvas();

    const delta = previousTime
        ? Math.min((time - previousTime) / 1000, 0.05)
        : 0;
    previousTime = time;

    // 일정한 속도로 지구를 자전시킵니다.
    rotation += 0.22 * delta;

    gl.clearColor(0.02, 0.025, 0.04, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);

    setAttribute("vPosition", positionBuffer, 3);
    setAttribute("vNormal", normalBuffer, 3);
    setAttribute("vElevation", elevationBuffer, 1);

    const modelView = translationMatrix(-3.2);
    const projection = perspective(
        Math.PI / 4,
        canvas.width / canvas.height,
        0.1,
        100
    );

    gl.uniformMatrix4fv(
        gl.getUniformLocation(program, "modelViewMatrix"),
        false,
        modelView
    );
    gl.uniformMatrix4fv(
        gl.getUniformLocation(program, "projectionMatrix"),
        false,
        projection
    );
    gl.uniform1f(
        gl.getUniformLocation(program, "rotation"),
        rotation
    );
    gl.uniform1f(
        gl.getUniformLocation(program, "heightScale"),
        1.5
    );

    setLighting();

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.drawElements(
        gl.TRIANGLES,
        indexCount,
        gl.UNSIGNED_SHORT,
        0
    );

    requestAnimationFrame(render);
}

async function start() {
    if (!gl) {
        throw new Error("현재 브라우저에서 WebGL을 사용할 수 없습니다.");
    }

    const [jsonText, vertexSource, fragmentSource] = await Promise.all([
        loadText("elevation-data.json"),
        loadText("shaders/vertex.glsl"),
        loadText("shaders/fragment.glsl")
    ]);

    elevationData = JSON.parse(jsonText);
    program = createProgram(vertexSource, fragmentSource);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    createEarth();
    requestAnimationFrame(render);
}

start().catch(error => {
    console.error(error);
    document.body.innerHTML =
        '<pre style="color:white;padding:20px;font:14px sans-serif;">' +
        '실행 오류: ' + error.message +
        '</pre>';
});
