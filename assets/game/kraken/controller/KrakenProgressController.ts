import { EventBus } from 'db://assets/core/events/EventBus';
import { IBetSelection } from 'db://assets/core/betting/ICoinWallet';
import { KRAKEN_PROGRESS_CONFIG } from '../config/KrakenProgressConfig';
import {
    KrakenMeterSnapshot,
    KrakenProgressEvents,
    KrakenTriggeredPayload,
} from '../KrakenProgressEvents';
import { KrakenProgressModel } from '../model/KrakenProgressModel';

export interface KrakenContributionResult {
    readonly symbolsAdded: number;
    readonly triggered: boolean;
    readonly awardAmount: number;
    readonly meter: KrakenMeterSnapshot;
}

export class KrakenProgressController {
    constructor(private readonly model: KrakenProgressModel = new KrakenProgressModel()) {}

    public initialize(): void {
        this.model.initialize();
        this.model.reset();
        this.emitMeterUpdated(0);
    }

    public getSnapshot(symbolsAdded = 0): KrakenMeterSnapshot {
        const requiredCount = Math.max(1, KRAKEN_PROGRESS_CONFIG.requiredCount);
        const currentCount = this.model.getCurrentCount();

        return {
            currentCount,
            requiredCount,
            progress: this.model.getProgress(requiredCount),
            symbolsAdded,
            isFilled: currentCount >= requiredCount,
        };
    }

    /**
     * Counts Kraken symbols in the visible reel window and advances the meter.
     * When filled, emits a separate trigger event (not part of spin payout) and resets.
     */
    public contributeFromReelWindow(
        reelWindow: readonly (readonly number[])[],
        betSelection: IBetSelection,
    ): KrakenContributionResult {
        if (!KRAKEN_PROGRESS_CONFIG.enabled) {
            return {
                symbolsAdded: 0,
                triggered: false,
                awardAmount: 0,
                meter: this.getSnapshot(0),
            };
        }

        const symbolsAdded = this.countKrakenSymbols(reelWindow);
        if (symbolsAdded <= 0) {
            return {
                symbolsAdded: 0,
                triggered: false,
                awardAmount: 0,
                meter: this.getSnapshot(0),
            };
        }

        this.model.addSymbols(symbolsAdded);

        let triggered = false;
        let awardAmount = 0;
        const requiredCount = Math.max(1, KRAKEN_PROGRESS_CONFIG.requiredCount);

        if (this.model.getCurrentCount() >= requiredCount) {
            awardAmount = this.calculateAward(betSelection);
            triggered = true;

            const filledMeter: KrakenMeterSnapshot = {
                ...this.getSnapshot(symbolsAdded),
                progress: 1,
                isFilled: true,
            };
            const payload: KrakenTriggeredPayload = {
                amount: awardAmount,
                symbolsAdded,
                meter: filledMeter,
            };
            EventBus.emit(KrakenProgressEvents.KrakenTriggered, payload);
            EventBus.emit(KrakenProgressEvents.MeterUpdated, filledMeter);

            this.model.reset();
            const resetMeter = this.getSnapshot(0);
            EventBus.emit(KrakenProgressEvents.MeterUpdated, resetMeter);

            return { symbolsAdded, triggered, awardAmount, meter: resetMeter };
        }

        const meter = this.getSnapshot(symbolsAdded);
        EventBus.emit(KrakenProgressEvents.MeterUpdated, meter);
        return { symbolsAdded, triggered, awardAmount, meter };
    }

    private calculateAward(betSelection: IBetSelection): number {
        const multiplier = Math.max(0, KRAKEN_PROGRESS_CONFIG.awardPayoutMultiplier);
        return Math.floor(betSelection.betAmount * betSelection.multiplier * multiplier);
    }

    private countKrakenSymbols(reelWindow: readonly (readonly number[])[]): number {
        const symbolId = KRAKEN_PROGRESS_CONFIG.symbolId;
        return reelWindow.reduce(
            (total, reel) => total + reel.filter(symbol => symbol === symbolId).length,
            0,
        );
    }

    private emitMeterUpdated(symbolsAdded: number): void {
        EventBus.emit(KrakenProgressEvents.MeterUpdated, this.getSnapshot(symbolsAdded));
    }
}
