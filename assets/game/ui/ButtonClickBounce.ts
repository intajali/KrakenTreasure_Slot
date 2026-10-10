import { _decorator, Button, Component, Node, tween, Tween, Vec3 } from 'cc';
import { AudioController } from 'db://assets/game/audio/AudioController';
import { AudioIds } from 'db://assets/game/audio/AudioIds';
const { ccclass, menu, property, requireComponent } = _decorator;

/**
 * Drop this on any Button node. On click it plays a short squash-and-bounce scale.
 * Tune squash / peak / durations in the inspector per button.
 */
@ccclass('ButtonClickBounce')
@requireComponent(Button)
@menu('Game/UI/Button Click Bounce')
export class ButtonClickBounce extends Component {
    @property({
        type: Node,
        tooltip: 'Node to scale. Leave empty to bounce this node.',
    })
    targetNode: Node | null = null;

    @property({ tooltip: 'Scale multiplier at the squash (pressed) pose.' })
    squashScale = 0.88;

    @property({ tooltip: 'Scale multiplier at the bounce peak before settling.' })
    peakScale = 1.08;

    @property({ tooltip: 'Seconds spent scaling down.' })
    squashDuration = 0.05;

    @property({ tooltip: 'Seconds spent scaling up to the peak.' })
    peakDuration = 0.12;

    @property({ tooltip: 'Seconds spent settling back to the original scale.' })
    settleDuration = 0.1;

    private readonly originalScale = new Vec3(1, 1, 1);
    private readonly squash = new Vec3();
    private readonly peak = new Vec3();
    private button: Button | null = null;
    private capturedScale = false;

    public static ensure(node: Node): ButtonClickBounce {
        return node.getComponent(ButtonClickBounce) ?? node.addComponent(ButtonClickBounce);
    }

    protected onLoad(): void {
        this.button = this.getComponent(Button);
        this.captureOriginalScale();
        this.disableConflictingScaleTransition();
    }

    protected onEnable(): void {
        this.node.on(Button.EventType.CLICK, this.onClicked, this);
    }

    protected onDisable(): void {
        this.node.off(Button.EventType.CLICK, this.onClicked, this);
        this.resetScale();
    }

    protected onDestroy(): void {
        this.resetScale();
    }

    public play(): void {
        const target = this.resolveTarget();
        if (!target?.isValid) {
            return;
        }

        if (!this.capturedScale) {
            this.captureOriginalScale();
        }

        this.squash.set(
            this.originalScale.x * this.squashScale,
            this.originalScale.y * this.squashScale,
            this.originalScale.z,
        );
        this.peak.set(
            this.originalScale.x * this.peakScale,
            this.originalScale.y * this.peakScale,
            this.originalScale.z,
        );

        Tween.stopAllByTarget(target);
        target.setScale(this.originalScale);

        tween(target)
            .to(this.squashDuration, { scale: this.squash.clone() }, { easing: 'quadOut' })
            .to(this.peakDuration, { scale: this.peak.clone() }, { easing: 'backOut' })
            .to(this.settleDuration, { scale: this.originalScale.clone() }, { easing: 'sineOut' })
            .start();
    }

    private onClicked = (): void => {
        if (this.button && !this.button.interactable) {
            return;
        }
        this.play();
        AudioController.playSfx(AudioIds.UiClick);
    };

    private resolveTarget(): Node {
        return this.targetNode?.isValid ? this.targetNode : this.node;
    }

    private captureOriginalScale(): void {
        const target = this.resolveTarget();
        if (!target?.isValid) {
            return;
        }
        target.getScale(this.originalScale);
        this.capturedScale = true;
    }

    private disableConflictingScaleTransition(): void {
        if (this.button?.transition === Button.Transition.SCALE) {
            this.button.transition = Button.Transition.NONE;
        }
    }

    private resetScale(): void {
        const target = this.resolveTarget();
        if (!target?.isValid) {
            return;
        }
        Tween.stopAllByTarget(target);
        if (this.capturedScale) {
            target.setScale(this.originalScale);
        }
    }
}
