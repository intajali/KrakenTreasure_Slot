import { _decorator, Label, tween, Tween, Vec3 } from 'cc';
import { BaseItemView } from '../../../core/architecture/BaseItemView';
const { ccclass, property } = _decorator;

export interface PearlRewardValues {
    readonly amount: number;
}

@ccclass('PearlView')
export class PearlView extends BaseItemView<PearlRewardValues> {
    @property({ type: Label })
    public label: Label | null = null;

    protected onSetData(data: PearlRewardValues, _index: number): void {
        if (this.label) {
            this.label.string = `${Math.floor(Math.max(0, data.amount))}`;
        }
    }

    public getAmount(): number {
        return Math.floor(Math.max(0, this.data?.amount ?? 0));
    }

    /** Brief pulse used when this pearl's reward is added to the total. */
    public playEvaluateHighlight(): void {
        Tween.stopAllByTarget(this.node);
        this.node.setScale(1, 1, 1);
        tween(this.node)
            .to(0.12, { scale: new Vec3(1.18, 1.18, 1) })
            .to(0.12, { scale: new Vec3(1, 1, 1) })
            .start();
    }
}
