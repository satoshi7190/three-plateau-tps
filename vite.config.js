import { resolve } from 'path';
import { defineConfig } from 'vite';
const root = resolve(__dirname, 'src');

export default defineConfig({
    root,
    build: {
        outDir: 'dist',
        base: './',
    },
    assetsDir: './',
    // publicDir: '../public',
    publicPath: './',
    base: './',
});
