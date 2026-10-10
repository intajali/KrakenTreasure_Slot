import { BaseModel } from 'db://assets/core/architecture/BaseModel';

export interface DailyRewardsPersistedState {
    weekStartMs: number;
    lastClaimMs: number;
    claimedDayIndexes: number[];
    weekAwards: number[];
}

export class DailyRewardsModel extends BaseModel {
    private weekStartMs = 0;
    private lastClaimMs = 0;
    private claimedDayIndexes: number[] = [];
    private weekAwards: number[] = [];

    public getWeekStartMs(): number {
        return this.weekStartMs;
    }

    public getLastClaimMs(): number {
        return this.lastClaimMs;
    }

    public getClaimedDayIndexes(): readonly number[] {
        return this.claimedDayIndexes;
    }

    public getWeekAwards(): readonly number[] {
        return this.weekAwards;
    }

    public isDayClaimed(dayIndex: number): boolean {
        return this.claimedDayIndexes.indexOf(dayIndex) >= 0;
    }

    public loadState(state: DailyRewardsPersistedState): void {
        this.weekStartMs = Math.max(0, state.weekStartMs);
        this.lastClaimMs = Math.max(0, state.lastClaimMs);
        this.claimedDayIndexes = [...state.claimedDayIndexes];
        this.weekAwards = [...state.weekAwards];
    }

    public startNewWeek(weekStartMs: number, weekAwards: readonly number[], lastClaimMs = 0): void {
        this.weekStartMs = weekStartMs;
        this.lastClaimMs = Math.max(0, lastClaimMs);
        this.claimedDayIndexes = [];
        this.weekAwards = [...weekAwards];
    }

    public markClaimed(dayIndex: number, claimMs: number): void {
        if (!this.isDayClaimed(dayIndex)) {
            this.claimedDayIndexes.push(dayIndex);
        }
        this.lastClaimMs = claimMs;
    }

    public toPersistedState(): DailyRewardsPersistedState {
        return {
            weekStartMs: this.weekStartMs,
            lastClaimMs: this.lastClaimMs,
            claimedDayIndexes: [...this.claimedDayIndexes],
            weekAwards: [...this.weekAwards],
        };
    }

    public override reset(): void {
        this.weekStartMs = 0;
        this.lastClaimMs = 0;
        this.claimedDayIndexes = [];
        this.weekAwards = [];
    }
}
