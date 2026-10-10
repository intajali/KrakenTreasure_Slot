export interface ICoinWallet {
    readonly balance: number;
    canAfford(amount: number): boolean;
    debit(amount: number): boolean;
    credit(amount: number): void;
    setBalance(amount: number): void;
}

export interface IBetSelection {
    readonly betAmount: number;
    readonly multiplier: number;
    readonly spinCost: number;
}

export interface IBetCalculator {
    getSpinCost(betAmount: number, multiplier: number): number;
}

export interface ISpinCostPolicy {
    shouldCharge(mode: string): boolean;
}
