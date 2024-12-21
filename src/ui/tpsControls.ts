import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';

const wallRay = new THREE.Raycaster(); // 壁用のレイキャスター
const groundRay = new THREE.Raycaster(); // 地面用のレイキャスター
const downDirection = new THREE.Vector3(0, -1, 0); // 下方向のベクトル

export class TPSControls {
    model: THREE.Group;
    mixer: THREE.AnimationMixer;
    animationsMap: Map<string, THREE.AnimationAction> = new Map(); // run, agree
    orbitControl: OrbitControls;
    zoomControls: TrackballControls;
    camera: THREE.PerspectiveCamera;
    y: number = 100;

    // 状態
    toggleRun: boolean = true;
    currentAction: string;

    // 一時的なデータ
    walkDirection = new THREE.Vector3();
    rotateAngle = new THREE.Vector3(0, 1, 0);
    rotateQuarternion: THREE.Quaternion = new THREE.Quaternion();
    cameraTarget = new THREE.Vector3();

    // 定数
    fadeDuration: number = 0.2; // フェード時間
    runVelocity: number = 7; // 速度

    constructor(
        model: THREE.Group,
        mixer: THREE.AnimationMixer,
        animationsMap: Map<string, THREE.AnimationAction>,
        orbitControl: OrbitControls,
        zoomControls: TrackballControls,
        camera: THREE.PerspectiveCamera,
        currentAction: string,
    ) {
        this.model = model;
        this.mixer = mixer;
        this.animationsMap = animationsMap;
        this.currentAction = currentAction;
        this.animationsMap.forEach((value, key) => {
            if (key == currentAction) {
                value.play();
            }
        });
        this.orbitControl = orbitControl;
        this.zoomControls = zoomControls;
        this.camera = camera;
        this.updateTarget();

        // ホイールイベントの監視 (カメラ位置が変更されたとき)
        this.orbitControl.addEventListener('change', () => {
            if (this.camera) this.camera.updateProjectionMatrix();
        });
    }

    // `Run`アニメーション切り替え
    public switchRunToggle() {
        this.toggleRun = !this.toggleRun;
    }

    public getPosition() {
        return this.model.position;
    }

    // 衝突判定
    public checkCollision(mesh: THREE.Mesh, distance: number): boolean {
        // 現在のモデルの位置を取得
        const origin = this.model.position.clone();
        origin.y += 1.0; // 1.0 の値は適宜調整

        // モデルの向きを基準にしたレイの方向
        const direction = this.walkDirection;
        direction.normalize();

        // レイキャスターの設定
        wallRay.set(origin, direction);
        wallRay.far = distance + 0.5; // チェックする範囲を設定

        // 衝突判定
        const intersects = wallRay.intersectObject(mesh, true);
        return intersects.length > 0; // 衝突があれば true を返す
    }

    // キャラクターの向きを取得するメソッド
    public getFacingDirection(): THREE.Vector3 {
        const direction = new THREE.Vector3();
        this.model.getWorldDirection(direction);
        direction.normalize(); // 必要に応じて正規化
        return direction;
    }

    // モデルの回転角度 (0〜360度) を取得するメソッド
    public getModelRotationAngle(): number {
        const direction = this.getFacingDirection();

        // Z方向の基準に対するモデルの回転角度を計算
        const angleRadians = Math.atan2(direction.x, -direction.z); // -Zが基準
        const angleDegrees = THREE.MathUtils.radToDeg(angleRadians);

        // 0〜360度の範囲に変換
        return (angleDegrees + 360) % 360;
    }

    // キャラクターの更新処理
    public update(delta: number, joystickDirection: { x: number; y: number }, groundMesh: THREE.Mesh, collisionMesh: THREE.Mesh) {
        const directionPressed = joystickDirection.x !== 0 || joystickDirection.y !== 0;

        const characterPosition = this.getPosition();
        const rayPosition = characterPosition.clone();

        // レイの位置を少し上にずらす
        rayPosition.y += 1.5;

        // 下方向のレイを作成
        groundRay.set(rayPosition, downDirection);

        // レイと地面の交差判定
        const intersects = groundRay.intersectObject(groundMesh, true);

        // 地面の高さを取得
        let y = this.y;
        if (intersects.length > 0) {
            y = intersects[0].point.y;
            this.y = y;
        }

        // アニメーション切り替え
        let play = '';
        if (directionPressed && this.toggleRun) {
            play = 'run';
        } else {
            play = 'agree';
        }
        if (this.currentAction != play) {
            const toPlay = this.animationsMap.get(play);
            const current = this.animationsMap.get(this.currentAction);

            if (!current || !toPlay) return;
            current.fadeOut(this.fadeDuration);
            toPlay.reset().fadeIn(this.fadeDuration).play();

            this.currentAction = play;
        }

        this.mixer.update(delta);

        if (this.currentAction == 'run') {
            // カメラの向きに基づく基準角度を計算
            const angleYCameraDirection = Math.atan2(this.camera.position.x - this.model.position.x, this.camera.position.z - this.model.position.z);

            // ジョイスティック方向をカメラ基準で回転
            this.walkDirection.set(joystickDirection.x, 0, -joystickDirection.y); // XとZを入れ替え
            this.walkDirection.normalize();
            this.walkDirection.applyAxisAngle(this.rotateAngle, angleYCameraDirection); // カメラ基準で回転

            // 衝突判定
            const velocity = this.runVelocity;
            const moveDistance = velocity * delta;

            if (this.checkCollision(collisionMesh, moveDistance)) {
                return; // 衝突があった場合は移動をキャンセル
            }

            // モデルの回転を調整
            const moveAngle = Math.atan2(this.walkDirection.x, this.walkDirection.z);
            this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, moveAngle);
            this.model.quaternion.rotateTowards(this.rotateQuarternion, 0.2);

            // 移動計算
            const moveX = this.walkDirection.x * moveDistance;
            const moveZ = this.walkDirection.z * moveDistance;
            this.model.position.x += moveX;
            this.model.position.z += moveZ;

            // 地面の高さ更新
            this.model.position.y = y;

            // カメラターゲット更新
            this.updateTarget();
        }
    }

    // カメラ、コントロールのターゲットの更新
    private updateTarget() {
        // 現在のカメラ位置とターゲットの差分を計算
        const cameraOffset = new THREE.Vector3().subVectors(this.camera.position, this.orbitControl.target);

        // モデルの現在位置を取得
        const modelY = this.model.position.y;

        // カメラターゲットの更新
        this.cameraTarget.set(
            this.model.position.x,
            modelY + 1, // 必要ならオフセットを調整
            this.model.position.z,
        );

        // カメラの新しい位置をターゲットのオフセットを基準に更新
        this.camera.position.copy(this.cameraTarget).add(cameraOffset);

        // コントロールのターゲット更新
        this.orbitControl.target.copy(this.cameraTarget);
        this.zoomControls.target.copy(this.cameraTarget);

        // カメラの更新を確定
        this.orbitControl.update();
        this.zoomControls.update();
        this.camera.updateProjectionMatrix();
    }

    // モデルの位置を設定するメソッド
    public setModelPosition(x: number, y: number, z: number) {
        this.model.position.set(x, y, z);

        this.updateTarget();
    }
}
