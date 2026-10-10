import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { SlotGameState } from 'db://assets/core/enums/SlotGameState';
import { AutoSpinEndReason } from 'db://assets/core/slot/AutoSpinEndReason';
import { SpinMode } from 'db://assets/core/slot/interfaces/ISlotGameSession';
import { BetEvents } from '../betting/BetEvents';
import { SlotGameStateBase } from './SlotGameStateBase';

export class AutoSpinState extends SlotGameStateBase {
    public readonly id = SlotGameState.AutoSpin;

    public enter(): void {
        EventBus.emit(SlotEvents.StateChanged, { state: this.id });

        const session = this.owner.session;

        if (session.autoSpinRemaining <= 0 || this.owner.shouldStopAutoSpin()) {
            this.owner.endAutoSpin(this.resolveEndReason());
            this.transition(SlotGameState.Ready);
            return;
        }

        if (!this.owner.canAffordSpin()) {
            EventBus.emit(BetEvents.InsufficientCoins, {
                balance: this.owner.getBalance(),
                required: this.owner.getBetSelection().spinCost,
            });
            this.owner.endAutoSpin('insufficient_funds');
            this.transition(SlotGameState.Ready);
            return;
        }

        session.spinMode = SpinMode.AutoSpin;

        const remaining = session.autoSpinRemaining;
        const total = session.autoSpinTotal;

        if (remaining === total) {
            EventBus.emit(SlotEvents.AutoSpinStarted, { remaining, total });
        }

        EventBus.emit(SlotEvents.AutoSpinUpdated, { remaining, total });

        session.autoSpinRemaining--;
        this.transition(SlotGameState.Spinning);
    }

    private resolveEndReason(): AutoSpinEndReason {
        if (this.owner.isAutoSpinLossLimitReached()) {
            return 'loss_limit';
        }
        if (this.owner.session.autoSpinStopRequested) {
            return 'manual_stop';
        }
        return 'completed';
    }
}
