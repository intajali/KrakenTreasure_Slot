import addSpinConfigData from 'db://assets/resources/freeSpin/AddSpinConfig.json';

export interface AddSpinConfig {
    readonly enabled: boolean;
    /** Symbol id used for the overlay sprite (see SymbolConfig). */
    readonly symbolId: number;
    /** When true, ADDSPIN only appears during free spins. */
    readonly freeSpinOnly: boolean;
    /** 0..1 chance that ADDSPIN appears on a free spin after reels stop. */
    readonly appearChance: number;
    /** Free spins awarded per landed ADDSPIN overlay. */
    readonly spinsAwarded: number;
    /** Max overlays that can land in a single spin. */
    readonly maxOverlaysPerSpin: number;
}

export const ADD_SPIN_CONFIG = addSpinConfigData as AddSpinConfig;
