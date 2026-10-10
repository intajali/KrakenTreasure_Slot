import dailyRewardsConfigData from 'db://assets/resources/dailyRewards/DailyRewardsConfig.json';

export interface DailyRewardsConfig {
    readonly enabled: boolean;
    /** Number of daily awards generated per week cycle. */
    readonly weekLengthDays: number;
    /** Minimum wait between claims (typically 24h). */
    readonly claimIntervalMs: number;
    readonly storageKey: string;
    /** Base awards for day 1..N. Recalculated/frozen each week start. */
    readonly dayRewards: readonly number[];
}

export const DAILY_REWARDS_CONFIG = dailyRewardsConfigData as DailyRewardsConfig;
