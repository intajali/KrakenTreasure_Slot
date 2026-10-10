import { IBetCalculator } from 'db://assets/core/betting/ICoinWallet';

export class BetCalculator implements IBetCalculator {
    getSpinCost(betAmount: number, multiplier: number): number {
        return Math.max(0, Math.floor(betAmount * multiplier));
    }
}
