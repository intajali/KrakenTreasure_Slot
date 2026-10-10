import { DefaultSpinCostPolicy } from 'db://assets/core/betting/DefaultSpinCostPolicy';
import {
    IBetCalculator,
    IBetSelection,
    ICoinWallet,
    ISpinCostPolicy,
} from 'db://assets/core/betting/ICoinWallet';
import { ISlotGameSession } from 'db://assets/core/slot/interfaces/ISlotGameSession';
import { EventBus } from 'db://assets/core/events/EventBus';
import { BetCalculator } from './BetCalculator';
import { BET_CONFIG } from './BetConfig';
import { BetEvents } from './BetEvents';
import { CoinWallet } from './CoinWallet';

export class BetController {
    constructor(
        private readonly wallet: ICoinWallet = new CoinWallet(BET_CONFIG.startingCoins),
        private readonly betCalculator: IBetCalculator = new BetCalculator(),
        private readonly spinCostPolicy: ISpinCostPolicy = new DefaultSpinCostPolicy(),
    ) {}

    public initializeSession(session: ISlotGameSession): void {
        session.betIndex = BET_CONFIG.defaultBetIndex;
        session.multiplierIndex = BET_CONFIG.defaultMultiplierIndex;
    }

    public getBalance(): number {
        return this.wallet.balance;
    }

    public getSelection(session: ISlotGameSession): IBetSelection {
        const betAmount = BET_CONFIG.betLevels[session.betIndex] ?? BET_CONFIG.betLevels[0];
        const multiplier = BET_CONFIG.multipliers[session.multiplierIndex] ?? BET_CONFIG.multipliers[0];
        const spinCost = this.betCalculator.getSpinCost(betAmount, multiplier);

        return { betAmount, multiplier, spinCost };
    }

    public canAffordSpin(session: ISlotGameSession): boolean {
        if (!this.shouldChargeSpin(session)) {
            return true;
        }

        return this.wallet.canAfford(this.getSelection(session).spinCost);
    }

    public shouldChargeSpin(session: ISlotGameSession): boolean {
        return this.spinCostPolicy.shouldCharge(session.spinMode);
    }

    public tryDebitSpinCost(session: ISlotGameSession): boolean {
        const { spinCost } = this.getSelection(session);
        if (!this.wallet.debit(spinCost)) {
            return false;
        }

        session.lastSpinCost = spinCost;
        EventBus.emit(BetEvents.SpinCostDebited, {
            spinCost,
            balance: this.wallet.balance,
        });
        return true;
    }

    public creditWin(amount: number): void {
        this.wallet.credit(amount);
    }

    public setBetIndex(session: ISlotGameSession, index: number): boolean {
        if (index < 0 || index >= BET_CONFIG.betLevels.length) {
            return false;
        }

        session.betIndex = index;
        EventBus.emit(BetEvents.BetChanged, this.getSelection(session));
        return true;
    }

    public setMultiplierIndex(session: ISlotGameSession, index: number): boolean {
        if (index < 0 || index >= BET_CONFIG.multipliers.length) {
            return false;
        }

        session.multiplierIndex = index;
        EventBus.emit(BetEvents.MultiplierChanged, this.getSelection(session));
        return true;
    }

    public setMaxAffordableBet(session: ISlotGameSession): boolean {
        const maxBetIndex = BET_CONFIG.betLevels.length - 1;
        let multiplierIndex = BET_CONFIG.multipliers.length - 1;

        session.betIndex = maxBetIndex;

        while (multiplierIndex > 0) {
            session.multiplierIndex = multiplierIndex;
            if (this.wallet.canAfford(this.getSelection(session).spinCost)) {
                this.emitBetSelectionChanged(session);
                return true;
            }
            multiplierIndex--;
        }

        session.multiplierIndex = multiplierIndex;
        this.emitBetSelectionChanged(session);
        return this.wallet.canAfford(this.getSelection(session).spinCost);
    }

    public canIncreaseBet(session: ISlotGameSession): boolean {
        return session.betIndex < BET_CONFIG.betLevels.length - 1;
    }

    public canDecreaseBet(session: ISlotGameSession): boolean {
        return session.betIndex > 0;
    }

    public canIncreaseMultiplier(session: ISlotGameSession): boolean {
        return session.multiplierIndex < BET_CONFIG.multipliers.length - 1;
    }

    public canDecreaseMultiplier(session: ISlotGameSession): boolean {
        return session.multiplierIndex > 0;
    }

    private emitBetSelectionChanged(session: ISlotGameSession): void {
        const selection = this.getSelection(session);
        EventBus.emit(BetEvents.BetChanged, selection);
        EventBus.emit(BetEvents.MultiplierChanged, selection);
    }
}
