export const AddSpinEvents = {
    Landed: 'add_spin_landed',
    Cleared: 'add_spin_cleared',
} as const;

export type AddSpinEvent = typeof AddSpinEvents[keyof typeof AddSpinEvents];

export interface AddSpinPosition {
    readonly reel: number;
    readonly row: number;
}

export interface AddSpinLandedPayload {
    readonly positions: readonly AddSpinPosition[];
    readonly spinsAwarded: number;
    readonly freeSpinsRemaining: number;
    readonly freeSpinTotal: number;
}
