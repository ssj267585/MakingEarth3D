attribute vec3 vPosition;
attribute vec3 vNormal;
attribute float vElevation;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float rotation;
uniform float heightScale;
uniform vec3 lightPosition;

varying vec3 fN;
varying vec3 fL;
varying vec3 fE;
varying float fElevation;

void main()
{
    float displacement = (vElevation / 8500.0) * 0.055 * heightScale;
    vec3 position = normalize(vPosition) * (1.0 + displacement);

    float c = cos(rotation);
    float s = sin(rotation);

    // 지구의 정점과 법선 벡터에 같은 회전 변환을 적용
    vec3 rotatedPosition = vec3(
        position.x * c - position.z * s,
        position.y,
        position.x * s + position.z * c
    );

    vec3 rotatedNormal = vec3(
        vNormal.x * c - vNormal.z * s,
        vNormal.y,
        vNormal.x * s + vNormal.z * c
    );

    // 모델뷰 변환 후 광원은 고정된 좌표에서 조명 계산
    vec4 eyePosition = modelViewMatrix * vec4(rotatedPosition, 1.0);
    vec3 pos = eyePosition.xyz;

    fN = normalize((modelViewMatrix * vec4(rotatedNormal, 0.0)).xyz);
    fL = normalize(lightPosition - pos);
    fE = normalize(-pos);
    fElevation = vElevation;

    gl_Position = projectionMatrix * eyePosition;
}
