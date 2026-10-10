import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { ICoinWallet } from 'db://assets/core/betting/ICoinWallet';

export class CoinWallet implements ICoinWallet {
    private _balance = 0;

    constructor(initialBalance = 0) {
        this._balance = initialBalance;
    }

    public get balance(): number {
        return this._balance;
    }

    public canAfford(amount: number): boolean {
        return amount >= 0 && this._balance >= amount;
    }

    public debit(amount: number): boolean {
        if (amount < 0 || !this.canAfford(amount)) {
            return false;
        }
        this._balance -= amount;
        this.emitBalanceUpdated();
        return true;
    }

    public credit(amount: number): void {
        if (amount <= 0) {
            return;
        }
        this._balance += amount;
        this.emitBalanceUpdated();
    }

    public setBalance(amount: number): void {
        this._balance = Math.max(0, Math.floor(amount));
        this.emitBalanceUpdated();
    }

    private emitBalanceUpdated(): void {
        EventBus.emit(SlotEvents.BalanceUpdated, { balance: this._balance });
    }
}
