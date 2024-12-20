import proj4 from 'proj4';
import { SCENE_CENTER_COORDS } from './constants';

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
