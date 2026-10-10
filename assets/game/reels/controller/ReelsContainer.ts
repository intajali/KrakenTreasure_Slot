import { _decorator, Component, Layers, Node, Prefab, UITransform } from 'cc';
import { SpriteFrameLibrary } from 'db://assets/core/config/SpriteFrameLibrary';
import { IWinLine } from 'db://assets/core/slot/interfaces/ISpinResult';
import { WinLineRendererView } from '../../paylines/view/WinLineRendererView';
import { REEL_CONFIG, REEL_ROW_HEIGHT, REEL_WIDTH, ReelConfig } from '../config/ReelConfig';
import { ReelView } from '../view/ReelView';
import { ReelController } from './ReelController';
const { ccclass, property } = _decorator;

@ccclass('ReelsContainer')
export class ReelsContainer extends Component {
    @property({
        type: [ReelController],
        tooltip: 'Reel controllers assigned from the Cocos inspector, ordered left to right.',
    })
    reelControllers: ReelController[] = [];

    @property({
        type: Node,
        tooltip: 'Optional parent used when fallback reels need to be created at runtime.',
    })
    reelRoot: Node | null = null;

    @property({
        type: Prefab,
        tooltip: 'Shared symbol cell prefab pushed to every reel before setup.',
    })
    symbolPrefab: Prefab | null = null;

    @property({
        type: SpriteFrameLibrary,
        tooltip: 'Shared sprite library used by every reel. Falls back to SpriteFrameLibrary.getShared().',
    })
    spriteFrameLibrary: SpriteFrameLibrary | null = null;

    @property({ type: Node })
    playToSpinRoot: Node | null = null;
    
    @property({ type: Node })
    playToSpinLabelNode: Node | null = null;

    @property({ tooltip: 'Find ReelController components under this node when none are assigned.' })
    autoDiscoverReels = true;

    @property({ tooltip: 'Create runtime reel nodes when no inspector/discovered reels exist.' })
    createMissingReels = true;

    public initializeReels(config: ReelConfig = REEL_CONFIG): ReelController[] {
        const controllers = this.resolveReelControllers(config);
        controllers.forEach((reel, index) => {
            this.applySharedReelAssets(reel);
            const strip = config.reelStrips[index] ?? config.reelStrips[0] ?? [];
            reel.setup(index, strip, config);
        });

        this.reelControllers = controllers;
        return this.reelControllers;
    }

    public highlightWinLines(winLines: readonly IWinLine[]): void {
        this.reelControllers.forEach(reel => reel.clearHighlights());

        if (winLines.length === 0) {
            this.clearWinLines();
            return;
        }

        WinLineRendererView.ensureOn(this.getReelRootNode()).showWinLines(
            winLines,
            (reel, row) => this.reelControllers[reel]?.getVisibleRowWorldPosition(row) ?? null,
        );
    }

    public clearHighlights(): void {
        this.reelControllers.forEach(reel => reel.clearHighlights());
        this.clearWinLines();
    }

    public showAddSpinOverlays(
        positions: readonly { reel: number; row: number }[],
        symbolId: number,
    ): void {
        this.clearAddSpinOverlays();
        positions.forEach(position => {
            const reel = this.reelControllers[position.reel];
            reel?.showAddSpinOverlay(position.row, symbolId);
        });
    }

    public clearAddSpinOverlays(): void {
        this.reelControllers.forEach(reel => reel.clearAddSpinOverlays());
    }

    private resolveReelControllers(config: ReelConfig): ReelController[] {
        const controllers = this.getAssignedReels();

        if (this.autoDiscoverReels) {
            this.collectChildReels(this.node, controllers);
        }

        if (this.createMissingReels && controllers.length < config.reelCount) {
            const missing = config.reelCount - controllers.length;
            controllers.push(...this.createFallbackReels(config, missing, controllers));
        }

        return controllers.slice(0, config.reelCount);
    }

    private applySharedReelAssets(reel: ReelController): void {
        const view = reel.reelView
            ?? reel.getComponent(ReelView)
            ?? reel.addComponent(ReelView);
        reel.reelView = view;

        if (this.symbolPrefab) {
            view.setSymbolPrefab(this.symbolPrefab);
        }

        const library = this.resolveSpriteFrameLibrary();
        if (library) {
            view.setSpriteFrameLibrary(library);
        }
    }

    private resolveSpriteFrameLibrary(): SpriteFrameLibrary | null {
        if (this.spriteFrameLibrary?.isValid) {
            return this.spriteFrameLibrary;
        }

        this.spriteFrameLibrary = SpriteFrameLibrary.getShared()
            ?? this.getComponent(SpriteFrameLibrary)
            ?? this.getComponentInChildren(SpriteFrameLibrary)
            ?? this.findLibraryInScene()
            ?? null;
        return this.spriteFrameLibrary;
    }

    private findLibraryInScene(): SpriteFrameLibrary | null {
        const scene = this.node.scene;
        if (!scene) {
            return null;
        }

        const stack: Node[] = [...scene.children];
        while (stack.length > 0) {
            const node = stack.pop()!;
            const library = node.getComponent(SpriteFrameLibrary);
            if (library) {
                return library;
            }
            stack.push(...node.children);
        }

        return null;
    }

    private getAssignedReels(): ReelController[] {
        return this.reelControllers.filter((reel): reel is ReelController => !!reel);
    }

    private collectChildReels(node: Node, output: ReelController[]): void {
        const reel = node.getComponent(ReelController);
        if (reel && output.indexOf(reel) === -1) {
            output.push(reel);
        }

        node.children.forEach(child => this.collectChildReels(child, output));
    }

    private createFallbackReels(
        config: ReelConfig,
        count: number,
        existing: ReelController[],
    ): ReelController[] {
        const root = this.getReelRootNode();
        const spacing = this.getFallbackReelSpacing(existing);
        const startX = existing.length > 0
            ? existing[existing.length - 1].node.position.x + spacing
            : -((count - 1) * spacing) / 2;
        const reels: ReelController[] = [];

        for (let i = 0; i < count; i++) {
            const reelIndex = existing.length + i;
            const reelNode = new Node(`reel_${reelIndex}`);
            reelNode.layer = Layers.Enum.UI_2D;
            reelNode.setPosition(startX + i * spacing, 0, 0);
            root.addChild(reelNode);

            const transform = reelNode.addComponent(UITransform);
            transform.setContentSize(REEL_WIDTH, config.visibleRows * REEL_ROW_HEIGHT);

            const symbolContainer = new Node('SymbolContainer');
            symbolContainer.layer = Layers.Enum.UI_2D;
            symbolContainer.addComponent(UITransform).setContentSize(
                REEL_WIDTH,
                config.visibleRows * REEL_ROW_HEIGHT,
            );
            reelNode.addChild(symbolContainer);

            const view = reelNode.addComponent(ReelView);
            const controller = reelNode.addComponent(ReelController);
            controller.reelView = view;
            reels.push(controller);
        }

        return reels;
    }

    private getFallbackReelSpacing(existing: ReelController[]): number {
        if (existing.length >= 2) {
            const gap = existing[1].node.position.x - existing[0].node.position.x;
            if (Math.abs(gap) > 1) {
                return Math.abs(gap);
            }
        }

        return ReelController.getReelSpacing();
    }

    private getReelRootNode(): Node {
        return this.reelRoot ?? this.node.getChildByName('ReelRootMask') ?? this.node;
    }

    private clearWinLines(): void {
        WinLineRendererView.findOn(this.getReelRootNode())?.clear();
    }
}
