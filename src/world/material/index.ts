import * as THREE from 'three';

import { uniforms } from './uniforms';

import ubldIntBuildingInstallationVS from './shader/underGround/vertex.glsl?raw';
import ubldIntBuildingInstallationFS from './shader/underGround/fragment.glsl?raw';
import ubldWallCeilingVS from './shader/ubldWallCeiling/vertex.glsl?raw';
import ubldWallCeilingFS from './shader/ubldWallCeiling/fragment.glsl?raw';
import ubldFloorVS from './shader/ubldFloor/vertex.glsl?raw';
import ubldFloorFS from './shader/ubldFloor/fragment.glsl?raw';
import bldgbridVS from './shader/bldgbrid/vertex.glsl?raw';
import bldgbridFS from './shader/bldgbrid/fragment.glsl?raw';
import vertexLineShader from './shader/line/vertex.glsl?raw';
import fragmentLineShader from './shader/line/fragment.glsl?raw';

// 地下街モデルの階段、柱のマテリアル
export const ubldIntBuildingInstallationMaterial = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: uniforms,
    vertexShader: ubldIntBuildingInstallationVS,
    fragmentShader: ubldIntBuildingInstallationFS,
    glslVersion: THREE.GLSL3,
    depthWrite: false, // 半透明面のチラつき防止
});

// 地下街モデルの壁、天井のマテリアル
export const ubldWallCeilingMaterial = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: uniforms,
    vertexShader: ubldWallCeilingVS,
    fragmentShader: ubldWallCeilingFS,
    glslVersion: THREE.GLSL3,
    depthWrite: false, // 半透明面のチラつき防止
});

// 地下街モデルの床のマテリアル
export const ubldfloorMaterial = new THREE.ShaderMaterial({
    transparent: true,
    vertexShader: ubldFloorVS,
    fragmentShader: ubldFloorFS,
    glslVersion: THREE.GLSL3,
    side: THREE.DoubleSide,
});

export const bldgbridMaterial = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: uniforms,
    vertexShader: bldgbridVS,
    fragmentShader: bldgbridFS,
    glslVersion: THREE.GLSL3,
    depthWrite: false, // 半透明面のチラつき防止
});

// ライン
export const lineMaterial = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: uniforms,
    vertexShader: vertexLineShader,
    fragmentShader: fragmentLineShader,
    glslVersion: THREE.GLSL3,
});

// 衝突判定マテリアル
export const hitBoxMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    visible: false,
    side: THREE.DoubleSide,
});

// キャラクターのマテリアル
export const characterMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color('rgb(220, 220, 220)'),
    transparent: true,
    opacity: 0.5,
    // depthTest: false,
    // depthWrite: false,
});
