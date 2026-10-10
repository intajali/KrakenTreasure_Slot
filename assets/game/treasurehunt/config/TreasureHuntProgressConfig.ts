import treasureHuntProgressConfigData from 'db://assets/resources/treasurehunt/TreasureHuntProgressConfig.json';

export interface TreasureHuntProgressConfig {
    readonly enabled: boolean;
    /** Symbol id that advances the Treasure Hunt meter when it lands. */
    readonly symbolId: number;
    /** Number of landed symbols needed to fill the meter. */
    readonly requiredCount: number;
    /** Award = floor(betAmount * multiplier * awardPayoutMultiplier). */
    readonly awardPayoutMultiplier: number;
    readonly choiceCount?: number;
    /** Chance a round includes one free-spin chest. */
    readonly freeSpinChance?: number;
    readonly freeSpinCount?: number;
    /** Coin prize = floor(betAmount * multiplier * one of these). */
    readonly coinMultipliers?: readonly number[];
}

export const TREASURE_HUNT_PROGRESS_CONFIG = treasureHuntProgressConfigData as TreasureHuntProgressConfig;
