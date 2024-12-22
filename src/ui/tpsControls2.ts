import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';

const groundRay = new THREE.Raycaster(); // 地面用のレイキャスター
const downDirection = new THREE.Vector3(0, -1, 0); // 下方向のベクトル

export class TPSControls {
    private model: THREE.Group;
    private mixer: THREE.AnimationMixer;
    private animationsMap: Map<string, THREE.AnimationAction> = new Map(); // run, agree
    private orbitControl: OrbitControls;
    private zoomControls: TrackballControls;
    private camera: THREE.PerspectiveCamera;
    private y: number = 100;

    // 状態
    private toggleRun: boolean = true;
    private currentAction: string;

    // 一時的なデータ
    private walkDirection = new THREE.Vector3();
    private rotateAngle = new THREE.Vector3(0, 1, 0);
    private rotateQuarternion: THREE.Quaternion = new THREE.Quaternion();
    private cameraTarget = new THREE.Vector3();

    // 定数
    private fadeDuration: number = 0.2; // フェード時間
    private runVelocity: number = 7; // 速度

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
    }

    // `Run`アニメーション切り替え
    public switchRunToggle() {
        this.toggleRun = !this.toggleRun;
    }

    // キャラクターの位置を取得するメソッド
    public getPosition() {
        return this.model.position;
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
    public update(delta: number, joystickDirection: { x: number; y: number }, groundMesh: THREE.Mesh) {
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
}
