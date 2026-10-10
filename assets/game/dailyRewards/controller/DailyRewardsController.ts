import { EventBus } from 'db://assets/core/events/EventBus';
import { DAILY_REWARDS_CONFIG } from '../config/DailyRewardsConfig';
import {
    DailyRewardDayInfo,
    DailyRewardsClaimedPayload,
    DailyRewardsEvents,
    DailyRewardsSnapshot,
} from '../DailyRewardsEvents';
import { DailyRewardsModel } from '../model/DailyRewardsModel';
import { DailyRewardsStorage } from '../services/DailyRewardsStorage';

export class DailyRewardsController {
    constructor(
        private readonly model: DailyRewardsModel = new DailyRewardsModel(),
        private readonly storage: DailyRewardsStorage = new DailyRewardsStorage(),
    ) {}

    public initialize(nowMs: number = Date.now()): void {
        this.model.initialize();
        const saved = this.storage.load();
        if (saved && saved.weekAwards.length > 0) {
            this.model.loadState(saved);
        } else {
            this.resetWeek(nowMs);
            return;
        }

        if (this.shouldResetWeek(nowMs)) {
            this.resetWeek(nowMs);
            return;
        }

        this.emitUpdated();
    }

    public getSnapshot(nowMs: number = Date.now()): DailyRewardsSnapshot {
        this.ensureWeekCurrent(nowMs);

        const weekLengthDays = this.getWeekLengthDays();
        const weekAwards = this.model.getWeekAwards();
        const nextClaimDayIndex = this.getNextClaimDayIndex();
        const msUntilNextClaim = this.getMsUntilNextClaim(nowMs);
        const canClaim = nextClaimDayIndex >= 0 && msUntilNextClaim <= 0;
        const claimedCount = this.model.getClaimedDayIndexes().length;
        const nextClaimAtMs = canClaim ? nowMs : nowMs + Math.max(0, msUntilNextClaim);

        const days: DailyRewardDayInfo[] = [];
        for (let dayIndex = 0; dayIndex < weekLengthDays; dayIndex++) {
            days.push({
                dayIndex,
                awardAmount: weekAwards[dayIndex] ?? 0,
                isClaimed: this.model.isDayClaimed(dayIndex),
                isCurrent: dayIndex === nextClaimDayIndex,
            });
        }

        return {
            weekAwards,
            days,
            nextClaimDayIndex,
            nextClaimAmount: nextClaimDayIndex >= 0 ? (weekAwards[nextClaimDayIndex] ?? 0) : 0,
            canClaim,
            msUntilNextClaim: Math.max(0, msUntilNextClaim),
            nextClaimAtMs,
            weekEndsInMs: Math.max(0, this.getWeekEndMs() - nowMs),
            claimedCount,
            weekLengthDays,
        };
    }

    public tryClaim(nowMs: number = Date.now()): DailyRewardsClaimedPayload | null {
        if (!DAILY_REWARDS_CONFIG.enabled) {
            return null;
        }

        this.ensureWeekCurrent(nowMs);
        const snapshotBefore = this.getSnapshot(nowMs);
        if (!snapshotBefore.canClaim || snapshotBefore.nextClaimDayIndex < 0) {
            return null;
        }

        const dayIndex = snapshotBefore.nextClaimDayIndex;
        const amount = snapshotBefore.nextClaimAmount;
        this.model.markClaimed(dayIndex, nowMs);
        this.persist();

        if (this.model.getClaimedDayIndexes().length >= this.getWeekLengthDays()) {
            this.resetWeek(nowMs, true);
        } else {
            this.emitUpdated();
        }

        const payload: DailyRewardsClaimedPayload = {
            dayIndex,
            amount,
            snapshot: this.getSnapshot(nowMs),
        };
        EventBus.emit(DailyRewardsEvents.Claimed, payload);
        return payload;
    }

    private ensureWeekCurrent(nowMs: number): void {
        if (this.shouldResetWeek(nowMs)) {
            this.resetWeek(nowMs);
        }
    }

    private shouldResetWeek(nowMs: number): boolean {
        if (this.model.getWeekStartMs() <= 0 || this.model.getWeekAwards().length === 0) {
            return true;
        }

        return nowMs >= this.getWeekEndMs();
    }

    private resetWeek(nowMs: number, keepClaimCooldown = false): void {
        const weekAwards = this.calculateWeekAwards();
        this.model.startNewWeek(nowMs, weekAwards, keepClaimCooldown ? nowMs : 0);
        this.persist();
        EventBus.emit(DailyRewardsEvents.WeekReset, this.getSnapshot(nowMs));
        this.emitUpdated();
    }

    /** Builds the frozen award table for the upcoming week cycle. */
    private calculateWeekAwards(): number[] {
        const configured = DAILY_REWARDS_CONFIG.dayRewards;
        const weekLengthDays = this.getWeekLengthDays();
        const awards: number[] = [];

        for (let dayIndex = 0; dayIndex < weekLengthDays; dayIndex++) {
            const configuredAmount = configured[dayIndex] ?? configured[configured.length - 1] ?? 0;
            awards.push(Math.max(0, Math.floor(configuredAmount)));
        }

        return awards;
    }

    private getNextClaimDayIndex(): number {
        const weekLengthDays = this.getWeekLengthDays();
        for (let dayIndex = 0; dayIndex < weekLengthDays; dayIndex++) {
            if (!this.model.isDayClaimed(dayIndex)) {
                return dayIndex;
            }
        }
        return -1;
    }

    private getMsUntilNextClaim(nowMs: number): number {
        const lastClaimMs = this.model.getLastClaimMs();
        if (lastClaimMs <= 0) {
            return 0;
        }

        const claimIntervalMs = Math.max(0, DAILY_REWARDS_CONFIG.claimIntervalMs);
        return lastClaimMs + claimIntervalMs - nowMs;
    }

    private getWeekLengthDays(): number {
        return Math.max(1, DAILY_REWARDS_CONFIG.weekLengthDays || DAILY_REWARDS_CONFIG.dayRewards.length || 7);
    }

    private getWeekEndMs(): number {
        const weekMs = this.getWeekLengthDays() * Math.max(1, DAILY_REWARDS_CONFIG.claimIntervalMs);
        return this.model.getWeekStartMs() + weekMs;
    }

    private persist(): void {
        this.storage.save(this.model.toPersistedState());
    }

    private emitUpdated(): void {
        EventBus.emit(DailyRewardsEvents.Updated, this.getSnapshot());
    }
}
