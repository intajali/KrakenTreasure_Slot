import { TREASURE_HUNT_PROGRESS_CONFIG } from './TreasureHuntProgressConfig';

export enum TreasureHuntRewardKind {
    Coins = 'coins',
    FreeSpins = 'freeSpins',
}

export interface TreasureHuntReward {
    readonly kind: TreasureHuntRewardKind;
    readonly coinAmount: number;
    readonly freeSpinCount: number;
}

export function formatTreasureHuntReward(reward: TreasureHuntReward): string {
    if (reward.kind === TreasureHuntRewardKind.FreeSpins) {
        return `${reward.freeSpinCount} FREE SPINS`;
    }
    return `${reward.coinAmount}`;
}

/**
 * Builds one hidden reward per chest. Coins are the common prize; at most one
 * chest can be free spins, and only at `freeSpinChance`.
 */
export function rollTreasureHuntRewards(
    betAmount: number,
    betMultiplier: number,
): TreasureHuntReward[] {
    const count = Math.max(1, Math.floor(TREASURE_HUNT_PROGRESS_CONFIG.choiceCount ?? 3));
    const rewards = Array.from({ length: count }, () => rollCoinReward(betAmount, betMultiplier));

    const chance = Math.min(1, Math.max(0, TREASURE_HUNT_PROGRESS_CONFIG.freeSpinChance ?? 0.12));
    if (Math.random() < chance && rewards.length > 0) {
        const slot = Math.floor(Math.random() * rewards.length);
        rewards[slot] = {
            kind: TreasureHuntRewardKind.FreeSpins,
            coinAmount: 0,
            freeSpinCount: Math.max(1, Math.floor(TREASURE_HUNT_PROGRESS_CONFIG.freeSpinCount ?? 3)),
        };
    }

    return rewards;
}

function rollCoinReward(betAmount: number, betMultiplier: number): TreasureHuntReward {
    const multipliers = TREASURE_HUNT_PROGRESS_CONFIG.coinMultipliers?.length
        ? TREASURE_HUNT_PROGRESS_CONFIG.coinMultipliers
        : [TREASURE_HUNT_PROGRESS_CONFIG.awardPayoutMultiplier || 10];
    const pick = multipliers[Math.floor(Math.random() * multipliers.length)] ?? 10;
    const stake = Math.max(1, betAmount) * Math.max(1, betMultiplier);
    return {
        kind: TreasureHuntRewardKind.Coins,
        coinAmount: Math.max(1, Math.floor(stake * pick)),
        freeSpinCount: 0,
    };
}
