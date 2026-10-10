export const TreasureHuntProgressEvents = {
    MeterUpdated: 'treasure_hunt_meter_updated',
    TreasureHuntTriggered: 'treasure_hunt_triggered',
    TreasureHuntAwarded: 'treasure_hunt_awarded',
    /** Fired when UI should open the treasure choice popup (may be deferred after auto-spin exit). */
    OpenRequested: 'treasure_hunt_open_requested',
} as const;

export type TreasureHuntProgressEvent = typeof TreasureHuntProgressEvents[keyof typeof TreasureHuntProgressEvents];

export interface TreasureHuntMeterSnapshot {
    readonly currentCount: number;
    readonly requiredCount: number;
    /** 0..1 fill toward requiredCount. */
    readonly progress: number;
    readonly symbolsAdded: number;
    readonly isFilled: boolean;
}

export interface TreasureHuntTriggeredPayload {
    readonly amount: number;
    readonly symbolsAdded: number;
    readonly meter: TreasureHuntMeterSnapshot;
}

export interface TreasureHuntOpenPayload {
    readonly betAmount: number;
    readonly multiplier: number;
}

export interface TreasureHuntAwardedPayload {
    readonly treasureId: string;
    readonly kind: 'coins' | 'freeSpins';
    readonly coinAmount: number;
    readonly freeSpinCount: number;
}
