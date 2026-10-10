import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';

export const BetEvents = {
    BetChanged: 'bet_changed',
    MultiplierChanged: 'multiplier_changed',
    SpinCostDebited: 'spin_cost_debited',
    InsufficientCoins: 'insufficient_coins',
    WinCredited: 'win_credited',
} as const;

export type BetEvent = typeof BetEvents[keyof typeof BetEvents];

export { EventBus, SlotEvents };
