import krakenProgressConfigData from 'db://assets/resources/kraken/KrakenProgressConfig.json';

export interface KrakenProgressConfig {
    readonly enabled: boolean;
    /** Symbol id that advances the Kraken release meter when it lands. */
    readonly symbolId: number;
    /** Number of landed Kraken symbols needed to fill the meter. */
    readonly requiredCount: number;
    /** Award = floor(betAmount * multiplier * awardPayoutMultiplier). */
    readonly awardPayoutMultiplier: number;
}

export const KRAKEN_PROGRESS_CONFIG = krakenProgressConfigData as KrakenProgressConfig;
