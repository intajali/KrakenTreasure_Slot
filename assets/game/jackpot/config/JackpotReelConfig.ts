import jackpotReelConfigData from 'db://assets/resources/jackpot/JackpotReelConfig.json';
import jackpotReelStripsData from 'db://assets/resources/jackpot/JackpotReelStrips.json';
import jackpotFinalReelStripsData from 'db://assets/resources/jackpot/JackpotFinalReelStrips.json';
import { PearlRewardValues } from '../view/PearlView';
import { ReelConfig, ReelConfigData, ReelStripsData } from '../../reels/config/ReelConfig';
import { calculateJackpotPayout } from '../../paylines/config/PaytableConfig';

export type FinalReelRewardKind = 'amount' | 'multiplier';
export type JackpotTierName = 'MINI' | 'MAXI' | 'MEGA' | 'GRAND';

interface JackpotFinalReelStripsData extends ReelStripsData {
    /** Test-mode stop indices that land each jackpot tier on the final reel. */
    demoTierStopIndices?: Partial<Record<JackpotTierName, number>>;
}

export interface FinalReelRewardPayout {
    readonly kind: FinalReelRewardKind;
    readonly value: number;
}

interface JackpotReelConfigData extends ReelConfigData {
    featureSpinCount: number;
    openDelayMs: number;
    resultEvaluationDelayMs: number;
    enterTransitionMs?: number;
    exitTransitionMs?: number;
    exitDelayMs?: number;
    /** Delay between each pearl reward added to the total after all spins. */
    pearlRewardStepMs?: number;
    /** Fixed reward amounts a pearl can roll. */
    pearlRewardValues?: number[];
    /** Minimum pearls required to trigger the final jackpot reel. */
    finalReelPearlThreshold?: number;
    /**
     * Per unlocked reel, chance to aim for a pearl window this spin.
     * Remaining chance lands a non-pearl window.
     */
    pearlLandChancePerReel?: number;
    /**
     * Relative weights for pearl-window sizes when a pearl land is rolled.
     * Keys are visible pearl counts ("1", "2", "3").
     */
    pearlWindowWeights?: Record<string, number>;
    /** Hold while the final reel is spinning before stop. */
    finalReelSpinHoldMs?: number;
    /** Hold after final reel result before closing the feature. */
    finalReelResultHoldMs?: number;
    /** Pulse the landed symbol before applying the reward. */
    finalReelLandRevealMs?: number;
    /** Visible rows for the single final jackpot reel. */
    finalReelVisibleRows?: number;
    /** Slower spin physics overrides for the final reveal reel. */
    finalReelSpinSpeedRowsPerSec?: number;
    finalReelSpinAccelerationRowsPerSecSq?: number;
    finalReelMinStopSpeedRowsPerSec?: number;
    finalReelStopDecelerationFactor?: number;
    finalReelStopExtraLaps?: number;
    finalReelStopBounceRows?: number;
    /**
     * Relative land weights for final-reel symbols (by name).
     * MINI > MAXI > MEGA > GRAND; R/X use lower weights.
     */
    finalReelSymbolWeights?: Record<string, number>;
    /** Payout map for R/X reward symbols on the final reel. */
    finalReelRewards?: Record<string, FinalReelRewardPayout>;
}

const DEFAULT_PEARL_REWARD_VALUES = [10, 20, 25, 50, 75, 100, 150, 200, 250, 500];

const DEFAULT_FINAL_REEL_REWARDS: Record<string, FinalReelRewardPayout> = {
    R1: { kind: 'amount', value: 50 },
    R2: { kind: 'amount', value: 100 },
    R3: { kind: 'amount', value: 200 },
    R4: { kind: 'amount', value: 500 },
    X2: { kind: 'multiplier', value: 2 },
    X3: { kind: 'multiplier', value: 3 },
    X4: { kind: 'multiplier', value: 4 },
    X5: { kind: 'multiplier', value: 5 },
};

/** Default final-reel land weights — R/X more common; tiers rarer (GRAND rarest). */
const DEFAULT_FINAL_REEL_SYMBOL_WEIGHTS: Readonly<Record<string, number>> = {
    MINI: 10,
    MAXI: 6,
    MEGA: 3,
    GRAND: 1,
    R1: 22,
    R2: 16,
    R3: 10,
    R4: 6,
    X2: 14,
    X3: 10,
    X4: 6,
    X5: 4,
};

const jackpotReelConfig = jackpotReelConfigData as JackpotReelConfigData;
const jackpotReelStrips = jackpotReelStripsData as ReelStripsData;
const jackpotFinalReelStrips = jackpotFinalReelStripsData as JackpotFinalReelStripsData;

/**
 * Jackpot tier symbols used on the final reveal reel.
 * Pearl is intentionally excluded — see JACKPOT_REEL_SYMBOL.
 */
export const JACKPOT_SYMBOL = {
    MINI: 12,
    MAXI: 13,
    MEGA: 14,
    GRAND: 15,
} as const;

/**
 * Symbols used by jackpot feature reel strips / spins:
 * low symbols 0–4 plus pearl.
 */
export const JACKPOT_REEL_SYMBOL = {
    ACE: 0,
    KING: 1,
    QUEEN: 2,
    JACK: 3,
    TEN: 4,
    PEARL: 16,
} as const;

/**
 * Symbols used by the final single jackpot reel:
 * tiers 12–15 plus reward amount/multiplier glyphs.
 */
export const JACKPOT_FINAL_REEL_SYMBOL = {
    MINI: JACKPOT_SYMBOL.MINI,
    MAXI: JACKPOT_SYMBOL.MAXI,
    MEGA: JACKPOT_SYMBOL.MEGA,
    GRAND: JACKPOT_SYMBOL.GRAND,
    R1: 18,
    R2: 19,
    R3: 20,
    R4: 21,
    X2: 22,
    X3: 23,
    X4: 24,
    X5: 25,
} as const;

/** Ordered list of symbol ids allowed on jackpot feature reel strips. */
export const JACKPOT_REEL_SYMBOL_IDS: readonly number[] = [
    JACKPOT_REEL_SYMBOL.ACE,
    JACKPOT_REEL_SYMBOL.KING,
    JACKPOT_REEL_SYMBOL.QUEEN,
    JACKPOT_REEL_SYMBOL.JACK,
    JACKPOT_REEL_SYMBOL.TEN,
    JACKPOT_REEL_SYMBOL.PEARL,
];

/** Ordered list of symbol ids allowed on the final jackpot reel. */
export const JACKPOT_FINAL_REEL_SYMBOL_IDS: readonly number[] = [
    JACKPOT_FINAL_REEL_SYMBOL.MINI,
    JACKPOT_FINAL_REEL_SYMBOL.MAXI,
    JACKPOT_FINAL_REEL_SYMBOL.MEGA,
    JACKPOT_FINAL_REEL_SYMBOL.GRAND,
    JACKPOT_FINAL_REEL_SYMBOL.R1,
    JACKPOT_FINAL_REEL_SYMBOL.R2,
    JACKPOT_FINAL_REEL_SYMBOL.R3,
    JACKPOT_FINAL_REEL_SYMBOL.R4,
    JACKPOT_FINAL_REEL_SYMBOL.X2,
    JACKPOT_FINAL_REEL_SYMBOL.X3,
    JACKPOT_FINAL_REEL_SYMBOL.X4,
    JACKPOT_FINAL_REEL_SYMBOL.X5,
];

const JACKPOT_REEL_SYMBOL_ID_SET = new Set<number>(JACKPOT_REEL_SYMBOL_IDS);
const JACKPOT_FINAL_REEL_SYMBOL_ID_SET = new Set<number>(JACKPOT_FINAL_REEL_SYMBOL_IDS);

export function isJackpotReelSymbol(symbolId: number): boolean {
    return JACKPOT_REEL_SYMBOL_ID_SET.has(symbolId);
}

export function isJackpotPearlSymbol(symbolId: number): boolean {
    return symbolId === JACKPOT_REEL_SYMBOL.PEARL;
}

export function isJackpotFinalReelSymbol(symbolId: number): boolean {
    return JACKPOT_FINAL_REEL_SYMBOL_ID_SET.has(symbolId);
}

export function isJackpotTierSymbol(symbolId: number): boolean {
    return symbolId === JACKPOT_SYMBOL.MINI
        || symbolId === JACKPOT_SYMBOL.MAXI
        || symbolId === JACKPOT_SYMBOL.MEGA
        || symbolId === JACKPOT_SYMBOL.GRAND;
}

/** Keeps only ids from the jackpot reel symbol list (0–4 + pearl). */
function sanitizeJackpotReelStrip(strip: readonly number[]): number[] {
    const fallback = JACKPOT_REEL_SYMBOL.ACE;
    if (!strip.length) {
        return [fallback, JACKPOT_REEL_SYMBOL.PEARL];
    }

    return strip.map(symbolId => (
        isJackpotReelSymbol(symbolId) ? symbolId : fallback
    ));
}

function sanitizeFinalReelStrip(strip: readonly number[]): number[] {
    const fallback = JACKPOT_FINAL_REEL_SYMBOL.MINI;
    if (!strip.length) {
        return [fallback, JACKPOT_FINAL_REEL_SYMBOL.R1, JACKPOT_FINAL_REEL_SYMBOL.X2];
    }

    return strip.map(symbolId => (
        isJackpotFinalReelSymbol(symbolId) ? symbolId : fallback
    ));
}

const sanitizedReelStrips = jackpotReelStrips.reelStrips.map(sanitizeJackpotReelStrip);
const sanitizedFinalReelStrips = (jackpotFinalReelStrips.reelStrips ?? [])
    .map(sanitizeFinalReelStrip);

/** Spin/stop physics + strips for the 4-reel jackpot feature. */
export const JACKPOT_REEL_CONFIG: ReelConfig = {
    reelCount: jackpotReelConfig.reelCount,
    visibleRows: jackpotReelConfig.visibleRows,
    spinDurationMs: jackpotReelConfig.spinDurationMs,
    stopDelayMs: jackpotReelConfig.stopDelayMs,
    reelStopGapMs: jackpotReelConfig.reelStopGapMs,
    stopDurationMs: jackpotReelConfig.stopDurationMs ?? 0,
    reelStrips: sanitizedReelStrips,
    spinSpeedRowsPerSec: jackpotReelConfig.spinSpeedRowsPerSec,
    spinAccelerationRowsPerSecSq: jackpotReelConfig.spinAccelerationRowsPerSecSq,
    minStopSpeedRowsPerSec: jackpotReelConfig.minStopSpeedRowsPerSec,
    stopDecelerationFactor: jackpotReelConfig.stopDecelerationFactor,
    stopExtraLaps: jackpotReelConfig.stopExtraLaps,
    stopBounceRows: jackpotReelConfig.stopBounceRows,
};

/** Spin/stop physics + strip for the single final jackpot reveal reel. */
export const JACKPOT_FINAL_REEL_CONFIG: ReelConfig = {
    ...JACKPOT_REEL_CONFIG,
    reelCount: 1,
    visibleRows: Math.max(1, jackpotReelConfig.finalReelVisibleRows ?? 1),
    spinSpeedRowsPerSec: Math.max(
        4,
        jackpotReelConfig.finalReelSpinSpeedRowsPerSec ?? 9,
    ),
    spinAccelerationRowsPerSecSq: Math.max(
        6,
        jackpotReelConfig.finalReelSpinAccelerationRowsPerSecSq ?? 16,
    ),
    minStopSpeedRowsPerSec: Math.max(
        0.6,
        jackpotReelConfig.finalReelMinStopSpeedRowsPerSec ?? 1.2,
    ),
    stopDecelerationFactor: Math.max(
        1.5,
        jackpotReelConfig.finalReelStopDecelerationFactor ?? 3.2,
    ),
    stopExtraLaps: Math.max(0, jackpotReelConfig.finalReelStopExtraLaps ?? 2),
    stopBounceRows: Math.max(
        0,
        jackpotReelConfig.finalReelStopBounceRows ?? 0.3,
    ),
    reelStrips: sanitizedFinalReelStrips.length > 0
        ? sanitizedFinalReelStrips
        : [[
            JACKPOT_FINAL_REEL_SYMBOL.MINI,
            JACKPOT_FINAL_REEL_SYMBOL.R1,
            JACKPOT_FINAL_REEL_SYMBOL.X2,
            JACKPOT_FINAL_REEL_SYMBOL.MAXI,
            JACKPOT_FINAL_REEL_SYMBOL.R2,
            JACKPOT_FINAL_REEL_SYMBOL.X3,
            JACKPOT_FINAL_REEL_SYMBOL.MEGA,
            JACKPOT_FINAL_REEL_SYMBOL.R3,
            JACKPOT_FINAL_REEL_SYMBOL.X4,
            JACKPOT_FINAL_REEL_SYMBOL.GRAND,
            JACKPOT_FINAL_REEL_SYMBOL.R4,
            JACKPOT_FINAL_REEL_SYMBOL.X5,
        ]],
};

export const JACKPOT_DEMO_STOP_INDICES = jackpotReelStrips.demoStopIndices;
export const JACKPOT_FINAL_DEMO_STOP_INDICES = jackpotFinalReelStrips.demoStopIndices ?? [0];

const TIER_SYMBOL_BY_NAME: Readonly<Record<JackpotTierName, number>> = {
    MINI: JACKPOT_SYMBOL.MINI,
    MAXI: JACKPOT_SYMBOL.MAXI,
    MEGA: JACKPOT_SYMBOL.MEGA,
    GRAND: JACKPOT_SYMBOL.GRAND,
};

/**
 * Test-mode final-reel stops for each jackpot tier.
 * Falls back to the first matching strip index when JSON omits a tier.
 */
export const JACKPOT_FINAL_DEMO_TIER_STOP_INDICES: Readonly<Record<JackpotTierName, number>> = (() => {
    const strip = sanitizedFinalReelStrips[0]
        ?? jackpotFinalReelStrips.reelStrips?.[0]
        ?? [];
    const configured = jackpotFinalReelStrips.demoTierStopIndices ?? {};
    const result = {} as Record<JackpotTierName, number>;

    (Object.keys(TIER_SYMBOL_BY_NAME) as JackpotTierName[]).forEach(tier => {
        const configuredStop = configured[tier];
        if (typeof configuredStop === 'number' && Number.isFinite(configuredStop) && strip.length > 0) {
            result[tier] = ((Math.floor(configuredStop) % strip.length) + strip.length) % strip.length;
            return;
        }

        const symbolId = TIER_SYMBOL_BY_NAME[tier];
        const found = strip.indexOf(symbolId);
        result[tier] = found >= 0 ? found : 0;
    });

    return result;
})();

/** Resolves a forced final-reel stop for a jackpot tier (test mode). */
export function getFinalReelDemoStopForTier(tier: JackpotTierName): number {
    return JACKPOT_FINAL_DEMO_TIER_STOP_INDICES[tier] ?? 0;
}

/** Number of jackpot feature spins before the panel closes. */
export const JACKPOT_FEATURE_SPIN_COUNT = Math.max(1, jackpotReelConfig.featureSpinCount ?? 10);

/** Delay after enter transition finishes before the first spin starts. */
export const JACKPOT_FEATURE_OPEN_DELAY_SEC = Math.max(0, (jackpotReelConfig.openDelayMs ?? 800) / 1000);

/** Hold time after each spin result evaluation before the next spin (or close). */
export const JACKPOT_FEATURE_RESULT_HOLD_SEC = Math.max(
    0,
    (jackpotReelConfig.resultEvaluationDelayMs ?? 1200) / 1000,
);

/** Fade duration for the enter blackout transition. */
export const JACKPOT_FEATURE_ENTER_TRANSITION_SEC = Math.max(
    0.05,
    (jackpotReelConfig.enterTransitionMs ?? 450) / 1000,
);

/** Fade duration for the exit blackout transition. */
export const JACKPOT_FEATURE_EXIT_TRANSITION_SEC = Math.max(
    0.05,
    (jackpotReelConfig.exitTransitionMs ?? 450) / 1000,
);

/** Delay after the final result before the exit transition starts. */
export const JACKPOT_FEATURE_EXIT_DELAY_SEC = Math.max(0, (jackpotReelConfig.exitDelayMs ?? 1200) / 1000);

/** Delay between each pearl reward tally step after all spins complete. */
export const JACKPOT_FEATURE_PEARL_REWARD_STEP_SEC = Math.max(
    0.1,
    (jackpotReelConfig.pearlRewardStepMs ?? 650) / 1000,
);

/** Pearls required to unlock the final jackpot reel. */
export const JACKPOT_FINAL_REEL_PEARL_THRESHOLD = Math.max(
    1,
    jackpotReelConfig.finalReelPearlThreshold ?? 6,
);

/** Chance an unlocked reel aims for a pearl window on a given feature spin. */
export const JACKPOT_PEARL_LAND_CHANCE_PER_REEL = Math.min(
    1,
    Math.max(0, jackpotReelConfig.pearlLandChancePerReel ?? 0.32),
);

const DEFAULT_PEARL_WINDOW_WEIGHTS: Readonly<Record<number, number>> = {
    1: 70,
    2: 25,
    3: 5,
};

/** Relative weights for 1/2/3-pearl windows when a pearl land is selected. */
export const JACKPOT_PEARL_WINDOW_WEIGHTS: ReadonlyMap<number, number> = (() => {
    const configured = jackpotReelConfig.pearlWindowWeights ?? {};
    const weights = new Map<number, number>();
    const source = Object.keys(configured).length > 0
        ? configured
        : {
            '1': DEFAULT_PEARL_WINDOW_WEIGHTS[1],
            '2': DEFAULT_PEARL_WINDOW_WEIGHTS[2],
            '3': DEFAULT_PEARL_WINDOW_WEIGHTS[3],
        };

    Object.keys(source).forEach(key => {
        const count = Math.floor(Number(key));
        const weight = Number(source[key]);
        if (count > 0 && Number.isFinite(weight) && weight > 0) {
            weights.set(count, weight);
        }
    });

    if (weights.size === 0) {
        Object.keys(DEFAULT_PEARL_WINDOW_WEIGHTS).forEach(key => {
            const count = Number(key);
            weights.set(count, DEFAULT_PEARL_WINDOW_WEIGHTS[count]);
        });
    }

    return weights;
})();

/** Hold while final reel spins before stop. */
export const JACKPOT_FINAL_REEL_SPIN_HOLD_SEC = Math.max(
    0.35,
    (jackpotReelConfig.finalReelSpinHoldMs ?? 2400) / 1000,
);

/** Pulse landed symbol before reward calculation. */
export const JACKPOT_FINAL_REEL_LAND_REVEAL_SEC = Math.max(
    0.2,
    (jackpotReelConfig.finalReelLandRevealMs ?? 900) / 1000,
);

/** Hold after final reel lands before feature exit. */
export const JACKPOT_FINAL_REEL_RESULT_HOLD_SEC = Math.max(
    0,
    (jackpotReelConfig.finalReelResultHoldMs ?? 1000) / 1000,
);

/** Allowed pearl reward amounts (random pick). */
export const JACKPOT_PEARL_REWARD_VALUES: readonly number[] = (
    jackpotReelConfig.pearlRewardValues?.length
        ? jackpotReelConfig.pearlRewardValues
        : DEFAULT_PEARL_REWARD_VALUES
)
    .map(value => Math.floor(Number(value)))
    .filter(value => value > 0);

const FINAL_REEL_REWARDS: Record<string, FinalReelRewardPayout> = {
    ...DEFAULT_FINAL_REEL_REWARDS,
    ...(jackpotReelConfig.finalReelRewards ?? {}),
};

const FINAL_REEL_PAYOUT_BY_SYMBOL_ID: ReadonlyMap<number, FinalReelRewardPayout> = new Map([
    [JACKPOT_FINAL_REEL_SYMBOL.R1, FINAL_REEL_REWARDS.R1 ?? DEFAULT_FINAL_REEL_REWARDS.R1],
    [JACKPOT_FINAL_REEL_SYMBOL.R2, FINAL_REEL_REWARDS.R2 ?? DEFAULT_FINAL_REEL_REWARDS.R2],
    [JACKPOT_FINAL_REEL_SYMBOL.R3, FINAL_REEL_REWARDS.R3 ?? DEFAULT_FINAL_REEL_REWARDS.R3],
    [JACKPOT_FINAL_REEL_SYMBOL.R4, FINAL_REEL_REWARDS.R4 ?? DEFAULT_FINAL_REEL_REWARDS.R4],
    [JACKPOT_FINAL_REEL_SYMBOL.X2, FINAL_REEL_REWARDS.X2 ?? DEFAULT_FINAL_REEL_REWARDS.X2],
    [JACKPOT_FINAL_REEL_SYMBOL.X3, FINAL_REEL_REWARDS.X3 ?? DEFAULT_FINAL_REEL_REWARDS.X3],
    [JACKPOT_FINAL_REEL_SYMBOL.X4, FINAL_REEL_REWARDS.X4 ?? DEFAULT_FINAL_REEL_REWARDS.X4],
    [JACKPOT_FINAL_REEL_SYMBOL.X5, FINAL_REEL_REWARDS.X5 ?? DEFAULT_FINAL_REEL_REWARDS.X5],
]);

/** Picks a random reward amount from the configured set. */
export function rollPearlAmount(): number {
    const values = JACKPOT_PEARL_REWARD_VALUES;
    if (values.length === 0) {
        return DEFAULT_PEARL_REWARD_VALUES[0];
    }
    return values[Math.floor(Math.random() * values.length)];
}

/** Full pearl reward roll — amount only. */
export function rollPearlReward(): PearlRewardValues {
    return { amount: rollPearlAmount() };
}

export function buildPearlReward(amount: number): PearlRewardValues {
    const values = JACKPOT_PEARL_REWARD_VALUES;
    const floored = Math.floor(amount);
    if (values.indexOf(floored) >= 0) {
        return { amount: floored };
    }
    return { amount: Math.max(0, floored) };
}

export function getFinalReelPayout(symbolId: number): FinalReelRewardPayout | null {
    return FINAL_REEL_PAYOUT_BY_SYMBOL_ID.get(symbolId) ?? null;
}

/**
 * Applies final-reel payout to the feature total.
 * Tier symbols (12–15) add paytable jackpot awards; R/X use finalReelRewards.
 */
export function applyFinalReelPayout(total: number, symbolId: number): number {
    const safeTotal = Math.max(0, total);

    if (isJackpotTierSymbol(symbolId)) {
        return Math.floor(safeTotal + calculateJackpotPayout(symbolId));
    }

    const payout = getFinalReelPayout(symbolId);
    if (!payout) {
        return Math.floor(safeTotal);
    }

    if (payout.kind === 'multiplier') {
        return Math.floor(safeTotal * Math.max(1, payout.value));
    }

    return Math.floor(safeTotal + Math.max(0, payout.value));
}

export function tierNameForFinalReelSymbol(symbolId: number): string {
    switch (symbolId) {
        case JACKPOT_SYMBOL.MINI:
            return 'MINI';
        case JACKPOT_SYMBOL.MAXI:
            return 'MAXI';
        case JACKPOT_SYMBOL.MEGA:
            return 'MEGA';
        case JACKPOT_SYMBOL.GRAND:
            return 'GRAND';
        case JACKPOT_FINAL_REEL_SYMBOL.R1:
            return 'R1';
        case JACKPOT_FINAL_REEL_SYMBOL.R2:
            return 'R2';
        case JACKPOT_FINAL_REEL_SYMBOL.R3:
            return 'R3';
        case JACKPOT_FINAL_REEL_SYMBOL.R4:
            return 'R4';
        case JACKPOT_FINAL_REEL_SYMBOL.X2:
            return 'X2';
        case JACKPOT_FINAL_REEL_SYMBOL.X3:
            return 'X3';
        case JACKPOT_FINAL_REEL_SYMBOL.X4:
            return 'X4';
        case JACKPOT_FINAL_REEL_SYMBOL.X5:
            return 'X5';
        default:
            return 'PEARL';
    }
}

const FINAL_REEL_SYMBOL_WEIGHT_BY_ID: ReadonlyMap<number, number> = (() => {
    const configured = {
        ...DEFAULT_FINAL_REEL_SYMBOL_WEIGHTS,
        ...(jackpotReelConfig.finalReelSymbolWeights ?? {}),
    };
    const weights = new Map<number, number>();

    (Object.keys(JACKPOT_FINAL_REEL_SYMBOL) as Array<keyof typeof JACKPOT_FINAL_REEL_SYMBOL>)
        .forEach(name => {
            const symbolId = JACKPOT_FINAL_REEL_SYMBOL[name];
            const weight = Number(configured[name] ?? 0);
            if (Number.isFinite(weight) && weight > 0) {
                weights.set(symbolId, weight);
            }
        });

    return weights;
})();

function getFinalReelSymbolWeight(symbolId: number): number {
    return FINAL_REEL_SYMBOL_WEIGHT_BY_ID.get(symbolId) ?? 0;
}

/**
 * Weighted stop on the final reel strip.
 * Picks a symbol by configured weight (MINI > MAXI > MEGA > GRAND), then a matching stop.
 */
export function rollFinalReelStopIndex(): number {
    const strip = JACKPOT_FINAL_REEL_CONFIG.reelStrips[0] ?? [];
    if (strip.length === 0) {
        return 0;
    }

    const stopsBySymbol = new Map<number, number[]>();
    strip.forEach((symbolId, index) => {
        const stops = stopsBySymbol.get(symbolId) ?? [];
        stops.push(index);
        stopsBySymbol.set(symbolId, stops);
    });

    let totalWeight = 0;
    const entries: Array<{ weight: number; stops: readonly number[] }> = [];

    stopsBySymbol.forEach((stops, symbolId) => {
        const weight = getFinalReelSymbolWeight(symbolId);
        if (weight <= 0 || stops.length === 0) {
            return;
        }
        entries.push({ weight, stops });
        totalWeight += weight;
    });

    if (entries.length === 0 || totalWeight <= 0) {
        return Math.floor(Math.random() * strip.length);
    }

    let roll = Math.random() * totalWeight;
    for (const entry of entries) {
        roll -= entry.weight;
        if (roll <= 0) {
            return entry.stops[Math.floor(Math.random() * entry.stops.length)];
        }
    }

    const last = entries[entries.length - 1];
    return last.stops[Math.floor(Math.random() * last.stops.length)];
}

export type JackpotTier = keyof typeof JACKPOT_SYMBOL;
export type JackpotReelSymbolName = keyof typeof JACKPOT_REEL_SYMBOL;
export type JackpotFinalReelSymbolName = keyof typeof JACKPOT_FINAL_REEL_SYMBOL;
