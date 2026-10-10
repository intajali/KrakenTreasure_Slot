import { IBetSelection } from 'db://assets/core/betting/ICoinWallet';
import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { ISpinResult } from 'db://assets/core/slot/interfaces/ISpinResult';
import { BetEvents } from '../betting/BetEvents';
import { KrakenProgressController } from '../kraken/controller/KrakenProgressController';
import { KrakenProgressEvents, KrakenTriggeredPayload } from '../kraken/KrakenProgressEvents';
import { TreasureHuntProgressController } from '../treasurehunt/controller/TreasureHuntProgressController';
import {
    TreasureHuntAwardedPayload,
    TreasureHuntProgressEvents,
    TreasureHuntTriggeredPayload,
} from '../treasurehunt/TreasureHuntProgressEvents';

export interface ProgressFeatureCreditSink {
    creditWin(amount: number): void;
    getBalance(): number;
    grantFreeSpins(count: number): void;
}

/** Contributes reel symbols to progress meters and credits awards on trigger. */
export class ProgressFeatureCoordinator {
    private readonly handleWinEvaluated = (result: ISpinResult) => this.onWinEvaluated(result);
    private readonly handleKrakenTriggered = (payload: KrakenTriggeredPayload) =>
        this.onProgressFeatureTriggered('kraken', payload.amount);
    private readonly handleTreasureHuntTriggered = (payload: TreasureHuntTriggeredPayload) =>
        this.onTreasureHuntTriggered(payload);
    private readonly handleTreasureHuntAwarded = (payload: TreasureHuntAwardedPayload) =>
        this.onTreasureHuntAwarded(payload);

    constructor(
        private readonly krakenProgress: KrakenProgressController,
        private readonly treasureHuntProgress: TreasureHuntProgressController,
        private readonly creditSink: ProgressFeatureCreditSink,
        private readonly getBetSelection: () => IBetSelection,
        private readonly isFreeSpinActive: () => boolean = () => false,
        private readonly markPendingTreasureHunt: () => void = () => undefined,
    ) {}

    public register(): void {
        EventBus.on<ISpinResult>(SlotEvents.WinEvaluated, this.handleWinEvaluated);
       // EventBus.on(KrakenProgressEvents.KrakenTriggered, this.handleKrakenTriggered);
        EventBus.on(TreasureHuntProgressEvents.TreasureHuntTriggered, this.handleTreasureHuntTriggered);
        EventBus.on(TreasureHuntProgressEvents.TreasureHuntAwarded, this.handleTreasureHuntAwarded);
    }

    public unregister(): void {
        EventBus.off<ISpinResult>(SlotEvents.WinEvaluated, this.handleWinEvaluated);
       // EventBus.off(KrakenProgressEvents.KrakenTriggered, this.handleKrakenTriggered);
        EventBus.off(TreasureHuntProgressEvents.TreasureHuntTriggered, this.handleTreasureHuntTriggered);
        EventBus.off(TreasureHuntProgressEvents.TreasureHuntAwarded, this.handleTreasureHuntAwarded);
    }

    private onWinEvaluated(result: ISpinResult): void {
        const betSelection = this.getBetSelection();
       // this.krakenProgress.contributeFromReelWindow(result.reelWindow, betSelection);

        // Treasure hunt meter / awards are base-game only.
        if (!this.isFreeSpinActive()) {
            this.treasureHuntProgress.contributeFromReelWindow(result.reelWindow, betSelection);
        }
    }

    private onTreasureHuntTriggered(payload: TreasureHuntTriggeredPayload): void {
        if (this.isFreeSpinActive()) {
            return;
        }

        this.markPendingTreasureHunt();
    }

    private onTreasureHuntAwarded(payload: TreasureHuntAwardedPayload): void {
        if (payload.kind === 'freeSpins' && payload.freeSpinCount > 0) {
            this.creditSink.grantFreeSpins(payload.freeSpinCount);
            return;
        }

        this.onProgressFeatureTriggered('treasureHunt', payload.coinAmount);
    }

    private onProgressFeatureTriggered(source: 'kraken' | 'treasureHunt', amount: number): void {
        if (amount <= 0) {
            return;
        }

        this.creditSink.creditWin(amount);
        EventBus.emit(BetEvents.WinCredited, {
            amount,
            balance: this.creditSink.getBalance(),
            source,
        });
        EventBus.emit(SlotEvents.BalanceUpdated, { balance: this.creditSink.getBalance() });
    }
}
