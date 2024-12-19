import { uniforms } from './world/material/uniforms';
import { parseHash, mapPotisonToWorldPotison } from './utils';
import './style/main.css';
import './style/mobile.css';
import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CharacterControls } from './ui/characterControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Joystick } from './ui/joystickControl';

import { SCENE_CENTER_COORDS, INITIAL_LNG_LAT, INITIAL_MODEL_ROTATION } from './constants';
import { map, setMarker } from './map';
import { FGB3DLoader } from './world/plateauGeometryLoader';
import { FGB2DLineLoader } from './world/lineGeometryLoader';
import type { FGB2DLineOption } from './world/lineGeometryLoader';
import { loadingEnd, loadingStart } from './ui/loading';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import gsap from 'gsap';
import maplibregl from 'maplibre-gl';
import { customLineMaterial, customSurfaceMaterial, characterMaterial, hitBoxMaterial, floorMaterial, underGroundMaterial, customSurfaceMaterial2 } from './world/material';
import { store } from './store';
import { ElementManager } from './ui/element';
import { BloomEffect, EffectComposer, EffectPass, RenderPass, FXAAEffect } from 'postprocessing';
import { checkLocalStorage } from './localStorage';

// import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
// NOTE: debug
// const gui = new GUI();
// gui.close();
// for (const key of Object.keys(uniforms) as Array<keyof Uniforms>) {
//     const uniform = uniforms[key];

//     // 値の型に応じて適切な UI を設定
//     if (typeof uniform.value === 'number') {
//         gui.add(uniform, 'value', -1000, 1000).name(key);
//     } else if (typeof uniform.value === 'boolean') {
//         gui.add(uniform, 'value').name(key);
//     } else if (uniform.value instanceof THREE.Color) {
//         gui.addColor(uniform, 'value').name(key);
//     } else if (uniform.value instanceof THREE.Vector3) {
//         const folder = gui.addFolder(key as string);
//         folder.add(uniform.value, 'x', -1000, 1000).name('x');
//         folder.add(uniform.value, 'y', -1000, 1000).name('y');
//         folder.add(uniform.value, 'z', -1000, 1000).name('z');
//     }
// }

loadingStart();

// 要素
const elManager = ElementManager.getInstance({
    mapContainer: '#map-container',
    mapOpenButton: '#map-open-button',
    mapCloseButton: '#map-close-button',
    viewButton: '#view-button',
    helpButton: '#help-button',
    githubButton: '#github-button',
    keyControl: '#key-control',
    joystickControl: '#joystick-control',
    operationGuide: '#operation-guide',
    guideCloseButton: '#guide-close-button',
});

// BVHの高速化されたレイキャストを有効にする
THREE.Mesh.prototype.raycast = acceleratedRaycast;
type IsRaycastObjectName = 'FloorSurface' | 'HitBox';
const raycastObjectNames: IsRaycastObjectName[] = ['FloorSurface', 'HitBox'];

// シーンの作成
const scene = new THREE.Scene();

// カメラ
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100000);
camera.position.set(18, 9, 3);
camera.zoom = 0.5;
scene.add(camera);

// キャンバス
const canvas = document.getElementById('three-canvas') as HTMLCanvasElement;
const context = canvas.getContext('webgl2') as WebGL2RenderingContext;

const orbitControls = new OrbitControls(camera, canvas);
orbitControls.enableDamping = true;
orbitControls.enablePan = false;
orbitControls.enableZoom = false;
orbitControls.minDistance = 1;
orbitControls.maxDistance = 7;

orbitControls.maxPolarAngle = Math.PI / 2 + 0.35;
orbitControls.minPolarAngle = Math.PI / 2 - 0.8;
orbitControls.update();

const setPlayerControl = (val: boolean) => {
    if (val) {
        orbitControls.maxDistance = 3;
        orbitControls.enablePan = false;
        orbitControls.maxPolarAngle = Math.PI / 2 + 0.35;
        orbitControls.minPolarAngle = Math.PI / 2 - 0.8;
    } else {
        orbitControls.maxDistance = 1000;
        orbitControls.enablePan = true;
        orbitControls.maxPolarAngle = Math.PI;
        orbitControls.minPolarAngle = 0;
    }
};
setPlayerControl(true);

const zoomControls = new TrackballControls(camera, canvas);
zoomControls.noPan = true;
zoomControls.noRotate = true;
zoomControls.zoomSpeed = 0.2;

// レンダラー
const renderer = new THREE.WebGLRenderer({
    canvas,
    context,
    alpha: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// エフェクト
const composer = new EffectComposer(renderer);
const bloom = new BloomEffect({
    intensity: 1.2, // ブルームの強度
    luminanceThreshold: 0.8, // 明るさのしきい値 (threshold)
    luminanceSmoothing: 0.3, // 明るさの平滑化
});
const fxaa = new FXAAEffect();
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new EffectPass(camera, bloom, fxaa));

// Raycasterの設定
const raycaster = new THREE.Raycaster();

// 下向きベクトル
const downDirection = new THREE.Vector3(0, -1, 0);

// モデルの読み込みとキャラクターコントロールの設定
let characterControls: CharacterControls;

// 画面リサイズ時にキャンバスもリサイズ
const onResize = () => {
    // サイズを取得
    const width = window.innerWidth;
    const height = window.innerHeight;

    // レンダラーのサイズを調整する
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);

    // カメラのアスペクト比を正す
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // stats.update();
};
window.addEventListener('resize', onResize);

// オブジェクトを読み込み
const objs: {
    [key: string]: THREE.Mesh;
} = {};

const lineLoader = new FGB2DLineLoader(SCENE_CENTER_COORDS);
const addLineObj = async (url: string, name: string, option: FGB2DLineOption) => {
    lineLoader.load(url, option).then((geometry: THREE.BufferGeometry) => {
        const road = new THREE.LineSegments(geometry, customLineMaterial);
        road.name = name;
        scene.add(road);
    });
};

const plateauLoader = new FGB3DLoader(SCENE_CENTER_COORDS);
const addPlateauObj = async (url: string, name: string, material: THREE.Material) => {
    plateauLoader.load(url).then((geometry: THREE.BufferGeometry) => {
        // レイキャスト
        if (raycastObjectNames.includes(name as IsRaycastObjectName)) {
            geometry.boundsTree = new MeshBVH(geometry);
        }

        const obj = new THREE.Mesh(geometry, material);
        obj.name = name;
        objs[name] = obj;
        scene.add(obj);
    });
};

// オブジェクトを読み込み
const loadObjs = async () => {
    const plateauObjPromises = [
        addPlateauObj('plateau_shinjuku/ubld/FloorSurface.fgb', 'FloorSurface', floorMaterial),
        addPlateauObj('plateau_shinjuku/ubld/IntBuildingInstallation.fgb', 'IntBuildingInstallation', underGroundMaterial),
        addPlateauObj('plateau_shinjuku/ubld/ClosureSurface.fgb', 'ClosureSurface', customSurfaceMaterial2),
        addPlateauObj('plateau_shinjuku/ubld/RoofSurface.fgb', 'RoofSurface', customSurfaceMaterial2),
        addPlateauObj('plateau_shinjuku/ubld/InteriorWallSurface.fgb', 'InteriorWallSurface', customSurfaceMaterial2),
        addPlateauObj('plateau_shinjuku/ubld/Window.fgb', 'Window', customSurfaceMaterial2),
        addPlateauObj('plateau_shinjuku/ubld/Door.fgb', 'Door', customSurfaceMaterial2),
        addPlateauObj('plateau_shinjuku/ubld/HitBox.fgb', 'HitBox', hitBoxMaterial),
        addPlateauObj('plateau_shinjuku/bldg/53394525_Building.fgb', '53394525_Building', customSurfaceMaterial),
        addPlateauObj('plateau_shinjuku/bldg/53394535_Building.fgb', '53394535_Building', customSurfaceMaterial),
        addPlateauObj('plateau_shinjuku/bldg/53394526_Building.fgb', '53394526_Building', customSurfaceMaterial),
        addPlateauObj('plateau_shinjuku/bldg/53394536_Building.fgb', '53394536_Building', customSurfaceMaterial),
        addPlateauObj('plateau_shinjuku/brid/53394525_Bridge.fgb', '53394525_Bridge', customSurfaceMaterial),
        addPlateauObj('plateau_shinjuku/brid/53394526_Bridge.fgb', '53394526_Bridge', customSurfaceMaterial),
        addPlateauObj('plateau_shinjuku/brid/53394535_Bridge.fgb', '53394535_Bridge', customSurfaceMaterial),
        addLineObj('plateau_shinjuku/link.fgb', 'link', { color: new THREE.Color('rgb(255, 0, 204)'), height: 40, speed: 0.8 }),
        addLineObj('plateau_shinjuku/gsi/RailCL.fgb', 'RailCL', { color: new THREE.Color('rgb(85, 255, 0)'), height: 60, speed: 1.2 }),
        addLineObj('plateau_shinjuku/gsi/road.fgb', 'road', { color: new THREE.Color('rgb(255, 255, 0)'), height: 50, speed: 1.0 }),
    ];

    await Promise.all(plateauObjPromises);

    // モデルの追加
    addModel('./models/Xbot.glb');
};

// 読み込み開始
loadObjs();

const addModel = (url: string) => {
    new GLTFLoader().load(url, function (gltf) {
        const model = gltf.scene;
        model.traverse((object: any) => {
            if (object.isMesh) {
                object.material.needUpdate = true;
                object.material = characterMaterial;
            }
        });

        model.scale.set(0.9, 0.9, 0.9);

        const hashData = parseHash(window.location.hash);
        if (hashData) {
            const { angle, lat, lng } = hashData;
            const initilPos = mapPotisonToWorldPotison(lng, lat);
            model.position.set(initilPos.x, 500, initilPos.z);
            // モデルの回転
            model.rotation.y = THREE.MathUtils.degToRad(angle + 180); // 度をラジアンに変換
        } else {
            const initilPos = mapPotisonToWorldPotison(INITIAL_LNG_LAT[0], INITIAL_LNG_LAT[1]);
            model.position.set(initilPos.x, 500, initilPos.z);
            model.rotation.y = THREE.MathUtils.degToRad(INITIAL_MODEL_ROTATION); // 度をラジアンに変換
        }

        const ground = objs.FloorSurface;

        if (ground) {
            // レイキャストの設定
            raycaster.set(model.position, downDirection);
            const intersects = raycaster.intersectObject(ground, true);

            if (intersects.length > 0) {
                model.position.y = intersects[0].point.y;
            } else {
                model.position.set(0, 500, 0);
                raycaster.set(model.position, downDirection);
                const intersects = raycaster.intersectObject(ground, true);
                if (intersects.length > 0) {
                    model.position.y = intersects[0].point.y;
                }
            }
        }
        scene.add(model);

        const gltfAnimations: THREE.AnimationClip[] = gltf.animations;
        const mixer = new THREE.AnimationMixer(model);
        const animationsMap: Map<string, THREE.AnimationAction> = new Map();

        gltfAnimations.forEach((a: THREE.AnimationClip) => {
            animationsMap.set(a.name, mixer.clipAction(a));
        });

        characterControls = new CharacterControls(model, mixer, animationsMap, orbitControls, zoomControls, camera, 'agree');
        characterControls.update;
        loadingEnd().then(() => {
            elManager.get('keyControl')?.classList.remove('hidden');
            elManager.get('mapContainer')?.classList.remove('hidden');
            elManager.get('joystickControl')?.classList.remove('hidden');

            if (checkLocalStorage('userData')) {
                store.set('showOperationGuide', true);
            }
        });
    });
};

const clock = new THREE.Clock();

// ジョイスティックコントロールの設定
const joystick = new Joystick('joystick-ball');

// アニメーション
const animate = () => {
    requestAnimationFrame(animate);
    // 必要に応じて衝突判定処理を呼び出す

    const target = orbitControls.target;
    zoomControls.target.set(target.x, target.y, target.z);

    let mixerUpdateDelta = clock.getDelta();
    if (characterControls && !store.get('isFarView') && !store.get('showMapViewer')) {
        const characterPosition = characterControls.getPosition();
        const rayPosition = characterPosition.clone();
        rayPosition.y += 1.5;
        const hitBox = objs.HitBox;
        const ground = objs.FloorSurface;

        const joystickDirection = joystick.getDirection();
        if (ground && hitBox) {
            characterControls.update(mixerUpdateDelta, joystickDirection, ground, hitBox);
        }
    }

    orbitControls.update();
    zoomControls.update();
    renderer.render(scene, camera);

    uniforms.u_time.value = clock.getElapsedTime();

    composer.render();
};
animate();

export const setPotison = (x: number, z: number) => {
    const ground = objs.FloorSurface;
    const hitBox = objs.HitBox;
    // レイキャストの設定
    raycaster.set(new THREE.Vector3(x, 1000, z), downDirection);
    const intersects = raycaster.intersectObject(ground, true);
    let mixerUpdateDelta = clock.getDelta();

    if (intersects.length > 0) {
        const y = intersects[0].point.y;

        characterControls.setModelPosition(x, y, z);
    }

    const joystickDirection = joystick.getDirection();
    characterControls.update(mixerUpdateDelta, joystickDirection, ground, hitBox);
    const angle = characterControls.getModelRotationAngle();
    setMarker(x, z, angle);
};

// カメラの近距離と遠距離の設定
const closeView = { position: camera.position.clone(), lookAt: { x: 0, y: 0, z: 0 } };
const farView = { position: { x: 300, y: 200, z: 100 }, lookAt: { x: 0, y: 0, z: 0 } };

// ビューを切り替える関数
const toggleView = (val: boolean) => {
    elManager.get('keyControl')?.classList.toggle('hidden');
    elManager.get('mapContainer')?.classList.toggle('hidden');
    elManager.get('joystickControl')?.classList.toggle('hidden');
    if (val) {
        setPlayerControl(false);
        closeView.position = camera.position.clone();

        const target = orbitControls.target;
        closeView.lookAt = { x: target.x, y: target.y, z: target.z };
    } else {
        farView.position = camera.position.clone();
        const target = orbitControls.target;
        farView.lookAt = { x: target.x, y: target.y, z: target.z };
    }

    const targetView = val ? farView : closeView;

    // カメラ位置のアニメーション
    store.set('isCameraAnimating', true);
    const cameraPositionAnim = gsap.to(camera.position, {
        x: targetView.position.x,
        y: targetView.position.y,
        z: targetView.position.z,
        duration: 1.0,
        ease: 'power1',
        onUpdate: () => {
            camera.lookAt(targetView.lookAt.x, targetView.lookAt.y, targetView.lookAt.z);
        },
    });

    // ターゲットのアニメーション
    const targetAnim = gsap.to(orbitControls.target, {
        x: targetView.lookAt.x,
        y: targetView.lookAt.y,
        z: targetView.lookAt.z,
        duration: 1.0,
        ease: 'power1',
        onUpdate: () => {
            camera.lookAt(orbitControls.target.x, orbitControls.target.y, orbitControls.target.z);
        },
    });

    // `camera.fov` のスムーズなアニメーション
    const fovAnim = gsap.to(camera, {
        fov: val ? 45 : 75, // 目標視野角
        duration: 1.0,
        ease: 'power1',
        onUpdate: () => {
            camera.updateProjectionMatrix(); // 投影行列の更新が必須
        },
    });

    // すべてのアニメーションの完了を待つ
    gsap.timeline({
        onComplete: () => {
            if (!val) {
                setPlayerControl(true);
            }
            store.set('isCameraAnimating', false);
        },
    })
        .add(cameraPositionAnim)
        .add(targetAnim, '-=1.0')
        .add(fovAnim, '-=1.0');
};

let popup: maplibregl.Popup;

// ボタンクリックでビュー切り替え
elManager.get('viewButton')?.addEventListener('click', () => {
    if (store.get('isCameraAnimating')) return;
    store.set('isFarView', !store.get('isFarView'));
});

elManager.get('helpButton')?.addEventListener('click', () => {
    store.set('showOperationGuide', !store.get('showOperationGuide'));
});

elManager.get('mapOpenButton')?.addEventListener('click', () => {
    store.set('showMapViewer', true);
});

elManager.get('mapCloseButton')?.addEventListener('click', () => {
    store.set('showMapViewer', false);
});

elManager.get('githubButton')?.addEventListener('click', () => {
    window.open('https://github.com/satoshi7190/three-plateau-tps', '_blank', 'noopener,noreferrer');
});

elManager.get('guideCloseButton')?.addEventListener('click', () => {
    store.set('showOperationGuide', false);
});

// カメラの切り替え
store.subscribe('isFarView', (value) => {
    if (value) {
        elManager.get('viewButton')?.classList.add('far-view');
        elManager.get('viewButton')?.classList.remove('player-view');
        elManager.get('operationGuide')?.classList.add('far-view');
        elManager.get('operationGuide')?.classList.remove('player-view');
    } else {
        elManager.get('viewButton')?.classList.add('player-view');
        elManager.get('viewButton')?.classList.remove('far-view');
        elManager.get('operationGuide')?.classList.add('player-view');
        elManager.get('operationGuide')?.classList.remove('far-view');
    }
    toggleView(value);
});

// 操作説明の表示切り替え
store.subscribe('showOperationGuide', (value) => {
    if (value) {
        elManager.get('operationGuide')?.classList.remove('hidden');
    } else {
        elManager.get('operationGuide')?.classList.add('hidden');
    }
});

// 地図ビューアーの表示切り替え
store.subscribe('showMapViewer', (value) => {
    if (value) {
        elManager.get('mapContainer')?.classList.add('active');
        elManager.get('mapCloseButton')?.classList.remove('hidden');
    } else {
        elManager.get('mapContainer')?.classList.remove('active');
        elManager.get('mapCloseButton')?.classList.add('hidden');
    }
    if (popup) popup.remove();
});

map.on('click', 'FloorSurface', (e) => {
    if (!store.get('showMapViewer')) return;

    const div = document.createElement('div');
    const button = document.createElement('button');
    button.className = 'popup-button';
    button.textContent = 'Move to this location';
    div.appendChild(button);

    popup = new maplibregl.Popup({
        closeButton: false,
        anchor: 'bottom',
    })
        .setLngLat(e.lngLat)
        .setDOMContent(div)
        .addTo(map);

    button.onclick = async () => {
        const vec2 = mapPotisonToWorldPotison(e.lngLat.lng, e.lngLat.lat);

        setPotison(vec2.x, vec2.z);
        popup.remove();
        store.set('showMapViewer', false);
    };
});

map.on('mouseover', 'FloorSurface', () => {
    map.getCanvas().style.cursor = 'pointer';
});

map.on('mouseleave', 'FloorSurface', () => {
    map.getCanvas().style.cursor = '';
});