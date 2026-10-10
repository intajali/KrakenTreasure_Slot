import { Node, Vec3 } from 'cc';
import { EventBus } from 'db://assets/core/events/EventBus';
import { ParticleEvents, ParticlePlayPayload, ParticleStopPayload } from './ParticleEvents';

/**
 * Fire-and-forget particle API. Gameplay should call this (or emit ParticleEvents)
 * instead of holding a ParticleManager reference.
 */
export class ParticleController {
    public static play(id: string, options?: Omit<ParticlePlayPayload, 'id'>): void {
        EventBus.emit<ParticlePlayPayload>(ParticleEvents.Play, { id, ...options });
    }

    public static playAt(
        id: string,
        worldPosition: Readonly<Vec3>,
        options?: Omit<ParticlePlayPayload, 'id' | 'worldPosition'>,
    ): void {
        this.play(id, { ...options, worldPosition });
    }

    public static playOn(
        id: string,
        parent: Node,
        options?: Omit<ParticlePlayPayload, 'id' | 'parent'>,
    ): void {
        this.play(id, { ...options, parent });
    }

    /** Play at a scene node's current world position. */
    public static playFrom(
        id: string,
        spawnPoint: Node,
        options?: Omit<ParticlePlayPayload, 'id' | 'spawnPoint'>,
    ): void {
        this.play(id, { ...options, spawnPoint });
    }

    public static stop(id: string): void {
        EventBus.emit<ParticleStopPayload>(ParticleEvents.Stop, { id });
    }

    public static stopAll(): void {
        EventBus.emit(ParticleEvents.StopAll);
    }
}
