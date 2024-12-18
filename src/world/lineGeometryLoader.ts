import * as THREE from 'three';
import { geojson } from 'flatgeobuf';

interface Feature {
    type: string;
    properties: {
        [key: string]: any;
        z?: number;
    };
    geometry: {
        type: string;
        coordinates: number[][][];
    };
}

type Vec2 = [number, number];

export type FGB2DLineOption = {
    color: THREE.Color;
    height?: number;
    speed?: number;
};

/** fgbを読み込みライン用のBufferGeometryを作成するクラス */
export class FGB2DLineLoader {
    private center: Vec2;

    constructor(center: Vec2) {
        this.center = center;
    }

    public async load(
        url: string,
        option: FGB2DLineOption = {
            color: new THREE.Color(0xffffff),
            height: 0,
            speed: 1.0,
        },
    ): Promise<THREE.BufferGeometry> {
        const response = await fetch(url);

        // フィーチャのイテレータを作成
        const featureIterator = geojson.deserialize(response.body as ReadableStream) as AsyncIterable<Feature>;

        const mergeVertices: number[] = []; // 全ての頂点を格納する配列
        const mergeIndices: number[] = []; // 全てのインデックスを格納する配列
        const mergeDistances: number[] = [];
        const mergeColors: number[] = [];
        const mergeSpeeds: number[] = [];

        let indexOffset = 0;
        let indexId = 0;

        for await (const feature of featureIterator) {
            const coordinates = feature.geometry.coordinates;

            coordinates.forEach((segments) => {
                const vertices: number[] = []; // 現在のラインの頂点配列
                const indices: number[] = []; // 現在のラインのインデックス配列
                const distances: number[] = []; // 現在のラインの距離配列
                const colors: number[] = []; // 現在のラインの色配列
                const speeds: number[] = []; // 現在のラインの速度配列
                let cumulativeDistance = 0; // 累積距離
                segments.forEach((vec3, idx) => {
                    vertices.push(vec3[0] - this.center[0], vec3[1] - this.center[1], 0);
                    colors.push(option.color.r, option.color.g, option.color.b);
                    speeds.push(option.speed || 1.0);

                    // 累積距離を計算
                    if (idx > 0) {
                        const v1 = new THREE.Vector3(vertices[(idx - 1) * 3], vertices[(idx - 1) * 3 + 1], vertices[(idx - 1) * 3 + 2]);
                        const v2 = new THREE.Vector3(vec3[0], vec3[1], 0);
                        cumulativeDistance += v1.distanceTo(v2);
                    }
                    distances.push(cumulativeDistance);
                });

                // ラインのインデックスを作成
                for (let i = 0; i < segments.length - 1; i++) {
                    indices.push(indexOffset + i, indexOffset + i + 1);
                }

                indexOffset += segments.length;

                // グローバルな頂点・インデックス配列に追加
                mergeVertices.push(...vertices);
                mergeIndices.push(...indices);
                mergeDistances.push(...distances);
                mergeColors.push(...colors);
                mergeSpeeds.push(...speeds);
            });

            indexId++;
        }

        // BufferGeometryを作成
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(mergeVertices, 3));
        geometry.setIndex(mergeIndices);
        geometry.setAttribute('a_distance', new THREE.Float32BufferAttribute(mergeDistances, 1));
        geometry.setAttribute('a_color', new THREE.Float32BufferAttribute(mergeColors, 3));
        geometry.setAttribute('a_speed', new THREE.Float32BufferAttribute(mergeSpeeds, 1));

        // 回転
        const matrix = new THREE.Matrix4().makeRotationX(Math.PI / -2);
        geometry.applyMatrix4(matrix);

        // y方向に移動
        geometry.translate(0, option.height as number, 0);

        return geometry;
    }
}
