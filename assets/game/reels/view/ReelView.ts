import {
    _decorator,
    instantiate,
    Layers,
    Node,
    Prefab,
    Sprite,
    tween,
    Tween,
    UITransform,
    Vec3,
} from 'cc';
import { BaseView } from 'db://assets/core/architecture/BaseView';
import { SpriteFrameLibrary } from 'db://assets/core/config/SpriteFrameLibrary';
import { IReelView } from 'db://assets/core/reel/interface/IReelView';
import { normalizeStripIndex } from 'db://assets/core/utilities/ReelStripHelper';
import { SymbolView } from '../../symbols/view/SymbolView';
import { REEL_CONFIG, REEL_ROW_HEIGHT, REEL_WIDTH, ReelConfig } from '../config/ReelConfig';
const { ccclass, property } = _decorator;

enum ReelAnimState {
    Idle = 'idle',
    Spinning = 'spinning',
    Stopping = 'stopping',
    Bouncing = 'bouncing',
}

interface SymbolCell {
    sprite: Sprite;
    symbolView: SymbolView | null;
    lastStripIdx: number;
    baseY: number;
    baseScale: Vec3;
}
const SYMBOL_OFFSET = 20;
const HIGHLIGHT_SCALE = 1.18;
const HIGHLIGHT_PULSE_SECONDS = 0.28;
const STOP_BOUNCE_OVERSHOOT_SEC = 0.07;
const STOP_BOUNCE_REBOUND_SEC = 0.11;
const STOP_BOUNCE_SETTLE_SEC = 0.09;

@ccclass('ReelView')
export class ReelView extends BaseView implements IReelView {
    @property({
        type: Prefab,
        tooltip: 'Generic symbol cell prefab instantiated at initialize.',
    })
    symbolPrefab: Prefab | null = null;

    @property({
        type: Node,
        tooltip: 'Parent for spawned symbol cells. Falls back to child SymbolContainer, then this node.',
    })
    symbolContainer: Node | null = null;

    @property({ tooltip: 'Extra cells above and below the visible window for scrolling wrap.' })
    bufferRows = 1;

    @property({
        type: SpriteFrameLibrary,
        tooltip: 'Optional per-reel override. Leave empty to use the shared SpriteFrameLibrary.',
    })
    spriteFrameLibrary: SpriteFrameLibrary | null = null;

    private reelIndex = 0;
    private strip: readonly number[] = [];
    private visibleRows = REEL_CONFIG.visibleRows;
    private spinConfig: ReelConfig = REEL_CONFIG;
    private centerCellIndex = 0;
    private cells: SymbolCell[] = [];

    /** Fractional strip scroll — increases while symbols move top → bottom. */
    private scrollOffset = 0;
    private scrollSpeed = 0;
    private targetScrollOffset = 0;
    private targetStripIndex = 0;
    private stopStartOffset = 0;
    private stopElapsed = 0;
    private stopDuration = 0;
    private state = ReelAnimState.Idle;
    private stopCompleteCallback: (() => void) | null = null;
    private readonly bounce = { offset: 0 };
    private readonly addSpinOverlays = new Map<number, Node>();
    /** Fixed-position symbols that stay put while the reel spins (e.g. locked jackpot pearls). */
    private readonly stickySymbols = new Map<number, Node>();

    public setReelIndex(reelIndex: number): void {
        this.reelIndex = reelIndex;
    }

    public setSpinConfig(config: ReelConfig): void {
        this.spinConfig = config;
    }

    public setStrip(strip: readonly number[], visibleRows: number): void {
        this.strip = strip.length > 0
            ? strip
            : this.spinConfig.reelStrips[this.reelIndex] ?? REEL_CONFIG.reelStrips[this.reelIndex] ?? [];
        this.visibleRows = visibleRows;
    }

    public setSymbolPrefab(prefab: Prefab | null): void {
        if (prefab) {
            this.symbolPrefab = prefab;
        }
    }

    public setSpriteFrameLibrary(library: SpriteFrameLibrary | null): void {
        if (library) {
            this.spriteFrameLibrary = library;
        }
    }

    protected onInitialize(): void {
        const sprites = this.spawnSymbolCells();
        this.layoutSymbols(sprites);
        this.buildReelWindow(sprites);
        this.snapToStripIndex(0);
        this.resolveSpriteFrameLibrary()?.preloadFrames(() => this.refreshVisibleSymbols());
    }

    private getCellCount(): number {
        return Math.max(1, this.visibleRows) + 2 * Math.max(0, this.bufferRows);
    }

    private resolveSymbolContainer(): Node {
        if (this.symbolContainer?.isValid) {
            return this.symbolContainer;
        }

        const existing = this.node.getChildByName('SymbolContainer');
        if (existing) {
            this.symbolContainer = existing;
            return existing;
        }

        const created = new Node('SymbolContainer');
        created.layer = this.node.layer;
        created.setParent(this.node);
        created.addComponent(UITransform).setContentSize(REEL_WIDTH, REEL_ROW_HEIGHT);
        this.symbolContainer = created;
        return created;
    }

    private spawnSymbolCells(): Sprite[] {
        const container = this.resolveSymbolContainer();
        this.clearSymbolContainer(container);
        return this.symbolPrefab
            ? this.spawnPrefabSymbols(container)
            : this.spawnRuntimeSprites(container);
    }

    private spawnPrefabSymbols(container: Node): Sprite[] {
        if (!this.symbolPrefab) {
            return this.spawnRuntimeSprites(container);
        }

        const sprites: Sprite[] = [];
        const cellCount = this.getCellCount();
        for (let i = 0; i < cellCount; i++) {
            const node = instantiate(this.symbolPrefab);
            node.name = `Symbol_${i}`;
            node.layer = container.layer;
            node.setParent(container);
            node.setPosition(0, 0, 0);
            node.setScale(1, 1, 1);
            node.active = true;

            const symbolView = node.getComponent(SymbolView) ?? node.addComponent(SymbolView);
            const sprite = symbolView.getSprite() ?? node.addComponent(Sprite);
            symbolView.sprite = sprite;
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprites.push(sprite);
        }

        return sprites;
    }

    private spawnRuntimeSprites(container: Node): Sprite[] {
        const sprites: Sprite[] = [];
        const cellCount = this.getCellCount();

        for (let i = 0; i < cellCount; i++) {
            const node = new Node(`Symbol_${i}`);
            node.layer = container.layer;
            node.setParent(container);
            node.setPosition(0, 0, 0);

            const transform = node.addComponent(UITransform);
            transform.setContentSize(REEL_WIDTH, REEL_ROW_HEIGHT);

            const sprite = node.addComponent(Sprite);
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;

            const symbolView = node.addComponent(SymbolView);
            symbolView.sprite = sprite;
            sprites.push(sprite);
        }

        return sprites;
    }

    private clearSymbolContainer(container: Node): void {
        const children = [...container.children];
        children.forEach(child => {
            child.removeFromParent();
            child.destroy();
        });
    }

    private layoutSymbols(sprites: readonly Sprite[]): void {
        sprites.forEach(item => {
            const uiTransform = item.node.getComponent(UITransform);
            if (uiTransform) {
                uiTransform.setContentSize(REEL_WIDTH, REEL_ROW_HEIGHT);
            }
        });

        const mid = Math.floor(sprites.length / 2);
        if (sprites[mid]) {
            sprites[mid].node.setPosition(0, 0, 0);
        }

        for (let i = 0; i < mid; i++) {
            const posY = (mid - i) * REEL_ROW_HEIGHT + ((mid - i) * SYMBOL_OFFSET);
            sprites[i].node.setPosition(0, posY, 0);
            sprites[sprites.length - i - 1].node.setPosition(0, -posY, 0);
        }
    }

    private buildReelWindow(sprites: readonly Sprite[]): void {
        this.cells = sprites
            .filter((symbol): symbol is Sprite => !!symbol)
            .map(sprite => ({
                sprite,
                symbolView: sprite.node.getComponent(SymbolView),
                lastStripIdx: -1,
                baseY: sprite.node.position.y,
                baseScale: sprite.node.scale.clone(),
            }));
        this.centerCellIndex = Math.floor(this.cells.length / 2);
    }

    public startSpin(): void {
        this.clearHighlights();
        this.clearAddSpinOverlays();
        this.state = ReelAnimState.Spinning;
        this.scrollSpeed = 0;
        this.stopElapsed = 0;
        this.stopDuration = 0;
        this.bounce.offset = 0;
    }

    public getVisibleRowWorldPosition(row: number, out: Vec3 = new Vec3()): Vec3 | null {
        const cell = this.getCellForVisibleRow(row);
        if (!cell) {
            return null;
        }

        cell.sprite.node.getWorldPosition(out);
        return out;
    }

    public highlightRows(rows: readonly number[]): void {
        this.clearHighlights();

        rows.forEach(row => {
            const cell = this.getCellForVisibleRow(row);
            if (!cell) {
                return;
            }

            tween(cell.sprite.node)
                .repeatForever(
                    tween()
                        .to(HIGHLIGHT_PULSE_SECONDS, {
                            scale: new Vec3(
                                cell.baseScale.x * HIGHLIGHT_SCALE,
                                cell.baseScale.y * HIGHLIGHT_SCALE,
                                cell.baseScale.z,
                            ),
                        }, { easing: 'sineOut' })
                        .to(HIGHLIGHT_PULSE_SECONDS, { scale: cell.baseScale }, { easing: 'sineIn' }),
                )
                .start();
        });
    }

    /**
     * One-shot land pulse on a visible row, then restores scale and calls onComplete.
     */
    public playLandReveal(row: number, durationSec: number, onComplete?: () => void): void {
        const cell = this.getCellForVisibleRow(row);
        if (!cell) {
            onComplete?.();
            return;
        }

        Tween.stopAllByTarget(cell.sprite.node);
        cell.sprite.node.setScale(cell.baseScale);

        const pulse = Math.max(0.12, durationSec / 4);
        const peak = new Vec3(
            cell.baseScale.x * HIGHLIGHT_SCALE,
            cell.baseScale.y * HIGHLIGHT_SCALE,
            cell.baseScale.z,
        );

        tween(cell.sprite.node)
            .to(pulse, { scale: peak }, { easing: 'backOut' })
            .to(pulse, { scale: cell.baseScale }, { easing: 'sineIn' })
            .to(pulse, { scale: peak }, { easing: 'sineOut' })
            .to(pulse, { scale: cell.baseScale }, { easing: 'sineIn' })
            .call(() => onComplete?.())
            .start();
    }

    public clearHighlights(): void {
        this.cells.forEach(cell => {
            Tween.stopAllByTarget(cell.sprite.node);
            cell.sprite.node.setScale(cell.baseScale);
        });
    }

    /** Places ADDSPIN on top of a visible stop row without replacing the strip symbol. */
    public showAddSpinOverlay(row: number, symbolId: number): void {
        const cell = this.getCellForVisibleRow(row);
        if (!cell) {
            return;
        }

        this.clearAddSpinOverlay(row);

        const frame = this.resolveSpriteFrameLibrary()?.getFrame(symbolId) ?? null;
        if (!frame) {
            return;
        }

        const overlay = new Node(`AddSpinOverlay_${row}`);
        overlay.layer = Layers.Enum.UI_2D;
        overlay.setParent(cell.sprite.node);
        overlay.setPosition(0, 0, 0);
        overlay.setScale(1.05, 1.05, 1);

        const transform = overlay.addComponent(UITransform);
        transform.setContentSize(REEL_WIDTH, REEL_ROW_HEIGHT);

        const sprite = overlay.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = frame;

        this.addSpinOverlays.set(row, overlay);

        tween(overlay)
            .to(0.18, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'backOut' })
            .to(0.12, { scale: new Vec3(1.05, 1.05, 1) }, { easing: 'sineOut' })
            .start();
    }

    public clearAddSpinOverlays(): void {
        this.addSpinOverlays.forEach((_node, row) => this.clearAddSpinOverlay(row));
        this.addSpinOverlays.clear();
    }

    /**
     * Pins a symbol at a visible row in reel-local space so it stays put while the strip spins.
     */
    public showStickySymbol(row: number, symbolId: number): void {
        const cell = this.getCellForVisibleRow(row);
        if (!cell) {
            return;
        }

        this.clearStickySymbol(row);

        const frame = this.resolveSpriteFrameLibrary()?.getFrame(symbolId) ?? null;
        if (!frame) {
            return;
        }

        const overlay = new Node(`StickySymbol_${row}`);
        overlay.layer = Layers.Enum.UI_2D;
        // Parent to reel root (not the scrolling cell) so the symbol stays fixed on screen.
        overlay.setParent(this.node);
        overlay.setPosition(0, cell.baseY, 0);
        overlay.setScale(1, 1, 1);

        const transform = overlay.addComponent(UITransform);
        transform.setContentSize(REEL_WIDTH, REEL_ROW_HEIGHT);

        const sprite = overlay.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = frame;

        this.stickySymbols.set(row, overlay);
    }

    public clearStickySymbols(): void {
        this.stickySymbols.forEach((_node, row) => this.clearStickySymbol(row));
        this.stickySymbols.clear();
    }

    private clearStickySymbol(row: number): void {
        const overlay = this.stickySymbols.get(row);
        if (!overlay) {
            return;
        }

        overlay.destroy();
        this.stickySymbols.delete(row);
    }

    private clearAddSpinOverlay(row: number): void {
        const overlay = this.addSpinOverlays.get(row);
        if (!overlay) {
            return;
        }

        Tween.stopAllByTarget(overlay);
        overlay.destroy();
        this.addSpinOverlays.delete(row);
    }

    public stopAtIndex(stripIndex: number, onComplete?: () => void): void {
        this.targetStripIndex = normalizeStripIndex(this.strip, stripIndex);
        this.targetScrollOffset = this.computeLandingScrollOffset(this.targetStripIndex);
        this.stopStartOffset = this.scrollOffset;
        this.stopElapsed = 0;
        this.stopDuration = this.computeStopDuration(this.targetScrollOffset - this.stopStartOffset);
        this.stopCompleteCallback = onComplete ?? null;
        this.state = ReelAnimState.Stopping;
    }

    private computeLandingScrollOffset(stripIndex: number): number {
        const stripLength = this.strip.length;
        const minTravel = this.spinConfig.stopExtraLaps * stripLength;
        let landing = stripIndex;

        while (landing < this.scrollOffset + minTravel) {
            landing += stripLength;
        }

        return landing;
    }

    private computeStopDuration(remainingRows: number): number {
        const remaining = Math.max(0, remainingRows);
        const configuredSec = Math.max(0, this.spinConfig.stopDurationMs) / 1000;
        const cruiseSpeed = Math.max(
            this.scrollSpeed,
            this.spinConfig.spinSpeedRowsPerSec,
            this.spinConfig.minStopSpeedRowsPerSec,
            1,
        );
        const uncappedSec = remaining / cruiseSpeed;

        if (configuredSec <= 0) {
            return Math.max(0.12, uncappedSec);
        }

        return Math.min(configuredSec, Math.max(0.12, uncappedSec));
    }

    public update(dt: number): void {
        if (this.state === ReelAnimState.Idle || this.state === ReelAnimState.Bouncing) {
            return;
        }

        if (this.state === ReelAnimState.Spinning) {
            this.scrollSpeed = Math.min(
                this.spinConfig.spinSpeedRowsPerSec,
                this.scrollSpeed + this.spinConfig.spinAccelerationRowsPerSecSq * dt,
            );
            this.scrollOffset += this.scrollSpeed * dt;
            this.applyScrollVisual();
            return;
        }

        this.stopElapsed += dt;
        const duration = Math.max(0.001, this.stopDuration);
        const t = Math.min(1, this.stopElapsed / duration);
        const eased = 1 - (1 - t) * (1 - t);
        const nextOffset = this.stopStartOffset
            + (this.targetScrollOffset - this.stopStartOffset) * eased;
        this.scrollSpeed = Math.max(0, (nextOffset - this.scrollOffset) / Math.max(dt, 0.0001));
        this.scrollOffset = nextOffset;
        this.applyScrollVisual();

        if (t >= 1) {
            this.beginLandingBounce();
        }
    }

    private beginLandingBounce(): void {
        this.scrollOffset = this.targetScrollOffset;
        this.scrollSpeed = 0;
        this.applyScrollVisual();
        this.state = ReelAnimState.Bouncing;

        const bounceRows = this.spinConfig.stopBounceRows;
        if (bounceRows <= 0 || this.cells.length === 0) {
            this.finishStop();
            return;
        }

        this.bounce.offset = 0;
        Tween.stopAllByTarget(this.bounce);

        const overshoot = bounceRows * REEL_ROW_HEIGHT;
        tween(this.bounce)
            .to(STOP_BOUNCE_OVERSHOOT_SEC, { offset: -overshoot }, {
                easing: 'quadOut',
                onUpdate: () => this.applyScrollVisual(),
            })
            .to(STOP_BOUNCE_REBOUND_SEC, { offset: overshoot * 0.35 }, {
                easing: 'sineOut',
                onUpdate: () => this.applyScrollVisual(),
            })
            .to(STOP_BOUNCE_SETTLE_SEC, { offset: 0 }, {
                easing: 'backOut',
                onUpdate: () => this.applyScrollVisual(),
            })
            .call(() => this.finishStop())
            .start();
    }

    private finishStop(): void {
        this.state = ReelAnimState.Idle;
        this.bounce.offset = 0;
        this.snapToStripIndex(this.targetStripIndex);
        this.stopCompleteCallback?.();
        this.stopCompleteCallback = null;
    }

    private snapToStripIndex(stripIndex: number): void {
        this.scrollOffset = stripIndex;
        this.targetStripIndex = stripIndex;
        this.applyScrollVisual();
    }

    private applyScrollVisual(): void {
        if (this.strip.length === 0 || this.cells.length === 0) {
            return;
        }

        const fraction = this.scrollOffset - Math.floor(this.scrollOffset);
        const baseRow = Math.floor(this.scrollOffset);

        this.cells.forEach((cell, i) => {
            const stripIdx = normalizeStripIndex(this.strip, baseRow + i - this.centerCellIndex);
            const y = cell.baseY - fraction * REEL_ROW_HEIGHT + this.bounce.offset;

            cell.sprite.node.setPosition(0, y, 0);

            if (cell.lastStripIdx !== stripIdx) {
                cell.lastStripIdx = stripIdx;
                const symbolId = this.strip[stripIdx];
                this.applySymbol(cell, symbolId);
            }
        });
    }

    private applySymbol(cell: SymbolCell, symbolId: number): void {
        const spriteFrame = this.resolveSpriteFrameLibrary()?.getFrame(symbolId) ?? null;
        if (cell.symbolView) {
            cell.symbolView.setSymbol(symbolId, spriteFrame);
            return;
        }

        if (spriteFrame) {
            cell.sprite.spriteFrame = spriteFrame;
            cell.sprite.enabled = true;
            return;
        }

        cell.sprite.spriteFrame = null;
        cell.sprite.enabled = false;
    }

    private refreshVisibleSymbols(): void {
        this.cells.forEach(cell => {
            cell.lastStripIdx = -1;
        });
        this.applyScrollVisual();
    }

    private getCellForVisibleRow(row: number): SymbolCell | null {
        if (row < 0 || row >= this.visibleRows) {
            return null;
        }

        const firstVisibleCellIndex = this.centerCellIndex - Math.floor(this.visibleRows / 2);
        return this.cells[firstVisibleCellIndex + row] ?? null;
    }

    private resolveSpriteFrameLibrary(): SpriteFrameLibrary | null {
        if (this.spriteFrameLibrary?.isValid) {
            return this.spriteFrameLibrary;
        }

        const shared = SpriteFrameLibrary.getShared();
        if (shared) {
            this.spriteFrameLibrary = shared;
            return shared;
        }

        let current: Node | null = this.node;
        while (current) {
            const library = current.getComponent(SpriteFrameLibrary);
            if (library) {
                this.spriteFrameLibrary = library;
                return this.spriteFrameLibrary;
            }

            current = current.parent;
        }

        return null;
    }

    protected onDispose(): void {
        Tween.stopAllByTarget(this.bounce);
        this.clearHighlights();
        this.clearAddSpinOverlays();
        this.clearStickySymbols();
        this.cells.forEach(cell => {
            if (cell.sprite?.node?.isValid) {
                cell.sprite.node.destroy();
            }
        });
        this.cells = [];
        this.stopCompleteCallback = null;
        this.state = ReelAnimState.Idle;
    }
}
