export interface IBetConfig {
    readonly startingCoins: number;
    readonly betLevels: readonly number[];
    readonly multipliers: readonly number[];
    readonly defaultBetIndex: number;
    readonly defaultMultiplierIndex: number;
}
