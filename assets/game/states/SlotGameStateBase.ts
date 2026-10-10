import { BaseState } from 'db://assets/core/stateMachine/base/BaseState';
import { SlotGameState } from 'db://assets/core/enums/SlotGameState';
import { ISlotGameOwner } from 'db://assets/core/slot/interfaces/ISlotGameOwner';

export abstract class SlotGameStateBase extends BaseState<ISlotGameOwner> {
    public abstract readonly id: SlotGameState;

    protected transition(stateId: SlotGameState): void {
        this.owner.changeState(stateId);
    }
}
