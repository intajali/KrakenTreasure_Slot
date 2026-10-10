import { IDisposable, IResettable } from '../../interfaces/ILifecycle';

export interface IReelModel extends IResettable, IDisposable {
    readonly reelIndex: number;
    readonly stripIndex: number;
    readonly visibleSymbols: readonly number[];
    setReelIndex(index: number): void;
    setStrip(strip: readonly number[]): void;
    setStripIndex(stripIndex: number): void;
    setVisibleRows?(rows: number): void;
    clear(): void;
}
