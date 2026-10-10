import { Node, Vec3 } from 'cc';

export const ParticleEvents = {
    Play: 'particle_play',
    Stop: 'particle_stop',
    StopAll: 'particle_stop_all',
} as const;

export type ParticleEvent = typeof ParticleEvents[keyof typeof ParticleEvents];

export interface ParticlePlayPayload {
    readonly id: string;
    readonly parent?: Node | null;
    readonly spawnPoint?: Node | null;
    readonly worldPosition?: Readonly<Vec3> | null;
    readonly position?: Readonly<Vec3> | null;
    readonly scale?: number | Readonly<Vec3> | null;
    /** Seconds before recycling. Leave empty to use the particle duration + lifetime. */
    readonly duration?: number;
}

export interface ParticleStopPayload {
    readonly id: string;
}
