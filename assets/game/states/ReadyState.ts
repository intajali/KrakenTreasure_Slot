import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { SlotGameState } from 'db://assets/core/enums/SlotGameState';
import { SpinMode } from 'db://assets/core/slot/interfaces/ISlotGameSession';
import { BetEvents } from '../betting/BetEvents';
import { SlotGameStateBase } from './SlotGameStateBase';

export class ReadyState extends SlotGameStateBase {
    public readonly id = SlotGameState.Ready;

    public enter(): void {
        EventBus.emit(SlotEvents.StateChanged, { state: this.id });

        if (this.owner.session.autoSpinRemaining > 0) {
            this.transition(SlotGameState.AutoSpin);
            return;
        }

        if (this.owner.session.freeSpinsRemaining > 0 || this.owner.session.freeSpinActive) {
            this.transition(SlotGameState.FreeSpin);
        }
    }

    public requestSpin(): void {
        if (this.owner.session.spinMode === SpinMode.Feature) {
            return;
        }

        if (!this.owner.canAffordSpin()) {
            EventBus.emit(BetEvents.InsufficientCoins, {
                balance: this.owner.getBalance(),
                required: this.owner.getBetSelection().spinCost,
            });
            return;
        }

        EventBus.emit(SlotEvents.SpinRequested);
        this.transition(SlotGameState.Spinning);
    }
}
