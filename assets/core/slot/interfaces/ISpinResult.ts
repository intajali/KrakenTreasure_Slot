export interface IWinLine {
    readonly lineIndex: number;
    readonly symbolId: number;
    readonly count: number;
    readonly payout: number;
    readonly positions: readonly { reel: number; row: number }[];
}

export interface ISpinResult {
    readonly reelWindow: readonly (readonly number[])[];
    readonly totalWin: number;
    readonly bonusWin?: number;
    readonly bonusWinLine?: IWinLine;
    readonly featureWin?: number;
    readonly featureWinLine?: IWinLine;
    readonly winLines: readonly IWinLine[];
    readonly isFeatureTriggered: boolean;
    readonly featureSymbolCount?: number;
    readonly isJackpotTriggered?: boolean;
    readonly jackpotSymbolCount?: number;
    readonly jackpotWin?: number;
}
