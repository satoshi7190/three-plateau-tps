precision highp float;

in vec3 v_normal;
in vec3 v_position;
in mat4 v_modelMatrix;

out vec4 fragColor;

void main() {

    float coefficient = 1.2;
    float power = 1.0;

    vec3 worldPosition = (v_modelMatrix * vec4(v_position, 1.0)).xyz;
    vec3 cameraToVertex = normalize(worldPosition - cameraPosition);
    float intensity = pow(coefficient + dot(cameraToVertex, normalize(v_normal)), power);

    vec3 color = vec3(1.0);

    fragColor = vec4(color, 1.0) * intensity;
}

