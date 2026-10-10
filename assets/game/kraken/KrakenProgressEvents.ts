export const KrakenProgressEvents = {
    MeterUpdated: 'kraken_meter_updated',
    KrakenTriggered: 'kraken_triggered',
    KrakenAwarded: 'kraken_awarded',
} as const;

export type KrakenProgressEvent = typeof KrakenProgressEvents[keyof typeof KrakenProgressEvents];

export interface KrakenMeterSnapshot {
    readonly currentCount: number;
    readonly requiredCount: number;
    /** 0..1 fill toward requiredCount. */
    readonly progress: number;
    readonly symbolsAdded: number;
    readonly isFilled: boolean;
}

export interface KrakenTriggeredPayload {
    readonly amount: number;
    readonly symbolsAdded: number;
    readonly meter: KrakenMeterSnapshot;
}
