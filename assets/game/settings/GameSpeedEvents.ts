export const GameSpeedEvents = {
    Changed: 'game_speed_changed',
} as const;

export interface GameSpeedSnapshot {
    /** Single speed factor. Min 0.1, max 1. Also used as the settings bar fill. */
    readonly speed: number;
    /** 0 at min speed, 1 at max speed. */
    readonly normalized: number;
    /** HUD needle angle. 90 at min speed, 0 at mid, -90 at max speed. */
    readonly meterAngle: number;
    /** True while spinning, free spin, feature, or auto-spin — speed cannot change. */
    readonly locked: boolean;
}
