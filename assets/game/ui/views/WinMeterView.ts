import { _decorator, Label } from 'cc';
import { BaseView } from 'db://assets/core/architecture/BaseView';
import { SlotGameState } from 'db://assets/core/enums/SlotGameState';
import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
const { ccclass, property } = _decorator;

@ccclass('WinMeterView')
export class WinMeterView extends BaseView {
    @property({ type: Label, tooltip: 'Displays latest win amount.' })
    winValue: Label | null = null;

    @property({ tooltip: 'Duration in seconds for win amount count-up animation.' })
    winCounterDurationSec = 0.6;

    private lastWinAmount = 0;
    private winCounterStartValue = 0;
    private winCounterTargetValue = 0;
    private winCounterElapsedSec = 0;
    private winCounterDurationCurrentSec = 0;
    private isWinCounterActive = false;

    protected onDestroy(): void {
        this.dispose();
    }

    protected update(dt: number): void {
        this.updateWinCounter(dt);
    }

    protected onInitialize(): void {
        EventBus.on(SlotEvents.StateChanged, this.onStateChanged);
        EventBus.on(SlotEvents.WinPresented, this.onWinPresented);
        EventBus.on(SlotEvents.WinLinePresented, this.onWinLinePresented);
        EventBus.on(SlotEvents.WinPresentationComplete, this.onWinPresentationComplete);
        EventBus.on(SlotEvents.FreeSpinEnded, this.onFreeSpinEnded);
    }

    protected onDispose(): void {
        EventBus.off(SlotEvents.StateChanged, this.onStateChanged);
        EventBus.off(SlotEvents.WinPresented, this.onWinPresented);
        EventBus.off(SlotEvents.WinLinePresented, this.onWinLinePresented);
        EventBus.off(SlotEvents.WinPresentationComplete, this.onWinPresentationComplete);
        EventBus.off(SlotEvents.FreeSpinEnded, this.onFreeSpinEnded);
    }

    public refresh(): void {
        this.refreshWinAmount();
    }

    public setWinAmount(amount: number): void {
        const targetAmount = Math.max(0, Math.floor(amount));
        if (targetAmount <= 0 || this.winCounterDurationSec <= 0) {
            this.setWinAmountImmediate(targetAmount);
            return;
        }

        if (this.winCounterTargetValue === targetAmount && (this.isWinCounterActive || this.lastWinAmount === targetAmount)) {
            return;
        }

        this.winCounterStartValue = this.lastWinAmount;
        this.winCounterTargetValue = targetAmount;
        this.winCounterElapsedSec = 0;
        this.winCounterDurationCurrentSec = Math.max(0.01, this.winCounterDurationSec);
        this.isWinCounterActive = true;
        this.refreshWinAmount();
    }

    public setWinAmountImmediate(amount: number): void {
        this.isWinCounterActive = false;
        this.lastWinAmount = Math.max(0, Math.floor(amount));
        this.winCounterTargetValue = this.lastWinAmount;
        this.refreshWinAmount();
    }

    private onStateChanged = (payload: { state: SlotGameState }): void => {
        if (payload.state === SlotGameState.Spinning) {
            this.setWinAmountImmediate(0);
        }
    };

    private onWinPresented = (payload: { totalWin: number }): void => {
        if (payload.totalWin <= 0) {
            this.setWinAmount(0);
        }
    };

    private onWinLinePresented = (payload: { payout: number; cumulativePayout?: number }): void => {
        this.setWinAmount(payload.cumulativePayout ?? payload.payout);
    };

    private onWinPresentationComplete = (payload: { totalWin: number }): void => {
        const targetAmount = Math.max(0, Math.floor(payload.totalWin));
        if (
            targetAmount === this.winCounterTargetValue
            || (targetAmount === this.lastWinAmount && !this.isWinCounterActive)
        ) {
            this.setWinAmountImmediate(targetAmount);
            return;
        }

        this.setWinAmount(targetAmount);
    };

    private onFreeSpinEnded = (): void => {
        // Free-spin total is credited to the balance meter; clear base-game win.
        this.setWinAmountImmediate(0);
    };

    private refreshWinAmount(): void {
        if (this.winValue) {
            this.winValue.string = `${this.lastWinAmount}`;
        }
    }

    private updateWinCounter(dt: number): void {
        if (!this.isWinCounterActive) {
            return;
        }

        this.winCounterElapsedSec += dt;
        const progress = Math.min(1, this.winCounterElapsedSec / this.winCounterDurationCurrentSec);
        this.lastWinAmount = Math.floor(
            this.winCounterStartValue
            + (this.winCounterTargetValue - this.winCounterStartValue) * progress,
        );
        this.refreshWinAmount();

        if (progress >= 1) {
            this.setWinAmountImmediate(this.winCounterTargetValue);
        }
    }
}
