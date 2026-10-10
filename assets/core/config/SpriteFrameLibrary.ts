import { _decorator, Component, SpriteAtlas, SpriteFrame } from 'cc';
import { ResourceLoader, ResourceLoadEntry } from 'db://assets/core/utilities/ResourceLoader';
import {
    getSymbolAtlasFrameName,
    getSymbolAtlasResourcePaths,
    SYMBOL_CONFIG,
} from 'db://assets/game/symbols/config/SymbolConfig';
const { ccclass, property } = _decorator;

@ccclass('SpriteFrameLibrary')
export class SpriteFrameLibrary extends Component {
    @property({
        tooltip: 'Load symbol sprite frames from assets/resources at runtime.',
    })
    loadFromResources = true;

    @property({
        tooltip: 'Prefer sprite-atlas frames before per-file spriteFrame paths.',
    })
    loadFromAtlas = true;

    @property({
        type: [SpriteAtlas],
        tooltip: 'Optional atlases assigned in the inspector. Used before resources load.',
    })
    atlases: SpriteAtlas[] = [];

    @property({
        type: [SpriteFrame],
        tooltip: 'Sprite frames indexed by config id. Used when atlas/file load does not provide a frame.',
    })
    frames: SpriteFrame[] = [];

    private readonly runtimeFrames = new Map<number, SpriteFrame>();
    private readonly pendingLoadCallbacks: Array<() => void> = [];
    private isLoading = false;
    private isLoaded = false;
    private static shared: SpriteFrameLibrary | null = null;

    public static getShared(): SpriteFrameLibrary | null {
        return SpriteFrameLibrary.shared?.isValid ? SpriteFrameLibrary.shared : null;
    }

    protected onLoad(): void {
        if (!SpriteFrameLibrary.shared || !SpriteFrameLibrary.shared.isValid) {
            SpriteFrameLibrary.shared = this;
        }
    }

    protected onDestroy(): void {
        if (SpriteFrameLibrary.shared === this) {
            SpriteFrameLibrary.shared = null;
        }
    }

    public getFrame(index: number): SpriteFrame | null {
        return this.runtimeFrames.get(index) ?? this.frames[index] ?? null;
    }

    public preloadFrames(onComplete?: () => void): void {
        if (this.isLoaded) {
            onComplete?.();
            return;
        }

        if (onComplete) {
            this.pendingLoadCallbacks.push(onComplete);
        }

        if (this.isLoading) {
            return;
        }

        if (!this.loadFromResources && this.atlases.length === 0) {
            this.completeRuntimeLoading();
            return;
        }

        this.isLoading = true;
        this.loadRuntimeFrames()
            .then(() => this.completeRuntimeLoading())
            .catch(() => this.completeRuntimeLoading());
    }

    private async loadRuntimeFrames(): Promise<void> {
        if (this.loadFromAtlas) {
            await this.loadAtlasFrames();
        }

        await this.loadIndividualFrames();
    }

    private async loadAtlasFrames(): Promise<void> {
        const assignedAtlases = this.atlases.filter((atlas): atlas is SpriteAtlas => !!atlas);
        if (assignedAtlases.length > 0) {
            this.applyAtlases(assignedAtlases);
            return;
        }

        if (!this.loadFromResources) {
            return;
        }

        const atlasPaths = getSymbolAtlasResourcePaths();
        const loadedEntries = await Promise.all(
            atlasPaths.map(async path => ({
                path,
                atlas: await ResourceLoader.load(path, SpriteAtlas),
            })),
        );
        const atlasByPath = new Map<string, SpriteAtlas>();
        const loadedAtlases: SpriteAtlas[] = [];

        loadedEntries.forEach(entry => {
            if (!entry.atlas) {
                return;
            }

            atlasByPath.set(entry.path, entry.atlas);
            loadedAtlases.push(entry.atlas);
        });

        this.applyConfiguredAtlasFrames(atlasByPath, loadedAtlases);
    }

    private applyConfiguredAtlasFrames(
        atlasByPath: ReadonlyMap<string, SpriteAtlas>,
        allAtlases: readonly SpriteAtlas[],
    ): void {
        SYMBOL_CONFIG.forEach(symbol => {
            const frameName = getSymbolAtlasFrameName(symbol);
            if (!frameName) {
                return;
            }

            const preferredAtlas = symbol.atlasResourcePath
                ? atlasByPath.get(symbol.atlasResourcePath) ?? null
                : null;
            const spriteFrame = (preferredAtlas
                ? this.findFrameInAtlases([preferredAtlas], frameName)
                : null)
                ?? this.findFrameInAtlases(allAtlases, frameName);

            if (spriteFrame) {
                this.runtimeFrames.set(symbol.id, spriteFrame);
            }
        });
    }

    private async loadIndividualFrames(): Promise<void> {
        if (!this.loadFromResources) {
            return;
        }

        const symbolResources: ResourceLoadEntry<number>[] = SYMBOL_CONFIG
            .filter(symbol => !!symbol.spriteFrameResourcePath && !this.runtimeFrames.has(symbol.id))
            .map(symbol => ({
                key: symbol.id,
                path: symbol.spriteFrameResourcePath!,
            }));

        if (symbolResources.length === 0) {
            return;
        }

        const spriteFrames = await ResourceLoader.loadMap(symbolResources, SpriteFrame);
        spriteFrames.forEach((spriteFrame, symbolId) => {
            if (!this.runtimeFrames.has(symbolId)) {
                this.runtimeFrames.set(symbolId, spriteFrame);
            }
        });
    }

    private applyAtlases(atlases: readonly SpriteAtlas[]): void {
        SYMBOL_CONFIG.forEach(symbol => {
            const frameName = getSymbolAtlasFrameName(symbol);
            if (!frameName) {
                return;
            }

            const spriteFrame = this.findFrameInAtlases(atlases, frameName);
            if (spriteFrame) {
                this.runtimeFrames.set(symbol.id, spriteFrame);
            }
        });
    }

    private findFrameInAtlases(
        atlases: readonly SpriteAtlas[],
        frameName: string,
    ): SpriteFrame | null {
        const candidates = [frameName, `${frameName}.png`];

        for (const atlas of atlases) {
            for (const name of candidates) {
                const frame = atlas.getSpriteFrame(name);
                if (frame) {
                    return frame;
                }
            }
        }

        return null;
    }

    private completeRuntimeLoading(): void {
        this.isLoading = false;
        this.isLoaded = true;

        const callbacks = [...this.pendingLoadCallbacks];
        this.pendingLoadCallbacks.length = 0;
        callbacks.forEach(callback => callback());
    }
}
