import { IBetSelection } from 'db://assets/core/betting/ICoinWallet';
import { ReelStopIndexGenerator } from 'db://assets/core/reel/ReelStopIndexGenerator';
import { ISpinResult } from 'db://assets/core/slot/interfaces/ISpinResult';
import { RandomNumberGenerator } from 'db://assets/core/utilities/RandomNumberGenerator';
import { REEL_CONFIG } from '../reels/config/ReelConfig';
import { getActiveMathProfile, MathTuningProfile } from './config/MathProfileConfig';

export type EvaluateCandidate = (
    reelWindow: readonly (readonly number[])[],
    betSelection: IBetSelection,
) => ISpinResult;

export type BuildReelWindow = (stripIndices: number[]) => readonly (readonly number[])[];

/**
 * Volatility / hit-frequency outcome filter.
 * Does not chase live RTP. Configurable RTP is applied via theoretical payout scaling.
 */
export class MathOutcomeSelector {
    public constructor(
        private readonly stopIndexGenerator = new ReelStopIndexGenerator(),
        private readonly rng = new RandomNumberGenerator(),
    ) {}

    public selectStopIndices(
        betSelection: IBetSelection,
        buildReelWindow: BuildReelWindow,
        evaluateSpin: EvaluateCandidate,
    ): number[] {
        const profile = getActiveMathProfile();
        if (!profile) {
            return this.stopIndexGenerator.generateStopIndices(REEL_CONFIG.reelStrips);
        }

        const maxAttempts = Math.max(1, profile.maxAttempts);
        let fallback = this.stopIndexGenerator.generateStopIndices(REEL_CONFIG.reelStrips);

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const candidate = attempt === 0
                ? fallback
                : this.stopIndexGenerator.generateStopIndices(REEL_CONFIG.reelStrips);
            const result = evaluateSpin(buildReelWindow(candidate), betSelection);

            if (this.shouldAcceptCandidate(result, profile)) {
                return candidate;
            }

            fallback = candidate;
        }

        return fallback;
    }

    private shouldAcceptCandidate(result: ISpinResult, profile: MathTuningProfile): boolean {
        const acceptanceRate = this.getAcceptanceRate(result, profile);
        return this.rng.nextFloat() <= Math.max(0, Math.min(1, acceptanceRate));
    }

    private getAcceptanceRate(result: ISpinResult, profile: MathTuningProfile): number {
        if (result.isJackpotTriggered) {
            return profile.jackpotHitAcceptanceRate;
        }

        if (result.isFeatureTriggered) {
            return profile.featureHitAcceptanceRate;
        }

        if ((result.bonusWin ?? 0) > 0) {
            return profile.bonusHitAcceptanceRate;
        }

        if (result.totalWin > 0) {
            return profile.lineHitAcceptanceRate;
        }

        return profile.missAcceptanceRate;
    }
}
