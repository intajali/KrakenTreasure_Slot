export const DailyRewardsEvents = {
    Updated: 'daily_rewards_updated',
    Claimed: 'daily_rewards_claimed',
    WeekReset: 'daily_rewards_week_reset',
} as const;

export type DailyRewardsEvent = typeof DailyRewardsEvents[keyof typeof DailyRewardsEvents];

export interface DailyRewardDayInfo {
    readonly dayIndex: number;
    readonly awardAmount: number;
    readonly isClaimed: boolean;
    readonly isCurrent: boolean;
}

export interface DailyRewardsSnapshot {
    readonly weekAwards: readonly number[];
    readonly days: readonly DailyRewardDayInfo[];
    readonly nextClaimDayIndex: number;
    readonly nextClaimAmount: number;
    readonly canClaim: boolean;
    readonly msUntilNextClaim: number;
    /** Absolute timestamp when the next claim becomes available. */
    readonly nextClaimAtMs: number;
    readonly weekEndsInMs: number;
    readonly claimedCount: number;
    readonly weekLengthDays: number;
}

export interface DailyRewardsClaimedPayload {
    readonly dayIndex: number;
    readonly amount: number;
    readonly snapshot: DailyRewardsSnapshot;
}
