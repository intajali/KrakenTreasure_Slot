import {
    _decorator,
    BlockInputEvents,
    Color,
    Graphics,
    Label,
    Node,
    Sprite,
    SpriteFrame,
    Tween,
    UIOpacity,
    UITransform,
    Widget,
    tween,
} from 'cc';
import { BaseView } from 'db://assets/core/architecture/BaseView';
import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { BetEvents } from '../../betting/BetEvents';
const { ccclass, property } = _decorator;

@ccclass('FreeSpinPanelView')
export class FreeSpinPanelView extends BaseView {
    @property(Node)
    gameLeftPanelNode: Node | null = null;

    @property(Node)
    freespinLeftPanelNode: Node | null = null;

    @property({ type: Label, tooltip: 'TOTAL WIN value on the free-spin left panel.' })
    freeSpinWinValue: Label | null = null;

    @property({ type: Label, tooltip: 'Spins remaining value on the free-spin left panel.' })
    freeSpinRemainLabel: Label | null = null;

    @property({ type: Node, tooltip: 'Optional fullscreen black overlay used for free-spin transitions.' })
    transitionOverlayNode: Node | null = null;

    @property({ type: SpriteFrame, tooltip: 'Optional black transparent sprite for the transition overlay.' })
    transitionSpriteFrame: SpriteFrame | null = null;

    @property({ tooltip: 'Fade in/out duration for free-spin screen transition (seconds).' })
    freeSpinTransitionDurationSec = 0.35;

    @property({ type: Node, tooltip: 'Host used when creating a runtime transition overlay.' })
    panelHost: Node | null = null;

    private isFreeSpinPanelActive = false;
    private isPanelTransitionRunning = false;
    private pendingFreeSpinPanelMode: boolean | null = null;
    private transitionOverlayOpacity: UIOpacity | null = null;
    private freeSpinAccumulatedWin = 0;
    private freeSpinRemaining = 0;
    private freeSpinTotal = 0;

    protected onDestroy(): void {
        this.dispose();
    }

    protected onInitialize(): void {
        this.resolveFreeSpinLabels();
        this.ensureTransitionOverlay();
        this.applyLeftPanelMode(false);
        this.refreshFreeSpinLabels();

        EventBus.on(SlotEvents.FeatureTriggered, this.onFreeSpinTriggered);
        EventBus.on(SlotEvents.FreeSpinStarted, this.onFreeSpinStarted);
        EventBus.on(SlotEvents.FreeSpinUpdated, this.onFreeSpinUpdated);
        EventBus.on(SlotEvents.FreeSpinEnded, this.onFreeSpinEnded);
        EventBus.on(BetEvents.WinCredited, this.onWinCredited);
    }

    protected onDispose(): void {
        EventBus.off(SlotEvents.FeatureTriggered, this.onFreeSpinTriggered);
        EventBus.off(SlotEvents.FreeSpinStarted, this.onFreeSpinStarted);
        EventBus.off(SlotEvents.FreeSpinUpdated, this.onFreeSpinUpdated);
        EventBus.off(SlotEvents.FreeSpinEnded, this.onFreeSpinEnded);
        EventBus.off(BetEvents.WinCredited, this.onWinCredited);
        if (this.transitionOverlayOpacity) {
            Tween.stopAllByTarget(this.transitionOverlayOpacity);
        }
    }

    public refresh(): void {
        this.resolveFreeSpinLabels();
        this.refreshFreeSpinLabels();
    }

    private onFreeSpinTriggered = (): void => {
        this.resolveFreeSpinLabels();
        // Start the enter transition as soon as the feature is awarded.
        this.playLeftPanelTransition(true);
    };

    private onFreeSpinStarted = (payload?: { remaining?: number; total?: number; totalWin?: number }): void => {
        this.resolveFreeSpinLabels();
        this.freeSpinRemaining = Math.max(0, payload?.remaining ?? this.freeSpinRemaining);
        this.freeSpinTotal = Math.max(0, payload?.total ?? this.freeSpinTotal);
        this.freeSpinAccumulatedWin = Math.max(0, payload?.totalWin ?? 0);
        this.refreshFreeSpinLabels();

        // Fallback only (e.g. debug start). Skip if FeatureTriggered already started/completed enter.
        if (!this.isFreeSpinPanelActive && !this.isPanelTransitionRunning && this.pendingFreeSpinPanelMode !== true) {
            this.playLeftPanelTransition(true);
        }
    };

    private onFreeSpinUpdated = (payload?: { remaining?: number; total?: number; totalWin?: number }): void => {
        if (typeof payload?.remaining === 'number') {
            this.freeSpinRemaining = Math.max(0, payload.remaining);
        }
        if (typeof payload?.total === 'number') {
            this.freeSpinTotal = Math.max(0, payload.total);
        }
        if (typeof payload?.totalWin === 'number') {
            this.freeSpinAccumulatedWin = Math.max(0, Math.floor(payload.totalWin));
        }
        this.refreshFreeSpinLabels();
    };

    private onFreeSpinEnded = (payload?: { totalWin?: number }): void => {
        if (typeof payload?.totalWin === 'number') {
            this.freeSpinAccumulatedWin = Math.max(0, Math.floor(payload.totalWin));
            this.refreshFreeSpinWinLabel();
        }
        this.freeSpinRemaining = 0;
        this.refreshFreeSpinRemainLabel();
        this.playLeftPanelTransition(false);
    };

    private onWinCredited = (payload: { amount: number; freeSpinTotalWin?: number; source?: string }): void => {
        if (payload.source) {
            return;
        }

        if (typeof payload.freeSpinTotalWin === 'number') {
            this.freeSpinAccumulatedWin = Math.max(0, Math.floor(payload.freeSpinTotalWin));
            this.refreshFreeSpinWinLabel();
        }
    };

    private resolveFreeSpinLabels(): void {
        if (!this.freespinLeftPanelNode) {
            return;
        }

        if (!this.freeSpinRemainLabel) {
            const remainNode = this.findChildByName(this.freespinLeftPanelNode, 'SpinRemainLabel');
            this.freeSpinRemainLabel = remainNode?.getComponent(Label) ?? null;
        }

        if (!this.freeSpinWinValue) {
            const winNode = this.findChildByName(this.freespinLeftPanelNode, 'SpinRemainLabel-001');
            this.freeSpinWinValue = winNode?.getComponent(Label) ?? null;
        }
    }

    private findChildByName(root: Node, name: string): Node | null {
        if (root.name === name) {
            return root;
        }

        for (const child of root.children) {
            const match = this.findChildByName(child, name);
            if (match) {
                return match;
            }
        }

        return null;
    }

    private refreshFreeSpinLabels(): void {
        this.refreshFreeSpinRemainLabel();
        this.refreshFreeSpinWinLabel();
    }

    private refreshFreeSpinRemainLabel(): void {
        if (!this.freeSpinRemainLabel) {
            return;
        }

        const total = Math.max(this.freeSpinTotal, this.freeSpinRemaining);
        this.freeSpinRemainLabel.string = `${this.freeSpinRemaining} / ${total}`;
    }

    private refreshFreeSpinWinLabel(): void {
        if (!this.freeSpinWinValue) {
            return;
        }

        this.freeSpinWinValue.string = `${Math.floor(this.freeSpinAccumulatedWin)}`;
    }

    private applyLeftPanelMode(freeSpinActive: boolean): void {
        this.isFreeSpinPanelActive = freeSpinActive;
        this.setLeftPanelVisible(this.gameLeftPanelNode, !freeSpinActive);
        this.setLeftPanelVisible(this.freespinLeftPanelNode, freeSpinActive);
    }

    /**
     * Toggle left-panel visibility without disabling the FreeSpinPanelView host node.
     * freespinLeftPanelNode is this.node in the scene — deactivating it mid-tween aborts the fade.
     */
    private setLeftPanelVisible(panel: Node | null, visible: boolean): void {
        if (!panel?.isValid) {
            return;
        }

        if (panel === this.node) {
            for (const child of panel.children) {
                child.active = visible;
            }
            return;
        }

        panel.active = visible;
    }

    private playLeftPanelTransition(enterFreeSpin: boolean): void {
        if (this.isPanelTransitionRunning) {
            this.pendingFreeSpinPanelMode = enterFreeSpin;
            return;
        }

        if (this.isFreeSpinPanelActive === enterFreeSpin) {
            this.applyLeftPanelMode(enterFreeSpin);
            return;
        }

        const overlay = this.ensureTransitionOverlay();
        const opacity = this.transitionOverlayOpacity;
        if (!overlay || !opacity) {
            this.applyLeftPanelMode(enterFreeSpin);
            return;
        }

        this.isPanelTransitionRunning = true;
        this.pendingFreeSpinPanelMode = null;
        Tween.stopAllByTarget(opacity);
        overlay.active = true;
        if (overlay.parent) {
            overlay.setSiblingIndex(overlay.parent.children.length - 1);
        }
        this.refreshTransitionOverlaySize(overlay);
        opacity.opacity = 0;

        // Fully opaque blackout before swapping panels so the enable/disable is hidden.
        const fadeDuration = Math.max(0.05, this.freeSpinTransitionDurationSec);
        const holdDuration = Math.min(0.12, fadeDuration * 0.35);
        tween(opacity)
            .to(fadeDuration, { opacity: 255 })
            .call(() => {
                this.applyLeftPanelMode(enterFreeSpin);
            })
            .delay(holdDuration)
            .to(fadeDuration, { opacity: 0 })
            .call(() => {
                overlay.active = false;
                this.isPanelTransitionRunning = false;
                this.flushPendingPanelTransition();
            })
            .start();
    }

    private flushPendingPanelTransition(): void {
        if (this.pendingFreeSpinPanelMode === null) {
            return;
        }

        const nextMode = this.pendingFreeSpinPanelMode;
        this.pendingFreeSpinPanelMode = null;
        if (this.isFreeSpinPanelActive !== nextMode) {
            this.playLeftPanelTransition(nextMode);
        }
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

    private ensureTransitionOverlay(): Node | null {
        if (this.transitionOverlayNode?.isValid) {
            this.transitionOverlayOpacity = this.transitionOverlayNode.getComponent(UIOpacity)
                ?? this.transitionOverlayNode.addComponent(UIOpacity);
            return this.transitionOverlayNode;
        }

        const host = this.panelHost ?? this.node;
        const existing = host.getChildByName('FreeSpinTransitionOverlay');
        if (existing) {
            this.transitionOverlayNode = existing;
            this.transitionOverlayOpacity = existing.getComponent(UIOpacity) ?? existing.addComponent(UIOpacity);
            existing.active = false;
            return existing;
        }

        const overlay = new Node('FreeSpinTransitionOverlay');
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
        widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;

        if (this.transitionSpriteFrame) {
            const sprite = overlay.addComponent(Sprite);
            sprite.spriteFrame = this.transitionSpriteFrame;
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.color = new Color(0, 0, 0, 255);
        } else {
            const graphics = overlay.addComponent(Graphics);
            graphics.fillColor = new Color(0, 0, 0, 255);
            graphics.rect(-960, -540, 1920, 1080);
            graphics.fill();
        }

        overlay.addComponent(BlockInputEvents);
        const opacity = overlay.addComponent(UIOpacity);
        opacity.opacity = 0;
        overlay.active = false;

        this.transitionOverlayNode = overlay;
        this.transitionOverlayOpacity = opacity;
        return overlay;
    }
}
