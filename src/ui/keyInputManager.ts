import { store } from '../store';

const keyDict: Record<string, string> = {
    arrowup: 'w',
    arrowleft: 'a',
    arrowdown: 's',
    arrowright: 'd',
};

export class KeyInputManager {
    private keyState: Record<string, boolean> = {};

    constructor() {
        this.initializeKeys();
        this.addEventListeners();
    }

    // 初期化処理
    private initializeKeys(): void {
        Object.values(keyDict).forEach((key) => {
            const element = document.getElementById(`key-${key}`);
            if (!element) throw new Error(`Key element "key-${key}" not found.`);
        });
    }

    // イベントリスナー登録
    private addEventListeners(): void {
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
    }

    // キー押下時の処理
    private handleKeyDown(e: KeyboardEvent): void {
        const key = this.normalizeKey(e.key);
        if (!key) return;

        this.keyState[key] = true;
        this.setKeyActive(key, true);
        this.handleSpecialKeys(e.key);
        if (key !== 'r') store.set('showLayerMenu', false);
    }

    // キー解放時の処理
    private handleKeyUp(e: KeyboardEvent): void {
        const key = this.normalizeKey(e.key);
        if (!key) return;

        this.keyState[key] = false;
        this.setKeyActive(key, false);
    }

    // 特定のキー操作の処理
    private handleSpecialKeys(key: string): void {
        switch (key) {
            case 'q':
                if (store.get('isFarView')) return;
                store.set('showMapViewer', !store.get('showMapViewer'));
                break;
            case 'e':
                if (store.get('showMapViewer') || store.get('isCameraAnimating')) return;
                store.set('isFarView', !store.get('isFarView'));
                break;
            case 'r':
                store.set('showLayerMenu', !store.get('showLayerMenu'));
                break;
            case 'Escape':
                store.set('showMapViewer', false);
                store.set('isFarView', false);
                store.set('showLayerMenu', false);
                break;
        }
    }

    // キー名の正規化
    private normalizeKey(key: string): string | undefined {
        const lowerKey = key.toLowerCase();
        return keyDict[lowerKey] || lowerKey;
    }

    // キーのアクティブ状態を設定
    private setKeyActive(key: string, isActive: boolean): void {
        const element = document.getElementById(`key-${key}`);
        if (element) {
            element.classList.toggle('active', isActive);
        }
    }

    // キーが押されているかチェック
    public isKeyPressed(key: string): boolean {
        return !!this.keyState[key.toLowerCase()];
    }
}
