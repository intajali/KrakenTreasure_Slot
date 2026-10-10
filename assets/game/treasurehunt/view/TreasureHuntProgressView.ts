import { _decorator, Label, Sprite } from 'cc';
import { BaseView } from 'db://assets/core/architecture/BaseView';
import { EventBus } from 'db://assets/core/events/EventBus';
import {
    TreasureHuntMeterSnapshot,
    TreasureHuntOpenPayload,
    TreasureHuntProgressEvents,
    TreasureHuntTriggeredPayload,
} from '../TreasureHuntProgressEvents';
import { TREASURE_HUNT_PROGRESS_CONFIG } from '../config/TreasureHuntProgressConfig';
import { rollTreasureHuntRewards } from '../config/TreasureHuntRewardRoller';
import { ParticleController } from '../../particles/ParticleController';
import { ParticleIds } from '../../particles/ParticleIds';
import { TreasureHuntPopupView } from './TreasureHuntPopupView';
import { TreasureItemData } from './TreasureItemView';
const { ccclass, property } = _decorator;

@ccclass('TreasureHuntProgressView')
export class TreasureHuntProgressView extends BaseView {
    @property({ type: Sprite, tooltip: 'Filled sprite under ProgressBarTreasure/Bar.' })
    fillBar: Sprite | null = null;

    @property({ type: Label, tooltip: 'Count label under ProgressBarTreasure/TreasureProgress.' })
    progressLabel: Label | null = null;

    @property({ type: TreasureHuntPopupView, tooltip: 'Opened when the treasure hunt meter completes.' })
    treasureHuntPopupView: TreasureHuntPopupView | null = null;

    private readonly onMeterUpdated = (snapshot: TreasureHuntMeterSnapshot) => {
        this.applySnapshot(snapshot);
    };

    private readonly onTreasureHuntTriggered = (_payload: TreasureHuntTriggeredPayload) => {
        ParticleController.play(ParticleIds.BarFilledTreasureHunt);
    };

    private readonly onOpenRequested = (payload?: TreasureHuntOpenPayload) => {
        this.openTreasureHuntPopup(payload);
    };

    protected onDestroy(): void {
        this.dispose();
    }

    protected onInitialize(): void {
        this.resolveBindings();
        EventBus.on(TreasureHuntProgressEvents.MeterUpdated, this.onMeterUpdated);
        EventBus.on(TreasureHuntProgressEvents.TreasureHuntTriggered, this.onTreasureHuntTriggered);
        EventBus.on(TreasureHuntProgressEvents.OpenRequested, this.onOpenRequested);
    }

    protected onDispose(): void {
        EventBus.off(TreasureHuntProgressEvents.MeterUpdated, this.onMeterUpdated);
        EventBus.off(TreasureHuntProgressEvents.TreasureHuntTriggered, this.onTreasureHuntTriggered);
        EventBus.off(TreasureHuntProgressEvents.OpenRequested, this.onOpenRequested);
    }

    public setTreasureHuntPopupView(popupView: TreasureHuntPopupView | null): void {
        this.treasureHuntPopupView = popupView;
    }

    public applySnapshot(snapshot: TreasureHuntMeterSnapshot): void {
        if (this.fillBar) {
            this.fillBar.type = Sprite.Type.FILLED;
            this.fillBar.fillType = Sprite.FillType.HORIZONTAL;
            this.fillBar.fillStart = 0;
            this.fillBar.fillRange = Math.min(1, Math.max(0, snapshot.progress));
        }

        if (this.progressLabel) {
            this.progressLabel.string = snapshot.currentCount + ' / ' + snapshot.requiredCount;
        }
    }

    private openTreasureHuntPopup(payload?: TreasureHuntOpenPayload): void {
        const popupView = this.treasureHuntPopupView;
        if (!popupView) {
            return;
        }

        popupView.initialize();

        const choiceCount = Math.max(1, TREASURE_HUNT_PROGRESS_CONFIG.choiceCount || 3);
        const betAmount = payload && payload.betAmount ? payload.betAmount : 1;
        const multiplier = payload && payload.multiplier ? payload.multiplier : 1;
        const rewards = rollTreasureHuntRewards(betAmount, multiplier);
        const items: TreasureItemData[] = [];
        const limit = Math.min(choiceCount, rewards.length);
        for (let index = 0; index < limit; index++) {
            items.push({
                treasureId: String(index + 1),
                reward: rewards[index],
            });
        }
        popupView.open(items);
    }

    private resolveBindings(): void {
        if (!this.fillBar) {
            const progressBar = this.node.getChildByName('ProgressBarTreasure');
            const barNode = progressBar
                ? progressBar.getChildByName('Bar')
                : this.node.getChildByName('Bar');
            this.fillBar = barNode ? barNode.getComponent(Sprite) : null;
        }

        if (!this.progressLabel) {
            const progressBar = this.node.getChildByName('ProgressBarTreasure');
            const progressNode = progressBar
                ? progressBar.getChildByName('TreasureProgress')
                : this.node.getChildByName('TreasureProgress');
            this.progressLabel = progressNode ? progressNode.getComponent(Label) : null;
        }
    }
}
