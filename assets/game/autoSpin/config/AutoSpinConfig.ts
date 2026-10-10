import autoSpinConfigData from 'db://assets/resources/autoSpin/AutoSpinConfig.json';

export interface AutoSpinConfig {
    /** Available auto-spin counts. Use 0 for unlimited. */
    readonly spinCountOptions: readonly number[];
    /** Available loss limits in coins. Use 0 for no limit. */
    readonly lossLimitOptions: readonly number[];
    readonly defaultSpinCount: number;
    readonly defaultLossLimit: number;
    /** Mapped count when the player selects unlimited (0). */
    readonly unlimitedSpinCount: number;
    /** Wait after ending auto-spin for exit FX before starting a feature. */
    readonly exitTransitionSec?: number;
}

export const AUTO_SPIN_CONFIG = autoSpinConfigData as AutoSpinConfig;

export function resolveAutoSpinCount(selectedCount: number): number {
    if (selectedCount <= 0) {
        return Math.max(1, AUTO_SPIN_CONFIG.unlimitedSpinCount);
    }
    return Math.floor(selectedCount);
}

export function getAutoSpinExitTransitionSeconds(): number {
    return Math.max(0, AUTO_SPIN_CONFIG.exitTransitionSec ?? 0.7);
}
