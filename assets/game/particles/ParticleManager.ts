import {
    _decorator,
    Component,
    instantiate,
    Node,
    NodePool,
    ParticleSystem2D,
    Prefab,
    Vec3,
} from 'cc';
import { EventBus } from 'db://assets/core/events/EventBus';
import { ParticleEvents, ParticlePlayPayload, ParticleStopPayload } from './ParticleEvents';
const { ccclass, menu, property } = _decorator;

@ccclass('ParticleEffectEntry')
export class ParticleEffectEntry {
    @property({ tooltip: 'Id used by ParticleController.play (coin_shower, coin_burst, fire_line).' })
    id = '';

    @property({ type: Prefab })
    prefab: Prefab | null = null;

    @property({
        type: Node,
        tooltip: 'Scene node this effect plays from. Place it where the particles should appear.',
    })
    spawnPoint: Node | null = null;

    @property({ tooltip: 'How many instances to keep ready in the pool.' })
    poolSize = 2;
}

interface ActiveParticle {
    readonly id: string;
    readonly node: Node;
    readonly particle: ParticleSystem2D | null;
    recycleCallback: (() => void) | null;
}

/**
 * Particle engine component. GameBootstrap calls initialize(); gameplay talks to it
 * through ParticleController / ParticleEvents.
 */
@ccclass('ParticleManager')
@menu('Game/FX/Particle Manager')
export class ParticleManager extends Component {
    @property({ type: [ParticleEffectEntry], tooltip: 'Register particle prefabs by id.' })
    effects: ParticleEffectEntry[] = [];

    @property({ type: Node, tooltip: 'Fallback parent when an effect has no spawn point. Use Canvas / SafeZone.' })
    defaultHost: Node | null = null;

    private static instance: ParticleManager | null = null;
    private initialized = false;

    private readonly entryById = new Map<string, ParticleEffectEntry>();
    private readonly poolById = new Map<string, NodePool>();
    private readonly active: ActiveParticle[] = [];
    private readonly missingIds = new Set<string>();

    public static getInstance(): ParticleManager | null {
        return ParticleManager.instance;
    }

    public initialize(): void {
        if (this.initialized) {
            return;
        }

        if (ParticleManager.instance && ParticleManager.instance !== this) {
            ParticleManager.instance.dispose();
        }

        ParticleManager.instance = this;
        this.buildMaps();
        this.prewarmPools();
        this.bindEvents();
        this.initialized = true;
    }

    public dispose(): void {
        if (!this.initialized) {
            return;
        }

        this.unbindEvents();
        this.stopAll();
        this.clearPools();
        if (ParticleManager.instance === this) {
            ParticleManager.instance = null;
        }
        this.initialized = false;
    }

    protected onDestroy(): void {
        this.dispose();
    }

    private bindEvents(): void {
        EventBus.on(ParticleEvents.Play, this.onPlay);
        EventBus.on(ParticleEvents.Stop, this.onStop);
        EventBus.on(ParticleEvents.StopAll, this.onStopAll);
    }

    private unbindEvents(): void {
        EventBus.off(ParticleEvents.Play, this.onPlay);
        EventBus.off(ParticleEvents.Stop, this.onStop);
        EventBus.off(ParticleEvents.StopAll, this.onStopAll);
    }

    private onPlay = (payload: ParticlePlayPayload): void => {
        if (!payload?.id) {
            return;
        }

        const entry = this.entryById.get(payload.id);
        if (!entry?.prefab) {
            this.warnMissing(payload.id);
            return;
        }

        const node = this.acquire(entry);
        const spawnPoint = payload.spawnPoint?.isValid ? payload.spawnPoint : entry.spawnPoint;
        const parent = payload.parent?.isValid
            ? payload.parent
            : (spawnPoint ?? this.defaultHost ?? this.node);

        node.setParent(parent);
        node.active = true;
        node.layer = parent.layer;
        this.applyTransform(node, parent, spawnPoint, payload);
        this.applyScale(node, payload.scale);

        const particle = this.resolveParticle(node);
        if (particle) {
            particle.autoRemoveOnFinish = false;
            particle.resetSystem();
        }

        const active: ActiveParticle = {
            id: payload.id,
            node,
            particle,
            recycleCallback: null,
        };
        active.recycleCallback = () => this.recycle(active);
        this.active.push(active);

        const delay = this.resolveDuration(particle, payload.duration);
        if (delay > 0) {
            this.scheduleOnce(active.recycleCallback, delay);
        }
    };

    private onStop = (payload: ParticleStopPayload): void => {
        if (!payload?.id) {
            return;
        }
        this.active
            .filter(item => item.id === payload.id)
            .forEach(item => this.recycle(item));
    };

    private onStopAll = (): void => {
        this.stopAll();
    };

    private stopAll(): void {
        [...this.active].forEach(item => this.recycle(item));
    }

    private acquire(entry: ParticleEffectEntry): Node {
        const pool = this.poolById.get(entry.id);
        const pooled = pool?.get();
        if (pooled?.isValid) {
            return pooled;
        }
        return instantiate(entry.prefab!);
    }

    private recycle(active: ActiveParticle): void {
        const index = this.active.indexOf(active);
        if (index >= 0) {
            this.active.splice(index, 1);
        }

        if (active.recycleCallback) {
            this.unschedule(active.recycleCallback);
            active.recycleCallback = null;
        }

        if (active.particle?.isValid) {
            active.particle.stopSystem();
        }

        const node = active.node;
        if (!node?.isValid) {
            return;
        }

        node.active = false;
        node.removeFromParent();
        this.poolById.get(active.id)?.put(node);
    }

    private resolveParticle(node: Node): ParticleSystem2D | null {
        return node.getComponent(ParticleSystem2D)
            ?? node.getComponentInChildren(ParticleSystem2D);
    }

    private resolveDuration(particle: ParticleSystem2D | null, override?: number): number {
        if (override != null && override >= 0) {
            return override;
        }
        if (!particle) {
            return 2;
        }
        const duration = particle.duration >= 0 ? particle.duration : 2;
        return duration + particle.life + particle.lifeVar;
    }

    private applyTransform(
        node: Node,
        parent: Node,
        spawnPoint: Node | null | undefined,
        payload: ParticlePlayPayload,
    ): void {
        if (payload.worldPosition) {
            node.setWorldPosition(payload.worldPosition.x, payload.worldPosition.y, payload.worldPosition.z);
            return;
        }

        if (payload.position) {
            node.setPosition(payload.position.x, payload.position.y, payload.position.z);
            return;
        }

        if (spawnPoint?.isValid && spawnPoint !== parent) {
            const world = spawnPoint.worldPosition;
            node.setWorldPosition(world.x, world.y, world.z);
            return;
        }

        node.setPosition(0, 0, 0);
    }

    private applyScale(node: Node, scale?: number | Readonly<Vec3> | null): void {
        if (scale == null) {
            node.setScale(1, 1, 1);
            return;
        }
        if (typeof scale === 'number') {
            node.setScale(scale, scale, scale);
            return;
        }
        node.setScale(scale.x, scale.y, scale.z);
    }

    private buildMaps(): void {
        this.entryById.clear();
        this.effects.forEach(entry => {
            if (!entry.id || !entry.prefab) {
                return;
            }
            this.entryById.set(entry.id, entry);
        });
    }

    private prewarmPools(): void {
        this.effects.forEach(entry => {
            if (!entry.id || !entry.prefab) {
                return;
            }
            const pool = new NodePool();
            const count = Math.max(0, Math.floor(entry.poolSize));
            for (let i = 0; i < count; i++) {
                const node = instantiate(entry.prefab);
                node.active = false;
                pool.put(node);
            }
            this.poolById.set(entry.id, pool);
        });
    }

    private clearPools(): void {
        this.poolById.forEach(pool => pool.clear());
        this.poolById.clear();
        this.entryById.clear();
        this.missingIds.clear();
    }

    private warnMissing(id: string): void {
        if (this.missingIds.has(id)) {
            return;
        }
        this.missingIds.add(id);
        console.warn(`[ParticleManager] No prefab registered for id "${id}".`);
    }
}
