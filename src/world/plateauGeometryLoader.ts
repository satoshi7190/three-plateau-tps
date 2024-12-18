import * as THREE from 'three';
import { Earcut } from 'three/src/extras/Earcut.js';
import { geojson } from 'flatgeobuf';

interface Feature {
    type: string;
    properties: {
        [key: string]: any;
    };
    geometry: {
        type: string;
        coordinates: number[][][][];
    };
}

type Vec3 = [number, number, number];

export class FGB3DLoader {
    private center: [number, number];

    constructor(center: [number, number]) {
        this.center = center;
    }

    // ファイルを読み込み、BufferGeometryを返すメソッド
    public async load(url: string): Promise<THREE.BufferGeometry> {
        const response = await fetch(url);
        const featureIterator = geojson.deserialize(response.body as ReadableStream) as AsyncIterable<Feature>;

        // 頂点・インデックス・UV格納用
        const mergeVertices: number[] = [];
        const mergeIndex: number[] = [];
        const allUVs: number[] = [];

        let indexId = 0;

        for await (const feature of featureIterator) {
            this.processFeature(feature, mergeVertices, mergeIndex, allUVs);
            indexId++;
        }

        return this.createBufferGeometry(mergeVertices, mergeIndex, allUVs);
    }

    //  Featureを処理するメソッド
    private processFeature(feature: Feature, mergeVertices: number[], mergeIndex: number[], allUVs: number[]) {
        const coordinates = feature.geometry.coordinates;

        coordinates.forEach((surface) => {
            const { vertices, outerVertices2D, holes, axis } = this.extractSurfaceData(surface);
            const uvs = this.computeUVs(vertices, axis);
            allUVs.push(...uvs);

            const triangles = this.triangulateSurface(outerVertices2D, holes);
            this.mergeVerticesAndIndices(mergeVertices, mergeIndex, vertices, triangles);
        });
    }

    // 法線計算、軸判定、verticesとouterVertices2Dの取得
    private extractSurfaceData(surface: any[]): { vertices: number[]; outerVertices2D: number[]; holes: number[][]; axis: string } {
        const vertices: number[] = []; // 現在の面の頂点配列
        const outerVertices2D: number[] = []; // earcut用の2D頂点配列
        const holes: number[][] = []; // 穴の頂点配列
        let axis: string = 'z'; // 初期値

        surface.forEach((segments, index) => {
            const points: Vec3[] = [];
            segments.forEach((vec3: Vec3, idx: number) => {
                if (idx < 3) points.push([vec3[0] - this.center[0], vec3[1] - this.center[1], vec3[2]]);
            });

            // 法線ベクトルの計算
            const vector1 = this.subtractVectors(points[1], points[0]);
            const vector2 = this.subtractVectors(points[2], points[0]);
            const normal = this.normalizeVector(this.crossProduct(vector1, vector2));

            // 法線の向きから軸を判断
            const normalX = Math.abs(normal[0]);
            const normalY = Math.abs(normal[1]);
            const normalZ = Math.abs(normal[2]);

            if (normalX > normalY && normalX > normalZ) {
                axis = 'x'; // YZ平面
            } else if (normalY > normalX && normalY > normalZ) {
                axis = 'y'; // XZ平面
            } else {
                axis = 'z'; // XY平面
            }

            // アウトラインの頂点配列を作成
            if (index === 0) {
                segments.forEach((vec3: Vec3, idx: number) => {
                    if (idx + 1 !== segments.length) {
                        vertices.push(vec3[0] - this.center[0], vec3[1] - this.center[1], vec3[2]);
                        if (axis === 'x') {
                            outerVertices2D.push(vec3[1] - this.center[0], vec3[2] - this.center[1]);
                        } else if (axis === 'y') {
                            outerVertices2D.push(vec3[0] - this.center[0], vec3[2] - this.center[1]);
                        } else if (axis === 'z') {
                            outerVertices2D.push(vec3[0] - this.center[0], vec3[1] - this.center[1]);
                        }
                    }
                });
            } else {
                const holeVertices2D: number[] = [];
                segments.forEach((vec3: Vec3, idx: number) => {
                    if (idx + 1 !== segments.length) {
                        vertices.push(vec3[0] - this.center[0], vec3[1] - this.center[1], vec3[2]);
                        if (axis === 'x') {
                            holeVertices2D.push(vec3[1] - this.center[0], vec3[2] - this.center[1]);
                        } else if (axis === 'y') {
                            holeVertices2D.push(vec3[0] - this.center[0], vec3[2] - this.center[1]);
                        } else if (axis === 'z') {
                            holeVertices2D.push(vec3[0] - this.center[0], vec3[1] - this.center[1]);
                        }
                    }
                });
                holes.push(holeVertices2D);
            }
        });
        return { vertices, outerVertices2D, holes, axis };
    }

    // Earcutを使用して三角形分割するメソッド
    private triangulateSurface(outerVertices2D: number[], holes: number[][]): number[] {
        let triangles: number[];
        if (holes.length > 0) {
            const holeIndices: number[] = [];
            let holesOffset = outerVertices2D.length / 2;
            holes.forEach((hole) => {
                holeIndices.push(holesOffset);
                holesOffset += hole.length / 2;
            });
            triangles = Earcut.triangulate(outerVertices2D.concat(...holes), holeIndices);
        } else {
            triangles = Earcut.triangulate(outerVertices2D);
        }

        // 頂点の順序を確認し、必要なら反転
        if (this.isClockwise(outerVertices2D)) {
            triangles.reverse(); // 時計回り (CW) の場合は反転
        }
        return triangles;
    }

    // 頂点とインデックスをマージするメソッド
    private mergeVerticesAndIndices(mergeVertices: number[], mergeIndex: number[], vertices: number[], triangles: number[]) {
        // グローバルな頂点配列に追加
        const vertexOffset = mergeVertices.length / 3;
        mergeVertices.push(...vertices);

        // インデックスをオフセットして追加
        const offsetIndices = triangles.map((i) => i + vertexOffset);
        mergeIndex.push(...offsetIndices);
    }

    // BufferGeometryを作成するメソッド
    private createBufferGeometry(mergeVertices: number[], mergeIndex: number[], allUVs: number[]): THREE.BufferGeometry {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(mergeVertices), 3));
        geometry.setIndex(mergeIndex);
        geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(allUVs), 2));

        // 回転 X軸
        const matrix = new THREE.Matrix4().makeRotationX(Math.PI / -2);
        geometry.applyMatrix4(matrix);
        geometry.computeVertexNormals();

        return geometry;
    }

    // 多角形の頂点配列がCWかCCWかを判定するメソッド
    private isClockwise(vertices2D: number[]): boolean {
        let area = 0;
        for (let i = 0; i < vertices2D.length; i += 2) {
            const x1 = vertices2D[i];
            const y1 = vertices2D[i + 1];
            const x2 = vertices2D[(i + 2) % vertices2D.length];
            const y2 = vertices2D[(i + 3) % vertices2D.length];
            area += x1 * y2 - x2 * y1;
        }
        return area / 2 < 0; // true: CW（時計回り）、false: CCW（反時計回り）
    }

    // 面のUV座標を計算するメソッド
    private computeUVs(vertices: number[], axis: string): number[] {
        const uvs: number[] = [];

        // 軸選択用の関数
        const getUV = (x: number, y: number, z: number): [number, number] => {
            switch (axis) {
                case 'x':
                    return [y, z]; // YZ平面
                case 'y':
                    return [x, z]; // XZ平面
                default:
                    return [x, y]; // XY平面
            }
        };

        // 最小・最大値の初期化
        let minU = Infinity,
            maxU = -Infinity;
        let minV = Infinity,
            maxV = -Infinity;

        // 最小・最大値を計算
        for (let i = 0; i < vertices.length; i += 3) {
            const [u, v] = getUV(vertices[i], vertices[i + 1], vertices[i + 2]);
            minU = Math.min(minU, u);
            maxU = Math.max(maxU, u);
            minV = Math.min(minV, v);
            maxV = Math.max(maxV, v);
        }

        // 範囲が無効ならUVゼロ配列を返す
        const rangeU = maxU - minU;
        const rangeV = maxV - minV;
        if (rangeU === 0 || rangeV === 0) {
            return new Array((vertices.length / 3) * 2).fill(0);
        }

        // UV座標を正規化して格納
        for (let i = 0; i < vertices.length; i += 3) {
            const [u, v] = getUV(vertices[i], vertices[i + 1], vertices[i + 2]);
            uvs.push((u - minU) / rangeU, (v - minV) / rangeV);
        }

        return uvs;
    }

    // ベクトルの差を計算するメソッド
    private subtractVectors(a: Vec3, b: Vec3): Vec3 {
        return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    }

    // ベクトルの外積を計算するメソッド
    private crossProduct(a: Vec3, b: Vec3): Vec3 {
        return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    }

    // ベクトルを正規化するメソッド
    private normalizeVector(v: Vec3): Vec3 {
        const length = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
        return length === 0 ? [0, 0, 0] : [v[0] / length, v[1] / length, v[2] / length];
    }
}
