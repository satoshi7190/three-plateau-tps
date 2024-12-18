type UniformValue<T> = { value: T };

export type Uniforms = {
    u_time: UniformValue<number>;
    u_fogFar: UniformValue<number>;
    u_fogNear: UniformValue<number>;
};

export const uniforms: Uniforms = {
    u_time: { value: 0 },
    u_fogFar: { value: 900.0 },
    u_fogNear: { value: 150.0 },
};
