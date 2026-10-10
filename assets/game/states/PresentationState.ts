import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { SlotGameState } from 'db://assets/core/enums/SlotGameState';
import { SpinMode } from 'db://assets/core/slot/interfaces/ISlotGameSession';
import { ISpinResult } from 'db://assets/core/slot/interfaces/ISpinResult';
import { BetEvents } from '../betting/BetEvents';
import {
    getAutoSpinExitTransitionSeconds,
} from '../autoSpin/config/AutoSpinConfig';
import { TreasureHuntProgressEvents } from '../treasurehunt/TreasureHuntProgressEvents';
import { SlotGameStateBase } from './SlotGameStateBase';

type FeatureInterruptKind = 'free_spin' | 'treasure_hunt' | 'jackpot';

export class PresentationState extends SlotGameStateBase {
    public readonly id = SlotGameState.Presentation;

    public enter(): void {
        EventBus.emit(SlotEvents.StateChanged, { state: this.id });

        const result = this.owner.session.lastSpinResult;
        const jackpotWin = this.owner.claimPendingJackpotAward();
        const spinWin = result?.totalWin ?? 0;
        const totalCredit = spinWin + jackpotWin;

        if (totalCredit > 0) {
            if (this.owner.session.freeSpinActive) {
                // Hold free-spin wins until FreeSpinEnded → Ready, then credit once.
                this.owner.session.freeSpinTotalWin += totalCredit;
                EventBus.emit(SlotEvents.FreeSpinUpdated, {
                    remaining: this.owner.session.freeSpinsRemaining,
                    total: this.owner.session.freeSpinTotal,
                    totalWin: this.owner.session.freeSpinTotalWin,
                });
            } else {
                this.owner.creditWin(totalCredit);
                EventBus.emit(BetEvents.WinCredited, {
                    amount: totalCredit,
                    balance: this.owner.getBalance(),
                    jackpotWin,
                    freeSpinTotalWin: this.owner.session.freeSpinTotalWin,
                });
            }
        }

        if (result) {
            EventBus.emit(SlotEvents.WinPresented, {
                ...result,
                totalWin: spinWin + jackpotWin,
                jackpotWin,
            });
        }

        const delaySec = this.getPresentationDelaySeconds(result);
        this.owner.scheduleDelay(delaySec, () => this.routeNext(jackpotWin));
    }

    private getPresentationDelaySeconds(result: {
        winLines: readonly unknown[];
        bonusWinLine?: unknown;
        featureWinLine?: unknown;
    } | null): number {
        const lineCount = result
            ? result.winLines.length
                + (result.bonusWinLine ? 1 : 0)
                + (result.featureWinLine ? 1 : 0)
            : 0;
        const sequenceDurationMs = lineCount * this.owner.session.winLinePresentationDelayMs;

        return Math.max(this.owner.session.presentationDurationMs, sequenceDurationMs) / 1000;
    }

    private routeNext(jackpotWin = 0): void {
        const session = this.owner.session;
        const result = session.lastSpinResult;
        const interrupt = this.resolveFeatureInterrupt(result, jackpotWin);

        // Auto-spin must fully exit (and play transition) before any feature starts.
        if (interrupt && this.isAutoSpinRunning()) {
            this.owner.endAutoSpin('feature_triggered');
            this.owner.scheduleDelay(getAutoSpinExitTransitionSeconds(), () => {
                this.continueAfterAutoSpinExit(interrupt, jackpotWin);
            });
            return;
        }

        this.continueAfterAutoSpinExit(interrupt, jackpotWin);
    }

    private continueAfterAutoSpinExit(interrupt: FeatureInterruptKind | null, jackpotWin = 0): void {
        const session = this.owner.session;
        const result = session.lastSpinResult;

        if (interrupt === 'treasure_hunt') {
            session.pendingTreasureHunt = false;
            EventBus.emit(TreasureHuntProgressEvents.OpenRequested, {
                betAmount: this.owner.getBetSelection().betAmount,
                multiplier: this.owner.getBetSelection().multiplier,
            });
        }

        if (interrupt === 'jackpot') {
            this.owner.openJackpotFeature(jackpotWin);
        }

        if (interrupt === 'free_spin' || result?.isFeatureTriggered) {
            this.transition(SlotGameState.Feature);
            return;
        }

        // Route through FreeSpin even when remaining is 0 so FreeSpinState can emit FreeSpinEnded.
        if (session.freeSpinsRemaining > 0 || session.freeSpinActive) {
            this.transition(SlotGameState.FreeSpin);
            return;
        }

        if (session.autoSpinRemaining > 0) {
            if (this.owner.shouldStopAutoSpin()) {
                const reason = this.owner.isAutoSpinLossLimitReached() ? 'loss_limit' : 'manual_stop';
                this.owner.endAutoSpin(reason);
                this.transition(SlotGameState.Ready);
                return;
            }

            this.transition(SlotGameState.AutoSpin);
            return;
        }

        if (session.spinMode === SpinMode.AutoSpin) {
            const reason = session.autoSpinStopRequested ? 'manual_stop' : 'completed';
            this.owner.endAutoSpin(reason);
        }

        session.spinMode = SpinMode.Normal;
        this.transition(SlotGameState.Ready);
    }

    private resolveFeatureInterrupt(
        result: ISpinResult | null,
        jackpotWin: number,
    ): FeatureInterruptKind | null {
        const session = this.owner.session;

        if (result?.isFeatureTriggered) {
            return 'free_spin';
        }

        if (session.pendingTreasureHunt) {
            return 'treasure_hunt';
        }

        if (result?.isJackpotTriggered || jackpotWin > 0) {
            return 'jackpot';
        }

        return null;
    }

    private isAutoSpinRunning(): boolean {
        const session = this.owner.session;
        return session.spinMode === SpinMode.AutoSpin
            || session.autoSpinRemaining > 0
            || session.autoSpinStopRequested;
    }
}
