import { _decorator, Button, Label, Sprite, Vec3, AudioClip } from 'cc';
import { BaseItemView } from 'db://assets/core/architecture/BaseItemView';
import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { AudioController } from '../../audio/AudioController';
import { AudioIds } from '../../audio/AudioIds';
import { ButtonClickBounce } from '../../ui/ButtonClickBounce';
import { UiTween } from '../../ui/UiTween';
import { formatTreasureHuntReward, TreasureHuntReward } from '../config/TreasureHuntRewardRoller';

const { ccclass, property } = _decorator;

export interface TreasureItemData {
    treasureId: string;
    reward: TreasureHuntReward;
    claimLabelText?: string;
}

@ccclass('TreasureItemView')
export class TreasureItemView extends BaseItemView<TreasureItemData> {
    @property(Button)
    treasureClaimButton: Button | null = null;

    @property({ type: Label, tooltip: 'Collect label before reveal; reward text after.' })
    claimLabel: Label | null = null;

    @property(Sprite)
    treasureBoxSprite: Sprite | null = null;

    private treasureId = '';
    private revealed = false;

    protected onInitialize(): void {
        super.onInitialize();
        if (this.treasureClaimButton) {
            ButtonClickBounce.ensure(this.treasureClaimButton.node);
            this.treasureClaimButton.node.on(Button.EventType.CLICK, this.onTreasureClaimButtonClick, this);
        }
    }

    protected onSetData(data: TreasureItemData, _index: number): void {
        this.treasureId = data.treasureId;
        this.revealed = false;
        this.setClaimEnabled(true);
        if (this.claimLabel) {
            this.claimLabel.string = data.claimLabelText ?? 'COLLECT';
        }
        this.node.active = true;
    }

    public reveal(): void {
        if (this.revealed || !this.data) {
            return;
        }
        this.revealed = true;
        this.setClaimEnabled(false);
        if (this.claimLabel) {
            this.claimLabel.string = formatTreasureHuntReward(this.data.reward);
        }
    }

    public setClaimEnabled(enabled: boolean): void {
        if (this.treasureClaimButton) {
            this.treasureClaimButton.interactable = enabled && !this.revealed;
        }
    }

    protected onDispose(): void {
        this.treasureClaimButton?.node.off(Button.EventType.CLICK, this.onTreasureClaimButtonClick, this);
        super.onDispose();
    }

    private onTreasureClaimButtonClick(): void {
        if (this.revealed || !this.data) {
            return;
        }
        this.playClickAnimation();
        EventBus.emit(SlotEvents.ClaimTreasure, this.treasureId);
    }

    private playClickAnimation(): void {
        UiTween.bounce(this.treasureClaimButton?.node, {
            peakScale: 1.1,
            upDuration: 0.1,
            downDuration: 0.1,
        });
        AudioController.playSfx(AudioIds.UiClick);
    }
}
