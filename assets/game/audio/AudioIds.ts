/** Clip ids assigned on AudioManager. Missing clips are ignored at runtime. */
export const AudioIds = {
    BgmMain: 'bgm_main',
    BgmFreeSpin: 'bgm_free_spin',
    BgmFeature: 'bgm_feature',
    UiClick: 'sfx_ui_click',
    Spin: 'sfx_spin',
    ReelStop: 'sfx_reel_stop',
    Win: 'sfx_win',
    Feature: 'sfx_feature',
    FreeSpinStart: 'sfx_free_spin_start',
    InsufficientCoins: 'sfx_insufficient_coins',
    RewardClaim: 'sfx_reward_claim',
} as const;

export type AudioId = typeof AudioIds[keyof typeof AudioIds] | string;
