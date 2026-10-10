import {
    _decorator,
    Color,
    Graphics,
    Label,
    Node,
    Tween,
    UIOpacity,
    UITransform,
    Widget,
    tween,
} from 'cc';
import { BaseView } from 'db://assets/core/architecture/BaseView';
import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { AutoSpinEndedPayload } from 'db://assets/core/slot/AutoSpinEndReason';
const { ccclass, property } = _decorator;

/**
 * Auto-spin enter/exit screen flash + loss-limit notification toast.
 */
@ccclass('AutoSpinFxView')
export class AutoSpinFxView extends BaseView {
    @property({ type: Node, tooltip: 'Host used when creating runtime overlay / toast nodes.' })
    panelHost: Node | null = null;

    @property({ tooltip: 'Fade duration for auto-spin enter/exit screen flash (seconds).' })
    transitionDurationSec = 0.28;

    @property({ tooltip: 'How long the loss-limit toast stays fully visible (seconds).' })
    notificationHoldSec = 2.2;

    private transitionOverlay: Node | null = null;
    private transitionOpacity: UIOpacity | null = null;
    private notificationRoot: Node | null = null;
    private notificationLabel: Label | null = null;
    private notificationOpacity: UIOpacity | null = null;

    protected onDestroy(): void {
        this.dispose();
    }

    protected onInitialize(): void {
        EventBus.on(SlotEvents.AutoSpinStarted, this.onAutoSpinStarted);
        EventBus.on(SlotEvents.AutoSpinEnded, this.onAutoSpinEnded);
    }

    protected onDispose(): void {
        EventBus.off(SlotEvents.AutoSpinStarted, this.onAutoSpinStarted);
        EventBus.off(SlotEvents.AutoSpinEnded, this.onAutoSpinEnded);
        if (this.transitionOpacity) {
            Tween.stopAllByTarget(this.transitionOpacity);
        }
        if (this.notificationOpacity) {
            Tween.stopAllByTarget(this.notificationOpacity);
        }
    }

    private onAutoSpinStarted = (): void => {
        this.playScreenTransition('enter');
    };

    private onAutoSpinEnded = (payload?: AutoSpinEndedPayload): void => {
        this.playScreenTransition('exit');
        if (payload?.reason === 'loss_limit') {
            this.showNotification('Exit limit crossed — auto-spin ended');
        } else if (payload?.reason === 'feature_triggered') {
            this.showNotification('Feature triggered — auto-spin ended');
        }
    };

    private playScreenTransition(kind: 'enter' | 'exit'): void {
        const overlay = this.ensureTransitionOverlay();
        const opacity = this.transitionOpacity;
        if (!overlay || !opacity) {
            return;
        }

        Tween.stopAllByTarget(opacity);
        overlay.active = true;
        if (overlay.parent) {
            overlay.setSiblingIndex(overlay.parent.children.length - 1);
        }
        this.refreshOverlaySize(overlay);
        opacity.opacity = 0;

        const fade = Math.max(0.08, this.transitionDurationSec);
        const peak = kind === 'enter' ? 170 : 200;
        const hold = Math.min(0.1, fade * 0.35);

        tween(opacity)
            .to(fade, { opacity: peak })
            .delay(hold)
            .to(fade, { opacity: 0 })
            .call(() => {
                overlay.active = false;
            })
            .start();
    }

    private showNotification(message: string): void {
        const root = this.ensureNotification();
        const opacity = this.notificationOpacity;
        const label = this.notificationLabel;
        if (!root || !opacity || !label) {
            return;
        }

        label.string = message;
        Tween.stopAllByTarget(opacity);
        root.active = true;
        if (root.parent) {
            root.setSiblingIndex(root.parent.children.length - 1);
        }
        opacity.opacity = 0;

        const hold = Math.max(0.6, this.notificationHoldSec);
        tween(opacity)
            .to(0.2, { opacity: 255 })
            .delay(hold)
            .to(0.35, { opacity: 0 })
            .call(() => {
                root.active = false;
            })
            .start();
    }

    private ensureTransitionOverlay(): Node | null {
        if (this.transitionOverlay?.isValid) {
            this.transitionOpacity = this.transitionOverlay.getComponent(UIOpacity)
                ?? this.transitionOverlay.addComponent(UIOpacity);
            return this.transitionOverlay;
        }

        const host = this.resolveHost();
        const existing = host.getChildByName('AutoSpinTransitionOverlay');
        if (existing) {
            this.transitionOverlay = existing;
            this.transitionOpacity = existing.getComponent(UIOpacity) ?? existing.addComponent(UIOpacity);
            existing.active = false;
            return existing;
        }

        const overlay = new Node('AutoSpinTransitionOverlay');
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

        this.transitionOverlay = overlay;
        this.transitionOpacity = opacity;
        this.refreshOverlaySize(overlay);
        return overlay;
    }

    private ensureNotification(): Node | null {
        if (this.notificationRoot?.isValid) {
            return this.notificationRoot;
        }

        const host = this.resolveHost();
        const existing = host.getChildByName('AutoSpinExitNotification');
        if (existing) {
            this.notificationRoot = existing;
            this.notificationOpacity = existing.getComponent(UIOpacity) ?? existing.addComponent(UIOpacity);
            this.notificationLabel = existing.getComponentInChildren(Label);
            existing.active = false;
            return existing;
        }

        const root = new Node('AutoSpinExitNotification');
        host.addChild(root);
        const rootTransform = root.addComponent(UITransform);
        rootTransform.setContentSize(640, 72);
        root.setPosition(0, 180, 0);

        const opacity = root.addComponent(UIOpacity);
        opacity.opacity = 0;

        const bg = new Node('Background');
        root.addChild(bg);
        const bgTransform = bg.addComponent(UITransform);
        bgTransform.setContentSize(640, 72);
        const graphics = bg.addComponent(Graphics);
        graphics.fillColor = new Color(18, 28, 40, 230);
        graphics.roundRect(-320, -36, 640, 72, 12);
        graphics.fill();

        const labelNode = new Node('Message');
        root.addChild(labelNode);
        const labelTransform = labelNode.addComponent(UITransform);
        labelTransform.setContentSize(600, 56);
        const label = labelNode.addComponent(Label);
        label.string = '';
        label.fontSize = 22;
        label.lineHeight = 28;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.color = new Color(255, 220, 140, 255);
        label.overflow = Label.Overflow.SHRINK;

        root.active = false;
        this.notificationRoot = root;
        this.notificationOpacity = opacity;
        this.notificationLabel = label;
        return root;
    }

    private refreshOverlaySize(overlay: Node): void {
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

    private resolveHost(): Node {
        if (this.panelHost?.isValid) {
            return this.panelHost;
        }

        let current: Node | null = this.node;
        while (current) {
            if (current.name === 'SafeZone' || current.name === 'Canvas') {
                return current;
            }
            current = current.parent;
        }

        return this.node.parent ?? this.node;
    }
}
