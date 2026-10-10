import { IBetSelection } from 'db://assets/core/betting/ICoinWallet';
import { ISpinResult } from 'db://assets/core/slot/interfaces/ISpinResult';
import { IWinEvaluator } from 'db://assets/core/slot/interfaces/IWinEvaluator';
import { getVisibleSymbols } from 'db://assets/core/utilities/ReelStripHelper';
import { getActiveMathProfile } from '../math/config/MathProfileConfig';
import { MathOutcomeSelector } from '../math/MathOutcomeSelector';
import { RtpTracker } from '../math/RtpTracker';
import { TheoreticalRtpCalculator } from '../math/TheoreticalRtpCalculator';
import { REEL_CONFIG } from '../reels/config/ReelConfig';
import { KrakenWinEvaluator } from './KrakenWinEvaluator';

export class SpinResultController {
    constructor(
        private readonly winEvaluator: IWinEvaluator = new KrakenWinEvaluator(),
        private readonly outcomeSelector: MathOutcomeSelector = new MathOutcomeSelector(),
        private readonly rtpTracker: RtpTracker = new RtpTracker(),
    ) {}

    public buildReelWindow(stripIndices: number[]): readonly (readonly number[])[] {
        return stripIndices.map((stripIndex, reelIndex) =>
            getVisibleSymbols(
                REEL_CONFIG.reelStrips[reelIndex],
                stripIndex,
                REEL_CONFIG.visibleRows,
            ),
        );
    }

    public evaluateSpin(
        reelWindow: readonly (readonly number[])[],
        betSelection: IBetSelection,
    ): ISpinResult {
        return this.winEvaluator.evaluate(reelWindow, betSelection);
    }

    public selectStopIndices(betSelection: IBetSelection): number[] {
        return this.outcomeSelector.selectStopIndices(
            betSelection,
            indices => this.buildReelWindow(indices),
            (reelWindow, selection) => this.evaluateSpin(reelWindow, selection),
        );
    }

    public recordWager(amount: number): void {
        this.rtpTracker.recordWager(amount);
    }

    public recordPayout(amount: number): void {
        this.rtpTracker.recordPayout(amount);
    }

    public getRtpTracker(): RtpTracker {
        return this.rtpTracker;
    }

    /** Configured theoretical RTP target for the active math profile. */
    public getTargetRtp(): number {
        return getActiveMathProfile()?.targetRtp ?? TheoreticalRtpCalculator.getEstimatedTheoreticalRtp();
    }

    /** Base-model theoretical RTP before target scaling. */
    public getBaseTheoreticalRtp(): number {
        TheoreticalRtpCalculator.getConfiguredPayoutScale();
        return TheoreticalRtpCalculator.getEstimatedTheoreticalRtp();
    }
}
