import { _decorator, Label } from 'cc';
import { BaseView } from 'db://assets/core/architecture/BaseView';
import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { BetEvents } from '../../betting/BetEvents';
const { ccclass, property } = _decorator;

@ccclass('CreditBetHudView')
export class CreditBetHudView extends BaseView {
    @property({ type: Label, tooltip: 'Displays available credit.' })
    creditValue: Label | null = null;

    @property({ type: Label, tooltip: 'Displays selected total bet.' })
    totalBetValue: Label | null = null;

    @property({ type: Label, tooltip: 'Optional selected bet display.' })
    betValue: Label | null = null;

    @property({ type: Label, tooltip: 'Optional selected multiplier display.' })
    multiplierValue: Label | null = null;

    protected onDestroy(): void {
        this.dispose();
    }

    protected onInitialize(): void {
        EventBus.on(SlotEvents.BalanceUpdated, this.onBalanceUpdated);
        EventBus.on(BetEvents.BetChanged, this.onBetChanged);
        EventBus.on(BetEvents.MultiplierChanged, this.onBetChanged);
        EventBus.on(BetEvents.SpinCostDebited, this.onSpinCostDebited);
        EventBus.on(BetEvents.WinCredited, this.onWinCredited);
    }

    protected onDispose(): void {
        EventBus.off(SlotEvents.BalanceUpdated, this.onBalanceUpdated);
        EventBus.off(BetEvents.BetChanged, this.onBetChanged);
        EventBus.off(BetEvents.MultiplierChanged, this.onBetChanged);
        EventBus.off(BetEvents.SpinCostDebited, this.onSpinCostDebited);
        EventBus.off(BetEvents.WinCredited, this.onWinCredited);
    }

    public refreshHud(balance: number, betAmount: number, multiplier: number, spinCost: number): void {
        this.refreshCredit(balance);
        this.refreshBet(betAmount, multiplier, spinCost);
    }

    public refreshCredit(balance: number): void {
        if (this.creditValue) {
            this.creditValue.string = `${Math.floor(balance)}`;
        }
    }

    public refreshBet(betAmount: number, multiplier: number, spinCost: number): void {
        if (this.betValue) {
            this.betValue.string = `${betAmount}`;
        }
        if (this.multiplierValue) {
            this.multiplierValue.string = `x${multiplier}`;
        }
        this.refreshTotalBet(spinCost);
    }

    public refreshTotalBet(spinCost: number): void {
        if (this.totalBetValue) {
            this.totalBetValue.string = `${spinCost}`;
        }
    }

    private onBalanceUpdated = (payload: { balance: number }): void => {
        this.refreshCredit(payload.balance);
    };

    private onBetChanged = (payload: { betAmount: number; multiplier: number; spinCost: number }): void => {
        this.refreshBet(payload.betAmount, payload.multiplier, payload.spinCost);
    };

    private onSpinCostDebited = (payload: { spinCost: number; balance: number }): void => {
        this.refreshCredit(payload.balance);
        this.refreshTotalBet(payload.spinCost);
    };

    private onWinCredited = (payload: { balance?: number }): void => {
        if (typeof payload.balance === 'number') {
            this.refreshCredit(payload.balance);
        }
    };
}
