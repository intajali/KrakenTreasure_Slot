/** Prefab ids assigned on ParticleManager. Missing types are ignored at runtime. */
export const ParticleIds = {
    CoinShower: 'coin_shower',
    CoinBurst: 'coin_burst',
    FireLine: 'fire_line',
    BarFilledJackpot: 'bar_filled_jackpot',
    BarFilledKraken: 'bar_filled_kraken',
    BarFilledTreasureHunt: 'bar_filled_treasure_hunt',
} as const;

export type ParticleId = typeof ParticleIds[keyof typeof ParticleIds] | string;
