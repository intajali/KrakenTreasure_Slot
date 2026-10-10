import { IBetSelection } from 'db://assets/core/betting/ICoinWallet';

/** Read-only balance / affordability queries for HUD. */
export interface IBalanceQuery {
    getBalance(): number;
    getBetSelection(): IBetSelection;
    canAffordSpin(): boolean;
}

/** Spin and auto-spin commands for the control panel. */
export interface ISpinCommands {
    requestSpin(): void;
    startAutoSpin(count: number, lossThreshold?: number): void;
    stopAutoSpin(): void;
    isAutoSpinActive(): boolean;
}

/** Bet / multiplier adjustment commands for the control panel. */
export interface IBetCommands {
    increaseBet(): void;
    decreaseBet(): void;
    increaseMultiplier(): void;
    decreaseMultiplier(): void;
    setMaxAffordableBet(): void;
    canIncreaseBet(): boolean;
    canDecreaseBet(): boolean;
    canIncreaseMultiplier(): boolean;
    canDecreaseMultiplier(): boolean;
}

/**
 * Full front-panel controller surface.
 * Prefer IBalanceQuery / ISpinCommands / IBetCommands when a view only needs one role.
 */
export interface IGamePanelController extends IBalanceQuery, ISpinCommands, IBetCommands {}
