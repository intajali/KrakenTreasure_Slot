import { IBetSelection } from 'db://assets/core/betting/ICoinWallet';
import { getVisibleSymbols } from 'db://assets/core/utilities/ReelStripHelper';
import { RandomNumberGenerator } from 'db://assets/core/utilities/RandomNumberGenerator';
import {
    getBonusPayout,
    getScatterPayout,
    getSymbolPayout,
    isFeatureTrigger,
    isJackpotTrigger,
    PAYLINES_CONFIG,
    PAYTABLE_CONFIG,
} from '../paylines/config/PaytableConfig';
import { REEL_CONFIG } from '../reels/config/ReelConfig';
import { getActiveMathProfile } from './config/MathProfileConfig';

/**
 * Estimates theoretical RTP from the published math model:
 * expected return per unit stake under uniform stop selection.
 *
 * Industry definition:
 * theoreticalRtp = E[totalWin] / stake
 *
 * Configurable profile RTP is then achieved with a fixed payout scale:
 * payoutScale = targetRtp / theoreticalBaseRtp
 */
export class TheoreticalRtpCalculator {
    private static cachedPayoutScale: number | null = null;
    private static cachedTheoreticalRtp: number | null = null;

    public static getConfiguredPayoutScale(): number {
        if (this.cachedPayoutScale != null) {
            return this.cachedPayoutScale;
        }

        const baseScale = PAYTABLE_CONFIG.payoutScale ?? 1;
        const profile = getActiveMathProfile();
        const targetRtp = profile?.targetRtp;
        if (targetRtp == null || targetRtp <= 0) {
            this.cachedPayoutScale = baseScale;
            return this.cachedPayoutScale;
        }

        const sampleSpins = Math.max(1000, profile?.theoreticalSampleSpins ?? 50000);
        const theoreticalBaseRtp = this.estimateTheoreticalRtp(sampleSpins);
        this.cachedTheoreticalRtp = theoreticalBaseRtp;

        if (theoreticalBaseRtp <= 0) {
            this.cachedPayoutScale = baseScale;
            return this.cachedPayoutScale;
        }

        this.cachedPayoutScale = baseScale * (targetRtp / theoreticalBaseRtp);
        return this.cachedPayoutScale;
    }

    public static getEstimatedTheoreticalRtp(): number {
        if (this.cachedTheoreticalRtp == null) {
            this.getConfiguredPayoutScale();
        }

        return this.cachedTheoreticalRtp ?? 0;
    }

    public static resetCache(): void {
        this.cachedPayoutScale = null;
        this.cachedTheoreticalRtp = null;
    }

    private static estimateTheoreticalRtp(sampleSpins: number): number {
        const rng = new RandomNumberGenerator();
        const unitStake = 1;
        const betSelection: IBetSelection = {
            betAmount: unitStake,
            multiplier: 1,
            spinCost: unitStake,
        };

        let totalReturn = 0;
        for (let i = 0; i < sampleSpins; i++) {
            const stopIndices = REEL_CONFIG.reelStrips.map(strip =>
                strip.length === 0 ? 0 : rng.pickIndex(strip.length),
            );
            const reelWindow = stopIndices.map((stripIndex, reelIndex) =>
                getVisibleSymbols(
                    REEL_CONFIG.reelStrips[reelIndex],
                    stripIndex,
                    REEL_CONFIG.visibleRows,
                ),
            );
            totalReturn += this.evaluateUnitReturn(reelWindow, betSelection);
        }

        return totalReturn / sampleSpins;
    }

    /**
     * Base-game unit return using raw paytable multipliers (payoutScale = 1).
     * Free-spin cascade EV is not expanded here; scatter/bonus awards on the
     * triggering spin are included as published by the current evaluator rules.
     */
    private static evaluateUnitReturn(
        reelWindow: readonly (readonly number[])[],
        betSelection: IBetSelection,
    ): number {
        const stake = betSelection.spinCost;
        let lineWin = 0;

        PAYLINES_CONFIG.paylines.forEach(payline => {
            const symbols = payline.rows.map((row, reel) => reelWindow[reel]?.[row]);
            const wildSymbol = PAYTABLE_CONFIG.specialSymbols.wild;
            let bestPayout = 0;

            Object.keys(PAYTABLE_CONFIG.symbolPayouts).forEach(symbolIdText => {
                const symbolId = Number(symbolIdText);
                let matchCount = 0;
                for (const symbol of symbols) {
                    if (symbol === undefined || (symbol !== symbolId && symbol !== wildSymbol)) {
                        break;
                    }
                    matchCount++;
                }

                if (matchCount < PAYTABLE_CONFIG.minMatchCount) {
                    return;
                }

                const payoutMultiplier = getSymbolPayout(symbolId, matchCount);
                bestPayout = Math.max(bestPayout, payoutMultiplier * stake);
            });

            lineWin += Math.floor(bestPayout);
        });

        const scatterCount = this.countSymbol(reelWindow, PAYTABLE_CONFIG.specialSymbols.scatter);
        const bonusCount = this.countSymbol(reelWindow, PAYTABLE_CONFIG.specialSymbols.bonus);
        const jackpotCount = this.countSymbols(reelWindow, PAYTABLE_CONFIG.specialSymbols.jackpots);
        const bonusWin = Math.floor(getBonusPayout(bonusCount) * stake);
        const featureTriggered = isFeatureTrigger(PAYTABLE_CONFIG.specialSymbols.scatter, scatterCount)
            || isJackpotTrigger(jackpotCount);
        const featureWin = featureTriggered
            ? Math.floor(getScatterPayout(scatterCount) * stake)
            : 0;

        return lineWin + bonusWin + featureWin;
    }

    private static countSymbol(reelWindow: readonly (readonly number[])[], symbolId: number): number {
        return reelWindow.reduce(
            (total, reel) => total + reel.filter(symbol => symbol === symbolId).length,
            0,
        );
    }

    private static countSymbols(
        reelWindow: readonly (readonly number[])[],
        symbolIds: readonly number[],
    ): number {
        return reelWindow.reduce(
            (total, reel) => total + reel.filter(symbol => symbolIds.indexOf(symbol) >= 0).length,
            0,
        );
    }
}
