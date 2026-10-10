import { _decorator } from 'cc';
import { BaseReelSetController } from 'db://assets/core/slot/base/BaseReelSetController';
import { EventBus } from 'db://assets/core/events/EventBus';
import { IReelController } from 'db://assets/core/reel/interface/IReelController';
import { getVisibleSymbols, normalizeStripIndex } from 'db://assets/core/utilities/ReelStripHelper';
import { ReelController } from '../../reels/controller/ReelController';
import {
    applyFinalReelPayout,
    getFinalReelDemoStopForTier,
    JACKPOT_FEATURE_EXIT_DELAY_SEC,
    JACKPOT_FEATURE_OPEN_DELAY_SEC,
    JACKPOT_FEATURE_PEARL_REWARD_STEP_SEC,
    JACKPOT_FEATURE_RESULT_HOLD_SEC,
    JACKPOT_FEATURE_SPIN_COUNT,
    JACKPOT_FINAL_REEL_PEARL_THRESHOLD,
    JACKPOT_FINAL_REEL_RESULT_HOLD_SEC,
    JACKPOT_PEARL_LAND_CHANCE_PER_REEL,
    JACKPOT_PEARL_WINDOW_WEIGHTS,
    JACKPOT_REEL_CONFIG,
    JACKPOT_REEL_SYMBOL,
    JackpotTierName,
    isJackpotPearlSymbol,
    rollFinalReelStopIndex,
    rollPearlReward,
    tierNameForFinalReelSymbol,
} from '../config/JackpotReelConfig';
import { JackpotEvents } from '../JackpotEvents';
import { JackpotFeatureView } from '../view/JackpotFeatureView';
import { PearlView } from '../view/PearlView';
const { ccclass, property } = _decorator;

export interface JackpotFeatureOpenOptions {
    /** Test mode: always land the richest multi-pearl windows until threshold. */
    readonly forceSixPearls?: boolean;
    /** Test mode: force the final reel to land this jackpot tier. */
    readonly forceFinalReelTier?: JackpotTierName;
}

/**
 * Jackpot feature flow:
 * 1) open → up to 10 weighted feature spins (pearls lock as they land)
 * 2) early-stop at 6 pearls, else run all spins
 * 3) tally pearl rewards one-by-one
 * 4) if ≥6 pearls → kraken release (lock → chain → kraken) → final reel
 * 5) credit feature total to balance, then close
 */
@ccclass('JackpotFeatureController')
export class JackpotFeatureController extends BaseReelSetController {
    @property(JackpotFeatureView)
    public featureView: JackpotFeatureView | null = null;

    private reelControllers: ReelController[] = [];
    private isPlaying = false;
    private isClosing = false;
    private pendingAwardAmount = 0;
    private totalWinAmount = 0;
    /** Locked stop per reel once a pearl lands (reel still spins, same window). */
    private lockedPearlStopIndices: Array<number | null> = [];
    private forceSixPearls = false;
    private forceFinalReelTier: JackpotTierName | null = null;

    protected onInitialize(): void {
        this.resolveFeatureView();
        this.createReels();
        this.featureView?.initialize();
    }

    protected onDestroy(): void {
        this.disposeAll();
    }

    public open(awardAmount = 0, options?: JackpotFeatureOpenOptions): void {
        if (this.isPlaying || this.isClosing) {
            return;
        }

        this.isPlaying = true;
        this.isClosing = false;
        this.pendingAwardAmount = awardAmount;
        this.forceSixPearls = options?.forceSixPearls === true;
        this.forceFinalReelTier = options?.forceFinalReelTier ?? null;
        this.totalWinAmount = 0;
        this.resetPearlLocks();
        this.featureView?.resetKrakenRestraints();
        this.featureView?.hideFinalJackpotReel();

        EventBus.emit(JackpotEvents.OpenRequested, { amount: awardAmount });

        if (this.reels.length === 0) {
            this.createReels();
        }

        this.featureView?.showFeatureWithTransition(() => {
            if (!this.isActive()) {
                return;
            }

            this.featureView?.showWin('', this.totalWinAmount);
            this.scheduleOnce(() => {
                if (this.isActive()) {
                    this.playSpinRound(0);
                }
            }, JACKPOT_FEATURE_OPEN_DELAY_SEC);
        });
    }

    public close(): void {
        if (!this.isPlaying || this.isClosing) {
            return;
        }

        this.isClosing = true;
        // Credit feature winnings to the credit meter before the exit transition.
        this.emitFeatureCompleted();

        this.scheduleOnce(() => {
            this.featureView?.hideFeatureWithTransition(() => {
                this.isPlaying = false;
                this.isClosing = false;
                this.pendingAwardAmount = 0;
                this.forceSixPearls = false;
                this.forceFinalReelTier = null;
                this.totalWinAmount = 0;
                this.resetPearlLocks();
                this.featureView?.hideFinalJackpotReel();
            });
        }, JACKPOT_FEATURE_EXIT_DELAY_SEC);
    }

    /** Spin without base-game SpinStarted. */
    public override spinAll(): void {
        this.stoppedCount = 0;
        this.reels.forEach(reel => reel.spin());
    }

    public override stopSequentially(
        stripIndices: number[],
        delayMs: number,
        onAllStopped?: () => void,
    ): void {
        this.stoppedCount = 0;
        const reels = [...this.reels];
        if (reels.length === 0) {
            onAllStopped?.();
            return;
        }

        const stopNext = (index: number): void => {
            if (index >= reels.length) {
                onAllStopped?.();
                return;
            }

            this.scheduleOnce(() => {
                reels[index].stop(stripIndices[index] ?? 0, () => {
                    this.stoppedCount++;
                    stopNext(index + 1);
                });
            }, delayMs / 1000);
        };

        stopNext(0);
    }

    // --- Feature spin loop ---

    private playSpinRound(spinIndex: number): void {
        if (!this.isActive()) {
            return;
        }

        const stopIndices = this.selectStopIndices();
        this.spinAll();

        const spinHoldSec = Math.max(0.35, JACKPOT_REEL_CONFIG.spinDurationMs / 1000 * 0.35);
        this.scheduleOnce(() => {
            if (!this.isActive()) {
                return;
            }
            this.stopSequentially(
                stopIndices,
                JACKPOT_REEL_CONFIG.reelStopGapMs,
                () => this.onSpinStopped(spinIndex, stopIndices),
            );
        }, spinHoldSec);
    }

    private onSpinStopped(spinIndex: number, stopIndices: number[]): void {
        if (!this.isActive()) {
            return;
        }

        this.lockPearlsFromStops(stopIndices);
        this.featureView?.showWin('', this.totalWinAmount);

        const reachedThreshold = this.getPearlCount() >= JACKPOT_FINAL_REEL_PEARL_THRESHOLD;
        const hasMoreSpins = spinIndex + 1 < JACKPOT_FEATURE_SPIN_COUNT;

        this.scheduleOnce(() => {
            if (!this.isActive()) {
                return;
            }
            if (reachedThreshold || !hasMoreSpins) {
                this.tallyPearlRewards();
                return;
            }
            this.playSpinRound(spinIndex + 1);
        }, JACKPOT_FEATURE_RESULT_HOLD_SEC);
    }

    // --- Pearl tally → optional final reel ---

    private tallyPearlRewards(): void {
        if (!this.isActive()) {
            return;
        }

        const pearls = this.featureView?.generatedPearlsView?.getSpawnedPearlsInOrder() ?? [];
        this.totalWinAmount = 0;
        this.featureView?.showWin('', 0);

        const addNext = (index: number): void => {
            if (!this.isActive()) {
                return;
            }
            if (index >= pearls.length) {
                this.onTallyComplete(pearls.length);
                return;
            }
            this.collectPearlReward(pearls[index]);
            this.scheduleOnce(
                () => addNext(index + 1),
                JACKPOT_FEATURE_PEARL_REWARD_STEP_SEC,
            );
        };

        addNext(0);
    }

    private onTallyComplete(pearlCount: number): void {
        if (!this.isActive()) {
            return;
        }

        this.featureView?.showWin('PEARL', this.totalWinAmount);

        if (pearlCount < JACKPOT_FINAL_REEL_PEARL_THRESHOLD) {
            this.emitFinalResult('PEARL', JACKPOT_REEL_SYMBOL.PEARL);
            this.close();
            return;
        }

        this.spinFinalJackpotReel();
    }

    private spinFinalJackpotReel(): void {
        if (!this.isActive()) {
            return;
        }

        const startFinalSpin = (): void => {
            if (!this.isActive()) {
                return;
            }

            const stopIndex = this.forceFinalReelTier
                ? getFinalReelDemoStopForTier(this.forceFinalReelTier)
                : rollFinalReelStopIndex();

            this.featureView?.spinFinalJackpotReel(stopIndex, (symbolId) => {
                if (!this.isActive()) {
                    return;
                }

                // Tier awards come from PaytableConfig.jackpotPayouts; R/X from JackpotReelConfig.
                this.totalWinAmount = applyFinalReelPayout(this.totalWinAmount, symbolId);
                const tierName = tierNameForFinalReelSymbol(symbolId);

                this.featureView?.showWin(tierName, this.totalWinAmount, true);
                this.emitFinalResult(tierName, symbolId);

                this.scheduleOnce(() => {
                    if (this.isActive()) {
                        this.close();
                    }
                }, JACKPOT_FINAL_REEL_RESULT_HOLD_SEC);
            });
        };

        // Lock open → chain break → kraken, then the final reel spins.
        if (this.featureView) {
            this.featureView.krakenReleaseAnimation(startFinalSpin);
            return;
        }
        startFinalSpin();
    }

    private emitFinalResult(tierName: string, symbolId: number): void {
        EventBus.emit(JackpotEvents.FeatureResult, {
            spinIndex: JACKPOT_FEATURE_SPIN_COUNT - 1,
            spinCount: JACKPOT_FEATURE_SPIN_COUNT,
            symbolIds: [symbolId],
            symbolId,
            tierName,
            spinWin: this.totalWinAmount,
            totalWin: this.totalWinAmount,
            amount: this.totalWinAmount,
            progressiveAward: this.pendingAwardAmount,
        });
    }

    private emitFeatureCompleted(): void {
        EventBus.emit(JackpotEvents.FeatureCompleted, {
            totalWin: Math.max(0, Math.floor(this.totalWinAmount)),
            progressiveAward: Math.max(0, Math.floor(this.pendingAwardAmount)),
        });
    }

    private collectPearlReward(pearl: PearlView): void {
        if (!pearl?.node?.isValid) {
            return;
        }
        pearl.playEvaluateHighlight();
        this.totalWinAmount += pearl.getAmount();
        this.featureView?.showWin('', this.totalWinAmount, true);
    }

    // --- Stop selection & pearl locks ---

    private selectStopIndices(): number[] {
        const strips = JACKPOT_REEL_CONFIG.reelStrips;
        const needPearls = this.getPearlCount() < JACKPOT_FINAL_REEL_PEARL_THRESHOLD;

        return Array.from({ length: JACKPOT_REEL_CONFIG.reelCount }, (_, reelIndex) => {
            const locked = this.lockedPearlStopIndices[reelIndex];
            if (locked !== null && locked !== undefined) {
                return locked;
            }

            const strip = strips[reelIndex] ?? strips[0] ?? [];
            if (strip.length === 0) {
                return 0;
            }

            if (needPearls) {
                return this.pickWeightedPearlStop(strip, this.forceSixPearls);
            }

            return Math.floor(Math.random() * strip.length);
        });
    }

    /**
     * Weighted stop pick for unlocked reels while under the pearl threshold.
     * Most spins miss; when a pearl lands, prefer 1-pearl windows over 2–3.
     * forceBest=true → richest window (test mode).
     */
    private pickWeightedPearlStop(strip: readonly number[], forceBest: boolean): number {
        const visibleRows = Math.max(1, JACKPOT_REEL_CONFIG.visibleRows);
        const emptyStops: number[] = [];
        const pearlStopsByCount = new Map<number, number[]>();
        let bestStop = 0;
        let bestCount = -1;

        for (let stop = 0; stop < strip.length; stop++) {
            const count = this.findVisiblePearlRows(strip, stop, visibleRows).length;
            if (count <= 0) {
                emptyStops.push(stop);
                continue;
            }

            const bucket = pearlStopsByCount.get(count) ?? [];
            bucket.push(stop);
            pearlStopsByCount.set(count, bucket);

            if (count > bestCount) {
                bestCount = count;
                bestStop = stop;
            }
        }

        if (forceBest) {
            return bestCount > 0 ? bestStop : Math.floor(Math.random() * strip.length);
        }

        const hasPearlStops = pearlStopsByCount.size > 0;
        const tryPearl = hasPearlStops && Math.random() < JACKPOT_PEARL_LAND_CHANCE_PER_REEL;

        if (!tryPearl) {
            if (emptyStops.length > 0) {
                return emptyStops[Math.floor(Math.random() * emptyStops.length)];
            }
            return Math.floor(Math.random() * strip.length);
        }

        const weightedStop = this.pickWeightedStopFromPearlBuckets(pearlStopsByCount);
        if (weightedStop !== null) {
            return weightedStop;
        }

        // Fallback: any pearl stop, else empty / random.
        for (const stops of pearlStopsByCount.values()) {
            if (stops.length > 0) {
                return stops[Math.floor(Math.random() * stops.length)];
            }
        }
        if (emptyStops.length > 0) {
            return emptyStops[Math.floor(Math.random() * emptyStops.length)];
        }
        return Math.floor(Math.random() * strip.length);
    }

    private pickWeightedStopFromPearlBuckets(
        pearlStopsByCount: ReadonlyMap<number, readonly number[]>,
    ): number | null {
        let totalWeight = 0;
        const entries: Array<{ stops: readonly number[]; weight: number }> = [];

        pearlStopsByCount.forEach((stops, count) => {
            if (stops.length === 0) {
                return;
            }
            const weight = JACKPOT_PEARL_WINDOW_WEIGHTS.get(count)
                ?? JACKPOT_PEARL_WINDOW_WEIGHTS.get(Math.min(3, count))
                ?? 0;
            if (weight <= 0) {
                return;
            }
            entries.push({ stops, weight });
            totalWeight += weight;
        });

        if (entries.length === 0 || totalWeight <= 0) {
            return null;
        }

        let roll = Math.random() * totalWeight;
        for (const entry of entries) {
            roll -= entry.weight;
            if (roll <= 0) {
                return entry.stops[Math.floor(Math.random() * entry.stops.length)];
            }
        }

        const last = entries[entries.length - 1];
        return last.stops[Math.floor(Math.random() * last.stops.length)];
    }

    private lockPearlsFromStops(stopIndices: readonly number[]): void {
        const visibleRows = Math.max(1, JACKPOT_REEL_CONFIG.visibleRows);
        const pearlsView = this.featureView?.generatedPearlsView;

        this.reelControllers.forEach((reel, reelIndex) => {
            const strip = JACKPOT_REEL_CONFIG.reelStrips[reelIndex] ?? [];
            const landed = typeof reel?.getStripIndex === 'function'
                ? reel.getStripIndex()
                : (stopIndices[reelIndex] ?? 0);
            const stopIndex = normalizeStripIndex(strip, landed);
            const pearlRows = this.findVisiblePearlRows(strip, stopIndex, visibleRows);
            if (pearlRows.length === 0) {
                return;
            }

            const alreadyLocked = this.lockedPearlStopIndices[reelIndex] !== null
                && this.lockedPearlStopIndices[reelIndex] !== undefined;
            this.lockedPearlStopIndices[reelIndex] = stopIndex;

            if (alreadyLocked || !pearlsView) {
                return;
            }

            const reward = rollPearlReward();
            pearlRows.forEach(rowIndex => {
                pearlsView.spawnPearlForReel(reelIndex, reward, rowIndex);
            });
        });
    }

    private findVisiblePearlRows(
        strip: readonly number[],
        stopIndex: number,
        visibleRows: number,
    ): number[] {
        const rows: number[] = [];
        getVisibleSymbols(strip, stopIndex, visibleRows).forEach((symbolId, rowIndex) => {
            if (isJackpotPearlSymbol(symbolId)) {
                rows.push(rowIndex);
            }
        });
        return rows;
    }

    // --- Helpers ---

    private isActive(): boolean {
        return this.isPlaying && !this.isClosing;
    }

    private getPearlCount(): number {
        return this.featureView?.generatedPearlsView?.getSpawnedPearlsInOrder().length ?? 0;
    }

    private resetPearlLocks(): void {
        this.featureView?.generatedPearlsView?.clearAllPearls();
        this.lockedPearlStopIndices = Array.from(
            { length: JACKPOT_REEL_CONFIG.reelCount },
            () => null,
        );
    }

    private createReels(): void {
        const container = this.featureView?.jackpotReelsContainer;
        if (!container) {
            return;
        }
        this.reelControllers = container.initializeReels(JACKPOT_REEL_CONFIG);
        this.setReels(this.reelControllers as IReelController[]);
    }

    private resolveFeatureView(): void {
        if (!this.featureView) {
            this.featureView = this.getComponent(JackpotFeatureView)
                ?? this.node.getComponentInChildren(JackpotFeatureView);
        }
    }
}
