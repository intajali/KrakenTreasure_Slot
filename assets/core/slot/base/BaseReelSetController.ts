import { Component } from 'cc';
import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { IReelController } from '../../reel/interface/IReelController';

export abstract class BaseReelSetController extends Component {
    protected reels: IReelController[] = [];
    protected stoppedCount = 0;
    private initialized = false;

    /** Call explicitly from bootstrap / owner — do not hook Cocos onLoad/start/onEnable. */
    public initialize(): void {
        if (this.initialized) {
            return;
        }

        this.onInitialize();
        this.initialized = true;
    }

    protected onInitialize(): void {}

    protected setReels(reels: IReelController[]): void {
        this.reels = reels;
    }

    public spinAll(): void {
        this.stoppedCount = 0;
        EventBus.emit(SlotEvents.SpinStarted);
        this.reels.forEach(reel => reel.spin());
    }

    public stopAll(stripIndices: number[]): void {
        this.reels.forEach((reel, index) => {
            reel.stop(stripIndices[index] ?? 0);
        });
    }

    public stopSequentially(
        stripIndices: number[],
        delayMs: number,
        onAllStopped?: () => void,
    ): void {
        this.stoppedCount = 0;
        const reels = [...this.reels];
        const totalReels = reels.length;

        if (totalReels === 0) {
            EventBus.emit(SlotEvents.AllReelsStopped);
            onAllStopped?.();
            return;
        }

        const stopNextReel = (index: number): void => {
            if (index >= totalReels) {
                EventBus.emit(SlotEvents.AllReelsStopped);
                onAllStopped?.();
                return;
            }

            const delaySec = index === 0 ? 0 : Math.max(0, delayMs) / 1000;
            this.scheduleOnce(() => {
                reels[index].stop(stripIndices[index] ?? 0, () => {
                    this.stoppedCount++;
                    stopNextReel(index + 1);
                });
            }, delaySec);
        };

        stopNextReel(0);
    }

    public update(dt: number): void {
        this.reels.forEach(reel => reel.update(dt));
    }

    public resetAll(): void {
        this.reels.forEach(reel => reel.reset());
    }

    public disposeAll(): void {
        this.reels.forEach(reel => reel.dispose());
        this.reels = [];
    }
}
