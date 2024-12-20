import { KeyInputManager } from './keyInputManager';

export class JoystickControl {
    private joystickBall: HTMLElement;
    private joystickCenterX: number = 0;
    private joystickCenterY: number = 0;
    private joystickLimit: number;
    private touchX: number = 0; // タッチ入力の X 値
    private touchY: number = 0; // タッチ入力の Y 値

    private keyManager: KeyInputManager;

    constructor(joystickId: string, joystickLimit: number = 35) {
        const element = document.getElementById(joystickId);
        if (!element) throw new Error(`Joystick element with ID "${joystickId}" not found.`);

        this.joystickBall = element;
        this.joystickLimit = joystickLimit;

        // キー入力マネージャの初期化
        this.keyManager = new KeyInputManager();

        this.init();
    }

    // 初期化
    private init(): void {
        this.updateJoystickCenter();
        this.addEventListeners();
        window.addEventListener('resize', () => this.updateJoystickCenter());
    }

    // ジョイスティックの中心位置を更新
    private updateJoystickCenter(): void {
        const rect = this.joystickBall.getBoundingClientRect();
        this.joystickCenterX = rect.left + this.joystickBall.clientWidth / 2;
        this.joystickCenterY = rect.top + this.joystickBall.clientHeight / 2;
    }

    // イベントリスナーを追加
    private addEventListeners(): void {
        this.joystickBall.addEventListener('touchmove', (event) => this.dragMove(event));
        this.joystickBall.addEventListener('touchend', () => this.dragLeave());
    }

    // タッチ移動処理
    private dragMove(event: TouchEvent): void {
        event.preventDefault();

        const pageX = event.touches[0].pageX;
        const pageY = event.touches[0].pageY;

        this.touchX = Math.min(Math.max(pageX - this.joystickCenterX, -this.joystickLimit), this.joystickLimit);
        this.touchY = Math.min(Math.max(pageY - this.joystickCenterY, -this.joystickLimit), this.joystickLimit);

        this.updateJoystickBall();
    }

    // タッチリリース処理
    private dragLeave(): void {
        this.touchX = 0;
        this.touchY = 0;
        this.updateJoystickBall();
    }

    // ジョイスティックの位置を更新
    private updateJoystickBall(): void {
        const keyX = this.keyManager.isKeyPressed('a') ? -this.joystickLimit : this.keyManager.isKeyPressed('d') ? this.joystickLimit : 0;
        const keyY = this.keyManager.isKeyPressed('w') ? -this.joystickLimit : this.keyManager.isKeyPressed('s') ? this.joystickLimit : 0;

        // タッチとキー入力を合算
        let totalX = this.touchX + keyX;
        let totalY = this.touchY + keyY;

        // 円の範囲内に制限
        const distance = Math.sqrt(totalX * totalX + totalY * totalY);
        if (distance > this.joystickLimit) {
            const angle = Math.atan2(totalY, totalX);
            totalX = Math.cos(angle) * this.joystickLimit;
            totalY = Math.sin(angle) * this.joystickLimit;
        }

        this.joystickBall.style.translate = `${totalX}px ${totalY}px`;
    }

    // ジョイスティックの方向を取得
    public getDirection(): { x: number; y: number } {
        const keyX = this.keyManager.isKeyPressed('a') ? -this.joystickLimit : this.keyManager.isKeyPressed('d') ? this.joystickLimit : 0;
        const keyY = this.keyManager.isKeyPressed('w') ? -this.joystickLimit : this.keyManager.isKeyPressed('s') ? this.joystickLimit : 0;

        const totalX = this.touchX + keyX;
        const totalY = this.touchY + keyY;

        const magnitude = Math.sqrt(totalX ** 2 + totalY ** 2);
        if (magnitude === 0) {
            return { x: 0, y: 0 }; // ジョイスティックが動いていない
        }

        return {
            x: totalX / this.joystickLimit, // Xの正規化 (-1 ～ 1)
            y: -totalY / this.joystickLimit, // Yの反転で上が正
        };
    }
}
