export const JackpotEvents = {
    MeterUpdated: 'jackpot_meter_updated',
    JackpotTriggered: 'jackpot_triggered',
    JackpotAwarded: 'jackpot_awarded',
    OpenRequested: 'jackpot_open_requested',
    FeatureResult: 'jackpot_feature_result',
    FeatureCompleted: 'jackpot_feature_completed',
} as const;

export type JackpotEvent = typeof JackpotEvents[keyof typeof JackpotEvents];

export interface JackpotMeterSnapshot {
    readonly currentValue: number;
    readonly seedValue: number;
    readonly triggerValue: number;
    /** 0..1 fill toward trigger. */
    readonly progress: number;
    readonly contribution: number;
    readonly isFilled: boolean;
}

export interface JackpotTriggeredPayload {
    readonly amount: number;
    readonly meter: JackpotMeterSnapshot;
}

export interface JackpotOpenRequestedPayload {
    readonly amount: number;
}

export interface JackpotFeatureCompletedPayload {
    /** Feature-earned total (pearls + final reel), credited before exit. */
    readonly totalWin: number;
    readonly progressiveAward: number;
}
