import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { SlotGameState } from 'db://assets/core/enums/SlotGameState';
import { SpinMode } from 'db://assets/core/slot/interfaces/ISlotGameSession';
import { SlotGameStateBase } from './SlotGameStateBase';

const DEFAULT_FREE_SPINS_AWARD = 5;

export class FeatureState extends SlotGameStateBase {
    public readonly id = SlotGameState.Feature;

    public enter(): void {
        EventBus.emit(SlotEvents.StateChanged, { state: this.id });
        EventBus.emit(SlotEvents.FeatureTriggered, this.owner.session.lastSpinResult);
        this.owner.session.spinMode = SpinMode.Feature;

        this.owner.scheduleDelay(2.0, () => {
            const awarded = DEFAULT_FREE_SPINS_AWARD;
            if (this.owner.session.freeSpinActive) {
                this.owner.session.freeSpinsRemaining += awarded;
                this.owner.session.freeSpinTotal += awarded;
            } else {
                this.owner.session.freeSpinsRemaining = awarded;
                this.owner.session.freeSpinTotal = awarded;
                this.owner.session.freeSpinTotalWin = 0;
            }
            this.owner.session.spinMode = SpinMode.FreeSpin;
            this.transition(SlotGameState.FreeSpin);
        });
    }
}
