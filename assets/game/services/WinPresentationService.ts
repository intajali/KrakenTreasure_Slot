import { SlotGameState } from 'db://assets/core/enums/SlotGameState';
import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { ISpinResult, IWinLine } from 'db://assets/core/slot/interfaces/ISpinResult';
import { ReelsContainer } from '../reels/controller/ReelsContainer';

export interface WinPresentationHost {
    getCurrentStateId(): SlotGameState | null;
    scheduleDelay(seconds: number, callback: () => void): void;
    getWinLinePresentationDelayMs(): number;
    getReelsContainer(): ReelsContainer | null;
}

/** Sequences per-line colored win-line draws after reels have fully stopped. */
export class WinPresentationService {
    private pendingWinHighlightResult: ISpinResult | null = null;
    private isReelStopSequenceComplete = false;
    private winPresentationSequenceId = 0;

    private readonly handleSpinStarted = () => this.onSpinStarted();
    private readonly handleAllReelsStopped = () => this.onAllReelsStopped();
    private readonly handleWinPresented = (result: ISpinResult) => this.presentWinHighlights(result);
    private readonly handleStateChanged = (payload?: { state?: SlotGameState }) => this.onStateChanged(payload);

    constructor(private readonly host: WinPresentationHost) {}

    public register(): void {
        EventBus.on(SlotEvents.SpinStarted, this.handleSpinStarted);
        EventBus.on(SlotEvents.AllReelsStopped, this.handleAllReelsStopped);
        EventBus.on<ISpinResult>(SlotEvents.WinPresented, this.handleWinPresented);
        EventBus.on<{ state?: SlotGameState }>(SlotEvents.StateChanged, this.handleStateChanged);
    }

    public unregister(): void {
        EventBus.off(SlotEvents.SpinStarted, this.handleSpinStarted);
        EventBus.off(SlotEvents.AllReelsStopped, this.handleAllReelsStopped);
        EventBus.off<ISpinResult>(SlotEvents.WinPresented, this.handleWinPresented);
        EventBus.off<{ state?: SlotGameState }>(SlotEvents.StateChanged, this.handleStateChanged);
        this.clearWinHighlights();
    }

    private presentWinHighlights(result: ISpinResult): void {
        this.pendingWinHighlightResult = result;
        this.tryPresentPendingWinHighlights();
    }

    private tryPresentPendingWinHighlights(): void {
        const result = this.pendingWinHighlightResult;
        if (
            !this.isReelStopSequenceComplete
            || this.host.getCurrentStateId() !== SlotGameState.Presentation
            || !result
        ) {
            return;
        }

        this.pendingWinHighlightResult = null;
        this.host.scheduleDelay(0, () => {
            if (this.host.getCurrentStateId() !== SlotGameState.Presentation) {
                return;
            }

            const highlightLines = this.getPresentableWinLines(result);
            const reelsContainer = this.host.getReelsContainer();

            if (!reelsContainer || highlightLines.length === 0) {
                this.clearWinHighlights();
                EventBus.emit(SlotEvents.WinPresentationComplete, result);
                return;
            }

            this.presentWinLinesSequentially(result, highlightLines);
        });
    }

    private onSpinStarted(): void {
        this.winPresentationSequenceId++;
        this.isReelStopSequenceComplete = false;
        this.pendingWinHighlightResult = null;
        this.clearWinHighlights();
    }

    private onAllReelsStopped(): void {
        this.isReelStopSequenceComplete = true;
        this.tryPresentPendingWinHighlights();
    }

    private onStateChanged(payload?: { state?: SlotGameState }): void {
        if (payload?.state === SlotGameState.Presentation) {
            this.tryPresentPendingWinHighlights();
            return;
        }

        this.winPresentationSequenceId++;
        this.pendingWinHighlightResult = null;
        this.clearWinHighlights();
    }

    private clearWinHighlights(): void {
        this.host.getReelsContainer()?.clearHighlights();
    }

    private getPresentableWinLines(result: ISpinResult): readonly IWinLine[] {
        const winLines = result.winLines.filter(line => line.payout > 0);
        const bonusWinLines = result.bonusWinLine && result.bonusWinLine.payout > 0
            ? [result.bonusWinLine]
            : [];
        if (result.featureWinLine && result.featureWinLine.payout > 0) {
            return [...winLines, ...bonusWinLines, result.featureWinLine];
        }

        return [...winLines, ...bonusWinLines];
    }

    private presentWinLinesSequentially(result: ISpinResult, winLines: readonly IWinLine[]): void {
        const sequenceId = ++this.winPresentationSequenceId;
        const delaySec = Math.max(0, this.host.getWinLinePresentationDelayMs()) / 1000;
        const reelsContainer = this.host.getReelsContainer();

        winLines.forEach((line, index) => {
            this.host.scheduleDelay(delaySec * index, () => {
                if (
                    sequenceId !== this.winPresentationSequenceId
                    || this.host.getCurrentStateId() !== SlotGameState.Presentation
                ) {
                    return;
                }

                reelsContainer?.highlightWinLines(winLines.slice(0, index + 1));
                EventBus.emit(SlotEvents.WinLinePresented, {
                    line,
                    index,
                    total: winLines.length,
                    payout: line.payout,
                    cumulativePayout: winLines
                        .slice(0, index + 1)
                        .reduce((total, current) => total + current.payout, 0),
                });
            });
        });

        this.host.scheduleDelay(delaySec * winLines.length, () => {
            if (
                sequenceId !== this.winPresentationSequenceId
                || this.host.getCurrentStateId() !== SlotGameState.Presentation
            ) {
                return;
            }

            EventBus.emit(SlotEvents.WinPresentationComplete, result);
        });
    }
}
