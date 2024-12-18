export const loadingEnd = async (): Promise<void> => {
    return new Promise((resolve) => {
        // 読み込み完了後にローディング画面を非表示にする
        const loading = document.getElementById('loading') as HTMLElement;

        const animation = loading.animate(
            {
                opacity: [1, 0],
            },
            {
                duration: 300,
                fill: 'forwards',
            },
        );

        animation.onfinish = () => {
            loading.remove(); // ローディング画面削除
            resolve(); // 完了を通知
        };
    });
};

export const loadingStart = () => {
    const loading = document.getElementById('loading') as HTMLElement;

    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    loading.appendChild(spinner);
    document.body.appendChild(loading);
};
