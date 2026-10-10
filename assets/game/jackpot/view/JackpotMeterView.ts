import { _decorator, Label, Sprite } from 'cc';
import { BaseView } from 'db://assets/core/architecture/BaseView';
import { EventBus } from 'db://assets/core/events/EventBus';
import { ParticleController } from '../../particles/ParticleController';
import { ParticleIds } from '../../particles/ParticleIds';
import { JackpotEvents, JackpotMeterSnapshot, JackpotTriggeredPayload } from '../JackpotEvents';
const { ccclass, property } = _decorator;

@ccclass('JackpotMeterView')
export class JackpotMeterView extends BaseView {
    @property({ type: Sprite, tooltip: 'Filled sprite under ProgressBarJackpot/Bar.' })
    fillBar: Sprite | null = null;

    @property({ type: Label, tooltip: 'Percent label under ProgressBarJackpot/JackpotProgress.' })
    progressLabel: Label | null = null;

    @property({ type: Label, tooltip: 'Optional label showing the current jackpot pool value.' })
    valueLabel: Label | null = null;

    private readonly onMeterUpdated = (snapshot: JackpotMeterSnapshot) => this.applySnapshot(snapshot);

    protected onDestroy(): void {
        this.dispose();
    }

    protected onInitialize(): void {
        this.resolveBindings();
        EventBus.on(JackpotEvents.MeterUpdated, this.onMeterUpdated);
        EventBus.on(JackpotEvents.JackpotTriggered, this.onJackpotTriggered);
    }

    onJackpotTriggered(payload: JackpotTriggeredPayload) {
        ParticleController.play(ParticleIds.BarFilledJackpot);
    }

    protected onDispose(): void {
        EventBus.off(JackpotEvents.MeterUpdated, this.onMeterUpdated);
        EventBus.off(JackpotEvents.JackpotTriggered, this.onJackpotTriggered);
    }

    public applySnapshot(snapshot: JackpotMeterSnapshot): void {
        if (this.fillBar) {
            this.fillBar.type = Sprite.Type.FILLED;
            this.fillBar.fillType = Sprite.FillType.HORIZONTAL;
            this.fillBar.fillStart = 0;
            this.fillBar.fillRange = Math.min(1, Math.max(0, snapshot.progress));
        }

        if (this.progressLabel) {
            this.progressLabel.string = `${Math.floor(snapshot.progress * 100)}%`;
        }

        if (this.valueLabel) {
            this.valueLabel.string = `${Math.floor(snapshot.currentValue)}`;
        }
    }

    private resolveBindings(): void {
        if (!this.fillBar) {
            const barNode = this.node.getChildByName('ProgressBarJackpot')?.getChildByName('Bar')
                ?? this.node.getChildByName('Bar');
            this.fillBar = barNode?.getComponent(Sprite) ?? null;
        }

        if (!this.progressLabel) {
            const progressNode = this.node.getChildByName('ProgressBarJackpot')?.getChildByName('JackpotProgress')
                ?? this.node.getChildByName('JackpotProgress');
            this.progressLabel = progressNode?.getComponent(Label) ?? null;
        }
    }
}
