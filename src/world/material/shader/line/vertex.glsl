precision highp float;

in float a_distance;
in vec3 a_color;
in float a_speed;

uniform float u_time;

out vec2 v_uv;
out vec3 v_normal;
out float v_cumulativeDistance;
out vec3 v_color;
out float v_fogDistance;
out float v_speed;

void main() {
    v_uv = uv;
    v_normal = normal;
    v_cumulativeDistance = a_distance;
    v_color = a_color;
    v_speed = a_speed;

    // 中心 (0, 0, 0) からの距離を計算
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    v_fogDistance = length(worldPosition.xyz);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
