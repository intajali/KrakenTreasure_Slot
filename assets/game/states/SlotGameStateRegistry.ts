import { SlotGameState } from 'db://assets/core/enums/SlotGameState';
import { ISlotGameOwner } from 'db://assets/core/slot/interfaces/ISlotGameOwner';
import { SlotGameStateBase } from './SlotGameStateBase';
import { ReadyState } from './ReadyState';
import { SpinningState } from './SpinningState';
import { StopState } from './StopState';
import { EvaluateState } from './EvaluateState';
import { ResultState } from './ResultState';
import { PresentationState } from './PresentationState';
import { FreeSpinState } from './FreeSpinState';
import { FeatureState } from './FeatureState';
import { AutoSpinState } from './AutoSpinState';

export function createSlotGameStates(owner: ISlotGameOwner): Map<SlotGameState, SlotGameStateBase> {
    const states: SlotGameStateBase[] = [
        new ReadyState(owner),
        new SpinningState(owner),
        new StopState(owner),
        new EvaluateState(owner),
        new ResultState(owner),
        new PresentationState(owner),
        new FreeSpinState(owner),
        new FeatureState(owner),
        new AutoSpinState(owner),
    ];

    return new Map(states.map(state => [state.id, state]));
}

export function getReadyState(states: Map<SlotGameState, SlotGameStateBase>): ReadyState {
    return states.get(SlotGameState.Ready) as ReadyState;
}
