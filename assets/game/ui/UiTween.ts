import { Node, Sprite, tween, Tween, TweenEasing, UIOpacity, Vec3 } from 'cc';

export interface UiTweenCallback {
    readonly onComplete?: () => void;
}

export interface UiScaleTweenOptions extends UiTweenCallback {
    /** Peak scale relative to the node's current scale. */
    readonly peakScale?: number;
    readonly upDuration?: number;
    readonly downDuration?: number;
    readonly easingUp?: TweenEasing;
    readonly easingDown?: TweenEasing;
}

export interface UiPulseOptions extends UiScaleTweenOptions {
    /** Seconds to wait between beats. */
    readonly pause?: number;
}

export interface UiPopInOptions extends UiTweenCallback {
    readonly duration?: number;
    readonly fromScale?: number;
    readonly easing?: TweenEasing;
}

export interface UiFadeOptions extends UiTweenCallback {
    readonly duration?: number;
}

export interface UiFillOptions extends UiTweenCallback {
    readonly duration?: number;
}

export interface UiCountOptions extends UiTweenCallback {
    readonly duration?: number;
    readonly easing?: TweenEasing;
    readonly onUpdate?: (value: number) => void;
}

/**
 * Shared UI tween helpers. Call from any script; always stop the previous tween
 * on the same target before starting a new one.
 */
export class UiTween {
    public static stop(target: object | null | undefined): void {
        if (!target) {
            return;
        }
        Tween.stopAllByTarget(target);
    }

    /** One-shot scale up then settle back. */
    public static bounce(node: Node | null | undefined, options?: UiScaleTweenOptions): void {
        if (!node?.isValid) {
            return;
        }

        const base = node.scale.clone();
        const peak = options?.peakScale ?? 1.12;
        this.stop(node);
        node.setScale(base);

        tween(node)
            .to(options?.upDuration ?? 0.08, {
                scale: new Vec3(base.x * peak, base.y * peak, base.z),
            }, { easing: options?.easingUp ?? 'quadOut' })
            .to(options?.downDuration ?? 0.12, { scale: base }, {
                easing: options?.easingDown ?? 'bounceOut',
            })
            .call(() => options?.onComplete?.())
            .start();
    }

    /** Looping heartbeat scale. */
    public static pulse(node: Node | null | undefined, options?: UiPulseOptions): void {
        if (!node?.isValid) {
            return;
        }

        const base = node.scale.clone();
        const peak = options?.peakScale ?? 1.1;
        const up = options?.upDuration ?? 0.25;
        const down = options?.downDuration ?? 0.25;
        this.stop(node);
        node.setScale(base);

        tween(node)
            .repeatForever(
                tween()
                    .to(up, {
                        scale: new Vec3(base.x * peak, base.y * peak, base.z),
                    }, { easing: options?.easingUp ?? 'quadOut' })
                    .to(down, { scale: base }, { easing: options?.easingDown ?? 'quadIn' })
                    .delay(options?.pause ?? 0.25),
            )
            .start();
    }

    /** Scale from a small size to the current scale. */
    public static popIn(node: Node | null | undefined, options?: UiPopInOptions): void {
        if (!node?.isValid) {
            return;
        }

        const base = node.scale.clone();
        const from = options?.fromScale ?? 0.6;
        this.stop(node);
        node.setScale(base.x * from, base.y * from, base.z);

        tween(node)
            .to(options?.duration ?? 0.22, { scale: base }, {
                easing: options?.easing ?? 'backOut',
            })
            .call(() => options?.onComplete?.())
            .start();
    }

    public static fadeTo(
        node: Node | null | undefined,
        opacity: number,
        options?: UiFadeOptions,
    ): void {
        if (!node?.isValid) {
            return;
        }

        const uiOpacity = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
        this.stop(uiOpacity);

        tween(uiOpacity)
            .to(options?.duration ?? 0.2, { opacity: Math.min(255, Math.max(0, opacity)) })
            .call(() => options?.onComplete?.())
            .start();
    }

    /** Animate a filled sprite from left to right (`fillRange` 0–1). */
    public static fillTo(
        sprite: Sprite | null | undefined,
        fillRange: number,
        options?: UiFillOptions,
    ): void {
        if (!sprite?.isValid) {
            return;
        }

        this.stop(sprite);
        tween(sprite)
            .to(options?.duration ?? 0.2, {
                fillRange: Math.min(1, Math.max(0, fillRange)),
            })
            .call(() => options?.onComplete?.())
            .start();
    }

    /** Tween a numeric `{ value }` holder, typically to roll a coin/win label. */
    public static countTo(
        holder: { value: number } | null | undefined,
        to: number,
        options?: UiCountOptions,
    ): void {
        if (!holder) {
            return;
        }

        const target = Math.max(0, to);
        this.stop(holder);
        tween(holder)
            .to(options?.duration ?? 0.35, { value: target }, {
                easing: options?.easing ?? 'sineOut',
                onUpdate: () => options?.onUpdate?.(holder.value),
            })
            .call(() => {
                holder.value = target;
                options?.onUpdate?.(target);
                options?.onComplete?.();
            })
            .start();
    }
}
