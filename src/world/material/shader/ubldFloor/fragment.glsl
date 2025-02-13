precision highp float;

in vec2 v_uv;
in vec3 v_normal;
in vec3 v_position;
in mat4 v_modelMatrix;
in float v_fogDistance;
uniform float u_fogFar;
uniform float u_fogNear;
uniform vec3 u_playerPosition;

out vec4 fragColor;



void main() {

    fragColor = vec4(.3,.3,.3,.7);
}

