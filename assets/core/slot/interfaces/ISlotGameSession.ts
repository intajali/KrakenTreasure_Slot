import { ISpinResult } from '../interfaces/ISpinResult';

export enum SpinMode {
    Normal = 'normal',
    AutoSpin = 'auto_spin',
    FreeSpin = 'free_spin',
    Feature = 'feature',
}

export interface ISlotGameSession {
    spinMode: SpinMode;
    autoSpinRemaining: number;
    autoSpinTotal: number;
    autoSpinStopRequested: boolean;
    autoSpinStartBalance: number;
    autoSpinLossThreshold: number;
    freeSpinsRemaining: number;
    freeSpinActive: boolean;
    freeSpinTotal: number;
    freeSpinTotalWin: number;
    betIndex: number;
    multiplierIndex: number;
    lastSpinCost: number;
    currentStopIndices: number[];
    pendingStopIndices: number[];
    lastSpinResult: ISpinResult | null;
    featureTriggered: boolean;
    /** Treasure hunt filled this spin; open popup after auto-spin exit if needed. */
    pendingTreasureHunt: boolean;
    presentationDurationMs: number;
    winLinePresentationDelayMs: number;
}

export function createDefaultSession(): ISlotGameSession {
    return {
        spinMode: SpinMode.Normal,
        autoSpinRemaining: 0,
        autoSpinTotal: 0,
        autoSpinStopRequested: false,
        autoSpinStartBalance: 0,
        autoSpinLossThreshold: 0,
        freeSpinsRemaining: 0,
        freeSpinActive: false,
        freeSpinTotal: 0,
        freeSpinTotalWin: 0,
        betIndex: 0,
        multiplierIndex: 0,
        lastSpinCost: 0,
        currentStopIndices: [],
        pendingStopIndices: [],
        lastSpinResult: null,
        featureTriggered: false,
        pendingTreasureHunt: false,
        presentationDurationMs: 1500,
        winLinePresentationDelayMs: 700,
    };
}
