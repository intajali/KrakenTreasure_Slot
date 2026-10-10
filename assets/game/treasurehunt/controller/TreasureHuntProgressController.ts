import { EventBus } from 'db://assets/core/events/EventBus';
import { IBetSelection } from 'db://assets/core/betting/ICoinWallet';
import { TREASURE_HUNT_PROGRESS_CONFIG } from '../config/TreasureHuntProgressConfig';
import {
    TreasureHuntMeterSnapshot,
    TreasureHuntProgressEvents,
    TreasureHuntTriggeredPayload,
} from '../TreasureHuntProgressEvents';
import { TreasureHuntProgressModel } from '../model/TreasureHuntProgressModel';

export interface TreasureHuntContributionResult {
    readonly symbolsAdded: number;
    readonly triggered: boolean;
    readonly awardAmount: number;
    readonly meter: TreasureHuntMeterSnapshot;
}

export class TreasureHuntProgressController {
    constructor(private readonly model: TreasureHuntProgressModel = new TreasureHuntProgressModel()) {}

    public initialize(): void {
        this.model.initialize();
        this.model.reset();
        this.emitMeterUpdated(0);
    }

    public getSnapshot(symbolsAdded = 0): TreasureHuntMeterSnapshot {
        const requiredCount = Math.max(1, TREASURE_HUNT_PROGRESS_CONFIG.requiredCount);
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
     * Counts configured symbols in the visible reel window and advances the meter.
     * When filled, emits a separate trigger event (not part of spin payout) and resets.
     */
    public contributeFromReelWindow(
        reelWindow: readonly (readonly number[])[],
        betSelection: IBetSelection,
    ): TreasureHuntContributionResult {
        if (!TREASURE_HUNT_PROGRESS_CONFIG.enabled) {
            return {
                symbolsAdded: 0,
                triggered: false,
                awardAmount: 0,
                meter: this.getSnapshot(0),
            };
        }

        const symbolsAdded = this.countSymbols(reelWindow);
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
        const requiredCount = Math.max(1, TREASURE_HUNT_PROGRESS_CONFIG.requiredCount);

        if (this.model.getCurrentCount() >= requiredCount) {
            awardAmount = this.calculateAward(betSelection);
            triggered = true;

            const filledMeter: TreasureHuntMeterSnapshot = {
                ...this.getSnapshot(symbolsAdded),
                progress: 1,
                isFilled: true,
            };
            const payload: TreasureHuntTriggeredPayload = {
                amount: awardAmount,
                symbolsAdded,
                meter: filledMeter,
            };
            EventBus.emit(TreasureHuntProgressEvents.TreasureHuntTriggered, payload);
            EventBus.emit(TreasureHuntProgressEvents.MeterUpdated, filledMeter);

            this.model.reset();
            const resetMeter = this.getSnapshot(0);
            EventBus.emit(TreasureHuntProgressEvents.MeterUpdated, resetMeter);

            return { symbolsAdded, triggered, awardAmount, meter: resetMeter };
        }

        const meter = this.getSnapshot(symbolsAdded);
        EventBus.emit(TreasureHuntProgressEvents.MeterUpdated, meter);
        return { symbolsAdded, triggered, awardAmount, meter };
    }

    private calculateAward(betSelection: IBetSelection): number {
        const multiplier = Math.max(0, TREASURE_HUNT_PROGRESS_CONFIG.awardPayoutMultiplier);
        return Math.floor(betSelection.betAmount * betSelection.multiplier * multiplier);
    }

    private countSymbols(reelWindow: readonly (readonly number[])[]): number {
        const symbolId = TREASURE_HUNT_PROGRESS_CONFIG.symbolId;
        return reelWindow.reduce(
            (total, reel) => total + reel.filter(symbol => symbol === symbolId).length,
            0,
        );
    }

    private emitMeterUpdated(symbolsAdded: number): void {
        EventBus.emit(TreasureHuntProgressEvents.MeterUpdated, this.getSnapshot(symbolsAdded));
    }
}
