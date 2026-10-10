import { BaseModel } from 'db://assets/core/architecture/BaseModel';

export class TreasureHuntProgressModel extends BaseModel {
    private currentCount = 0;

    public getCurrentCount(): number {
        return this.currentCount;
    }

    public setCurrentCount(count: number): void {
        this.currentCount = Math.max(0, Math.floor(count));
    }

    public addSymbols(count: number): number {
        const added = Math.max(0, Math.floor(count));
        this.currentCount += added;
        return added;
    }

    public reset(): void {
        this.currentCount = 0;
    }

    public getProgress(requiredCount: number): number {
        if (requiredCount <= 0) {
            return this.currentCount > 0 ? 1 : 0;
        }

        return Math.min(1, Math.max(0, this.currentCount / requiredCount));
    }
}
