import proj4 from 'proj4';
import { SCENE_CENTER_COORDS } from './constants';
import throttle from 'lodash.throttle';

proj4.defs('EPSG:6677', '+proj=tmerc +lat_0=36 +lon_0=139.833333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs');

/* ワールド座標を経緯度に変える **/
export const worldPotisonToMapPotison = (x: number, z: number): [number, number] => {
    const lon = SCENE_CENTER_COORDS[0] + x;
    const lat = SCENE_CENTER_COORDS[1] + z * -1;
    const lnglat = proj4('EPSG:6677', 'WGS84', [lon, lat]) as [number, number];
    return lnglat;
};

/* 経緯度をワールド座標に変える **/
export const mapPotisonToWorldPotison = (
    lng: number,
    lat: number,
): {
    x: number;
    z: number;
} => {
    const vec2 = proj4('WGS84', 'EPSG:6677', [lng, lat]) as [number, number];
    const x = vec2[0] - SCENE_CENTER_COORDS[0];
    const z = (vec2[1] - SCENE_CENTER_COORDS[1]) * -1;
    return { x, z };
};

/*  ハッシュ値を解析する **/
export const parseHash = (
    hash: string,
): {
    angle: number;
    lat: number;
    lng: number;
} | null => {
    const parts = hash.slice(1).split('/');
    if (parts.length === 3) {
        const rawAngle = parseFloat(parts[0]);

        // 0〜360に収める
        const angle = rawAngle >= 0 && rawAngle <= 360 ? rawAngle : 0;
        const lat = parseFloat(parts[1]); // 緯度
        const lng = parseFloat(parts[2]); // 経度
        return { angle, lat, lng };
    } else {
        return null;
    }
};

const updateHash = (angle: number, x: number, z: number) => {
    const hash = `${angle.toFixed(2)}/${x.toFixed(6)}/${z.toFixed(6)}`;
    history.replaceState(null, '', `#${hash}`);
};
/*  ハッシュ値を更新する **/
export const throttledUpdateHash = throttle(updateHash, 1000);
