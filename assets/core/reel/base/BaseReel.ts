import { ReelState } from '../../enums/ReelState';
import { IReel } from '../interface/IReel';

export class BaseReel implements IReel {
    protected _state = ReelState.Idle;
    protected _stripIndex = 0;

    constructor(public readonly id: number = 0) {}

    public get state(): ReelState {
        return this._state;
    }

    public initialize(): void {
        this._state = ReelState.Idle;
        this._stripIndex = 0;
    }

    public spin(): void {
        this._state = ReelState.Spinning;
        this.onSpin();
    }

    public stop(stripIndex: number): void {
        this._stripIndex = stripIndex;
        this._state = ReelState.Stopped;
        this.onStop(stripIndex);
    }

    public update(dt: number): void {
        this.onUpdate(dt);
    }

    public reset(): void {
        this._state = ReelState.Idle;
        this._stripIndex = 0;
        this.onReset();
    }

    public dispose(): void {
        this.onDispose();
    }

    protected onSpin(): void {}

    protected onStop(_stripIndex: number): void {}

    protected onUpdate(_dt: number): void {}

    protected onReset(): void {}

    protected onDispose(): void {}
}
