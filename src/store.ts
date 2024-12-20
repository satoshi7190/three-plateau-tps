// 状態型の型定義
type AppStates = {
    showMapViewer: boolean;
    showOperationGuide: boolean;
    isFarView: boolean;
    isModelAnimation: 'idle' | 'run';
    isCameraAnimating: boolean;
    isFullScreen: boolean;
};

// 初期状態
const State: AppStates = {
    showMapViewer: false,
    showOperationGuide: false,
    isFarView: false,
    isModelAnimation: 'idle',
    isCameraAnimating: false,
    isFullScreen: false,
};

// Store クラス定義
class Store<T extends object> {
    private static instances = new Map<string, Store<any>>();
    private state: T;
    private listeners: Map<keyof T, Array<(value: any) => void>> = new Map();

    private constructor(initialState: T) {
        this.state = new Proxy(initialState, {
            set: (target, key, value) => {
                if (target[key as keyof T] !== value) {
                    target[key as keyof T] = value;
                    this.notify(key as keyof T, value); // 特定プロパティの変更通知
                }
                return true;
            },
        });
    }

    // シングルトンインスタンスの取得
    public static getInstance<T extends object>(key: string, initialState: T): Store<T> {
        if (!this.instances.has(key)) {
            this.instances.set(key, new Store(initialState));
        }
        return this.instances.get(key)! as Store<T>;
    }

    // 現在の状態の取得 (key 指定型)
    public get<K extends keyof T>(key: K): T[K] {
        return this.state[key];
    }

    // 状態の変更
    public set<K extends keyof T>(key: K, value: T[K]) {
        if (this.state[key] !== value) {
            this.state[key] = value; // Proxy による自動通知
        }
    }

    // 特定プロパティの変更時に購読
    public subscribe<K extends keyof T>(key: K, listener: (value: T[K]) => void) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key)!.push(listener);
    }

    // 特定プロパティの購読解除
    public unsubscribe<K extends keyof T>(key: K, listener: (value: T[K]) => void) {
        if (this.listeners.has(key)) {
            this.listeners.set(
                key,
                this.listeners.get(key)!.filter((l) => l !== listener),
            );
        }
    }

    // プロパティ変更時の通知
    private notify<K extends keyof T>(key: K, value: T[K]) {
        if (this.listeners.has(key)) {
            this.listeners.get(key)!.forEach((listener) => listener(value));
        }
    }
}

export const store = Store.getInstance<AppStates>('AppStates', State);
