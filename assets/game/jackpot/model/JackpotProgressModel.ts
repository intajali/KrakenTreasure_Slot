import { BaseModel } from 'db://assets/core/architecture/BaseModel';
import { JACKPOT_CONFIG } from '../config/JackpotConfig';

export class JackpotProgressModel extends BaseModel {
    private currentValue = JACKPOT_CONFIG.seedValue;

    public getCurrentValue(): number {
        return this.currentValue;
    }

    public setCurrentValue(value: number): void {
        this.currentValue = Math.max(0, value);
    }

    public addContribution(amount: number): number {
        const contribution = Math.max(0, amount);
        this.currentValue += contribution;
        return contribution;
    }

    public resetToSeed(seedValue: number = JACKPOT_CONFIG.seedValue): void {
        this.currentValue = Math.max(0, seedValue);
    }

    public getProgress(seedValue: number, triggerValue: number): number {
        const span = Math.max(0, triggerValue - seedValue);
        if (span <= 0) {
            return this.currentValue >= triggerValue ? 1 : 0;
        }

        return Math.min(1, Math.max(0, (this.currentValue - seedValue) / span));
    }

    public override reset(): void {
        this.resetToSeed();
    }
}
