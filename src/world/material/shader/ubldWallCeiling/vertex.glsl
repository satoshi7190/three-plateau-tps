precision highp float;

out vec2 v_uv;
out vec3 v_normal;
out vec3 v_position;
out mat4 v_modelMatrix;
out float v_fogDistance;


void main() {
    v_uv = uv;
    v_normal = normal;
    v_position = position;

       // ワールド座標を計算
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    v_modelMatrix = modelMatrix;

    // 中心 (0, 0, 0) からの距離を計算
    v_fogDistance = length(worldPosition.xyz);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}