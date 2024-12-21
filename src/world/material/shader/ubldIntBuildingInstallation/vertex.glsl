precision highp float;

out vec3 v_normal;
out vec3 v_position;
out mat4 v_modelMatrix;

void main() {
    v_normal = normal;
    v_position = position;

    // ワールド座標を計算
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    v_modelMatrix = modelMatrix;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}