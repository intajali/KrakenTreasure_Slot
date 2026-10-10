import {
    _decorator,
    Color,
    Graphics,
    Label,
    Node,
    tween,
    Tween,
    UIOpacity,
    UITransform,
    Widget,
    Vec3,
} from 'cc';
import { BaseView } from 'db://assets/core/architecture/BaseView';
import { SpriteFrameLibrary } from 'db://assets/core/config/SpriteFrameLibrary';
import { JackpotReelController } from '../../reels/controller/JackpotReelController';
import { ReelController } from '../../reels/controller/ReelController';
import { ReelView } from '../../reels/view/ReelView';
import { ReelsContainer } from '../../reels/controller/ReelsContainer';
import {
    JACKPOT_FEATURE_ENTER_TRANSITION_SEC,
    JACKPOT_FEATURE_EXIT_TRANSITION_SEC,
    JACKPOT_FINAL_REEL_CONFIG,
    JACKPOT_FINAL_REEL_LAND_REVEAL_SEC,
    JACKPOT_FINAL_REEL_SPIN_HOLD_SEC,
} from '../config/JackpotReelConfig';
import { GeneratedPearlsView } from './GeneratedPearlsView';
import { UiTween } from '../../ui/UiTween';
const { ccclass, property } = _decorator;

@ccclass('JackpotFeatureView')
export class JackpotFeatureView extends BaseView {
    @property(ReelsContainer)
    public jackpotReelsContainer: ReelsContainer | null = null;

    @property(GeneratedPearlsView)
    public generatedPearlsView: GeneratedPearlsView | null = null;

    /** Controls the single final jackpot reveal reel (tiers + R/X rewards). */
    @property(JackpotReelController)
    public jackpotReelController: JackpotReelController | null = null;

    @property(Label)
    public winValueLabel: Label | null = null;

    @property(Node)
    public chainNode: Node | null = null;

    @property(Node)
    public lockNode: Node | null = null;

    @property(Node)
    public krakenBGNode: Node | null = null;

    @property({ type: Node, tooltip: 'Optional fullscreen overlay used for enter/exit transitions.' })
    public transitionOverlayNode: Node | null = null;

    private transitionOpacity: UIOpacity | null = null;
    private isTransitionRunning = false;
    private finalReelReady = false;
    private displayedWinAmount = 0;
    private readonly winCountProxy = { value: 0 };

    protected onInitialize(): void {
        this.resolveBindings();
        this.generatedPearlsView?.initialize();
        this.setupFinalJackpotReel();
        this.hideFeature();
    }

    protected onDispose(): void {
        this.generatedPearlsView?.dispose();
        this.jackpotReelController?.dispose();
        if (this.transitionOpacity) {
            Tween.stopAllByTarget(this.transitionOpacity);
        }
        UiTween.stop(this.winCountProxy);
        UiTween.stop(this.winValueLabel?.node);
    }

    /** Reveal content with a blackout transition, then invoke onComplete. */
    public showFeatureWithTransition(onComplete?: () => void): void {
        this.node.active = true;
        this.playTransition('enter', () => {
            this.setContentActive(true);
        }, onComplete);
    }

    /** Hide content with a blackout transition, then invoke onComplete. */
    public hideFeatureWithTransition(onComplete?: () => void): void {
        this.node.active = true;
        this.playTransition('exit', () => {
            this.setContentActive(false);
        }, onComplete);
    }

    public showFeature(): void {
        this.node.active = true;
        this.setContentActive(true);
    }

    public hideFeature(): void {
        this.setContentActive(false);
        this.node.active = true;
    }

    public showWin(_tierName: string, amount: number, animate = false): void {
        const target = Math.floor(Math.max(0, amount));
        if (!this.winValueLabel) {
            this.displayedWinAmount = target;
            this.winCountProxy.value = target;
            return;
        }

        if (!animate || target <= this.displayedWinAmount) {
            this.snapWinAmount(target);
            return;
        }

        this.playWinAmountAdd(target);
    }

    private playWinAmountAdd(target: number): void {
        const from = this.winCountProxy.value;
        this.displayedWinAmount = target;
        this.winCountProxy.value = from;
        UiTween.countTo(this.winCountProxy, target, {
            duration: 0.38,
            easing: 'sineOut',
            onUpdate: value => {
                if (this.winValueLabel) {
                    this.winValueLabel.string = `${Math.floor(value)}`;
                }
            },
        });
        UiTween.bounce(this.winValueLabel?.node, {
            peakScale: 1.18,
            upDuration: 0.1,
            downDuration: 0.16,
        });
    }

    private snapWinAmount(amount: number): void {
        UiTween.stop(this.winCountProxy);
        this.displayedWinAmount = amount;
        this.winCountProxy.value = amount;
        if (this.winValueLabel) {
            this.winValueLabel.string = `${amount}`;
        }
    }

    /**
     * Spins the final jackpot reel and returns the landed symbol id.
     * Activates the JackpotReel node for the spin, then leaves it visible.
     */
    public spinFinalJackpotReel(
        stopIndex: number,
        onComplete?: (symbolId: number) => void,
    ): void {
        this.setupFinalJackpotReel();
        const reel = this.ensureFinalJackpotReel();
        if (!reel) {
            console.warn('[JackpotFeatureView] Final jackpot reel controller is missing.');
            onComplete?.(JACKPOT_FINAL_REEL_CONFIG.reelStrips[0]?.[0] ?? 12);
            return;
        }

        reel.node.active = true;
        reel.spin();

        this.scheduleOnce(() => {
            const strip = JACKPOT_FINAL_REEL_CONFIG.reelStrips[0] ?? [];
            const safeStop = strip.length > 0
                ? ((stopIndex % strip.length) + strip.length) % strip.length
                : 0;

            reel.stop(safeStop, () => {
                const symbolId = typeof reel.getLandedSymbolId === 'function'
                    ? reel.getLandedSymbolId()
                    : (strip[safeStop] ?? 12);

                // Animate the stopped symbol before reward evaluation.
                if (typeof reel.playLandReveal === 'function') {
                    reel.playLandReveal(JACKPOT_FINAL_REEL_LAND_REVEAL_SEC, () => {
                        onComplete?.(symbolId);
                    });
                    return;
                }

                this.scheduleOnce(
                    () => onComplete?.(symbolId),
                    JACKPOT_FINAL_REEL_LAND_REVEAL_SEC,
                );
            });
        }, JACKPOT_FINAL_REEL_SPIN_HOLD_SEC);
    }

    public hideFinalJackpotReel(): void {
        const reel = this.jackpotReelController;
        if (reel?.node?.isValid) {
            reel.node.active = false;
        }
    }

    private setupFinalJackpotReel(): void {
        const reel = this.ensureFinalJackpotReel();
        if (!reel) {
            return;
        }

        if (!this.finalReelReady) {
            const strip = JACKPOT_FINAL_REEL_CONFIG.reelStrips[0] ?? [];
            reel.setup(0, strip, JACKPOT_FINAL_REEL_CONFIG);
            this.finalReelReady = true;
        }

        reel.node.active = false;
    }


    /** Restore lock/chain restraints and kraken scale for a fresh feature run. */
    public resetKrakenRestraints(): void {
        if (this.lockNode?.isValid) {
            Tween.stopAllByTarget(this.lockNode);
            this.lockNode.active = true;
            this.lockNode.setScale(1, 1, 1);
        }
        if (this.chainNode?.isValid) {
            Tween.stopAllByTarget(this.chainNode);
            this.chainNode.active = true;
            this.chainNode.setScale(1, 1, 1);
        }
        if (this.krakenBGNode?.isValid) {
            Tween.stopAllByTarget(this.krakenBGNode);
            this.krakenBGNode.active = true;
            this.krakenBGNode.setScale(1, 1, 1);
        }
    }

    /**
     * Release sequence before the final jackpot reel:
     * 1) lock opens  2) chain breaks  3) kraken pulse → onComplete
     */
    public krakenReleaseAnimation(onComplete?: () => void): void {
        const finish = (): void => {
            onComplete?.();
        };

        this.playLockOpenedAnimation(() => {
            this.playChainBrokeAnimation(() => {
                this.playKrakenReleasePulse(finish);
            });
        });
    }

    private playLockOpenedAnimation(onComplete: () => void): void {
        const lock = this.lockNode;
        if (!lock?.isValid) {
            onComplete();
            return;
        }

        Tween.stopAllByTarget(lock);
        lock.active = true;
        lock.setScale(1, 1, 1);
        tween(lock)
            .to(0.22, { scale: new Vec3(1.28, 1.28, 1) })
            .to(0.28, { scale: new Vec3(0, 0, 1) })
            .call(() => {
                lock.active = false;
                lock.setScale(1, 1, 1);
                onComplete();
            })
            .start();
    }

    private playChainBrokeAnimation(onComplete: () => void): void {
        const chain = this.chainNode;
        if (!chain?.isValid) {
            onComplete();
            return;
        }

        Tween.stopAllByTarget(chain);
        chain.active = true;
        chain.setScale(1, 1, 1);
        tween(chain)
            .to(0.18, { scale: new Vec3(1.15, 1.15, 1) })
            .to(0.32, { scale: new Vec3(0, 0, 1) })
            .call(() => {
                chain.active = false;
                chain.setScale(1, 1, 1);
                onComplete();
            })
            .start();
    }

    private playKrakenReleasePulse(onComplete: () => void): void {
        const finish = (): void => {
            this.hideKrakenRestraints();
            onComplete();
        };

        const kraken = this.krakenBGNode;
        if (!kraken?.isValid) {
            finish();
            return;
        }

        Tween.stopAllByTarget(kraken);
        kraken.setScale(1, 1, 1);
        tween(kraken)
            .to(0.5, { scale: new Vec3(1.12, 1.12, 1) })
            .to(0.5, { scale: new Vec3(1, 1, 1) })
            .call(finish)
            .start();
    }

    private hideKrakenRestraints(): void {
        if (this.lockNode?.isValid) {
            this.lockNode.active = false;
        }
        if (this.chainNode?.isValid) {
            this.chainNode.active = false;
        }
        if (this.krakenBGNode?.isValid) {
            this.krakenBGNode.active = false;
        }
    }

    private ensureFinalJackpotReel(): JackpotReelController | null {
        if (this.jackpotReelController?.isValid) {
            this.applyFinalReelSharedAssets(this.jackpotReelController);
            return this.jackpotReelController;
        }

        let controller = this.node.getComponentInChildren(JackpotReelController);
        if (!controller) {
            const jackpotReelNode = this.findNodeByName(this.node, 'JackpotReel');
            if (jackpotReelNode) {
                const legacy = jackpotReelNode.getComponent(ReelController);
                const reelView = legacy?.reelView
                    ?? jackpotReelNode.getComponent(ReelView)
                    ?? jackpotReelNode.getComponentInChildren(ReelView);

                if (legacy) {
                    // Prefer the dedicated final-reel controller; disable the base one.
                    legacy.enabled = false;
                }

                controller = jackpotReelNode.getComponent(JackpotReelController)
                    ?? jackpotReelNode.addComponent(JackpotReelController);

                if (!controller.reelView && reelView) {
                    controller.reelView = reelView;
                }
            }
        }

        if (controller) {
            this.applyFinalReelSharedAssets(controller);
        }

        this.jackpotReelController = controller;
        return this.jackpotReelController;
    }

    private playTransition(
        kind: 'enter' | 'exit',
        onMidpoint: () => void,
        onComplete?: () => void,
    ): void {
        const overlay = this.ensureTransitionOverlay();
        const opacity = this.transitionOpacity;
        if (!overlay || !opacity) {
            onMidpoint();
            onComplete?.();
            return;
        }

        if (this.isTransitionRunning) {
            Tween.stopAllByTarget(opacity);
        }

        this.isTransitionRunning = true;
        overlay.active = true;
        if (overlay.parent) {
            overlay.setSiblingIndex(overlay.parent.children.length - 1);
        }
        this.refreshTransitionOverlaySize(overlay);
        opacity.opacity = 0;

        const fade = kind === 'enter'
            ? JACKPOT_FEATURE_ENTER_TRANSITION_SEC
            : JACKPOT_FEATURE_EXIT_TRANSITION_SEC;
        const hold = Math.min(0.12, fade * 0.35);

        // Enter: content starts hidden; reveal under blackout.
        // Exit: content is visible; hide under blackout.
        if (kind === 'enter') {
            this.setContentActive(false);
        }

        tween(opacity)
            .to(fade, { opacity: 255 })
            .call(() => onMidpoint())
            .delay(hold)
            .to(fade, { opacity: 0 })
            .call(() => {
                overlay.active = false;
                this.isTransitionRunning = false;
                onComplete?.();
            })
            .start();
    }

    private setContentActive(active: boolean): void {
        this.node.children.forEach(child => {
            if (child === this.transitionOverlayNode) {
                return;
            }
            child.active = active;
        });
    }

    private ensureTransitionOverlay(): Node | null {
        if (this.transitionOverlayNode?.isValid) {
            this.transitionOpacity = this.transitionOverlayNode.getComponent(UIOpacity)
                ?? this.transitionOverlayNode.addComponent(UIOpacity);
            return this.transitionOverlayNode;
        }

        const host = this.node.parent ?? this.node;
        const existing = host.getChildByName('JackpotTransitionOverlay');
        if (existing) {
            this.transitionOverlayNode = existing;
            this.transitionOpacity = existing.getComponent(UIOpacity) ?? existing.addComponent(UIOpacity);
            existing.active = false;
            return existing;
        }

        const overlay = new Node('JackpotTransitionOverlay');
        host.addChild(overlay);

        const transform = overlay.addComponent(UITransform);
        transform.setContentSize(1920, 1080);

        const widget = overlay.addComponent(Widget);
        widget.isAlignTop = true;
        widget.isAlignBottom = true;
        widget.isAlignLeft = true;
        widget.isAlignRight = true;
        widget.top = 0;
        widget.bottom = 0;
        widget.left = 0;
        widget.right = 0;
        widget.alignMode = Widget.AlignMode.ALWAYS;
        widget.updateAlignment();

        overlay.addComponent(Graphics);
        const opacity = overlay.addComponent(UIOpacity);
        opacity.opacity = 0;
        overlay.active = false;

        this.transitionOverlayNode = overlay;
        this.transitionOpacity = opacity;
        this.refreshTransitionOverlaySize(overlay);
        return overlay;
    }

    private refreshTransitionOverlaySize(overlay: Node): void {
        const widget = overlay.getComponent(Widget);
        widget?.updateAlignment();

        const transform = overlay.getComponent(UITransform);
        const graphics = overlay.getComponent(Graphics);
        if (!transform) {
            return;
        }

        const width = Math.max(1920, transform.width || 1920);
        const height = Math.max(1080, transform.height || 1080);
        transform.setContentSize(width, height);

        if (!graphics) {
            return;
        }

        graphics.clear();
        graphics.fillColor = new Color(0, 0, 0, 255);
        graphics.rect(-width / 2, -height / 2, width, height);
        graphics.fill();
    }

    private resolveBindings(): void {
        if (!this.jackpotReelsContainer) {
            this.jackpotReelsContainer =
                this.node.getComponentInChildren(ReelsContainer)
                ?? this.getComponent(ReelsContainer);
        }

        if (!this.generatedPearlsView) {
            this.generatedPearlsView =
                this.node.getComponentInChildren(GeneratedPearlsView)
                ?? this.getComponent(GeneratedPearlsView);
        }

        if (!this.jackpotReelController) {
            this.jackpotReelController =
                this.node.getComponentInChildren(JackpotReelController);
        }

        if (!this.winValueLabel) {
            const winPanel = this.findNodeByName(this.node, 'WinPanel');
            if (winPanel) {
                this.winValueLabel = winPanel.getChildByName('LabelValue')?.getComponent(Label) ?? null;
            }
        }
    }

    private applyFinalReelSharedAssets(controller: JackpotReelController): void {
        const view = controller.reelView
            ?? controller.getComponent(ReelView)
            ?? controller.getComponentInChildren(ReelView);
        if (!view) {
            return;
        }

        if (!view.symbolPrefab && this.jackpotReelsContainer?.symbolPrefab) {
            view.setSymbolPrefab(this.jackpotReelsContainer.symbolPrefab);
        }

        const library = this.jackpotReelsContainer?.spriteFrameLibrary
            ?? SpriteFrameLibrary.getShared();
        if (library) {
            view.setSpriteFrameLibrary(library);
        }
    }

    private findNodeByName(root: Node, name: string): Node | null {
        if (root.name === name) {
            return root;
        }
        for (const child of root.children) {
            const match = this.findNodeByName(child, name);
            if (match) {
                return match;
            }
        }
        return null;
    }
}
