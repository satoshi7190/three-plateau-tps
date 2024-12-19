import * as THREE from 'three';

import { uniforms } from './uniforms';
import fragmentSurfaceShader from './shader/surface/fragment.glsl?raw';
import vertexSurfaceShader from './shader/surface/vertex.glsl?raw';
import fragmentSurfaceShader2 from './shader/surface2/fragment.glsl?raw';
import vertexSurfaceShader2 from './shader/surface2/vertex.glsl?raw';
import fragmentUnderGroundShader from './shader/underGround/fragment.glsl?raw';
import vertexUnderGroundShader from './shader/underGround/vertex.glsl?raw';
import fragmentLineShader from './shader/line/fragment.glsl?raw';
import vertexLineShader from './shader/line/vertex.glsl?raw';

export const customSurfaceMaterial = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: uniforms,
    vertexShader: vertexSurfaceShader,
    fragmentShader: fragmentSurfaceShader,
    glslVersion: THREE.GLSL3,
    depthWrite: false, // 半透明面のチラつき防止
});

export const customSurfaceMaterial2 = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: uniforms,
    vertexShader: vertexSurfaceShader2,
    fragmentShader: fragmentSurfaceShader2,
    glslVersion: THREE.GLSL3,
    depthWrite: false, // 半透明面のチラつき防止
});

export const underGroundMaterial = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: uniforms,
    vertexShader: vertexUnderGroundShader,
    fragmentShader: fragmentUnderGroundShader,
    glslVersion: THREE.GLSL3,
    depthWrite: false, // 半透明面のチラつき防止
});

// ライン
export const customLineMaterial = new THREE.ShaderMaterial({
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

// 床
export const floorMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    color: new THREE.Color('rgb(0, 17, 23)'),
    opacity: 0.7,
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
