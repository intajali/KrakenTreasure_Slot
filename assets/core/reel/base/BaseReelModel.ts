import { BaseModel } from '../../architecture/BaseModel';
import { getVisibleSymbols } from '../../utilities/ReelStripHelper';
import { IReelModel } from '../interface/IReelModel';

export abstract class BaseReelModel extends BaseModel implements IReelModel {
    protected _reelIndex = 0;
    protected _stripIndex = 0;
    protected _strip: readonly number[] = [];
    protected _visibleRows = 3;

    public get reelIndex(): number {
        return this._reelIndex;
    }

    public get stripIndex(): number {
        return this._stripIndex;
    }

    public get visibleSymbols(): readonly number[] {
        return getVisibleSymbols(this._strip, this._stripIndex, this._visibleRows);
    }

    public setReelIndex(index: number): void {
        this._reelIndex = index;
    }

    public setStrip(strip: readonly number[]): void {
        this._strip = strip;
    }

    public setVisibleRows(rows: number): void {
        this._visibleRows = rows;
    }

    public setStripIndex(stripIndex: number): void {
        this._stripIndex = stripIndex;
    }

    public clear(): void {
        this._reelIndex = 0;
        this._stripIndex = 0;
        this._strip = [];
    }

    public override reset(): void {
        this._stripIndex = 0;
    }
}
