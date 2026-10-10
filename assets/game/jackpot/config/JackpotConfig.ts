import jackpotConfigData from 'db://assets/resources/jackpot/JackpotConfig.json';

export interface JackpotConfig {
    readonly enabled: boolean;
    /** Fraction of each charged spin cost added to the progressive jackpot. */
    readonly contributionPercent: number;
    /** Starting / post-award jackpot pool value. */
    readonly seedValue: number;
    /** Pool value at which the meter is considered full and the jackpot awards. */
    readonly triggerValue: number;
}

export const JACKPOT_CONFIG = jackpotConfigData as JackpotConfig;
