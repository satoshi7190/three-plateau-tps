import * as THREE from 'three';

import { uniforms } from './uniforms';
import bldgbridVS from './shader/bldgbrid/vertex.glsl?raw';
import bldgbridFS from './shader/bldgbrid/fragment.glsl?raw';
import ubldWallCeilingVS from './shader/ubldWallCeiling/vertex.glsl?raw';
import ubldWallCeilingFS from './shader/ubldWallCeiling/fragment.glsl?raw';
import ubldIntBuildingInstallationVS from './shader/ubldIntBuildingInstallation/vertex.glsl?raw';
import ubldIntBuildingInstallationFS from './shader/ubldIntBuildingInstallation/fragment.glsl?raw';
import lineVS from './shader/line/vertex.glsl?raw';
import lineFS from './shader/line/fragment.glsl?raw';

// 建物、橋梁のマテリアル
export const bldgbridMaterial = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: uniforms,
    vertexShader: bldgbridVS,
    fragmentShader: bldgbridFS,
    glslVersion: THREE.GLSL3,
    depthWrite: false, // 半透明面のチラつき防止
});

// 地下街の壁、天井のマテリアル
export const ubldWallCeilingMaterial = new THREE.ShaderMaterial({
    transparent: true,
    vertexShader: ubldWallCeilingVS,
    fragmentShader: ubldWallCeilingFS,
    glslVersion: THREE.GLSL3,
    depthWrite: false, // 半透明面のチラつき防止
});

// 地下街の階段、柱のマテリアル
export const ubldIntBuildingInstallationMaterial = new THREE.ShaderMaterial({
    transparent: true,
    vertexShader: ubldIntBuildingInstallationVS,
    fragmentShader: ubldIntBuildingInstallationFS,
    glslVersion: THREE.GLSL3,
    depthWrite: false, // 半透明面のチラつき防止
});

// 床
export const ubldfloorMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    color: new THREE.Color('rgb(0, 17, 23)'),
    opacity: 0.7,
    side: THREE.DoubleSide,
});

// ライン
export const lineMaterial = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: uniforms,
    vertexShader: lineVS,
    fragmentShader: lineFS,
    glslVersion: THREE.GLSL3,
});

// 衝突判定マテリアル
export const hitBoxMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    side: THREE.DoubleSide, // 両面
    visible: false, // 非表示にする
});

// キャラクターのマテリアル
export const characterMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color('rgb(220, 220, 220)'),
    transparent: true,
    opacity: 0.5,
});
