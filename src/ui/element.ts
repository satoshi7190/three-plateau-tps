export class ElementManager {
    private static instance: ElementManager;
    private elements: Record<string, HTMLElement>;

    // コンストラクタをプライベートにして直接のインスタンス化を禁止
    private constructor(selectors: Record<string, string>) {
        this.elements = this.initElements(selectors);
    }

    // 初期化メソッド
    private initElements(selectors: Record<string, string>): Record<string, HTMLElement> {
        const result: Record<string, HTMLElement> = {};

        for (const [key, selector] of Object.entries(selectors)) {
            const element = document.querySelector<HTMLElement>(selector);
            if (!element) {
                console.warn(`要素が見つかりません: ${selector}`);
                continue;
            }
            result[key] = element;
        }
        return result;
    }

    // インスタンスの取得 (シングルトン)
    public static getInstance(selectors: Record<string, string>): ElementManager {
        if (!this.instance) {
            this.instance = new ElementManager(selectors);
        }
        return this.instance;
    }

    // 要素の取得
    public get(key: string): HTMLElement | null {
        return this.elements[key] || null;
    }

    // クラスのトグル
    public toggleClass(key: string, className: string = 'active') {
        const element = this.get(key);
        if (element) {
            element.classList.toggle(className);
        } else {
            console.error(`要素 "${key}" が見つかりませんでした。`);
        }
    }
}
