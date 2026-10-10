import { _decorator, Button, Label } from 'cc';
import { BaseView } from 'db://assets/core/architecture/BaseView';
import { ButtonClickBounce } from '../../ui/ButtonClickBounce';
import { EventBus } from 'db://assets/core/events/EventBus';
import {
    DailyRewardsEvents,
    DailyRewardsSnapshot,
} from '../DailyRewardsEvents';
const { ccclass, property } = _decorator;

export type DailyRewardsClaimHandler = () => void;

@ccclass('DailyRewardsView')
export class DailyRewardsView extends BaseView {
    @property({ type: Label, tooltip: 'Countdown label under Timer/Time.' })
    timerLabel: Label | null = null;

    @property({ type: Button, tooltip: 'Claim button on Timer node.' })
    claimButton: Button | null = null;

    @property({ type: Label, tooltip: 'Optional title/status label.' })
    titleLabel: Label | null = null;

    private claimHandler: DailyRewardsClaimHandler | null = null;
    private latestSnapshot: DailyRewardsSnapshot | null = null;

    private readonly onUpdated = (snapshot: DailyRewardsSnapshot) => this.applySnapshot(snapshot);
    private readonly onClaimClicked = () => {
        this.claimHandler?.();
    };

    protected update(_dt: number): void {
        if (this.latestSnapshot) {
            this.refreshTimerText(this.latestSnapshot);
        }
    }

    protected onDestroy(): void {
        this.dispose();
    }

    protected onInitialize(): void {
        this.resolveBindings();
        EventBus.on(DailyRewardsEvents.Updated, this.onUpdated);
        if (this.claimButton) {
            ButtonClickBounce.ensure(this.claimButton.node);
            this.claimButton.node.on(Button.EventType.CLICK, this.onClaimClicked, this);
        }
    }

    protected onDispose(): void {
        EventBus.off(DailyRewardsEvents.Updated, this.onUpdated);
        this.claimButton?.node.off(Button.EventType.CLICK, this.onClaimClicked, this);
        this.claimHandler = null;
    }

    public setClaimHandler(handler: DailyRewardsClaimHandler | null): void {
        this.claimHandler = handler;
    }

    public applySnapshot(snapshot: DailyRewardsSnapshot): void {
        this.latestSnapshot = snapshot;
        this.refreshTimerText(snapshot);
        this.refreshTitle(snapshot);

        if (this.claimButton) {
            this.claimButton.interactable = snapshot.canClaim || snapshot.msUntilNextClaim <= 0;
        }
    }

    private refreshTitle(snapshot: DailyRewardsSnapshot): void {
        if (!this.titleLabel) {
            return;
        }

        if (snapshot.nextClaimDayIndex < 0) {
            this.titleLabel.string = 'DAILY REWARDS';
            return;
        }

        const dayNumber = snapshot.nextClaimDayIndex + 1;
        this.titleLabel.string = snapshot.canClaim
            ? `DAY ${dayNumber} • ${snapshot.nextClaimAmount}`
            : `DAY ${dayNumber}/${snapshot.weekLengthDays}`;
    }

    private refreshTimerText(snapshot: DailyRewardsSnapshot): void {
        if (!this.timerLabel) {
            return;
        }

        const remainingMs = Math.max(0, snapshot.nextClaimAtMs - Date.now());
        if (remainingMs <= 0 && snapshot.nextClaimDayIndex >= 0) {
            this.timerLabel.string = 'CLAIM';
            if (this.claimButton) {
                this.claimButton.interactable = true;
            }
            return;
        }

        if (snapshot.nextClaimDayIndex < 0) {
            this.timerLabel.string = this.formatDuration(snapshot.weekEndsInMs);
            return;
        }

        this.timerLabel.string = this.formatDuration(remainingMs);
    }

    private formatDuration(ms: number): string {
        const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
    }

    private pad(value: number): string {
        return value < 10 ? `0${value}` : `${value}`;
    }

    private resolveBindings(): void {
        if (!this.claimButton) {
            const timerNode = this.node.getChildByName('Timer');
            this.claimButton = timerNode?.getComponent(Button) ?? null;
        }

        if (!this.timerLabel) {
            const timeNode = this.node.getChildByName('Timer')?.getChildByName('Time')
                ?? this.node.getChildByName('Time');
            this.timerLabel = timeNode?.getComponent(Label) ?? null;
        }

        if (!this.titleLabel) {
            const labelNode = this.node.getChildByName('Label');
            this.titleLabel = labelNode?.getComponent(Label) ?? null;
        }
    }
}
