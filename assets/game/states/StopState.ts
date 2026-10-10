import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { SlotGameState } from 'db://assets/core/enums/SlotGameState';
import { GameSpeedController } from '../settings/GameSpeedController';
import { SlotGameStateBase } from './SlotGameStateBase';

export class StopState extends SlotGameStateBase {
    public readonly id = SlotGameState.Stop;

    public enter(): void {
        EventBus.emit(SlotEvents.StateChanged, { state: this.id });

        const stopIndices = this.owner.session.pendingStopIndices.length > 0
            ? this.owner.session.pendingStopIndices
            : this.owner.selectStopIndices();

        this.owner.session.currentStopIndices = [...stopIndices];
        this.owner.session.pendingStopIndices = [];

        this.owner.stopSequentially(stopIndices, GameSpeedController.getReelStopGapMs(), () => {
            this.transition(SlotGameState.Evaluate);
        });
    }
}
