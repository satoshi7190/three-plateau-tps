import { worldPotisonToMapPotison } from '../utils';
import { store } from '../store';
import { throttledUpdateHash } from '../utils';

import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
            FloorSurface: {
                type: 'geojson',
                data: 'plateau_shinjuku/ubld/geojson/UndergroundBuilding.geojson',
            },
            obj2_2d: {
                type: 'geojson',
                data: 'plateau_shinjuku/ubld/geojson/obj2_2d.geojson',
            },
            gsi_vector: {
                // 地理院ベクトル
                type: 'vector',
                tiles: ['https://cyberjapandata.gsi.go.jp/xyz/experimental_bvmap/{z}/{x}/{y}.pbf'],
                maxzoom: 16,
                minzoom: 4,
                attribution: '国土地理院',
            },
        },
        layers: [
            {
                id: 'background',
                type: 'background',
                paint: {
                    'background-color': '#595959',
                    'background-opacity': 0.5,
                },
            },
            {
                'id': 'railway',
                'source': 'gsi_vector',
                'source-layer': 'railway',
                'type': 'line',
                // 'filter': ['!=', ['get', 'ftCode'], 6101],
                'paint': {
                    'line-color': '#4cf100',
                    'line-width': 2,
                },
                'layout': {
                    // visibility: 'none',
                },
            },
            {
                'id': 'road',
                'source': 'gsi_vector',
                'source-layer': 'road',
                'type': 'line',
                // 'filter': ['!=', ['get', 'ftCode'], 6101],
                'paint': {
                    'line-color': 'rgb(198, 198, 198)',
                    'line-width': 1,
                },
                'layout': {
                    // visibility: 'none',
                },
            },
            {
                'id': 'building',
                'source': 'gsi_vector',
                'source-layer': 'building',
                'type': 'line',
                // 'filter': ['!=', ['get', 'ftCode'], 6101],
                'paint': {
                    'line-color': '#00d3ff',
                    'line-width': 1,
                },
                'layout': {
                    // visibility: 'none',
                },
            },
            {
                id: 'FloorSurface',
                source: 'FloorSurface',
                type: 'fill',
                paint: {
                    'fill-color': '#292929',
                    'fill-outline-color': '#ffffff',
                    'fill-opacity': 1,
                },
            },
            {
                id: 'FloorSurface_line',
                source: 'FloorSurface',
                type: 'line',
                paint: {
                    'line-color': '#ffffff',
                    'line-width': 1.5,
                },
            },
            {
                id: 'obj2_2d_line',
                source: 'obj2_2d',
                type: 'line',
                paint: {
                    'line-color': '#ffffff',
                    'line-width': 1.5,
                },
            },
        ],
    },
    center: [139.700925, 35.691417], // 地図の中心座標
    zoom: 18,
    // minZoom: 14, // 地図の初期ズームレベル
    maxPitch: 0,
    // attributionControl: false,
    maxBounds: [
        [139.689, 35.682],
        [139.712, 35.7],
    ],
    // mapの回転を無効化
});

// function disableAllInteractions(map) {
//     map.dragPan.disable();
//     map.scrollZoom.disable();
//     map.boxZoom.disable();
//     map.dragRotate.disable();
//     map.keyboard.disable();
//     map.doubleClickZoom.disable();
//     map.touchZoomRotate.disable();
// }

// function enableAllInteractions(map) {
//     map.dragPan.enable();
//     map.scrollZoom.enable();
//     map.boxZoom.enable();
//     map.dragRotate.enable();
//     map.keyboard.enable();
//     map.doubleClickZoom.enable();
//     map.touchZoomRotate.enable();
// }

// disableAllInteractions(map);

map.dragRotate.disable();

//  Controls
const nav = new maplibregl.NavigationControl({
    // showCompass: false,
});
map.addControl(nav, 'top-left');

let playerMarkerDiv: HTMLDivElement;
let playerMarker: maplibregl.Marker;
let cameraAngleMaker: maplibregl.Marker;

const cameraMarkerDiv = document.createElement('div');
const divChild = document.createElement('div');
divChild.className = 'camera-angle';
cameraMarkerDiv.appendChild(divChild);

fetch('./location.svg')
    .then((res) => res.text()) // SVGを文字列として取得
    .then((svgText) => {
        const div = document.createElement('div'); // コンテナ要素を作成
        div.className = 'location'; // クラス名を設定
        div.innerHTML = svgText; // SVGデータを挿入
        playerMarkerDiv = div;
    })
    .catch((error) => {
        console.error('Failed to fetch SVG:', error);
    });

//  カメラ
export const setCameraMarker = (angle: number) => {
    // 既存のマーカーを削除または再利用
    if (cameraAngleMaker) {
        cameraAngleMaker.setLngLat(map.getCenter()).setRotation(angle); // マーカーの位置を更新
    } else {
        cameraAngleMaker = new maplibregl.Marker({
            element: cameraMarkerDiv,
            className: 'camera-angle-marker',
        })
            .setLngLat(map.getCenter())
            .addTo(map)
            .setRotation(angle);
    }

    // マップを新しい位置に移動
};

// プレイヤー
export const setPlayerMarker = (x: number, z: number, angle: number) => {
    const lonlat = worldPotisonToMapPotison(x, z);

    // 既存のマーカーを削除または再利用
    if (playerMarker) {
        playerMarker.setLngLat(lonlat).setRotation(angle); // マーカーの位置を更新
    } else {
        // 新しいマーカーを作成
        playerMarker = new maplibregl.Marker({
            element: playerMarkerDiv,
            className: 'player-marker',
        })
            .setLngLat(lonlat)
            .addTo(map)
            .setRotation(angle);
    }

    // マップを新しい位置に移動
    map.easeTo({ center: lonlat, duration: 0, zoom: 18 });
    // ハッシュの更新
    throttledUpdateHash(angle, lonlat[1], lonlat[0]);
};

let currentCenter = map.getCenter();

// 初期購読設定
store.subscribe('showMapViewer', (value) => {
    if (value) {
        currentCenter = map.getCenter();
        map.setPaintProperty('background', 'background-opacity', 1.0);
        divChild.classList.remove('active');
    } else {
        map.setPaintProperty('background', 'background-opacity', 0.5);
        map.easeTo({ center: currentCenter, duration: 0 });
        divChild.classList.add('active');
    }
});
