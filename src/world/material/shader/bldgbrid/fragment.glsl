precision highp float;

in vec2 v_uv;
in vec3 v_normal;
in vec3 v_position;
in mat4 v_modelMatrix;
in float v_fogDistance;
uniform float u_fogFar;
uniform float u_fogNear;

out vec4 fragColor;

 float edgeFactor(vec2 p){
    float thickness = 5.0;
    	vec2 grid = abs(fract(p - 0.5) - 0.5) / fwidth(p) / thickness;
  		return min(grid.x, grid.y);
    }

void main() {

     // // // フォッグの割合を計算 (線形補間)
    float fogFactor = smoothstep(u_fogNear,u_fogFar,  v_fogDistance);
    float alpha = 1.0 - fogFactor; // フォッグが濃いほど透明に

    float coefficient = 1.2;
    float power = 1.0;

    vec3 worldPosition = (v_modelMatrix * vec4(v_position, 1.0)).xyz;
    vec3 cameraToVertex = normalize(worldPosition - cameraPosition);
    float intensity = pow(coefficient + dot(cameraToVertex, normalize(v_normal)), power);

    float a = edgeFactor(v_uv);


    vec3 color = vec3(0.0, 0.9215686274509803, 1.0);


    // エッジの強度をそのままアルファ値に設定
    fragColor = vec4(color, alpha - a) * intensity;
}

