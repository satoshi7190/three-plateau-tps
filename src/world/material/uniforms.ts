type UniformValue<T> = { value: T };
import { Vector3 } from 'three';

export type Uniforms = {
    u_time: UniformValue<number>;
    u_fogFar: UniformValue<number>;
    u_fogNear: UniformValue<number>;
    u_playerPosition: UniformValue<Vector3>;
};

export const uniforms: Uniforms = {
    u_time: { value: 0 },
    u_fogFar: { value: 900.0 },
    u_fogNear: { value: 150.0 },
    u_playerPosition: { value: new Vector3(0) },
};
