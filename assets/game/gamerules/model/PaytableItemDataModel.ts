import { SpriteFrame } from 'cc';
import { BaseModel } from 'db://assets/core/architecture/BaseModel';

export interface PaytablePayoutEntry {
    readonly matchCount: number;
    readonly payout: number;
}

export class PaytableItemDataModel extends BaseModel {
    private symbolId = -1;
    private symbolSprite: SpriteFrame | null = null;
    private payoutEntries: PaytablePayoutEntry[] = [];

    public getSymbolId(): number {
        return this.symbolId;
    }

    public setSymbolId(symbolId: number): void {
        this.symbolId = symbolId;
    }

    public getSymbolSprite(): SpriteFrame | null {
        return this.symbolSprite;
    }

    public setSymbolSprite(symbolSprite: SpriteFrame | null): void {
        this.symbolSprite = symbolSprite;
    }

    public getPayoutEntries(): readonly PaytablePayoutEntry[] {
        return this.payoutEntries;
    }

    public setPayoutEntries(entries: readonly PaytablePayoutEntry[]): void {
        this.payoutEntries = [...entries];
    }

    /** Highest configured payout (used when only a single value is needed). */
    public getPayout(): number {
        if (this.payoutEntries.length === 0) {
            return 0;
        }
        return this.payoutEntries[this.payoutEntries.length - 1].payout;
    }

    public reset(): void {
        this.symbolId = -1;
        this.symbolSprite = null;
        this.payoutEntries = [];
    }
}
