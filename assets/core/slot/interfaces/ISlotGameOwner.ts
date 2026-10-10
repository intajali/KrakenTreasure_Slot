import { SlotGameState } from '../../enums/SlotGameState';
import { IBetSelection } from '../../betting/ICoinWallet';
import { AutoSpinEndReason } from '../AutoSpinEndReason';
import { ISlotGameSession } from './ISlotGameSession';
import { ISpinResult } from './ISpinResult';

/** Session access, state transitions, and delayed callbacks. */
export interface ISessionHost {
    readonly session: ISlotGameSession;
    changeState(stateId: SlotGameState): void;
    scheduleDelay(seconds: number, callback: () => void): void;
}

/** Reel spin / stop / evaluate flow used by FSM states. */
export interface IReelFlowHost {
    spinAll(): void;
    stopSequentially(stripIndices: number[], delayMs: number, onComplete?: () => void): void;
    buildReelWindow(stripIndices: number[]): readonly (readonly number[])[];
    evaluateSpin(reelWindow: readonly (readonly number[])[], betSelection: IBetSelection): ISpinResult;
    selectStopIndices(): number[];
}

/** Wallet + bet selection used during spins and presentation. */
export interface IBettingHost {
    getBalance(): number;
    getBetSelection(): IBetSelection;
    canAffordSpin(): boolean;
    shouldChargeCurrentSpin(): boolean;
    tryDebitSpinCost(): boolean;
    creditWin(amount: number): void;
    setBetIndex(index: number): void;
    setMultiplierIndex(index: number): void;
}

/** Progressive jackpot claim / feature open during presentation. */
export interface IJackpotHost {
    claimPendingJackpotAward(): number;
    openJackpotFeature(amount?: number): void;
}

/** Auto-spin lifecycle control. */
export interface IAutoSpinHost {
    stopAutoSpin(): void;
    endAutoSpin(reason?: AutoSpinEndReason): void;
    shouldStopAutoSpin(): boolean;
    isAutoSpinLossLimitReached(): boolean;
}

/**
 * Full owner surface for the slot FSM.
 * Prefer depending on a role interface (ISessionHost, IBettingHost, …) when possible.
 */
export interface ISlotGameOwner
    extends ISessionHost, IReelFlowHost, IBettingHost, IJackpotHost, IAutoSpinHost {}
