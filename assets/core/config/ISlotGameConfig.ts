export interface ISymbolDefinition {
    readonly id: number;
    readonly name: string;
    readonly weight?: number;
}

export interface IReelLayoutConfig {
    readonly reelCount: number;
    readonly visibleRows: number;
    readonly spinDurationMs: number;
    readonly stopDelayMs: number;
}

export interface ISlotGameConfig {
    readonly reelLayout: IReelLayoutConfig;
    readonly symbols: readonly ISymbolDefinition[];
    readonly reelStrips: readonly (readonly number[])[];
}
