import { _decorator, Label, Sprite } from 'cc';
import { BaseView } from 'db://assets/core/architecture/BaseView';
import { EventBus } from 'db://assets/core/events/EventBus';
import { KrakenMeterSnapshot, KrakenProgressEvents } from '../KrakenProgressEvents';
const { ccclass, property } = _decorator;

@ccclass('KrakenProgressView')
export class KrakenProgressView extends BaseView {
    @property({ type: Sprite, tooltip: 'Filled sprite under ProgressBarKraken/Bar.' })
    fillBar: Sprite | null = null;

    @property({ type: Label, tooltip: 'Count label under ProgressBarKraken/KrakenProgress.' })
    progressLabel: Label | null = null;

    private readonly onMeterUpdated = (snapshot: KrakenMeterSnapshot) => this.applySnapshot(snapshot);

    protected onDestroy(): void {
        this.dispose();
    }

    protected onInitialize(): void {
        this.resolveBindings();
        EventBus.on(KrakenProgressEvents.MeterUpdated, this.onMeterUpdated);
    }

    protected onDispose(): void {
        EventBus.off(KrakenProgressEvents.MeterUpdated, this.onMeterUpdated);
    }

    public applySnapshot(snapshot: KrakenMeterSnapshot): void {
        if (this.fillBar) {
            this.fillBar.type = Sprite.Type.FILLED;
            this.fillBar.fillType = Sprite.FillType.HORIZONTAL;
            this.fillBar.fillStart = 0;
            this.fillBar.fillRange = Math.min(1, Math.max(0, snapshot.progress));
        }

        if (this.progressLabel) {
            this.progressLabel.string = `${snapshot.currentCount} / ${snapshot.requiredCount}`;
        }
    }

    private resolveBindings(): void {
        if (!this.fillBar) {
            const barNode = this.node.getChildByName('ProgressBarKraken')?.getChildByName('Bar')
                ?? this.node.getChildByName('Bar');
            this.fillBar = barNode?.getComponent(Sprite) ?? null;
        }

        if (!this.progressLabel) {
            const progressNode = this.node.getChildByName('ProgressBarKraken')?.getChildByName('KrakenProgress')
                ?? this.node.getChildByName('KrakenProgress');
            this.progressLabel = progressNode?.getComponent(Label) ?? null;
        }
    }
}
