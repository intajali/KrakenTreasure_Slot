import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { SlotGameState } from 'db://assets/core/enums/SlotGameState';
import { SlotGameStateBase } from './SlotGameStateBase';

export class ResultState extends SlotGameStateBase {
    public readonly id = SlotGameState.Result;

    public enter(): void {
        EventBus.emit(SlotEvents.StateChanged, { state: this.id });
        this.transition(SlotGameState.Presentation);
    }
}
