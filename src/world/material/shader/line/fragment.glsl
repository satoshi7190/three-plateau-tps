precision highp float;

in vec2 v_uv;
in vec3 v_normal;
in vec3 v_color;
in float v_cumulativeDistance;
in float v_fogDistance;
in float v_speed;
uniform float u_time;
uniform float u_fogFar;
uniform float u_fogNear;

out vec4 fragColor;

void main() {
    float t = u_time * 5.0 * v_speed; // 速度

    // UV座標を計算
    vec2 uv = v_uv;

    // 色の範囲を設定
    vec3 sub_color = vec3(1.0); // 白
    vec3 main_color = v_color; // 頂点色

    // 累積距離に基づいたアニメーション
    float scale = 0.00005; // 色変化の広がり
    float gradient = mod(v_cumulativeDistance * scale + t * -0.5, 1.0); // 0から1の範囲でループ

    // フォッグの割合を計算 (線形補間)
    float fogFactor = smoothstep(u_fogNear, u_fogFar, v_fogDistance);

    // アルファ値の統一
    float gradientAlpha = smoothstep(0.2, 0.8, gradient); // グラデーションでの透明度
    float alpha = (1.0 - fogFactor) * gradientAlpha; // フォッグとグラデーションのアルファ値を掛け合わせる

    // 色を補間
    vec3 color = mix(sub_color, main_color, gradient);

    fragColor = vec4(color, alpha); // アルファ値を適用
}
