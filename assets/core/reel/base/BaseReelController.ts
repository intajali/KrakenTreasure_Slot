import { Component } from 'cc';
import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { IReel } from '../interface/IReel';
import { IReelController } from '../interface/IReelController';
import { IReelModel } from '../interface/IReelModel';
import { IReelService } from '../interface/IReelService';
import { IReelView } from '../interface/IReelView';

export abstract class BaseReelController extends Component implements IReelController {
    protected reel!: IReel;
    protected model!: IReelModel;
    protected view!: IReelView;
    protected service!: IReelService;

    public reelIndex = 0;

    protected bind(
        reel: IReel,
        model: IReelModel,
        view: IReelView,
        service: IReelService,
    ): void {
        this.reel = reel;
        this.model = model;
        this.view = view;
        this.service = service;
    }

    public initialize(reelIndex: number, strip: readonly number[]): void {
        this.reelIndex = reelIndex;
        this.reel.initialize();
        this.model.setReelIndex(reelIndex);
        this.model.setStrip(strip);
        this.model.setVisibleRows?.(this.getVisibleRows());
        this.view.setStrip(strip, this.getVisibleRows());
        this.view.initialize();
    }

    public spin(): void {
        this.service.spin(this.reel);
        this.view.startSpin();
    }

    public stop(stripIndex: number, onComplete?: () => void): void {
        this.service.stop(this.reel, stripIndex, () => {
            this.model.setStripIndex(stripIndex);
            this.view.stopAtIndex(stripIndex, () => {
                EventBus.emit(SlotEvents.ReelStopped, {
                    reelIndex: this.reelIndex,
                    stripIndex,
                });
                onComplete?.();
            });
        });
    }

    public update(dt: number): void {
        this.reel.update(dt);
        this.view.update(dt);
    }

    public reset(): void {
        this.reel.reset();
        this.model.reset();
        this.view.update(0);
    }

    public dispose(): void {
        this.service.dispose();
        this.reel.dispose();
        this.view.dispose();
        this.model.dispose();
    }

    protected abstract getVisibleRows(): number;
}
