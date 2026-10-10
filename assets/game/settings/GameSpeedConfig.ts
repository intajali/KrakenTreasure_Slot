/** One game-speed value. Settings bar and HUD meter both read/write this (never 0). */
export const GAME_SPEED_CONFIG = {
    storageKey: 'krakens_treasure.game_speed',
    min: 0.1,
    max: 1,
    default: 1,
    /** One settings-button press. Matches one 15° HUD needle detent. */
    step: 0.9 / 12,
    meterMinAngle: 90,
    meterMaxAngle: -90,
    meterAngleStep: 15,
};
