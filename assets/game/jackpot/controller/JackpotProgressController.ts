import { EventBus } from 'db://assets/core/events/EventBus';
import { JACKPOT_CONFIG } from '../config/JackpotConfig';
import {
    JackpotEvents,
    JackpotMeterSnapshot,
    JackpotTriggeredPayload,
} from '../JackpotEvents';
import { JackpotProgressModel } from '../model/JackpotProgressModel';

export interface JackpotContributionResult {
    readonly contribution: number;
    readonly triggered: boolean;
    readonly awardAmount: number;
    readonly meter: JackpotMeterSnapshot;
}

export class JackpotProgressController {
    private pendingAwardAmount = 0;

    constructor(private readonly model: JackpotProgressModel = new JackpotProgressModel()) {}

    public initialize(): void {
        this.model.initialize();
        this.model.resetToSeed(JACKPOT_CONFIG.seedValue);
        this.pendingAwardAmount = 0;
        this.emitMeterUpdated(0);
    }

    public getSnapshot(contribution = 0): JackpotMeterSnapshot {
        const seedValue = JACKPOT_CONFIG.seedValue;
        const triggerValue = JACKPOT_CONFIG.triggerValue;
        const currentValue = this.model.getCurrentValue();
        const progress = this.model.getProgress(seedValue, triggerValue);

        return {
            currentValue,
            seedValue,
            triggerValue,
            progress,
            contribution,
            isFilled: currentValue >= triggerValue,
        };
    }

    public getPendingAwardAmount(): number {
        return this.pendingAwardAmount;
    }

    /**
     * Adds a percentage of the charged spin cost to the progressive pot.
     * When the meter reaches triggerValue it stays full until the jackpot feature opens.
     */
    public contributeFromSpinCost(spinCost: number): JackpotContributionResult {
        if (!JACKPOT_CONFIG.enabled || spinCost <= 0) {
            return {
                contribution: 0,
                triggered: false,
                awardAmount: 0,
                meter: this.getSnapshot(0),
            };
        }

        // Already triggered and waiting for feature entry — keep bar full, ignore new fills.
        if (this.pendingAwardAmount > 0) {
            const filledMeter = this.getFilledSnapshot(0);
            return {
                contribution: 0,
                triggered: false,
                awardAmount: 0,
                meter: filledMeter,
            };
        }

        const contribution = spinCost * Math.max(0, JACKPOT_CONFIG.contributionPercent);
        this.model.addContribution(contribution);

        if (this.model.getCurrentValue() >= JACKPOT_CONFIG.triggerValue) {
            const awardAmount = Math.floor(this.model.getCurrentValue());
            this.pendingAwardAmount += awardAmount;
            // Hold the bar at full until the jackpot feature is entered.
            this.model.setCurrentValue(JACKPOT_CONFIG.triggerValue);

            const filledMeter = this.getFilledSnapshot(contribution);
            const payload: JackpotTriggeredPayload = { amount: awardAmount, meter: filledMeter };
            EventBus.emit(JackpotEvents.JackpotTriggered, payload);
            EventBus.emit(JackpotEvents.MeterUpdated, filledMeter);

            return {
                contribution,
                triggered: true,
                awardAmount,
                meter: filledMeter,
            };
        }

        const meter = this.getSnapshot(contribution);
        EventBus.emit(JackpotEvents.MeterUpdated, meter);
        return { contribution, triggered: false, awardAmount: 0, meter };
    }

    /** Claims any pot award queued by a filled meter (usually during presentation). */
    public claimPendingAward(): number {
        const amount = Math.max(0, Math.floor(this.pendingAwardAmount));
        this.pendingAwardAmount = 0;

        if (amount > 0) {
            EventBus.emit(JackpotEvents.JackpotAwarded, {
                amount,
                meter: this.getSnapshot(0),
            });
        }

        return amount;
    }

    /**
     * Resets the progress bar after the jackpot feature has been entered.
     */
    public resetMeter(): void {
        this.model.resetToSeed(JACKPOT_CONFIG.seedValue);
        this.emitMeterUpdated(0);
    }

    private getFilledSnapshot(contribution: number): JackpotMeterSnapshot {
        return {
            ...this.getSnapshot(contribution),
            progress: 1,
            isFilled: true,
            currentValue: JACKPOT_CONFIG.triggerValue,
        };
    }

    private emitMeterUpdated(contribution: number): void {
        EventBus.emit(JackpotEvents.MeterUpdated, this.getSnapshot(contribution));
    }
}
