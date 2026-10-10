import paytableConfigData from 'db://assets/resources/paytable/PaytableConfig.json';
import paylinesConfigData from 'db://assets/resources/paytable/PaylinesConfig.json';
import { IBetSelection } from 'db://assets/core/betting/ICoinWallet';
import { TheoreticalRtpCalculator } from '../../math/TheoreticalRtpCalculator';

export interface PaylineDefinition {
    lineIndex: number;
    rows:  number[];
}

export interface FeatureTriggerDefinition {
    symbolId: number;
    count: number;
}

export interface SpecialSymbolConfig {
    scatter: number;
    wild: number;
    bonus: number;
    jackpots: number[];
}

export interface JackpotTriggerDefinition {
    count: number;
}

export type SymbolPayoutTable = Record<string, Record<string, number>>;

/** Fixed award amounts for jackpot tier symbols (MINI/MAXI/MEGA/GRAND). */
export type JackpotPayoutTable = Record<string, number>;

export interface PaytableConfig {
    minMatchCount: number;
    /** Global multiplier applied to every configured payout. */
    payoutScale?: number;
    specialSymbols: SpecialSymbolConfig;
    symbolPayouts: SymbolPayoutTable;
    bonusPayouts?: Record<string, number>;
    scatterPayouts?: Record<string, number>;
    /** Absolute coin awards when a jackpot tier lands in the feature. */
    jackpotPayouts?: JackpotPayoutTable;
    jackpotTrigger?: JackpotTriggerDefinition;
    featureTriggers:  FeatureTriggerDefinition[];
}

export interface PaylinesConfig {
    paylines: PaylineDefinition[];
}

export const PAYTABLE_CONFIG = paytableConfigData as PaytableConfig;
export const PAYLINES_CONFIG = paylinesConfigData as PaylinesConfig;

export function getSymbolPayout(symbolId: number, matchCount: number): number {
    return PAYTABLE_CONFIG.symbolPayouts[`${symbolId}`]?.[`${matchCount}`] ?? 0;
}

export function getBonusPayout(matchCount: number): number {
    const bonusPayouts = PAYTABLE_CONFIG.bonusPayouts;
    if (!bonusPayouts) {
        return 0;
    }

    const bestMatchCount = Object.keys(bonusPayouts)
        .map(count => Number(count))
        .filter(count => count <= matchCount)
        .sort((a, b) => b - a)[0];

    return bestMatchCount ? bonusPayouts[`${bestMatchCount}`] : 0;
}

export function getScatterPayout(matchCount: number): number {
    const scatterPayouts = PAYTABLE_CONFIG.scatterPayouts;
    if (!scatterPayouts) {
        return 0;
    }

    const bestMatchCount = Object.keys(scatterPayouts)
        .map(count => Number(count))
        .filter(count => count <= matchCount)
        .sort((a, b) => b - a)[0];

    return bestMatchCount ? scatterPayouts[`${bestMatchCount}`] : 0;
}

/** Fixed coin award for a jackpot tier symbol id (12–15). */
export function getJackpotPayout(symbolId: number): number {
    const payout = PAYTABLE_CONFIG.jackpotPayouts?.[`${symbolId}`];
    if (typeof payout !== 'number' || !Number.isFinite(payout)) {
        return 0;
    }
    return Math.max(0, payout);
}

export function calculateSymbolPayout(
    symbolId: number,
    matchCount: number,
    betSelection: IBetSelection,
): number {
    const payoutMultiplier = getSymbolPayout(symbolId, matchCount);
    const payoutScale = TheoreticalRtpCalculator.getConfiguredPayoutScale();
    const totalBetMultiplier = betSelection.betAmount * betSelection.multiplier;

    return Math.floor(payoutMultiplier * payoutScale * totalBetMultiplier);
}

export function calculateBonusPayout(matchCount: number, betSelection: IBetSelection): number {
    const payoutMultiplier = getBonusPayout(matchCount);
    const payoutScale = TheoreticalRtpCalculator.getConfiguredPayoutScale();
    const totalBetMultiplier = betSelection.betAmount * betSelection.multiplier;

    return Math.floor(payoutMultiplier * payoutScale * totalBetMultiplier);
}

export function calculateScatterPayout(matchCount: number, betSelection: IBetSelection): number {
    const payoutMultiplier = getScatterPayout(matchCount);
    const payoutScale = TheoreticalRtpCalculator.getConfiguredPayoutScale();
    const totalBetMultiplier = betSelection.betAmount * betSelection.multiplier;

    return Math.floor(payoutMultiplier * payoutScale * totalBetMultiplier);
}

/** Scaled jackpot tier award (feature final reel). */
export function calculateJackpotPayout(symbolId: number): number {
    const payoutScale = TheoreticalRtpCalculator.getConfiguredPayoutScale();
    return Math.floor(getJackpotPayout(symbolId) * payoutScale);
}

export function isFeatureTrigger(symbolId: number, matchCount: number): boolean {
    return PAYTABLE_CONFIG.featureTriggers.some(trigger =>
        trigger.symbolId === symbolId && matchCount >= trigger.count,
    );
}

export function isJackpotTrigger(matchCount: number): boolean {
    return matchCount >= (PAYTABLE_CONFIG.jackpotTrigger?.count ?? Number.POSITIVE_INFINITY);
}
