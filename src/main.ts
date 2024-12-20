import { uniforms } from './world/material/uniforms';
import { parseHash, mapPotisonToWorldPotison } from './utils';
import './main.css';
import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Joystick } from './ui/joystickControl';
import { TPSControls } from './ui/tpsControls';

import { SCENE_CENTER_COORDS, INITIAL_LNG_LAT, INITIAL_MODEL_ROTATION } from './constants';
import { FGB3DLoader } from './world/plateauGeometryLoader';
import { FGB2DLineLoader } from './world/lineGeometryLoader';
import type { FGB2DLineOption } from './world/lineGeometryLoader';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import { customLineMaterial, customSurfaceMaterial, characterMaterial, hitBoxMaterial, floorMaterial, underGroundMaterial, customSurfaceMaterial2 } from './world/material';

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

// レイキャスト
const raycaster = new THREE.Raycaster();

// 下向きベクトル
const downDirection = new THREE.Vector3(0, -1, 0);

// モデルの読み込みとキャラクターコントロールの設定
let tpsControls: TPSControls;

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

    setFullHeight();
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

        tpsControls = new TPSControls(model, mixer, animationsMap, orbitControls, zoomControls, camera, 'agree');
        tpsControls.update;
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
    if (tpsControls) {
        const characterPosition = tpsControls.getPosition();
        const rayPosition = characterPosition.clone();
        rayPosition.y += 1.5;
        const hitBox = objs.HitBox;
        const ground = objs.FloorSurface;

        const joystickDirection = joystick.getDirection();
        if (ground && hitBox) {
            tpsControls.update(mixerUpdateDelta, joystickDirection, ground, hitBox);
        }
    }

    orbitControls.update();
    zoomControls.update();
    renderer.render(scene, camera);

    uniforms.u_time.value = clock.getElapsedTime();
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

        tpsControls.setModelPosition(x, y, z);
    }

    const joystickDirection = joystick.getDirection();
    tpsControls.update(mixerUpdateDelta, joystickDirection, ground, hitBox);
    const angle = tpsControls.getModelRotationAngle();
    setMarker(x, z, angle);
};

map.on('mouseover', 'FloorSurface', () => {
    map.getCanvas().style.cursor = 'pointer';
});

map.on('mouseleave', 'FloorSurface', () => {
    map.getCanvas().style.cursor = '';
});

// スマホブラウザのアドレスバーの高さを除いた画面の高さを取得
const setFullHeight = () => {
    const fullHeight = window.innerHeight;
    const fullWidth = window.innerWidth;
    document.documentElement.style.setProperty('--full-height', `${fullHeight}px`);
    document.documentElement.style.setProperty('--full-width', `${fullWidth}px`);
};
setFullHeight;
