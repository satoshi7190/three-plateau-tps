import { uniforms } from './world/material/uniforms';
import './main.css';
import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { JoystickControl } from './ui/joystickControl';
import { TPSControls } from './ui/tpsControls';
// import { TPSControls } from './ui/tpsControls2';
import { FGB3DLoader } from './world/plateauGeometryLoader';
import { FGB2DLineLoader } from './world/lineGeometryLoader';
import type { FGB2DLineOption } from './world/lineGeometryLoader';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import { lineMaterial, bldgbridMaterial, characterMaterial, hitBoxMaterial, ubldfloorMaterial, ubldIntBuildingInstallationMaterial, ubldWallCeilingMaterial } from './world/material';
import proj4 from 'proj4';
proj4.defs('EPSG:6677', '+proj=tmerc +lat_0=36 +lon_0=139.833333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs');
// シーンの中心にする地理座標[x, y] (EPSG:6677)
const SCENE_CENTER_COORDS: [number, number] = [-12043, -34145];
const INITIAL_LNG_LAT: [number, number] = [139.699361, 35.692191]; // キャラクターのの初期緯度
const INITIAL_MODEL_ROTATION: number = 90; // キャラクターの初期向き (0〜360)

/* 経緯度をワールド座標に変える **/
const mapPotisonToWorldPotison = (
    lng: number,
    lat: number,
): {
    x: number;
    z: number;
} => {
    const vec2 = proj4('WGS84', 'EPSG:6677', [lng, lat]) as [number, number];
    const x = vec2[0] - SCENE_CENTER_COORDS[0];
    const z = (vec2[1] - SCENE_CENTER_COORDS[1]) * -1;
    return { x, z };
};

// BVHの高速化されたレイキャストを有効にする
THREE.Mesh.prototype.raycast = acceleratedRaycast;
type IsRaycastObjectName = 'FloorSurface' | 'HitBox';
const raycastObjectNames: IsRaycastObjectName[] = ['FloorSurface', 'HitBox'];

// シーンの作成
const scene = new THREE.Scene();

// カメラ
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100000);
camera.position.set(18, 9, 3);

// camera.position.set(100, 100, 100);
// camera.zoom = 0.5;
scene.add(camera);

// キャンバス
const canvas = document.getElementById('three-canvas') as HTMLCanvasElement;
const context = canvas.getContext('webgl2') as WebGL2RenderingContext;

const orbitControls = new OrbitControls(camera, canvas);
orbitControls.enableDamping = true;
orbitControls.enablePan = false;
orbitControls.enableZoom = false;
orbitControls.minDistance = 1; // カメラが近づける最小距離
orbitControls.maxDistance = 7; // カメラが遠ざかれる最大距離
orbitControls.maxPolarAngle = Math.PI / 2 + 0.35; // カメラが上を向ける最大角度
orbitControls.minPolarAngle = Math.PI / 2 - 0.8; // カメラが下を向ける最小角度
orbitControls.update(); // 初期化

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
setPlayerControl(false);

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
};
window.addEventListener('resize', onResize);

const lineLoader = new FGB2DLineLoader(SCENE_CENTER_COORDS);
const addLineObj = async (url: string, name: string, option: FGB2DLineOption) => {
    lineLoader.load(url, option).then((geometry: THREE.BufferGeometry) => {
        const obj = new THREE.LineSegments(geometry, lineMaterial);
        obj.name = name;

        // シーンに追加
        scene.add(obj);
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

        // シーンに追加
        scene.add(obj);
    });
};

// オブジェクトを読み込み
const loadObjs = async () => {
    const plateauObjPromises = [
        addPlateauObj('plateau_shinjuku/ubld/FloorSurface.fgb', 'FloorSurface', ubldfloorMaterial),
        addPlateauObj('plateau_shinjuku/ubld/IntBuildingInstallation.fgb', 'IntBuildingInstallation', ubldIntBuildingInstallationMaterial),
        addPlateauObj('plateau_shinjuku/ubld/ClosureSurface.fgb', 'ClosureSurface', ubldWallCeilingMaterial),
        addPlateauObj('plateau_shinjuku/ubld/RoofSurface.fgb', 'RoofSurface', ubldWallCeilingMaterial),
        addPlateauObj('plateau_shinjuku/ubld/InteriorWallSurface.fgb', 'InteriorWallSurface', ubldWallCeilingMaterial),
        addPlateauObj('plateau_shinjuku/ubld/Window.fgb', 'Window', ubldWallCeilingMaterial),
        addPlateauObj('plateau_shinjuku/ubld/Door.fgb', 'Door', ubldWallCeilingMaterial),
        addPlateauObj('plateau_shinjuku/ubld/HitBox.fgb', 'HitBox', hitBoxMaterial),
        addPlateauObj('plateau_shinjuku/bldg/53394525_Building.fgb', '53394525_Building', bldgbridMaterial),
        addPlateauObj('plateau_shinjuku/bldg/53394535_Building.fgb', '53394535_Building', bldgbridMaterial),
        addPlateauObj('plateau_shinjuku/bldg/53394526_Building.fgb', '53394526_Building', bldgbridMaterial),
        addPlateauObj('plateau_shinjuku/bldg/53394536_Building.fgb', '53394536_Building', bldgbridMaterial),
        addPlateauObj('plateau_shinjuku/brid/53394525_Bridge.fgb', '53394525_Bridge', bldgbridMaterial),
        addPlateauObj('plateau_shinjuku/brid/53394526_Bridge.fgb', '53394526_Bridge', bldgbridMaterial),
        addPlateauObj('plateau_shinjuku/brid/53394535_Bridge.fgb', '53394535_Bridge', bldgbridMaterial),
        addLineObj('line/shinjuku_link.fgb', 'link', { color: new THREE.Color('rgb(255, 0, 204)'), height: 40, speed: 0.8 }),
        addLineObj('line/gsi_RailCL.fgb', 'RailCL', { color: new THREE.Color('rgb(85, 255, 0)'), height: 60, speed: 1.2 }),
        addLineObj('line/gsi_road.fgb', 'road', { color: new THREE.Color('rgb(255, 255, 0)'), height: 50, speed: 1.0 }),
    ];

    await Promise.all(plateauObjPromises);

    // モデルの追加
    addModel('./models/Xbot.glb');
};

// 読み込み開始
loadObjs();

// レイキャスト
const raycaster = new THREE.Raycaster();

// 下向きベクトル
const downDirection = new THREE.Vector3(0, -1, 0);

// モデルの読み込みとキャラクターコントロールの設定
let tpsControls: TPSControls;
// モデルの追加
const addModel = (url: string) => {
    new GLTFLoader().load(url, (gltf) => {
        const model = gltf.scene;
        model.traverse((object: any) => {
            if (object.isMesh) {
                object.material.needUpdate = true;
                object.material = characterMaterial;
            }
        });

        // だいたいの人間の大きさに合わせる
        model.scale.set(0.9, 0.9, 0.9);

        model.position.set(0, 500, 0);

        // const initilPos = mapPotisonToWorldPotison(INITIAL_LNG_LAT[0], INITIAL_LNG_LAT[1]);
        // model.position.set(initilPos.x, 500, initilPos.z);
        // model.rotation.y = THREE.MathUtils.degToRad(INITIAL_MODEL_ROTATION); // 度をラジアンに変換

        const ground = scene.getObjectByName('FloorSurface');

        if (ground) {
            // レイキャストの設定
            raycaster.set(model.position, downDirection);
            const intersects = raycaster.intersectObject(ground, true);

            if (intersects.length > 0) {
                model.position.y = intersects[0].point.y;
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

// 経過時間の管理
const clock = new THREE.Clock();

// ジョイスティックコントロールの設定
const joystick = new JoystickControl('joystick-ball');

// アニメーション
const animate = () => {
    requestAnimationFrame(animate);

    // 省略

    uniforms.u_time.value = clock.getElapsedTime();
};
animate();

export const setPotison = (x: number, z: number) => {
    const ground = scene.getObjectByName('FloorSurface');
    const hitBox = scene.getObjectByName('HitBox');
    // レイキャストの設定
    raycaster.set(new THREE.Vector3(x, 1000, z), downDirection);
    const intersects = raycaster.intersectObject(ground, true);
    let mixerUpdateDelta = clock.getDelta();

    if (intersects.length > 0) {
        const y = intersects[0].point.y;

        // tpsControls.setModelPosition(x, y, z);
    }

    const joystickDirection = joystick.getDirection();
    // tpsControls.update(mixerUpdateDelta, joystickDirection, ground, hitBox);
};
