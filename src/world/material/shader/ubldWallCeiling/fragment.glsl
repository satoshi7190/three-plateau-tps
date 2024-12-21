precision highp float;

in vec2 v_uv;
in vec3 v_normal;
in vec3 v_position;
in mat4 v_modelMatrix;

out vec4 fragColor;

 float edgeFactor(vec2 p){
    float thickness = 5.0;
    	vec2 grid = abs(fract(p - 0.5) - 0.5) / fwidth(p) / thickness;
  		return min(grid.x, grid.y);
    }

void main() {

    float coefficient = 1.2;
    float power = 1.0;

    vec3 worldPosition = (v_modelMatrix * vec4(v_position, 1.0)).xyz;
    vec3 cameraToVertex = normalize(worldPosition - cameraPosition);
    float intensity = pow(coefficient + dot(cameraToVertex, normalize(v_normal)), power);

    float a = edgeFactor(v_uv);

    vec3 color = vec3(0.76);

    fragColor = vec4(color, 1.0 - a) * intensity;
}

