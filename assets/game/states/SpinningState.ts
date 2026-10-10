import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { SlotGameState } from 'db://assets/core/enums/SlotGameState';
import { SpinMode } from 'db://assets/core/slot/interfaces/ISlotGameSession';
import { BetEvents } from '../betting/BetEvents';
import { GameSpeedController } from '../settings/GameSpeedController';
import { SlotGameStateBase } from './SlotGameStateBase';

export class SpinningState extends SlotGameStateBase {
    public readonly id = SlotGameState.Spinning;

    public enter(): void {
        EventBus.emit(SlotEvents.StateChanged, { state: this.id });
        this.owner.session.currentStopIndices = [];

        if (this.owner.shouldChargeCurrentSpin()) {
            if (!this.owner.tryDebitSpinCost()) {
                EventBus.emit(BetEvents.InsufficientCoins, {
                    balance: this.owner.getBalance(),
                    required: this.owner.getBetSelection().spinCost,
                });
                this.abortSpin();
                return;
            }
        } else {
            this.owner.session.lastSpinCost = 0;
        }

        GameSpeedController.logReelSpeed('before spinning');
        this.owner.spinAll();

        const spinDurationSec = GameSpeedController.getSpinDurationMs() / 1000;
        if (spinDurationSec <= 0) {
            this.transition(SlotGameState.Stop);
            return;
        }

        this.owner.scheduleDelay(spinDurationSec, () => {
            this.transition(SlotGameState.Stop);
        });
    }

    private abortSpin(): void {
        const session = this.owner.session;

        if (session.spinMode === SpinMode.AutoSpin) {
            this.owner.endAutoSpin('insufficient_funds');
        }

        this.transition(SlotGameState.Ready);
    }
}
