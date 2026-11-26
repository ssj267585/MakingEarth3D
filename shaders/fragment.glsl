precision mediump float;

uniform vec4 ambientProduct;
uniform vec4 diffuseProduct;
uniform vec4 specularProduct;
uniform float shininess;

varying vec3 fN;
varying vec3 fL;
varying vec3 fE;
varying float fElevation;

void main()
{
    vec3 N = normalize(fN);
    vec3 L = normalize(fL);
    vec3 E = normalize(fE);
    vec3 H = normalize(L + E);

    vec3 oceanDeep = vec3(0.008, 0.055, 0.16);
    vec3 oceanShallow = vec3(0.025, 0.24, 0.39);
    vec3 lowLand = vec3(0.16, 0.36, 0.20);
    vec3 highLand = vec3(0.48, 0.39, 0.25);
    vec3 snow = vec3(0.82, 0.86, 0.88);

    vec3 baseColor;

    if (fElevation < 0.0) {
        float t = smoothstep(-8500.0, 0.0, fElevation);
        baseColor = mix(oceanDeep, oceanShallow, t);
    } else if (fElevation < 1800.0) {
        float t = smoothstep(0.0, 1800.0, fElevation);
        baseColor = mix(lowLand * 0.72, lowLand, t);
    } else if (fElevation < 5000.0) {
        float t = smoothstep(1800.0, 5000.0, fElevation);
        baseColor = mix(lowLand, highLand, t);
    } else {
        float t = smoothstep(5000.0, 8500.0, fElevation);
        baseColor = mix(highLand, snow, t);
    }

    float Kd = max(dot(L, N), 0.0);
    float Ks = pow(max(dot(N, H), 0.0), shininess);

    vec4 ambient = ambientProduct * vec4(baseColor, 1.0);
    vec4 diffuse = Kd * diffuseProduct * vec4(baseColor, 1.0);
    vec4 specular = Ks * specularProduct;

    if (dot(L, N) < 0.0) {
        specular = vec4(0.0, 0.0, 0.0, 1.0);
    }

    vec4 color = ambient + diffuse + specular;
    color.a = 1.0;
    gl_FragColor = color;
}
